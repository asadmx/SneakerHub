/**
 * SneakerHub Backend Server
 * Handles authentication and order tracking (ORD-1)
 *
 * Tech Stack:
 * - Node.js + Express
 * - SQLite for database
 * - JWT for authentication
 */

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Secret key for JWT (In production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// -----------------------------
// Frontend serving (IMPORTANT)
// -----------------------------
const FRONTEND_DIR = path.join(__dirname, 'src'); // your repo uses /src for frontend
const FRONTEND_ENTRY = process.env.FRONTEND_ENTRY || 'order-tracking.HTML'; // you can change later

// Middleware
app.use(cors()); // ok to keep; if you want stricter later, we can lock origin
app.use(express.json());

// Serve static frontend files
app.use(express.static(FRONTEND_DIR));

// Root route loads the UI
app.get('/', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, FRONTEND_ENTRY));
});

// -----------------------------
// Database setup
// -----------------------------
// Use DB_PATH if provided (helpful on Render / production)
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'sneakerhub.db');

// Ensure directory exists if DB_PATH points to a folder
try {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
} catch (_) {}

// Initialize SQLite Database
const db = new Database(DB_PATH);

/**
 * Initialize database tables
 * Creates necessary tables if they don't exist
 */
function initializeDatabase() {
  db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

  db.exec(`
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            orderId TEXT UNIQUE NOT NULL,
            userId INTEGER NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('Processing', 'Shipped', 'Delivered', 'Cancelled')),
            totalAmount REAL NOT NULL,
            orderDate DATETIME DEFAULT CURRENT_TIMESTAMP,
            statusUpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            estimatedDelivery DATETIME,
            trackingNumber TEXT,
            shippingName TEXT NOT NULL,
            shippingStreet TEXT NOT NULL,
            shippingCity TEXT NOT NULL,
            shippingState TEXT NOT NULL,
            shippingZipCode TEXT NOT NULL,
            FOREIGN KEY (userId) REFERENCES users(id)
        )
    `);

  db.exec(`
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            orderId TEXT NOT NULL,
            productId TEXT NOT NULL,
            name TEXT NOT NULL,
            size INTEGER NOT NULL,
            price REAL NOT NULL,
            quantity INTEGER NOT NULL,
            FOREIGN KEY (orderId) REFERENCES orders(orderId)
        )
    `);

  console.log('✅ Database initialized successfully');
}

// Optional: seed demo data so the deployed site is usable immediately
function seedDemoDataIfEmpty() {
  const seedEnabled = (process.env.SEED_DEMO || 'true').toLowerCase() !== 'false';
  if (!seedEnabled) return;

  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount > 0) return;

  const demoEmail = process.env.DEMO_EMAIL || 'demo@sneakerhub.com';
  const demoPassword = process.env.DEMO_PASSWORD || 'password123';
  const hashed = bcrypt.hashSync(demoPassword, 10);

  const insertUser = db.prepare('INSERT INTO users (email, password) VALUES (?, ?)');
  const result = insertUser.run(demoEmail, hashed);
  const demoUserId = result.lastInsertRowid;

  const orderId = `ORD-DEMO-${Date.now()}`;
  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);

  db.prepare(`
    INSERT INTO orders (
      orderId, userId, status, totalAmount,
      estimatedDelivery, shippingName, shippingStreet,
      shippingCity, shippingState, shippingZipCode
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    orderId,
    demoUserId,
    'Shipped',
    299.99,
    estimatedDelivery.toISOString(),
    'Demo User',
    '123 Demo St',
    'Toronto',
    'ON',
    'M1M 1M1'
  );

  const insertItem = db.prepare(`
    INSERT INTO order_items (orderId, productId, name, size, price, quantity)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertItem.run(orderId, 'SKU-DEMO-1', 'Air Demo Runner', 10, 299.99, 1);

  console.log('✅ Seeded demo user + demo order');
  console.log(`   Demo Login: ${demoEmail} / ${demoPassword}`);
}

// Initialize database on server start
initializeDatabase();
seedDemoDataIfEmpty();

