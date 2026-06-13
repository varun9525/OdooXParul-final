import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.resolve('backend/pos.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Connection error:', err);
    return;
  }
  
  db.all('PRAGMA table_info(orders)', [], (err, info) => {
    if (err) {
      console.error(err);
    } else {
      console.log('Orders table columns:');
      info.forEach(col => console.log(` - ${col.name} (${col.type})`));
    }
    
    db.all('PRAGMA table_info(customers)', [], (err, info) => {
      if (err) {
        console.error(err);
      } else {
        console.log('\nCustomers table columns:');
        info.forEach(col => console.log(` - ${col.name} (${col.type})`));
      }
      db.close();
    });
  });
});
