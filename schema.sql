PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  academy TEXT DEFAULT '',
  isAdmin INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS athletes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK(gender IN ('masculino','feminino')),
  birthdate TEXT NOT NULL,
  weight REAL NOT NULL,
  belt TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tourneys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  athlete_id INTEGER NOT NULL,
  tourney_id INTEGER NOT NULL,
  age_category TEXT NOT NULL,
  weight_category TEXT NOT NULL,
  gender TEXT NOT NULL CHECK(gender IN ('masculino','feminino')),
  FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE,
  FOREIGN KEY (tourney_id) REFERENCES tourneys(id) ON DELETE CASCADE,
  UNIQUE (athlete_id, tourney_id, age_category, weight_category, gender)
);

INSERT INTO tourneys (name, date, location, description) VALUES
  ('Spring Judo Open', '2026-09-12', 'São Paulo', 'A regional judo open for all age divisions.'),
  ('National Kids Cup', '2026-10-05', 'Brasília', 'Youth tournament with categories for under-12 and under-15 athletes.'),
  ('Black Belt Challenge', '2026-11-20', 'Rio de Janeiro', 'Senior-level competition for advanced judoka.');
