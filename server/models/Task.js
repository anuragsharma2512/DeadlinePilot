const db = require('../db/client');
const { calculatePriorityScore } = require('../services/priorityScorer');

const Task = {
  /**
   * Finds all tasks for a user, recalculates priority scores on-the-fly,
   * and returns them sorted by priority score DESC.
   */
  async findAll(userId) {
    const result = await db.execute({
      sql: 'SELECT * FROM tasks WHERE user_id = ?',
      args: [userId]
    });
    
    const tasks = result.rows.map(row => ({
      id: Number(row.id),
      user_id: Number(row.user_id),
      title: String(row.title),
      deadline: row.deadline ? String(row.deadline) : null,
      estimated_minutes: row.estimated_minutes ? Number(row.estimated_minutes) : null,
      actual_minutes: row.actual_minutes !== null ? Number(row.actual_minutes) : null,
      priority_score: Number(row.priority_score),
      urgency: Number(row.urgency),
      impact: Number(row.impact),
      category: String(row.category),
      status: String(row.status),
      created_at: String(row.created_at),
      completed_at: row.completed_at ? String(row.completed_at) : null
    }));

    // Recalculate priority score for pending/in_progress tasks
    for (const task of tasks) {
      if (task.status !== 'complete') {
        const newScore = calculatePriorityScore(task);
        if (Math.abs(newScore - task.priority_score) > 0.01) {
          task.priority_score = newScore;
          await db.execute({
            sql: 'UPDATE tasks SET priority_score = ? WHERE id = ?',
            args: [newScore, task.id]
          });
        }
      }
    }

    // Sort: pending/in_progress tasks sorted by priority_score DESC, completed tasks at the bottom
    return tasks.sort((a, b) => {
      if (a.status === 'complete' && b.status !== 'complete') return 1;
      if (a.status !== 'complete' && b.status === 'complete') return -1;
      return b.priority_score - a.priority_score;
    });
  },

  async findById(id) {
    const result = await db.execute({
      sql: 'SELECT * FROM tasks WHERE id = ?',
      args: [id]
    });
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: Number(row.id),
      user_id: Number(row.user_id),
      title: String(row.title),
      deadline: row.deadline ? String(row.deadline) : null,
      estimated_minutes: row.estimated_minutes ? Number(row.estimated_minutes) : null,
      actual_minutes: row.actual_minutes !== null ? Number(row.actual_minutes) : null,
      priority_score: Number(row.priority_score),
      urgency: Number(row.urgency),
      impact: Number(row.impact),
      category: String(row.category),
      status: String(row.status),
      created_at: String(row.created_at),
      completed_at: row.completed_at ? String(row.completed_at) : null
    };
  },

  async create(taskData) {
    const { user_id, title, deadline, estimated_minutes = 30, urgency = 5, impact = 5, category = 'general' } = taskData;
    
    const initialScore = calculatePriorityScore({ deadline, urgency, impact, status: 'pending' });

    const result = await db.execute({
      sql: `INSERT INTO tasks (user_id, title, deadline, estimated_minutes, urgency, impact, category, priority_score, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      args: [user_id, title, deadline, estimated_minutes, urgency, impact, category, initialScore]
    });

    const newId = Number(result.lastInsertRowid);
    return this.findById(newId);
  },

  async update(id, taskData) {
    const fields = [];
    const args = [];
    
    for (const [key, value] of Object.entries(taskData)) {
      if (['title', 'deadline', 'estimated_minutes', 'actual_minutes', 'urgency', 'impact', 'category', 'status', 'completed_at'].includes(key)) {
        fields.push(`${key} = ?`);
        args.push(value);
      }
    }

    if (fields.length === 0) return this.findById(id);

    args.push(id);
    await db.execute({
      sql: `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`,
      args
    });

    const task = await this.findById(id);
    const newScore = calculatePriorityScore(task);
    await db.execute({
      sql: 'UPDATE tasks SET priority_score = ? WHERE id = ?',
      args: [newScore, id]
    });

    return this.findById(id);
  },

  async delete(id) {
    await db.execute({
      sql: 'DELETE FROM tasks WHERE id = ?',
      args: [id]
    });
    return true;
  },

  async complete(id, actualMinutes) {
    const now = new Date().toISOString();
    const task = await this.findById(id);
    if (!task) return null;

    const actual = actualMinutes !== undefined ? actualMinutes : (task.estimated_minutes || 30);

    await db.execute({
      sql: `UPDATE tasks 
            SET status = 'complete', actual_minutes = ?, completed_at = ?, priority_score = 0 
            WHERE id = ?`,
      args: [actual, now, id]
    });

    // Update user profile completion statistics
    await this.updateProfileStats(task.user_id);

    return this.findById(id);
  },

  async getProfile(userId) {
    const result = await db.execute({
      sql: 'SELECT * FROM user_profile WHERE user_id = ?',
      args: [userId]
    });
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      user_id: Number(row.user_id),
      avg_error_pct: Number(row.avg_error_pct),
      completion_rate_7d: Number(row.completion_rate_7d),
      streak_days: Number(row.streak_days),
      peak_focus_start: String(row.peak_focus_start),
      peak_focus_end: String(row.peak_focus_end),
      google_calendar_token: row.google_calendar_token ? String(row.google_calendar_token) : null
    };
  },

  async createProfile(userId, profileData = {}) {
    const { 
      avg_error_pct = 0, 
      completion_rate_7d = 0, 
      streak_days = 0, 
      peak_focus_start = '09:00', 
      peak_focus_end = '11:00', 
      google_calendar_token = null 
    } = profileData;

    await db.execute({
      sql: `INSERT INTO user_profile (user_id, avg_error_pct, completion_rate_7d, streak_days, peak_focus_start, peak_focus_end, google_calendar_token)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [userId, avg_error_pct, completion_rate_7d, streak_days, peak_focus_start, peak_focus_end, google_calendar_token]
    });
    return this.getProfile(userId);
  },

  async updateProfile(userId, profileData) {
    const fields = [];
    const args = [];
    for (const [key, value] of Object.entries(profileData)) {
      if (['avg_error_pct', 'completion_rate_7d', 'streak_days', 'peak_focus_start', 'peak_focus_end', 'google_calendar_token'].includes(key)) {
        fields.push(`${key} = ?`);
        args.push(value);
      }
    }
    if (fields.length === 0) return this.getProfile(userId);

    args.push(userId);
    await db.execute({
      sql: `UPDATE user_profile SET ${fields.join(', ')} WHERE user_id = ?`,
      args
    });
    return this.getProfile(userId);
  },

  async updateProfileStats(userId) {
    // Fetch all completed tasks
    const completedResult = await db.execute({
      sql: `SELECT estimated_minutes, actual_minutes, completed_at FROM tasks 
            WHERE user_id = ? AND status = 'complete'`,
      args: [userId]
    });

    const completedTasks = completedResult.rows;
    if (completedTasks.length === 0) return;

    // Calculate avg_error_pct: how off estimated vs actual is
    // error_pct = abs(actual - estimated) / estimated
    let totalError = 0;
    let countWithError = 0;
    for (const t of completedTasks) {
      const est = Number(t.estimated_minutes);
      const act = t.actual_minutes !== null ? Number(t.actual_minutes) : null;
      if (est > 0 && act !== null) {
        const error = Math.abs(act - est) / est;
        totalError += error;
        countWithError++;
      }
    }
    const avg_error_pct = countWithError > 0 ? (totalError / countWithError) : 0;

    // Calculate completion_rate_7d
    // total tasks created in last 7 days vs completed
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateStr = sevenDaysAgo.toISOString();

    const statsResult = await db.execute({
      sql: `SELECT 
              COUNT(*) as total,
              SUM(CASE WHEN status = 'complete' THEN 1 ELSE 0 END) as completed
            FROM tasks 
            WHERE user_id = ? AND created_at >= ?`,
      args: [userId, dateStr]
    });

    const row = statsResult.rows[0];
    const total = Number(row.total || 0);
    const completed = Number(row.completed || 0);
    const completion_rate_7d = total > 0 ? (completed / total) : 0;

    // Calculate streak (days with at least 1 task completed consecutively up to today)
    const datesResult = await db.execute({
      sql: `SELECT DISTINCT date(completed_at) as comp_date FROM tasks
            WHERE user_id = ? AND status = 'complete' AND completed_at IS NOT NULL
            ORDER BY comp_date DESC`,
      args: [userId]
    });

    let streak_days = 0;
    const completedDates = datesResult.rows.map(r => String(r.comp_date));
    
    if (completedDates.length > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Streak is active if user completed something today or yesterday
      if (completedDates[0] === todayStr || completedDates[0] === yesterdayStr) {
        streak_days = 1;
        for (let i = 0; i < completedDates.length - 1; i++) {
          const curr = new Date(completedDates[i]);
          const next = new Date(completedDates[i+1]);
          const diffDays = Math.round((curr - next) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            streak_days++;
          } else if (diffDays > 1) {
            break; // Streak broken
          }
        }
      }
    }

    await this.updateProfile(userId, {
      avg_error_pct,
      completion_rate_7d,
      streak_days
    });
  }
};

module.exports = Task;
