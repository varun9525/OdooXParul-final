import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.resolve('backend/pos.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  
  const current = new Date();
  const utcYear = current.getUTCFullYear();
  const utcMonth = current.getUTCMonth();
  const utcDate = current.getUTCDate();
  const utcDay = current.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
  
  const dayDiff = utcDay === 0 ? -6 : 1 - utcDay;
  const mondayUTC = new Date(Date.UTC(utcYear, utcMonth, utcDate + dayDiff, 0, 0, 0, 0));
  const mondayStr = mondayUTC.toISOString();
  
  console.log("mondayStr (UTC):", mondayStr);
  
  db.all(
    `SELECT substr(created_at, 1, 10) as order_date, SUM(total) as daily_total 
     FROM orders 
     WHERE status = 'Paid' AND created_at >= ? 
     GROUP BY order_date`,
    [mondayStr],
    (err, rows) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      console.log('rows in database query:', rows);
      
      const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const weeklySales = weekDays.map((dayName, idx) => {
        const d = new Date(mondayUTC);
        d.setUTCDate(mondayUTC.getUTCDate() + idx);
        const dateStr = d.toISOString().split('T')[0];
        const row = rows ? rows.find(r => r.order_date === dateStr) : null;
        return {
          day: dayName,
          total: row ? row.daily_total : 0.0,
          dateStr
        };
      });
      console.log('weeklySales mapped:', weeklySales);
      db.close();
    }
  );
});
