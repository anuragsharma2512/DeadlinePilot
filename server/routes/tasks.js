const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const authMiddleware = require('../middleware/auth');
const claudeService = require('../services/claudeService');
const db = require('../db/client');

// In-memory rate limiter for AI parsing (3 requests per minute per user)
const parseRateLimits = {};

router.use(authMiddleware);

// GET /api/tasks - Get all tasks (sorted by priority score)
router.get('/', async (req, res, next) => {
  try {
    const tasks = await Task.findAll(req.user.id);
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

// POST /api/tasks - Create a single task
router.post('/', async (req, res, next) => {
  try {
    const taskData = { ...req.body, user_id: req.user.id };
    const task = await Task.create(taskData);
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

// POST /api/tasks/batch - Batch create tasks (used after brain dump confirmation)
router.post('/batch', async (req, res, next) => {
  try {
    const tasksData = req.body.tasks;
    if (!Array.isArray(tasksData)) {
      return res.status(400).json({ error: 'Body must contain an array of tasks in the "tasks" field.' });
    }

    const createdTasks = [];
    for (const data of tasksData) {
      const task = await Task.create({
        user_id: req.user.id,
        title: data.title,
        deadline: data.deadline,
        estimated_minutes: data.estimated_minutes || 30,
        urgency: data.urgency || 5,
        impact: data.impact || 5,
        category: data.category || 'general'
      });
      createdTasks.push(task);
    }

    res.status(201).json(createdTasks);
  } catch (error) {
    next(error);
  }
});

// PUT /api/tasks/:id - Update a task
router.put('/:id', async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task || task.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const updatedTask = await Task.update(req.params.id, req.body);
    res.json(updatedTask);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/tasks/:id/complete - Complete a task
router.patch('/:id/complete', async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task || task.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const { actual_minutes } = req.body;
    const completedTask = await Task.complete(req.params.id, actual_minutes);
    res.json(completedTask);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tasks/:id - Delete a task
router.delete('/:id', async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task || task.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    await Task.delete(req.params.id);
    res.json({ success: true, message: 'Task deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

// POST /api/tasks/parse - Parse messy brain dump using Claude/Gemini
router.post('/parse', async (req, res, next) => {
  try {
    const { rawText } = req.body;
    if (!rawText || rawText.trim() === '') {
      return res.status(400).json({ error: 'Raw text is required for parsing.' });
    }

    const userId = req.user.id;
    const now = Date.now();
    
    if (!parseRateLimits[userId]) {
      parseRateLimits[userId] = [];
    }

    parseRateLimits[userId] = parseRateLimits[userId].filter(timestamp => now - timestamp < 60000);

    if (parseRateLimits[userId].length >= 3) {
      return res.status(429).json({ 
        error: 'Too many requests. Please wait a moment before doing another brain dump.' 
      });
    }

    parseRateLimits[userId].push(now);

    const parsedTasks = await claudeService.extractTasks(rawText);
    
    if (parsedTasks.length === 0) {
      return res.json({ 
        tasks: [],
        message: 'Try adding more detail — deadlines, names, and stakes help.' 
      });
    }

    res.json({ tasks: parsedTasks });
  } catch (error) {
    next(error);
  }
});

// POST /api/tasks/:id/execute - Autonomous Task Execution (Agentic Depth)
router.post('/:id/execute', async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task || task.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    // Call Gemini to execute task autonomously
    const result = await claudeService.executeTaskAutonomously(task.title, task.category);

    // Auto-complete the task in the database
    await Task.complete(req.params.id, task.estimated_minutes || 30);

    res.json({
      success: true,
      steps: result.steps || [],
      artifact: result.artifact || 'Task completed successfully.'
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// HABIT & GOAL TRACKING ROUTE ENDPOINTS
// ============================================================================

// GET /api/tasks/habits - Fetch all habits
router.get('/habits', async (req, res, next) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM habits WHERE user_id = ? ORDER BY created_at DESC',
      args: [req.user.id]
    });
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// POST /api/tasks/habits - Create a new habit
router.post('/habits', async (req, res, next) => {
  try {
    const { title } = req.body;
    if (!title || title.trim() === '') {
      return res.status(450).json({ error: 'Habit title is required.' });
    }

    const result = await db.execute({
      sql: 'INSERT INTO habits (user_id, title, streak) VALUES (?, ?, 0)',
      args: [req.user.id, title.trim()]
    });

    const newId = Number(result.lastInsertRowid);
    const habitResult = await db.execute({
      sql: 'SELECT * FROM habits WHERE id = ?',
      args: [newId]
    });

    res.status(201).json(habitResult.rows[0]);
  } catch (error) {
    next(error);
  }
});

// POST /api/tasks/habits/:id/complete - Complete habit for today (increment streak)
router.post('/habits/:id/complete', async (req, res, next) => {
  try {
    const habitId = req.params.id;
    
    // Fetch habit
    const habitQuery = await db.execute({
      sql: 'SELECT * FROM habits WHERE id = ? AND user_id = ?',
      args: [habitId, req.user.id]
    });

    if (habitQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found.' });
    }

    const habit = habitQuery.rows[0];
    const todayStr = new Date().toISOString().split('T')[0];

    if (habit.last_completed_date === todayStr) {
      return res.status(400).json({ error: 'Habit already completed today.' });
    }

    // Determine new streak
    let newStreak = (habit.streak || 0) + 1;
    
    // Check if streak was broken (i.e. last completion was before yesterday)
    if (habit.last_completed_date) {
      const lastDate = new Date(habit.last_completed_date);
      const today = new Date(todayStr);
      const diffDays = Math.round((today - lastDate) / (1000 * 60 * 60 * 24));
      if (diffDays > 1) {
        newStreak = 1; // Reset streak if broken
      }
    }

    await db.execute({
      sql: 'UPDATE habits SET streak = ?, last_completed_date = ? WHERE id = ?',
      args: [newStreak, todayStr, habitId]
    });

    // Also update user profile streak if this habit completes today
    const profile = await Task.getProfile(req.user.id);
    if (profile) {
      const newProfileStreak = Math.max(profile.streak_days, newStreak);
      await Task.updateProfile(req.user.id, { streak_days: newProfileStreak });
    }

    res.json({ success: true, streak: newStreak, last_completed_date: todayStr });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tasks/habits/:id - Delete a habit
router.delete('/habits/:id', async (req, res, next) => {
  try {
    const result = await db.execute({
      sql: 'DELETE FROM habits WHERE id = ? AND user_id = ?',
      args: [req.params.id, req.user.id]
    });

    res.json({ success: true, message: 'Habit deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
