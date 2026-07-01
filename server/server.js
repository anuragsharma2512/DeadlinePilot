require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const db = require('./db/client');
const initDatabase = require('./db/init');
const { getDatabaseConfig } = require('./db/config');
const { router: authRouter } = require('./routes/auth'); // Wait, we exported default router or { router }? Let's check.
// Ah, in auth.js we did module.exports = router;
// In tasks.js we did module.exports = router;
// In ai.js we did module.exports = { router, activeSSEConnections, triggerCoachingPush };
// In mockCalendar.js we did module.exports = { router, getMockEvents };
// In insights.js we did module.exports = router;

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const { router: aiRoutes, activeSSEConnections, triggerCoachingPush } = require('./routes/ai');
const { router: calendarRoutes } = require('./routes/mockCalendar');
const insightsRoutes = require('./routes/insights');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const allowedOrigins = [process.env.CLIENT_URL || 'http://localhost:5173'];
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/insights', insightsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// CRON JOBS

// 1. Every day at 8:00 AM -> Regenerate war plans (log activity for all active users)
cron.schedule('0 8 * * *', async () => {
  console.log('[CRON] Running 8:00 AM War Plan regeneration...');
  try {
    const result = await db.execute('SELECT id FROM users');
    console.log(`[CRON] Regenerating war plans for ${result.rows.length} users.`);
    // In a real production app, we would pre-generate or cache the war plans here.
  } catch (error) {
    console.error('[CRON] Error in War Plan regeneration cron:', error);
  }
});

// 2. Every 30 minutes -> Scan tasks with deadline < 30 min -> Trigger SSE push notification
cron.schedule('*/30 * * * *', async () => {
  console.log('[CRON] Running 30-minute task deadline scanner...');
  try {
    const now = new Date();
    const thirtyMinsFromNow = new Date(now.getTime() + 30 * 60 * 1000);

    // Find users with tasks due within 30 minutes
    const result = await db.execute({
      sql: `SELECT DISTINCT user_id FROM tasks 
            WHERE status != 'complete' 
            AND deadline IS NOT NULL 
            AND deadline >= ? 
            AND deadline <= ?`,
      args: [now.toISOString(), thirtyMinsFromNow.toISOString()]
    });

    console.log(`[CRON] Found ${result.rows.length} users with urgent upcoming tasks.`);

    for (const row of result.rows) {
      const userId = Number(row.user_id);
      const connection = activeSSEConnections.get(userId);
      if (connection) {
        // Push a real-time notification alert via SSE
        connection.write(`data: ${JSON.stringify({ 
          type: 'notification', 
          message: '⚡ URGENT: You have a task deadline approaching in less than 30 minutes! Lock in now.' 
        })}\n\n`);
        console.log(`[CRON] Pushed urgent deadline alert to online user ${userId}`);
      }
    }
  } catch (error) {
    console.error('[CRON] Error in deadline scanner cron:', error);
  }
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start Server
async function startServer() {
  await initDatabase();

  app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`  LAST MINUTE LIFESAVER BACKEND RUNNING ON PORT ${PORT}`);
    console.log(`  Database URL: ${getDatabaseConfig().url}`);
    console.log(`  Allowed Origin: ${allowedOrigins.join(', ')}`);
    console.log(`==================================================`);
  });
}

startServer().catch((error) => {
  console.error('[STARTUP ERROR]', error);
  process.exit(1);
});
