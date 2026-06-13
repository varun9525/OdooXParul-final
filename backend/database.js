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
    // Create Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL
      )
    `);

    // Create Products table
    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        category TEXT NOT NULL,
        image TEXT,
        description TEXT,
        stock INTEGER NOT NULL DEFAULT 50
      )
    `);

    // Create Orders table
    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        items TEXT NOT NULL,
        subtotal REAL NOT NULL,
        tax REAL NOT NULL,
        total REAL NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    // Seed users
    const hashPassword = (password) => bcrypt.hashSync(password, 10);
    const users = [
      ['admin', hashPassword('admin123'), 'manager'],
      ['cashier', hashPassword('cashier123'), 'cashier'],
      ['customer', hashPassword('customer123'), 'customer']
    ];

    users.forEach(([username, password, role]) => {
      db.run(
        `INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)`,
        [username, password, role]
      );
    });

    // Seed products
    const products = [
      [
        'Espresso',
        3.50,
        'coffee',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDPYENZEOUTzNv00QqWVKrixCrDScG2zUzek7vhY6tzRDBnToCsnm50xeKOddgD6RgIbSGNK_FgOH1ACHlRGZmVnVNiUVC71FFKOgST3CbN_B0j5FZdA0KM7ui0_wkTXAVWil6mY3sUn0q08DhQUg-C-rDSh9-B-Aw928G4-saqj8ZGywro1li3uGh3NKvamzTlodw8YHBenA5qqcW7-ZvjTZqETM22X4LyOMHVrOsZHa-smXdNFS7f',
        'Double shot, robust, perfect crema',
        40
      ],
      [
        'Flat White',
        4.75,
        'coffee',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuC3B-BZa_fjHFcbwbM7LsH2KBpB9n5OTeqBcD9g_tsq0nTVMFUgmmfCe_R4km8cypumCg8W7DyfSM3uWyMyIpKM7QvJHS34jptEbTwPNm4mRAkJyBZCiT5Jg01ePwXZzPPsV439b9_2ZtS-dkoCuh9V4vaPL-Srg0GcWrZyH9OcREoiVqTq_Ij8cvzOZkDERHVRZXhyJ2EdrQmZ--XWDq0AbcRenMhBelOfxxdPWaYdXyeEjCfSNDNU',
        'Double espresso with silky microfoam',
        25
      ],
      [
        'Cappuccino',
        4.50,
        'coffee',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBHePw8yX5uVth0ot4CG9BLbjS-DqNTcrdnNFvmMXjfzV6VCgMKQP-lF21wLnhqUM8DOKnntVL2fOn9VlcdNr_3W26Ml6fdLnnfeED9fntlRZNoKjkBkxEkPZiTRJahSIg7ZkuMv7VRUynIV0TZpzLXNW4HMkuZCh9hYMO8XobwD1GfFNe-h7YDC3yrWiPmPfCzPU0e-X1gixsGEB4A7wIV1lOA0dA0NnJuZ_Tp_n_A0GQg8LxxoRSL',
        'Steamed milk, foam, and chocolate dusting',
        30
      ],
      [
        'Cold Brew',
        5.25,
        'coffee',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBlS8s2eRakUTc8b51LHfhiXWosC_AU74D31StkaLLtMz_gygS2U5_E1Z6ASoQk7UQKklLEyHJJsYSBp95L8jRo_HqXPIcR7sH_-Medctsb17RfPVQwUqg8UKH73rMVbSLVlcJiq_YUboJAmzqLJLLD0yvTvtx97RN5MBTYNCOW_tL3YVO9_c6Xxl2J_Q5x6GxEzzSI_7CMfMH28EJOa-QDU-LL0u6YD5-0vR2lj8JTVkIM_kEH-gmA',
        '12-hour steeped, smooth and rich',
        50
      ],
      [
        'Matcha Latte',
        5.50,
        'tea',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuATAtFXQVfoCAQqRByhxXJI9d9SyHkCU-eaEV8sJxTmrs9XmDr4vlEq7rzvUY639o6Sj6dKXmEQ3qUcakaUkdnJ3qUId6m3tTITdzHXCN32WOuINjqMCuIL71GSlKc2us9AJWa008aCYOdWKcU3YpVsJ6ZhFEWAc8kMCdXwUGQkbCHD09GJ07hWXgyM4hEP4_5XmhuS8es0GZ2rBmzRiSNse7O6tm19HVC4YGWX6lPz4UfsTimB_nbC',
        'Ceremonial grade matcha whisked with steamed milk',
        20
      ],
      [
        'Earl Grey Tea',
        4.00,
        'tea',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAAMR1OVh19TwdtvmkWlkawSkAjhkxqRx4oifPoM-d7d1dSzRmZE7trtRxEqtc3JlMfBJW2HDutX64HMgewoyvN7sAnkmbhFzjya2TDA896jqJtpDxu-Qhtf-7EDRfFCvz-vvqg-43PHJobewHyjwNsymKdMAXkqWKV0N13Qt1x9s0cfz1_synHytt40BE9bsNZ01Z-LFqQ4-cnZhQDQknci2C47kP0uyIfQEgPwtIYFiLXU1HTpDEE',
        'Traditional black tea with bergamot and lemon slice',
        18
      ],
      [
        'Butter Croissant',
        3.25,
        'pastry',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDahgV76-JXyjjbf_qngrxuixedSlkiKTjL6yaCJwmQXRBGMBl-LxiPCdEKGz25aGpyWUhqkZusiQwZTRcduJ319wWJu9q5p54bnTDnihEHahomkMvJFlI9qx_xNCEuoPUOh1tLgD-auGhNbY9kx6WxrAruAkqrO6plhy7DoBYYszX_q0lAlJIOgoXlxrhFZBPp_z4uAXdlZxWP5cvnJ_VH3ZEMJhNu1gV64x5I2FjPM3EFMKhb1Ey3',
        'Hand-rolled flaky butter croissant',
        3
      ],
      [
        'Pain au Chocolat',
        3.95,
        'pastry',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDU4wHQDtM86p0cfgygggCBIg3rHthFOzuO64TKyETXi-5LdMrLW-NBdZA91rwP0LghajPzz7RRwsgidwOfIuLiOn53VlK4oAMNN9m2Iwdbgsz-hhww8saSed650lszSu6I3yDVwtSEeMuA0JIUJgoyI-fGnrv91kDxn3GzZ5qa0eNtXXPrQoC3CMCVkzenk89Pl8--z-rBZxWrgPuQgXBIYhmg2CYofrFe7xm8qTw0zQ01r-b5gLl5',
        'Flaky French pastry with rich dark chocolate center',
        10
      ],
      [
        'Glazed Donut',
        3.25,
        'pastry',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDAiXDR2BLoIhrG4RjC6sykELevXs8S48A3D1VQGaCaJivVmheb7bwH6tZKFxGin1sTReBm7MApyQGrG0ZMo_rbJiTj86MYIHUL4rAbKHadoa3-kNjrrxaOY-jzaBLwWGjOZ-JNQ7SMNkK7Kkv7d3BOaedjP4au2-xnZgXLXfOHQAfB9iUuxvWzcGMSG-_0XM-EtWxwSp8oH4izL9MzYQvHqKMTFmdpqGqy07uNYJ1q88zncV7rKL_z',
        'Vanilla bean glazed yeast donut',
        15
      ],
      [
        'Avocado Toast',
        12.00,
        'lunch',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDcAtEb5r9vTcFIh0aBkQrNk6BUDKIa8e04MdJsht1OJgAH7OcupJWkOuC4hHJ3fagDSSEBTbTAKnyOMbCgCip4cc9qDfcH3pOsBL3ypRnVfUyQPTeRX04rG-PJn3HsOZw4LSJragRMhAwqL5hO18xzo-56tOyuXsaivAYxaeVvuhcZP-j1S3OKCBecaqPOcjbyMKzEkgSlCKL1Lf6yuyDyZk7J4Oj-PUKcHVfMbuV_0EpUuZVFxgOz',
        'Gourmet toast on thick artisanal sourdough bread',
        12
      ]
    ];

    products.forEach(([name, price, category, image, description, stock]) => {
      db.run(
        `INSERT OR IGNORE INTO products (name, price, category, image, description, stock) VALUES (?, ?, ?, ?, ?, ?)`,
        [name, price, category, image, description, stock]
      );
    });

    // Seed some initial orders for the dashboard view
    const initialOrders = [
      [
        JSON.stringify([{ name: 'Flat White', price: 4.75, quantity: 2 }, { name: 'Pain au Chocolat', price: 3.95, quantity: 1 }]),
        13.45,
        1.08,
        14.53,
        'Paid',
        new Date(Date.now() - 2 * 60 * 1000).toISOString()
      ],
      [
        JSON.stringify([{ name: 'Espresso', price: 3.50, quantity: 1 }]),
        3.50,
        0.28,
        3.78,
        'Paid',
        new Date(Date.now() - 15 * 60 * 1000).toISOString()
      ],
      [
        JSON.stringify([{ name: 'Avocado Toast', price: 12.00, quantity: 2 }, { name: 'Matcha Latte', price: 5.50, quantity: 2 }]),
        35.00,
        2.80,
        37.80,
        'Pending',
        new Date(Date.now() - 42 * 60 * 1000).toISOString()
      ]
    ];

    db.get("SELECT COUNT(*) as count FROM orders", (err, row) => {
      if (row && row.count === 0) {
        initialOrders.forEach(([items, subtotal, tax, total, status, created_at]) => {
          db.run(
            `INSERT INTO orders (items, subtotal, tax, total, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
            [items, subtotal, tax, total, status, created_at]
          );
        });
      }
    });
  });
}

export default db;
