const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(process.cwd(), 'data.sqlite');
const db = new sqlite3.Database(dbPath);

const athleteId = 1; // adjust if needed
const tourneyId = 3; // Black Belt Challenge
const ageCategory = 'Senior';
const weightCategory = '+100kg';
// read athlete gender to use in insert

db.serialize(() => {
  db.get('SELECT gender FROM athletes WHERE id = ?', [athleteId], (err, row) => {
    if (err) { console.error('ERR', err); process.exit(1); }
    if (!row) { console.error('No athlete'); process.exit(1); }
    const gender = row.gender;
    db.run('INSERT OR IGNORE INTO registrations (athlete_id,tourney_id,age_category,weight_category,gender) VALUES (?,?,?,?,?)', [athleteId,tourneyId,ageCategory,weightCategory,gender], function(err) {
      if (err) console.error('INSERT ERR', err);
      else console.log('Inserted registration id:', this.lastID);

      db.all('SELECT id,athlete_id,tourney_id,age_category,weight_category,gender FROM registrations', [], (e, rows) => {
        if (e) console.error('SELECT ERR', e);
        else console.log('REGISTRATIONS NOW:', rows);
        db.close();
      });
    });
  });
});