/**
 * Middleware: Authenticate JWT token
 */
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

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) return res.status(409).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = db.prepare('INSERT INTO users (email, password) VALUES (?, ?)').run(email, hashedPassword);

    const token = jwt.sign({ userId: result.lastInsertRowid, email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ message: 'User registered successfully', token, user: { email } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ message: 'Login successful', token, user: { email: user.email } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ============================================
// ORDER ENDPOINTS
// ============================================

app.get('/api/orders', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;

    const orders = db.prepare(`
      SELECT * FROM orders
      WHERE userId = ? AND status != 'Cancelled'
      ORDER BY orderDate DESC
    `).all(userId);

    const ordersWithItems = orders.map(order => {
      const items = db.prepare(`
        SELECT productId, name, size, price, quantity
        FROM order_items
        WHERE orderId = ?
      `).all(order.orderId);

      return {
        orderId: order.orderId,
        status: order.status,
        totalAmount: order.totalAmount,
        orderDate: order.orderDate,
        statusUpdatedAt: order.statusUpdatedAt,
        estimatedDelivery: order.estimatedDelivery,
        trackingNumber: order.trackingNumber,
        shippingAddress: {
          name: order.shippingName,
          street: order.shippingStreet,
          city: order.shippingCity,
          state: order.shippingState,
          zipCode: order.shippingZipCode
        },
        items
      };
    });

    res.json({ orders: ordersWithItems });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.get('/api/orders/history', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;

    const orders = db.prepare(`
      SELECT * FROM orders
      WHERE userId = ?
      ORDER BY orderDate DESC
    `).all(userId);

    const ordersWithItems = orders.map(order => {
      const items = db.prepare(`
        SELECT productId, name, size, price, quantity
        FROM order_items
        WHERE orderId = ?
      `).all(order.orderId);

      return {
        orderId: order.orderId,
        status: order.status,
        totalAmount: order.totalAmount,
        orderDate: order.orderDate,
        statusUpdatedAt: order.statusUpdatedAt,
        estimatedDelivery: order.estimatedDelivery,
        trackingNumber: order.trackingNumber,
        shippingAddress: {
          name: order.shippingName,
          street: order.shippingStreet,
          city: order.shippingCity,
          state: order.shippingState,
          zipCode: order.shippingZipCode
        },
        items
      };
    });

    res.json({ orders: ordersWithItems });
  } catch (error) {
    console.error('Error fetching order history:', error);
    res.status(500).json({ error: 'Failed to fetch order history' });
  }
});

app.get('/api/orders/:orderId', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const { orderId } = req.params;

    const order = db.prepare(`
      SELECT * FROM orders
      WHERE orderId = ? AND userId = ?
    `).get(orderId, userId);

    if (!order) return res.status(404).json({ error: 'Order not found' });

    const items = db.prepare(`
      SELECT productId, name, size, price, quantity
      FROM order_items
      WHERE orderId = ?
    `).all(orderId);

    res.json({
      order: {
        orderId: order.orderId,
        status: order.status,
        totalAmount: order.totalAmount,
        orderDate: order.orderDate,
        statusUpdatedAt: order.statusUpdatedAt,
        estimatedDelivery: order.estimatedDelivery,
        trackingNumber: order.trackingNumber,
        shippingAddress: {
          name: order.shippingName,
          street: order.shippingStreet,
          city: order.shippingCity,
          state: order.shippingState,
          zipCode: order.shippingZipCode
        },
        items
      }
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

app.post('/api/orders', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const { items, shippingAddress, totalAmount } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    if (!shippingAddress || !shippingAddress.name || !shippingAddress.street) {
      return res.status(400).json({ error: 'Complete shipping address is required' });
    }

    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);

    db.prepare(`
      INSERT INTO orders (
        orderId, userId, status, totalAmount,
        estimatedDelivery, shippingName, shippingStreet,
        shippingCity, shippingState, shippingZipCode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderId,
      userId,
      'Processing',
      totalAmount,
      estimatedDelivery.toISOString(),
      shippingAddress.name,
      shippingAddress.street,
      shippingAddress.city,
      shippingAddress.state,
      shippingAddress.zipCode
    );

    const insertItem = db.prepare(`
      INSERT INTO order_items (orderId, productId, name, size, price, quantity)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    items.forEach(item => {
      insertItem.run(
        orderId,
        item.productId || item.id,
        item.name,
        item.size,
        item.price,
        item.quantity
      );
    });

    res.status(201).json({
      message: 'Order placed successfully',
      orderId,
      status: 'Processing',
      estimatedDelivery: estimatedDelivery.toISOString()
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.patch('/api/orders/:orderId/status', authenticateToken, (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatuses = ['Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    let trackingNumber = null;
    if (status === 'Shipped') {
      trackingNumber = `TRK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    }

    const result = db.prepare(`
      UPDATE orders
      SET status = ?,
          statusUpdatedAt = CURRENT_TIMESTAMP,
          trackingNumber = COALESCE(?, trackingNumber)
      WHERE orderId = ?
    `).run(status, trackingNumber, orderId);

    if (result.changes === 0) return res.status(404).json({ error: 'Order not found' });

    res.json({ message: 'Order status updated successfully', orderId, status, trackingNumber });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

app.delete('/api/orders/:orderId', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const { orderId } = req.params;

    const order = db.prepare(`
      SELECT * FROM orders
      WHERE orderId = ? AND userId = ?
    `).get(orderId, userId);

    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.status !== 'Processing') {
      return res.status(400).json({
        error: `Cannot cancel order. Only orders in "Processing" status can be cancelled. Current status: ${order.status}`
      });
    }

    const result = db.prepare(`
      UPDATE orders
      SET status = 'Cancelled',
          statusUpdatedAt = CURRENT_TIMESTAMP
      WHERE orderId = ? AND userId = ?
    `).run(orderId, userId);

    if (result.changes === 0) return res.status(404).json({ error: 'Order not found or could not be cancelled' });

    res.json({ message: 'Order cancelled successfully', orderId, status: 'Cancelled' });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'SneakerHub API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 SneakerHub Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 Server running on: http://localhost:${PORT}
🗄️  Database: ${DB_PATH}
🧩 Frontend: ${FRONTEND_DIR} (entry: ${FRONTEND_ENTRY})
🔐 JWT Secret: ${JWT_SECRET === 'your-secret-key-change-in-production' ? '⚠️ Using default (change in production!)' : '✅ Custom secret configured'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});

module.exports = app;
