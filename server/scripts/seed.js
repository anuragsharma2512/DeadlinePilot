const bcrypt = require('bcrypt');
const db = require('../db/client');
const { calculatePriorityScore } = require('../services/priorityScorer');

async function seed() {
  console.log('Starting database seeding...');

  try {
    // Clear existing data
    console.log('Clearing old data...');
    await db.execute('DELETE FROM tasks');
    await db.execute('DELETE FROM user_profile');
    await db.execute('DELETE FROM users');

    // Create demo user
    console.log('Creating demo user...');
    const email = 'demo@lifesaver.app';
    const password = 'demo123';
    const passwordHash = await bcrypt.hash(password, 10);

    const userResult = await db.execute({
      sql: 'INSERT INTO users (email, password_hash) VALUES (?, ?)',
      args: [email, passwordHash]
    });

    const userId = Number(userResult.lastInsertRowid);

    // Create user profile
    console.log('Creating demo user profile...');
    await db.execute({
      sql: `INSERT INTO user_profile (user_id, avg_error_pct, completion_rate_7d, streak_days, peak_focus_start, peak_focus_end)
            VALUES (?, 0.35, 0.68, 3, '09:00', '11:00')`,
      args: [userId]
    });

    // Create 10 demo tasks
    console.log('Creating 10 pre-seeded tasks with relative deadlines...');
    const now = new Date();
    
    // 1. TODAY 5PM
    const today5pm = new Date(now);
    today5pm.setHours(17, 0, 0, 0);

    // 2. TODAY 3PM
    const today3pm = new Date(now);
    today3pm.setHours(15, 0, 0, 0);

    // 3. Overdue by 3 days
    const overdue3days = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    // 4. 20 min from now
    const dueIn20Min = new Date(now.getTime() + 20 * 60 * 1000);

    // 5. Tomorrow 9AM
    const tomorrow9am = new Date(now);
    tomorrow9am.setDate(tomorrow9am.getDate() + 1);
    tomorrow9am.setHours(9, 0, 0, 0);

    // 6. TODAY EOD (11:59 PM)
    const todayEOD = new Date(now);
    todayEOD.setHours(23, 59, 0, 0);

    // 7. In 2 days
    const in2days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    // 8. No deadline
    const noDeadline = null;

    // 9. Tomorrow 2PM
    const tomorrow2pm = new Date(now);
    tomorrow2pm.setDate(tomorrow2pm.getDate() + 1);
    tomorrow2pm.setHours(14, 0, 0, 0);

    // 10. Overdue 1 week
    const overdue1week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const demoTasks = [
      {
        title: 'Submit Q3 report',
        deadline: today5pm ? today5pm.toISOString() : null,
        estimated_minutes: 90,
        urgency: 10,
        impact: 9,
        category: 'work'
      },
      {
        title: 'Call vendor before cutoff',
        deadline: today3pm ? today3pm.toISOString() : null,
        estimated_minutes: 15,
        urgency: 9,
        impact: 8,
        category: 'work'
      },
      {
        title: 'Pay electricity bill',
        deadline: overdue3days.toISOString(),
        estimated_minutes: 10,
        urgency: 7,
        impact: 6,
        category: 'finance'
      },
      {
        title: "Review Raj's PR before standup",
        deadline: dueIn20Min.toISOString(),
        estimated_minutes: 20,
        urgency: 9,
        impact: 7,
        category: 'work'
      },
      {
        title: 'Prep for doctor appointment',
        deadline: tomorrow9am.toISOString(),
        estimated_minutes: 30,
        urgency: 5,
        impact: 8,
        category: 'personal'
      },
      {
        title: 'Respond to client email',
        deadline: todayEOD.toISOString(),
        estimated_minutes: 15,
        urgency: 6,
        impact: 7,
        category: 'work'
      },
      {
        title: 'Update project roadmap',
        deadline: in2days.toISOString(),
        estimated_minutes: 60,
        urgency: 4,
        impact: 9,
        category: 'work'
      },
      {
        title: 'Buy groceries',
        deadline: noDeadline,
        estimated_minutes: 45,
        urgency: 3,
        impact: 4,
        category: 'personal'
      },
      {
        title: 'Weekly team sync prep',
        deadline: tomorrow2pm.toISOString(),
        estimated_minutes: 30,
        urgency: 6,
        impact: 6,
        category: 'work'
      },
      {
        title: 'Cancel unused subscriptions',
        deadline: overdue1week.toISOString(),
        estimated_minutes: 15,
        urgency: 2,
        impact: 5,
        category: 'finance'
      }
    ];

    for (const t of demoTasks) {
      const score = calculatePriorityScore({
        deadline: t.deadline,
        urgency: t.urgency,
        impact: t.impact,
        status: 'pending'
      });

      await db.execute({
        sql: `INSERT INTO tasks (user_id, title, deadline, estimated_minutes, urgency, impact, category, priority_score, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        args: [userId, t.title, t.deadline, t.estimated_minutes, t.urgency, t.impact, t.category, score]
      });
    }

    console.log('Demo tasks inserted successfully!');
    console.log('==================================================');
    console.log('  SEEDING COMPLETE! USE THESE CREDENTIALS FOR DEMO:');
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
    console.log('==================================================');

  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    if (db && typeof db.close === 'function') {
      db.close();
    }
  }
}

seed();
