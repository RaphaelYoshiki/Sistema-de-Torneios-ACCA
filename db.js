require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const useLocalDatabase =
  /^(1|true|yes|local)$/i.test(process.env.DB_MODE || '') ||
  /^(1|true|yes)$/i.test(process.env.USE_LOCAL_DB || '') ||
  (!process.env.TURSO_DATABASE_URL && !process.env.DATABASE_URL);

const dbPath = process.env.LOCAL_DB_PATH || path.join(__dirname, 'data.sqlite');

let db;

if (useLocalDatabase) {
  const sqlite3 = require('sqlite3').verbose();
  db = new sqlite3.Database(dbPath);
} else {
  const { createClient } = require('@libsql/client');
  db = createClient({
    url: process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}

const isLocalDb = useLocalDatabase;

async function executeSchema(sql) {
  if (isLocalDb) {
    return new Promise((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  return db.executeMultiple(sql);
}

async function run(sql, params = []) {
  if (isLocalDb) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({
          id: this.lastID ? Number(this.lastID) : null,
          changes: this.changes || 0,
        });
      });
    });
  }

  const result = await db.execute({ sql, args: params });
  return {
    // LibSQL retorna o ID como BigInt, precisamos converter para Number
    id: result.lastInsertRowid ? Number(result.lastInsertRowid) : null,
    changes: result.rowsAffected,
  };
}

async function get(sql, params = []) {
  if (isLocalDb) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  const result = await db.execute({ sql, args: params });
  // Se encontrou alguma linha, retorna a primeira; se não, retorna undefined
  return result.rows.length > 0 ? result.rows[0] : undefined;
}

async function all(sql, params = []) {
  if (isLocalDb) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  const result = await db.execute({ sql, args: params });
  return result.rows;
}

async function init() {
  if (isLocalDb) {
    await run('PRAGMA foreign_keys = ON');
  }

  // Lógica de inicialização do banco (criação de tabelas e usuário admin)
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    const hasUsersTable = await get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
    
    if (!hasUsersTable) {
      console.log('Tabelas não encontradas. Criando schema inicial...');
      await executeSchema(schema);
    }
  }

  // Se a tabela users existe mas falta a coluna isAdmin, adiciona
  const usersCols = await all("PRAGMA table_info(users)");
  const hasIsAdmin = usersCols.some((c) => c && c.name === 'isAdmin');
  if (!hasIsAdmin && usersCols.length > 0) {
    await run("ALTER TABLE users ADD COLUMN isAdmin INTEGER DEFAULT 0");
  }

  // Criar o usuário admin padrão se não houver nenhum
  const userCountRow = await get("SELECT COUNT(*) as count FROM users");
  const userCount = userCountRow ? Number(userCountRow.count) : 0;
  
  if (userCount === 0) {
    const defaultEmail = 'admin@judo.local';
    const defaultPassword = 'Admin@123456';
    const passwordHash = await bcrypt.hash(defaultPassword, 12);
    await run(
      'INSERT INTO users (email, password_hash, name, academy, isAdmin) VALUES (?, ?, ?, ?, ?)',
      [defaultEmail, passwordHash, 'Administrador', 'Judo Admin', 1]
    );
    console.log(`\n✓ Usuário admin padrão criado no ${isLocalDb ? 'SQLite local' : 'Turso'}!\n  Email: ${defaultEmail}\n  Senha: ${defaultPassword}\n`);
  }

  // Garantir que a tabela fights existe (igual ao seu código original)
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

  console.log(`✓ Banco de dados ${isLocalDb ? 'SQLite local' : 'Turso'} conectado e inicializado!`);
}

module.exports = {
  db,
  run,
  get,
  all,
  init,
};