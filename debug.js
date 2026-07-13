const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data.sqlite');

db.serialize(() => {
  db.run('DROP TABLE IF EXISTS athletes', (err) => {
    if (err) {
      console.error(err.message);
    } else {
      console.log('Table deleted.');
    }
  });
});

db.close();