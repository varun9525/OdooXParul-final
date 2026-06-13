import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.resolve('backend/pos.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Connection error:', err);
    return;
  }
  
  console.log('Testing loyalty flow integration...');
  runTests();
});

function runTests() {
  db.serialize(() => {
    // 1. Ensure a test customer exists
    db.run(
      `INSERT OR IGNORE INTO customers (id, name, email, phone, loyalty_points) 
       VALUES (9999, 'Test Loyalty Customer', 'loyalty@test.com', '1234567890', 100)`
    );

    // Reset customer points to 100 for testing consistency
    db.run(`UPDATE customers SET loyalty_points = 100 WHERE id = 9999`);

    // Fetch and display initial customer state
    db.get(`SELECT * FROM customers WHERE id = 9999`, (err, customerBefore) => {
      if (err) console.error(err);
      console.log('Initial customer state:', customerBefore);

      // 2. Simulate order creation where status = 'Paid' (meaning points should accumulate)
      // Cart subtotal: 200, discount: 0, total: 200
      // 10% of total (200) is 20 points earned.
      // Redeemed points: 0.
      // Expected new balance: 100 - 0 + 20 = 120 points.
      const orderPayload1 = {
        session_id: 1,
        table_id: null,
        customer_id: 9999,
        items: JSON.stringify([{ name: 'Espresso', price: 60, quantity: 2 }]),
        subtotal: 120.0,
        tax: 9.6,
        discount_amount: 0.0,
        total: 129.6,
        status: 'Paid',
        payment_method: 'Cash',
        payment_status: 'Paid',
        coupon_code: null,
        redeemed_points: 0
      };

      console.log('\n--- Simulating Order 1 (Earn Points) ---');
      db.run('BEGIN TRANSACTION');
      db.run(
        `INSERT INTO orders (session_id, table_id, customer_id, items, subtotal, tax, discount_amount, total, status, payment_method, payment_status, coupon_code, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderPayload1.session_id,
          orderPayload1.table_id,
          orderPayload1.customer_id,
          orderPayload1.items,
          orderPayload1.subtotal,
          orderPayload1.tax,
          orderPayload1.discount_amount,
          orderPayload1.total,
          orderPayload1.status,
          orderPayload1.payment_method,
          orderPayload1.payment_status,
          orderPayload1.coupon_code,
          new Date().toISOString()
        ],
        function(err) {
          if (err) {
            console.error('Order 1 insertion failed:', err);
            db.run('ROLLBACK');
            return;
          }
          
          const pointsEarned = Math.floor(orderPayload1.total / 10);
          db.run(
            `UPDATE customers SET loyalty_points = MAX(0, loyalty_points - ? + ?) WHERE id = ?`,
            [orderPayload1.redeemed_points, pointsEarned, orderPayload1.customer_id],
            (err) => {
              if (err) {
                console.error('Customer update failed:', err);
                db.run('ROLLBACK');
                return;
              }

              db.run('COMMIT', (err) => {
                if (err) {
                  console.error('Commit failed:', err);
                  db.run('ROLLBACK');
                  return;
                }

                db.get(`SELECT * FROM customers WHERE id = 9999`, (err, customerAfter1) => {
                  console.log('Customer after Order 1 (expected loyalty_points = 112):', customerAfter1);

                  // 3. Simulate order creation where points are redeemed
                  // Current balance: 112 points.
                  // Redeemed points: 50.
                  // Total of new order: 100.
                  // Points earned on new order (10% of 100): 10 points.
                  // Expected new balance: 112 - 50 + 10 = 72 points.
                  const orderPayload2 = {
                    session_id: 1,
                    table_id: null,
                    customer_id: 9999,
                    items: JSON.stringify([{ name: 'Filter Coffee', price: 55, quantity: 2 }]),
                    subtotal: 110.0,
                    tax: 8.8,
                    discount_amount: 50.0,
                    total: 68.8,
                    status: 'Paid',
                    payment_method: 'Cash',
                    payment_status: 'Paid',
                    coupon_code: null,
                    redeemed_points: 50
                  };

                  console.log('\n--- Simulating Order 2 (Redeem & Earn Points) ---');
                  db.run('BEGIN TRANSACTION');
                  db.run(
                    `INSERT INTO orders (session_id, table_id, customer_id, items, subtotal, tax, discount_amount, total, status, payment_method, payment_status, coupon_code, created_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                      orderPayload2.session_id,
                      orderPayload2.table_id,
                      orderPayload2.customer_id,
                      orderPayload2.items,
                      orderPayload2.subtotal,
                      orderPayload2.tax,
                      orderPayload2.discount_amount,
                      orderPayload2.total,
                      orderPayload2.status,
                      orderPayload2.payment_method,
                      orderPayload2.payment_status,
                      orderPayload2.coupon_code,
                      new Date().toISOString()
                    ],
                    function(err) {
                      if (err) {
                        console.error('Order 2 insertion failed:', err);
                        db.run('ROLLBACK');
                        return;
                      }

                      const pointsEarned = Math.floor(orderPayload2.total / 10);
                      db.run(
                        `UPDATE customers SET loyalty_points = MAX(0, loyalty_points - ? + ?) WHERE id = ?`,
                        [orderPayload2.redeemed_points, pointsEarned, orderPayload2.customer_id],
                        (err) => {
                          if (err) {
                            console.error('Customer update failed:', err);
                            db.run('ROLLBACK');
                            return;
                          }

                          db.run('COMMIT', (err) => {
                            if (err) {
                              console.error('Commit failed:', err);
                              db.run('ROLLBACK');
                              return;
                            }

                            db.get(`SELECT * FROM customers WHERE id = 9999`, (err, customerAfter2) => {
                              console.log('Customer after Order 2 (expected loyalty_points = 68):', customerAfter2);
                              
                              // Clean up
                              db.run(`DELETE FROM orders WHERE customer_id = 9999`);
                              db.run(`DELETE FROM customers WHERE id = 9999`);
                              console.log('\nTests completed successfully!');
                              db.close();
                            });
                          });
                        }
                      );
                    }
                  );
                });
              });
            }
          );
        }
      );
    });
  });
}
