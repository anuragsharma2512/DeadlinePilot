const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Task = require('../models/Task');
const claudeService = require('../services/claudeService');
const googleCalendarService = require('../services/googleCalendarService');

// Store active SSE connections: userId -> res
const activeSSEConnections = new Map();

router.use(authMiddleware);

// GET /api/ai/warplan - Generate a time-blocked war plan
router.get('/warplan', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const tasks = await Task.findAll(userId);
    const profile = await Task.getProfile(userId);
    
    // Fetch today's calendar events (real if connected, else mock)
    const events = await googleCalendarService.getTodayEvents(userId);

    const warPlan = await claudeService.generateWarPlan(tasks, events, profile);
    res.json(warPlan);
  } catch (error) {
    next(error);
  }
});

// POST /api/ai/coach - Get a direct coaching message
router.post('/coach', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const tasks = await Task.findAll(userId);
    
    // Calculate overdue tasks count
    const now = new Date();
    const overdueTasks = tasks.filter(t => t.status !== 'complete' && t.deadline && new Date(t.deadline) < now);
    const overdueCount = overdueTasks.length;

    // Calculate minutes since last task completion
    const completedTasks = tasks.filter(t => t.status === 'complete' && t.completed_at);
    let minutesSinceLastComplete = 120; // Default to 2 hours if none completed
    if (completedTasks.length > 0) {
      completedTasks.sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
      const lastComplete = new Date(completedTasks[0].completed_at);
      minutesSinceLastComplete = Math.floor((Date.now() - lastComplete.getTime()) / 60000);
    }

    const message = await claudeService.getCoachingMessage(tasks, minutesSinceLastComplete, overdueCount);
    res.json({ message });
  } catch (error) {
    next(error);
  }
});

// GET /api/ai/coach/stream - SSE endpoint for real-time coaching pushes
router.get('/coach/stream', (req, res) => {
  const userId = req.user.id;

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for Nginx/Railway

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'info', message: 'Coaching stream connected.' })}\n\n`);

  // Store connection
  activeSSEConnections.set(userId, res);
  console.log(`User ${userId} connected to coaching SSE stream.`);

  // Immediately trigger a coaching check and send the message
  triggerCoachingPush(userId).catch(err => {
    console.error(`Initial coaching push failed for user ${userId}:`, err);
  });

  // Keep-alive ping every 30 seconds
  const pingInterval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(pingInterval);
    activeSSEConnections.delete(userId);
    console.log(`User ${userId} disconnected from coaching SSE stream.`);
  });
});

/**
 * Generates and pushes a coaching message to a user if they are connected.
 */
async function triggerCoachingPush(userId) {
  const connection = activeSSEConnections.get(userId);
  if (!connection) return; // User not online

  try {
    const tasks = await Task.findAll(userId);
    const overdueTasks = tasks.filter(t => t.status !== 'complete' && t.deadline && new Date(t.deadline) < new Date());
    const overdueCount = overdueTasks.length;

    const completedTasks = tasks.filter(t => t.status === 'complete' && t.completed_at);
    let minutesSinceLastComplete = 120; // Default to 2 hours
    if (completedTasks.length > 0) {
      completedTasks.sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
      const lastComplete = new Date(completedTasks[0].completed_at);
      minutesSinceLastComplete = Math.floor((Date.now() - lastComplete.getTime()) / 60000);
    }

    const message = await claudeService.getCoachingMessage(tasks, minutesSinceLastComplete, overdueCount);
    
    connection.write(`data: ${JSON.stringify({ type: 'coach', message })}\n\n`);
    console.log(`Pushed coaching message to user ${userId}`);
  } catch (error) {
    console.error(`Error generating coaching push for user ${userId}:`, error);
  }
}

module.exports = {
  router,
  activeSSEConnections,
  triggerCoachingPush
};
