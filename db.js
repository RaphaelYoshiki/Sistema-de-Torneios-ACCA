require('dotenv').config();
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

// Configuração da conexão com o Turso
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function run(sql, params = []) {
  try {
    const result = await db.execute({ sql, args: params });
    return { 
      // LibSQL retorna o ID como BigInt, precisamos converter para Number
      id: result.lastInsertRowid ? Number(result.lastInsertRowid) : null, 
      changes: result.rowsAffected 
    };
  } catch (err) {
    throw err;
  }
}

async function get(sql, params = []) {
  try {
    const result = await db.execute({ sql, args: params });
    // Se encontrou alguma linha, retorna a primeira; se não, retorna undefined
    return result.rows.length > 0 ? result.rows[0] : undefined;
  } catch (err) {
    throw err;
  }
}

async function all(sql, params = []) {
  try {
    const result = await db.execute({ sql, args: params });
    return result.rows;
  } catch (err) {
    throw err;
  }
}

async function init() {
  // Lógica de inicialização do banco (criação de tabelas e usuário admin)
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    const hasUsersTable = await get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
    
    if (!hasUsersTable) {
      console.log('Tabelas não encontradas. Criando schema inicial...');
      // O LibSQL permite executar múltiplos comandos separados por ponto e vírgula
      await db.executeMultiple(schema);
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
    console.log(`\n✓ Usuário admin padrão criado no Turso!\n  Email: ${defaultEmail}\n  Senha: ${defaultPassword}\n`);
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

  console.log('✓ Banco de dados Turso conectado e inicializado!');
}

module.exports = {
  db,
  run,
  get,
  all,
  init,
};