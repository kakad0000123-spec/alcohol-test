CREATE TABLE line_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  am_enabled BOOLEAN DEFAULT FALSE,
  am_start TEXT DEFAULT '07:00',
  am_end TEXT DEFAULT '09:30',
  am_token TEXT,
  am_group_id TEXT,
  pm_enabled BOOLEAN DEFAULT FALSE,
  pm_start TEXT DEFAULT '13:00',
  pm_end TEXT DEFAULT '15:30',
  pm_token TEXT,
  pm_group_id TEXT
);
INSERT INTO line_config (id) VALUES (1) ON CONFLICT DO NOTHING;
