const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'data.sqlite');
const dbDir = path.dirname(dbPath);
if (dbDir && dbDir !== '.' && !fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function init() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const hasUsersTable = await new Promise((resolve) => {
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", [], (err, row) => {
      if (err) return resolve(false);
      resolve(!!row);
    });
  });
  if (!hasUsersTable) {
    await new Promise((resolve, reject) => {
      db.exec(schema, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
  // If users table exists but missing isAdmin column, add it.
  const usersCols = await new Promise((resolve) => {
    db.all("PRAGMA table_info(users)", [], (err, rows) => {
      if (err) return resolve([]);
      resolve(rows || []);
    });
  });
  const hasIsAdmin = usersCols.some((c) => c && c.name === 'isAdmin');
  if (!hasIsAdmin) {
    await new Promise((resolve, reject) => {
      db.run("ALTER TABLE users ADD COLUMN isAdmin INTEGER DEFAULT 0", [], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
  // Seed default admin user if no users exist
  const userCount = await new Promise((resolve) => {
    db.get("SELECT COUNT(*) as count FROM users", [], (err, row) => {
      if (err) return resolve(0);
      resolve(row ? row.count : 0);
    });
  });
  if (userCount === 0) {
    const defaultEmail = 'admin@judo.local';
    const defaultPassword = 'Admin@123456';
    const passwordHash = await bcrypt.hash(defaultPassword, 12);
    await run(
      'INSERT INTO users (email, password_hash, name, academy, isAdmin) VALUES (?, ?, ?, ?, ?)',
      [defaultEmail, passwordHash, 'Administrador', 'Judo Admin', 1]
    );
    console.log(`\n✓ Default admin user created!\n  Email: ${defaultEmail}\n  Password: ${defaultPassword}\n`);
  }
  // Ensure fights table exists for storing paired matches. Allow NULLs so a fight can have only one athlete.
  // If an existing table has NOT NULL constraints, migrate it to the nullable schema.
  await run(
    `CREATE TABLE IF NOT EXISTS fights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tourney_id INTEGER NOT NULL,
      athlete_a_id INTEGER,
      athlete_b_id INTEGER,
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tourney_id) REFERENCES tourneys(id) ON DELETE CASCADE,
      FOREIGN KEY (athlete_a_id) REFERENCES athletes(id) ON DELETE CASCADE,
      FOREIGN KEY (athlete_b_id) REFERENCES athletes(id) ON DELETE CASCADE
    )`
  );

  // Migration: if existing fights table had NOT NULL on athlete_a_id/athlete_b_id, recreate table preserving data.
  const fightsCols = await new Promise((resolve) => {
    db.all("PRAGMA table_info(fights)", [], (err, rows) => {
      if (err) return resolve([]);
      resolve(rows || []);
    });
  });
  const hasNotNullA = fightsCols.some((c) => c && c.name === 'athlete_a_id' && c.notnull === 1);
  const hasNotNullB = fightsCols.some((c) => c && c.name === 'athlete_b_id' && c.notnull === 1);
  if ((hasNotNullA || hasNotNullB) && fightsCols.length > 0) {
    // recreate table with nullable columns
    await new Promise((resolve, reject) => {
      db.serialize(async () => {
        try {
          await run('ALTER TABLE fights RENAME TO fights_old');
          await run(
            `CREATE TABLE fights (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              tourney_id INTEGER NOT NULL,
              athlete_a_id INTEGER,
              athlete_b_id INTEGER,
              created_by INTEGER,
              created_at TEXT DEFAULT (datetime('now')),
              FOREIGN KEY (tourney_id) REFERENCES tourneys(id) ON DELETE CASCADE,
              FOREIGN KEY (athlete_a_id) REFERENCES athletes(id) ON DELETE CASCADE,
              FOREIGN KEY (athlete_b_id) REFERENCES athletes(id) ON DELETE CASCADE
            )`
          );
          await run('INSERT INTO fights (id, tourney_id, athlete_a_id, athlete_b_id, created_by, created_at) SELECT id, tourney_id, athlete_a_id, athlete_b_id, created_by, created_at FROM fights_old');
          await run('DROP TABLE fights_old');
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  }
}

module.exports = {
  db,
  run,
  get,
  all,
  init,
};
