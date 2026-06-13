import express from 'express';
import db from '../../database.js';
import { authenticateJWT, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

export default function(io) {
  // Get all orders (including draft and KDS active orders)
  router.get('/orders', (req, res) => {
    db.all('SELECT * FROM orders ORDER BY id DESC', [], (err, orderRows) => {
      if (err) return res.status(500).json({ error: err.message });
      
      db.all('SELECT * FROM order_items', [], (err, itemRows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const itemsByOrderId = {};
        itemRows.forEach(item => {
          if (!itemsByOrderId[item.order_id]) {
            itemsByOrderId[item.order_id] = [];
          }
          itemsByOrderId[item.order_id].push({
            name: item.name,
            price: item.price,
            quantity: item.quantity
          });
        });
        
        const formatted = orderRows.map(order => ({
          ...order,
          items: itemsByOrderId[order.id] || []
        }));
        
        res.json(formatted);
      });
    });
  });

  // Get active kitchen orders
  router.get('/orders/kitchen', (req, res) => {
    db.all("SELECT * FROM orders WHERE status IN ('To Cook', 'Preparing', 'Completed') ORDER BY id DESC", [], (err, orderRows) => {
      if (err) return res.status(500).json({ error: err.message });
      
      db.all('SELECT * FROM order_items', [], (err, itemRows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const itemsByOrderId = {};
        itemRows.forEach(item => {
          if (!itemsByOrderId[item.order_id]) {
            itemsByOrderId[item.order_id] = [];
          }
          itemsByOrderId[item.order_id].push({
            name: item.name,
            price: item.price,
            quantity: item.quantity
          });
        });
        
        const formatted = orderRows.map(order => ({
          ...order,
          items: itemsByOrderId[order.id] || []
        }));
        
        res.json(formatted);
      });
    });
  });

  // Create/Draft Order
  router.post('/orders', (req, res) => {
    const { session_id, table_id, customer_id, items, subtotal, tax, discount_amount, total, status, payment_method, payment_status, coupon_code, redeemed_points } = req.body;
    const createdAt = new Date().toISOString();
    const payStatus = payment_status || (status === 'Paid' ? 'Paid' : 'Pending');
    const isSettled = (status === 'Paid' || payStatus === 'Paid');

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");
      db.run(
        `INSERT INTO orders (session_id, table_id, customer_id, items, subtotal, tax, discount_amount, total, status, payment_method, payment_status, coupon_code, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [session_id || 1, table_id, customer_id, '[]', subtotal, tax, discount_amount || 0.0, total, status || 'Draft', payment_method, payStatus, coupon_code, createdAt],
        function (err) {
          if (err) {
            db.run("ROLLBACK");
            return res.status(500).json({ error: err.message });
          }
          const newOrderId = this.lastID;

          // Insert order items relationally
          let itemInsertError = null;
          const insertStmt = db.prepare(`INSERT INTO order_items (order_id, name, price, quantity) VALUES (?, ?, ?, ?)`);
          
          items.forEach((item) => {
            insertStmt.run([newOrderId, item.name, item.price, item.quantity], (runErr) => {
              if (runErr) itemInsertError = runErr;
            });
          });

          insertStmt.finalize(() => {
            if (itemInsertError) {
              db.run("ROLLBACK");
              return res.status(500).json({ error: itemInsertError.message });
            }

            // If table is linked, update table status
            if (table_id) {
              const tableStatus = isSettled ? 'Inactive' : 'Active';
              const linkedOrderId = isSettled ? null : newOrderId;
              db.run(`UPDATE tables SET status = ?, active_order_id = ? WHERE id = ?`, [tableStatus, linkedOrderId, table_id], (tableErr) => {
                if (tableErr) console.error('Table sync error:', tableErr);
              });
            }

            // Decrement stock if Paid
            if (isSettled) {
              items.forEach((item) => {
                db.run(
                  `UPDATE products SET stock = MAX(0, stock - ?) WHERE name = ?`,
                  [item.quantity, item.name],
                  (updateErr) => {
                    if (updateErr) console.error(updateErr);
                    db.get(`SELECT name, stock FROM products WHERE name = ?`, [item.name], (err, product) => {
                      if (product && product.stock <= 10) {
                        io.emit('inventory_alert', { name: product.name, stock: product.stock });
                      }
                    });
                  }
                );
              });
            }

            // Update loyalty points
            if (customer_id && isSettled) {
              const pointsEarned = Math.floor(total / 10);
              db.run(
                `UPDATE customers SET loyalty_points = MAX(0, loyalty_points - ? + ?) WHERE id = ?`,
                [redeemed_points || 0, pointsEarned, customer_id],
                (loyaltyErr) => {
                  if (loyaltyErr) console.error('Loyalty points update error:', loyaltyErr);
                }
              );
            }

            db.run("COMMIT", (commitErr) => {
              if (commitErr) {
                db.run("ROLLBACK");
                return res.status(500).json({ error: commitErr.message });
              }
              
              const createdOrder = {
                id: newOrderId,
                session_id,
                table_id,
                customer_id,
                items,
                subtotal,
                tax,
                discount_amount,
                total,
                status: status || 'Draft',
                payment_method,
                payment_status: payStatus,
                coupon_code,
                created_at: createdAt
              };

              io.emit('new_order', createdOrder);
              res.status(201).json(createdOrder);
            });
          });
        }
      );
    });
  });

  // Update Order status / Edit Order
  router.put('/orders/:id', authenticateJWT, authorizeRoles('manager', 'cashier'), (req, res) => {
    const { status, items, subtotal, tax, discount_amount, total, payment_method, payment_status, coupon_code, redeemed_points, customer_id } = req.body;
    const id = req.params.id;
    const payStatus = payment_status || (status === 'Paid' ? 'Paid' : 'Pending');
    const isSettled = (status === 'Paid' || payStatus === 'Paid');

    if (items) {
      db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        db.run(
          `UPDATE orders SET subtotal = ?, tax = ?, discount_amount = ?, total = ?, status = ?, payment_method = ?, payment_status = ?, coupon_code = ? WHERE id = ?`,
          [subtotal, tax, discount_amount, total, status, payment_method, payStatus, coupon_code, id],
          function (err) {
            if (err) {
              db.run("ROLLBACK");
              return res.status(500).json({ error: err.message });
            }

            // Delete existing items
            db.run(`DELETE FROM order_items WHERE order_id = ?`, [id], (delErr) => {
              if (delErr) {
                db.run("ROLLBACK");
                return res.status(500).json({ error: delErr.message });
              }

              // Insert new items
              let itemInsertError = null;
              const insertStmt = db.prepare(`INSERT INTO order_items (order_id, name, price, quantity) VALUES (?, ?, ?, ?)`);
              
              items.forEach((item) => {
                insertStmt.run([id, item.name, item.price, item.quantity], (runErr) => {
                  if (runErr) itemInsertError = runErr;
                });
              });

              insertStmt.finalize(() => {
                if (itemInsertError) {
                  db.run("ROLLBACK");
                  return res.status(500).json({ error: itemInsertError.message });
                }

                // Sync table status
                db.get(`SELECT table_id FROM orders WHERE id = ?`, [id], (err, order) => {
                  if (order && order.table_id) {
                    const tableStatus = isSettled ? 'Inactive' : 'Active';
                    const linkedOrderId = isSettled ? null : id;
                    db.run(`UPDATE tables SET status = ?, active_order_id = ? WHERE id = ?`, [tableStatus, linkedOrderId, order.table_id]);
                  }
                });

                // Decrement stock if Paid
                if (isSettled) {
                  items.forEach((item) => {
                    db.run(`UPDATE products SET stock = MAX(0, stock - ?) WHERE name = ?`, [item.quantity, item.name]);
                  });
                }

                // Update loyalty points
                if (customer_id && isSettled) {
                  const pointsEarned = Math.floor(total / 10);
                  db.run(
                    `UPDATE customers SET loyalty_points = MAX(0, loyalty_points - ? + ?) WHERE id = ?`,
                    [redeemed_points || 0, pointsEarned, customer_id]
                  );
                }

                db.run("COMMIT", (commitErr) => {
                  if (commitErr) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: commitErr.message });
                  }

                  io.emit('order_updated', { id: parseInt(id), status, payment_status: payStatus });
                  res.json({ success: true });
                });
              });
            });
          }
        );
      });
    } else {
      // Basic status update (e.g. KDS/Payment confirmation)
      db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        db.get(`SELECT * FROM orders WHERE id = ?`, [id], (err, oldOrder) => {
          if (!oldOrder) {
            db.run("ROLLBACK");
            return res.status(404).json({ error: 'Order not found' });
          }

          const targetStatus = status || oldOrder.status;
          const targetPayStatus = payment_status || (status === 'Paid' ? 'Paid' : oldOrder.payment_status);
          const targetCoupon = coupon_code || oldOrder.coupon_code;
          const targetCustomer = customer_id || oldOrder.customer_id;
          const isSettled = (targetStatus === 'Paid' || targetPayStatus === 'Paid');

          db.run(
            `UPDATE orders SET status = ?, payment_status = ?, coupon_code = ? WHERE id = ?`,
            [targetStatus, targetPayStatus, targetCoupon, id],
            function (err) {
              if (err) {
                db.run("ROLLBACK");
                return res.status(500).json({ error: err.message });
              }

              // Sync table status
              if (oldOrder.table_id) {
                const tableStatus = isSettled ? 'Inactive' : 'Active';
                const linkedOrderId = isSettled ? null : id;
                db.run(`UPDATE tables SET status = ?, active_order_id = ? WHERE id = ?`, [tableStatus, linkedOrderId, oldOrder.table_id]);
              }

              // Decrement stock if just became paid
              const wasPaid = (oldOrder.status === 'Paid' || oldOrder.payment_status === 'Paid');
              if (isSettled && !wasPaid) {
                db.all(`SELECT name, quantity FROM order_items WHERE order_id = ?`, [id], (err, itemsRows) => {
                  if (itemsRows) {
                    itemsRows.forEach((item) => {
                      db.run(`UPDATE products SET stock = MAX(0, stock - ?) WHERE name = ?`, [item.quantity, item.name]);
                    });
                  }
                });

                // Award / Redeem loyalty points
                if (targetCustomer) {
                  const pointsEarned = Math.floor(oldOrder.total / 10);
                  db.run(
                    `UPDATE customers SET loyalty_points = MAX(0, loyalty_points - ? + ?) WHERE id = ?`,
                    [redeemed_points || 0, pointsEarned, targetCustomer]
                  );
                }
              }

              db.run("COMMIT", (commitErr) => {
                if (commitErr) {
                  db.run("ROLLBACK");
                  return res.status(500).json({ error: commitErr.message });
                }

                io.emit('order_updated', { id: parseInt(id), status: targetStatus, payment_status: targetPayStatus });
                res.json({ success: true });
              });
            }
          );
        });
      });
    }
  });

  // Send order to Kitchen Display System (sets order status to 'To Cook')
  router.post('/orders/:id/kitchen', authenticateJWT, authorizeRoles('manager', 'cashier'), (req, res) => {
    const { id } = req.params;
    db.run(`UPDATE orders SET status = 'To Cook' WHERE id = ?`, [id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      
      db.get(`SELECT * FROM orders WHERE id = ?`, [id], (err, order) => {
        if (order) {
          db.all(`SELECT name, price, quantity FROM order_items WHERE order_id = ?`, [id], (err, itemsRows) => {
            const formatted = { 
              ...order, 
              items: itemsRows || [] 
            };
            io.emit('kitchen_order', formatted);
          });
        }
      });
      
      res.json({ success: true });
    });
  });

  // Update order stage in Kitchen (To Cook -> Preparing -> Completed)
  router.put('/orders/:id/kitchen-stage', (req, res) => {
    const { stage } = req.body; // 'Preparing' or 'Completed'
    const { id } = req.params;
    db.run(`UPDATE orders SET status = ? WHERE id = ?`, [stage, id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      io.emit('kitchen_stage_updated', { id: parseInt(id), stage });
      res.json({ success: true });
    });
  });

  return router;
}
