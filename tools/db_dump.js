const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(process.cwd(), 'data.sqlite');
console.log('DB:', dbPath);
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) { console.error('DB OPEN ERROR', err); process.exit(1); }
});

db.serialize(() => {
  db.all("PRAGMA table_info(registrations)", [], (err, rows) => {
    if (err) console.error('PRAGMA ERROR', err);
    else console.log('PRAGMA regs:', rows);
  });

  db.all('SELECT id,athlete_id,tourney_id,age_category,weight_category,gender FROM registrations', [], (err, rows) => {
    if (err) console.error('REGS ERROR', err);
    else console.log('REGISTRATIONS:', rows);
  });

  db.all('SELECT id,name,user_id,gender FROM athletes', [], (err, rows) => {
    if (err) console.error('ATHLETES ERROR', err);
    else console.log('ATHLETES:', rows);
  });

  db.all('SELECT id,name,date FROM tourneys', [], (err, rows) => {
    if (err) console.error('TOURNEYS ERROR', err);
    else console.log('TOURNEYS:', rows);
    db.close();
  });
});
