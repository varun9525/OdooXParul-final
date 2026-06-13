import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'pos.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    // 1. Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        archived INTEGER DEFAULT 0
      )
    `);

    // 2. Categories table (Name, Color)
    db.run(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        color TEXT NOT NULL
      )
    `);

    // 3. Products table (UOM, Tax, Description, Category ID)
    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        category TEXT NOT NULL,
        image TEXT,
        description TEXT,
        uom TEXT DEFAULT 'pcs',
        tax REAL DEFAULT 8.0,
        stock INTEGER NOT NULL DEFAULT 50
      )
    `);

    // 4. Payment Methods table
    db.run(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        enabled INTEGER DEFAULT 1,
        upi_id TEXT
      )
    `);

    // 5. Tables / Floor Plan table
    db.run(`
      CREATE TABLE IF NOT EXISTS tables (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_number TEXT NOT NULL,
        seats INTEGER NOT NULL,
        floor TEXT NOT NULL,
        status TEXT DEFAULT 'Inactive',
        active_order_id INTEGER
      )
    `);

    // 6. Coupons table
    db.run(`
      CREATE TABLE IF NOT EXISTS coupons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        discount_type TEXT NOT NULL, -- 'percent' or 'fixed'
        value REAL NOT NULL,
        active INTEGER DEFAULT 1
      )
    `);

    // 7. Promotions table (Automated Promotions)
    db.run(`
      CREATE TABLE IF NOT EXISTS promotions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL, -- 'product' or 'order'
        min_qty INTEGER DEFAULT 0,
        min_amount REAL DEFAULT 0.0,
        discount_type TEXT NOT NULL, -- 'percent' or 'fixed'
        value REAL NOT NULL,
        product_id INTEGER,
        active INTEGER DEFAULT 1
      )
    `);

    // 8. Customers table
    db.run(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT
      )
    `);

    // 9. Sessions table
    db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        opened_at TEXT NOT NULL,
        closed_at TEXT,
        start_balance REAL NOT NULL,
        end_balance REAL,
        status TEXT NOT NULL -- 'open' or 'closed'
      )
    `);

    // 10. Orders table
    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        table_id INTEGER,
        customer_id INTEGER,
        items TEXT NOT NULL, -- JSON string
        subtotal REAL NOT NULL,
        tax REAL NOT NULL,
        discount_amount REAL DEFAULT 0.0,
        total REAL NOT NULL,
        status TEXT NOT NULL, -- 'Draft', 'Paid', 'Cancelled'
        payment_method TEXT,
        created_at TEXT NOT NULL
      )
    `);

    // --- DATABASE SCHEMA MIGRATIONS (Self-Healing) ---
    db.run("ALTER TABLE products ADD COLUMN uom TEXT DEFAULT 'pcs'", (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Migration error products.uom:', err.message);
      }
    });
    db.run("ALTER TABLE products ADD COLUMN tax REAL DEFAULT 8.0", (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Migration error products.tax:', err.message);
      }
    });
    db.run("ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 50", (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Migration error products.stock:', err.message);
      }
    });
    db.run("ALTER TABLE tables ADD COLUMN status TEXT DEFAULT 'Inactive'", (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Migration error tables.status:', err.message);
      }
    });
    db.run("ALTER TABLE tables ADD COLUMN active_order_id INTEGER", (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Migration error tables.active_order_id:', err.message);
      }
    });
    db.run("ALTER TABLE sessions ADD COLUMN status TEXT DEFAULT 'closed'", (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Migration error sessions.status:', err.message);
      }
    });

    // --- SEED DATA ---

    // Seed Users
    const hashPassword = (password) => bcrypt.hashSync(password, 10);
    const seedUsers = [
      ['Admin Manager', 'admin', hashPassword('admin123'), 'manager'],
      ['Cashier Staff', 'cashier', hashPassword('cashier123'), 'cashier'],
      ['Customer User', 'customer', hashPassword('customer123'), 'customer']
    ];
    seedUsers.forEach(([name, username, password, role]) => {
      db.run(
        `INSERT OR IGNORE INTO users (name, username, password, role) VALUES (?, ?, ?, ?)`,
        [name, username, password, role]
      );
    });

    // Seed Categories
    const seedCategories = [
      ['Coffee', '#714B67'],
      ['Tea', '#017E84'],
      ['Pastries', '#FFD54F'],
      ['Lunch', '#F06292']
    ];
    seedCategories.forEach(([name, color]) => {
      db.run(
        `INSERT OR IGNORE INTO categories (name, color) VALUES (?, ?)`,
        [name, color]
      );
    });

    // Seed Products
    const seedProducts = [
      ['Espresso', 3.50, 'Coffee', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDPYENZEOUTzNv00QqWVKrixCrDScG2zUzek7vhY6tzRDBnToCsnm50xeKOddgD6RgIbSGNK_FgOH1ACHlRGZmVnVNiUVC71FFKOgST3CbN_B0j5FZdA0KM7ui0_wkTXAVWil6mY3sUn0q08DhQUg-C-rDSh9-B-Aw928G4-saqj8ZGywro1li3uGh3NKvamzTlodw8YHBenA5qqcW7-ZvjTZqETM22X4LyOMHVrOsZHa-smXdNFS7f', 'Double shot, robust crema', 'cup', 8.0, 40],
      ['Flat White', 4.75, 'Coffee', 'https://lh3.googleusercontent.com/aida-public/AB6AXuC3B-BZa_fjHFcbwbM7LsH2KBpB9n5OTeqBcD9g_tsq0nTVMFUgmmfCe_R4km8cypumCg8W7DyfSM3uWyMyIpKM7QvJHS34jptEbTwPNm4mRAkJyBZCiT5Jg01ePwXZzPPsV439b9_2ZtS-dkoCuh9V4vaPL-Srg0GcWrZyH9OcREoiVqTq_Ij8cvzOZkDERHVRZXhyJ2EdrQmZ--XWDq0AbcRenMhBelOfxxdPWaYdXyeEjCfSNDNU', 'Velvety microfoam latte', 'cup', 8.0, 30],
      ['Cappuccino', 4.50, 'Coffee', 'https://lh3.googleusercontent.com/aida-public/AB6AXuBHePw8yX5uVth0ot4CG9BLbjS-DqNTcrdnNFvmMXjfzV6VCgMKQP-lF21wLnhqUM8DOKnntVL2fOn9VlcdNr_3W26Ml6fdLnnfeED9fntlRZNoKjkBkxEkPZiTRJahSIg7ZkuMv7VRUynIV0TZpzLXNW4HMkuZCh9hYMO8XobwD1GfFNe-h7YDC3yrWiPmPfCzPU0e-X1gixsGEB4A7wIV1lOA0dA0NnJuZ_Tp_n_A0GQg8LxxoRSL', 'Espresso with extra foam and cocoa', 'cup', 8.0, 30],
      ['Cold Brew', 5.25, 'Coffee', 'https://lh3.googleusercontent.com/aida-public/AB6AXuBlS8s2eRakUTc8b51LHfhiXWosC_AU74D31StkaLLtMz_gygS2U5_E1Z6ASoQk7UQKklLEyHJJsYSBp95L8jRo_HqXPIcR7sH_-Medctsb17RfPVQwUqg8UKH73rMVbSLVlcJiq_YUboJAmzqLJLLD0yvTvtx97RN5MBTYNCOW_tL3YVO9_c6Xxl2J_Q5x6GxEzzSI_7CMfMH28EJOa-QDU-LL0u6YD5-0vR2lj8JTVkIM_kEH-gmA', 'Steeped for 12 hours', 'cup', 8.0, 45],
      ['Matcha Latte', 5.50, 'Tea', 'https://lh3.googleusercontent.com/aida-public/AB6AXuATAtFXQVfoCAQqRByhxXJI9d9SyHkCU-eaEV8sJxTmrs9XmDr4vlEq7rzvUY639o6Sj6dKXmEQ3qUcakaUkdnJ3qUId6m3tTITdzHXCN32WOuINjqMCuIL71GSlKc2us9AJWa008aCYOdWKcU3YpVsJ6ZhFEWAc8kMCdXwUGQkbCHD09GJ07hWXgyM4hEP4_5XmhuS8es0GZ2rBmzRiSNse7O6tm19HVC4YGWX6lPz4UfsTimB_nbC', 'Ceremonial grade matcha', 'cup', 5.0, 20],
      ['Earl Grey Tea', 4.00, 'Tea', 'https://lh3.googleusercontent.com/aida-public/AB6AXuAAMR1OVh19TwdtvmkWlkawSkAjhkxqRx4oifPoM-d7d1dSzRmZE7trtRxEqtc3JlMfBJW2HDutX64HMgewoyvN7sAnkmbhFzjya2TDA896jqJtpDxu-Qhtf-7EDRfFCvz-vvqg-43PHJobewHyjwNsymKdMAXkqWKV0N13Qt1x9s0cfz1_synHytt40BE9bsNZ01Z-LFqQ4-cnZhQDQknci2C47kP0uyIfQEgPwtIYFiLXU1HTpDEE', 'Bergamot infused black tea', 'cup', 5.0, 20],
      ['Butter Croissant', 3.25, 'Pastries', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDahgV76-JXyjjbf_qngrxuixedSlkiKTjL6yaCJwmQXRBGMBl-LxiPCdEKGz25aGpyWUhqkZusiQwZTRcduJ319wWJu9q5p54bnTDnihEHahomkMvJFlI9qx_xNCEuoPUOh1tLgD-auGhNbY9kx6WxrAruAkqrO6plhy7DoBYYszX_q0lAlJIOgoXlxrhFZBPp_z4uAXdlZxWP5cvnJ_VH3ZEMJhNu1gV64x5I2FjPM3EFMKhb1Ey3', 'Freshly baked flaky pastry', 'pcs', 10.0, 10],
      ['Pain au Chocolat', 3.95, 'Pastries', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDU4wHQDtM86p0cfgygggCBIg3rHthFOzuO64TKyETXi-5LdMrLW-NBdZA91rwP0LghajPzz7RRwsgidwOfIuLiOn53VlK4oAMNN9m2Iwdbgsz-hhww8saSed650lszSu6I3yDVwtSEeMuA0JIUJgoyI-fGnrv91kDxn3GzZ5qa0eNtXXPrQoC3CMCVkzenk89Pl8--z-rBZxWrgPuQgXBIYhmg2CYofrFe7xm8qTw0zQ01r-b5gLl5', 'Flaky pastry filled with chocolate', 'pcs', 10.0, 10],
      ['Glazed Donut', 3.25, 'Pastries', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDAiXDR2BLoIhrG4RjC6sykELevXs8S48A3D1VQGaCaJivVmheb7bwH6tZKFxGin1sTReBm7MApyQGrG0ZMo_rbJiTj86MYIHUL4rAbKHadoa3-kNjrrxaOY-jzaBLwWGjOZ-JNQ7SMNkK7Kkv7d3BOaedjP4au2-xnZgXLXfOHQAfB9iUuxvWzcGMSG-_0XM-EtWxwSp8oH4izL9MzYQvHqKMTFmdpqGqy07uNYJ1q88zncV7rKL_z', 'Traditional glazed donut', 'pcs', 10.0, 15],
      ['Avocado Toast', 12.00, 'Lunch', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDcAtEb5r9vTcFIh0aBkQrNk6BUDKIa8e04MdJsht1OJgAH7OcupJWkOuC4hHJ3fagDSSEBTbTAKnyOMbCgCip4cc9qDfcH3pOsBL3ypRnVfUyQPTeRX04rG-PJn3HsOZw4LSJragRMhAwqL5hO18xzo-56tOyuXsaivAYxaeVvuhcZP-j1S3OKCBecaqPOcjbyMKzEkgSlCKL1Lf6yuyDyZk7J4Oj-PUKcHVfMbuV_0EpUuZVFxgOz', 'Mashed avocado with egg on sourdough', 'pcs', 8.0, 12]
    ];
    seedProducts.forEach(([name, price, category, image, description, uom, tax, stock]) => {
      db.run(
        `INSERT OR IGNORE INTO products (name, price, category, image, description, uom, tax, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, price, category, image, description, uom, tax, stock]
      );
    });

    // Seed Payment Methods
    const seedPayments = [
      ['Cash', 1, null],
      ['Digital/Card', 1, null],
      ['UPI QR', 1, 'cafe@ybl']
    ];
    seedPayments.forEach(([name, enabled, upi_id]) => {
      db.run(
        `INSERT OR IGNORE INTO payment_methods (name, enabled, upi_id) VALUES (?, ?, ?)`,
        [name, enabled, upi_id]
      );
    });

    // Seed Tables / Floor Plan
    const seedTables = [
      ['1', 4, 'Ground Floor', 'Inactive', null],
      ['2', 2, 'Ground Floor', 'Inactive', null],
      ['3', 6, 'Ground Floor', 'Inactive', null],
      ['4', 4, 'First Floor', 'Inactive', null],
      ['5', 4, 'First Floor', 'Inactive', null],
      ['T1', 2, 'Terrace', 'Inactive', null]
    ];
    seedTables.forEach(([table_number, seats, floor, status, active_order_id]) => {
      db.run(
        `INSERT OR IGNORE INTO tables (table_number, seats, floor, status, active_order_id) VALUES (?, ?, ?, ?, ?)`,
        [table_number, seats, floor, status, active_order_id]
      );
    });

    // Seed Coupons
    const seedCoupons = [
      ['COFFEE10', 'percent', 10, 1],
      ['CAFE5', 'fixed', 5, 1]
    ];
    seedCoupons.forEach(([code, type, value, active]) => {
      db.run(
        `INSERT OR IGNORE INTO coupons (code, discount_type, value, active) VALUES (?, ?, ?, ?)`,
        [code, type, value, active]
      );
    });

    // Seed Promotions (Matcha Latte Buy 2 get 20% off order)
    db.run(
      `INSERT OR IGNORE INTO promotions (name, type, min_qty, min_amount, discount_type, value, product_id, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Matcha Promo', 'product', 2, 0.0, 'percent', 20, 5, 1]
    );

    // Seed Promotions (Order total > $30 gets $3 off)
    db.run(
      `INSERT OR IGNORE INTO promotions (name, type, min_qty, min_amount, discount_type, value, product_id, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Big Order Promo', 'order', 0, 30.0, 'fixed', 3.0, null, 1]
    );

    // Seed Customers
    const seedCustomers = [
      ['John Doe', 'john@example.com', '1234567890'],
      ['Jane Smith', 'jane@example.com', '9876543210']
    ];
    seedCustomers.forEach(([name, email, phone]) => {
      db.run(
        `INSERT OR IGNORE INTO customers (name, email, phone) VALUES (?, ?, ?)`,
        [name, email, phone]
      );
    });

    // Seed Active POS Session
    const openDate = new Date().toISOString();
    db.run(
      `INSERT OR IGNORE INTO sessions (id, opened_at, start_balance, status) VALUES (1, ?, 100.0, 'open')`,
      [openDate]
    );
  });
}

export default db;
