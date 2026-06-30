-- Table: users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Table: user_profile
CREATE TABLE IF NOT EXISTS user_profile (
  user_id INTEGER PRIMARY KEY,
  avg_error_pct REAL DEFAULT 0,         -- estimated vs actual time error
  completion_rate_7d REAL DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  peak_focus_start TEXT DEFAULT '09:00',
  peak_focus_end TEXT DEFAULT '11:00',
  google_calendar_token TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table: tasks
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  deadline TEXT,
  estimated_minutes INTEGER,
  actual_minutes INTEGER,
  priority_score REAL DEFAULT 50,
  urgency INTEGER DEFAULT 5,           -- 1-10
  impact INTEGER DEFAULT 5,            -- 1-10
  category TEXT DEFAULT 'general',
  status TEXT DEFAULT 'pending',       -- pending | in_progress | complete
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table: habits
CREATE TABLE IF NOT EXISTS habits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  streak INTEGER DEFAULT 0,
  last_completed_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
