const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Task = require('../models/Task');
const db = require('../db/client');

router.use(authMiddleware);

// GET /api/insights - Retrieve productivity analytics
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Ensure profile statistics are up to date
    await Task.updateProfileStats(userId);
    
    // Fetch profile
    const profile = await Task.getProfile(userId);

    // Fetch counts
    const countsResult = await db.execute({
      sql: `SELECT 
              COUNT(*) as total,
              SUM(CASE WHEN status = 'pending' OR status = 'in_progress' THEN 1 ELSE 0 END) as pending,
              SUM(CASE WHEN status = 'complete' THEN 1 ELSE 0 END) as completed
            FROM tasks
            WHERE user_id = ?`,
      args: [userId]
    });

    const counts = countsResult.rows[0] || {};
    const pending_count = Number(counts.pending || 0);
    const completed_count = Number(counts.completed || 0);

    // Fetch overdue count
    const now = new Date().toISOString();
    const overdueResult = await db.execute({
      sql: `SELECT COUNT(*) as overdue FROM tasks
            WHERE user_id = ? AND status != 'complete' AND deadline IS NOT NULL AND deadline < ?`,
      args: [userId, now]
    });
    const overdue_count = Number(overdueResult.rows[0]?.overdue || 0);

    // Fetch category breakdown of completed tasks
    const categoryResult = await db.execute({
      sql: `SELECT category, COUNT(*) as count FROM tasks
            WHERE user_id = ? AND status = 'complete'
            GROUP BY category`,
      args: [userId]
    });

    const category_breakdown = categoryResult.rows.map(row => ({
      category: String(row.category),
      count: Number(row.count)
    }));

    res.json({
      streak_days: profile ? profile.streak_days : 0,
      completion_rate_7d: profile ? Math.round(profile.completion_rate_7d * 100) : 0,
      avg_error_pct: profile ? Math.round(profile.avg_error_pct * 100) : 0,
      peak_focus_start: profile ? profile.peak_focus_start : '09:00',
      peak_focus_end: profile ? profile.peak_focus_end : '11:00',
      is_calendar_connected: !!(profile && profile.google_calendar_token),
      completed_count,
      pending_count,
      overdue_count,
      category_breakdown
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
