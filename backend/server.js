import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from './database.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT']
  }
});

const JWT_SECRET = 'odoo_cafe_pos_super_secret_key';

app.use(cors());
app.use(express.json());

// Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// 1. Auth Endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });

    const passwordIsValid = bcrypt.compareSync(password, user.password);
    if (!passwordIsValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, {
      expiresIn: '8h'
    });

    res.json({ token, role: user.role, username: user.username });
  });
});

// 2. Get Products
app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 3. Get Orders
app.get('/api/orders', (req, res) => {
  db.all('SELECT * FROM orders ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Parse items JSON string
    const formattedRows = rows.map(row => ({
      ...row,
      items: JSON.parse(row.items)
    }));
    
    res.json(formattedRows);
  });
});

// 4. Create Order
app.post('/api/orders', (req, res) => {
  const { items, subtotal, tax, total, status } = req.body;
  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Order items required' });
  }

  const itemsJson = JSON.stringify(items);
  const createdAt = new Date().toISOString();

  db.serialize(() => {
    db.run(
      `INSERT INTO orders (items, subtotal, tax, total, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [itemsJson, subtotal, tax, total, status || 'Paid', createdAt],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        const newOrderId = this.lastID;

        // Decrement stock and check for stock alerts
        items.forEach((item) => {
          db.run(
            `UPDATE products SET stock = MAX(0, stock - ?) WHERE name = ?`,
            [item.quantity, item.name],
            (updateErr) => {
              if (updateErr) console.error('Error updating stock:', updateErr);
              
              // Verify if stock is low now
              db.get(`SELECT name, stock FROM products WHERE name = ?`, [item.name], (err, product) => {
                if (product && product.stock <= 10) {
                  io.emit('inventory_alert', { name: product.name, stock: product.stock });
                }
              });
            }
          );
        });

        const newOrder = {
          id: newOrderId,
          items,
          subtotal,
          tax,
          total,
          status: status || 'Paid',
          created_at: createdAt
        };

        io.emit('new_order', newOrder);
        res.status(201).json(newOrder);
      }
    );
  });
});

// 5. Update Order Status
app.put('/api/orders/:id', (req, res) => {
  const { status } = req.body;
  const { id } = req.params;

  db.run(
    `UPDATE orders SET status = ? WHERE id = ?`,
    [status, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      
      io.emit('order_updated', { id: parseInt(id), status });
      res.json({ success: true, id, status });
    }
  );
});

// 6. Dashboard Stats
app.get('/api/dashboard/stats', (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  const queries = {
    todaySales: `SELECT SUM(total) as total FROM orders WHERE status = 'Paid' AND created_at LIKE '${today}%'`,
    ordersToday: `SELECT COUNT(*) as count FROM orders WHERE created_at LIKE '${today}%'`,
    stockAlerts: `SELECT * FROM products WHERE stock <= 10`,
    topProducts: `SELECT items FROM orders WHERE status = 'Paid'`
  };

  db.get(queries.todaySales, [], (err, salesRow) => {
    db.get(queries.ordersToday, [], (err, ordersRow) => {
      db.all(queries.stockAlerts, [], (err, alertRows) => {
        db.all(queries.topProducts, [], (err, orderRows) => {
          // Calculate top products
          const productCounts = {};
          orderRows.forEach(row => {
            const items = JSON.parse(row.items);
            items.forEach(item => {
              productCounts[item.name] = (productCounts[item.name] || 0) + item.quantity;
            });
          });

          let topProduct = 'None';
          let topProductSold = 0;
          Object.entries(productCounts).forEach(([name, count]) => {
            if (count > topProductSold) {
              topProduct = name;
              topProductSold = count;
            }
          });

          res.json({
            todaySales: salesRow?.total || 0,
            ordersToday: ordersRow?.count || 0,
            stockAlerts: alertRows,
            topProduct: { name: topProduct, count: topProductSold }
          });
        });
      });
    });
  });
});

// Socket.io Connection
io.on('connection', (socket) => {
  console.log('Client connected to socket:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
