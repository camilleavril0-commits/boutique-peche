import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const databasePath = path.resolve(process.env.DATABASE_PATH ?? "server/data/app.db");

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new DatabaseSync(databasePath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    stripe_session_id TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    total_amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'xaf',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paid_at TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    unit_price INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS admin_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    session_token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
  );
`);

export function getDatabase() {
  return db;
}

export function createCustomer({ name, phone }) {
  const statement = db.prepare(`
    INSERT INTO customers (name, phone)
    VALUES (?, ?)
    RETURNING id, name, phone, created_at
  `);

  return statement.get(name, phone);
}

export function createOrder({ customerId, totalAmount, items }) {
  const insertOrder = db.prepare(`
    INSERT INTO orders (customer_id, total_amount)
    VALUES (?, ?)
    RETURNING id, customer_id, status, total_amount, currency, created_at
  `);
  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity)
    VALUES (?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    const order = insertOrder.get(customerId, totalAmount);

    for (const item of items) {
      insertItem.run(order.id, item.productId, item.productName, item.unitPrice, item.quantity);
    }

    return order;
  });

  return transaction();
}

export function attachStripeSessionToOrder({ orderId, stripeSessionId }) {
  const statement = db.prepare(`
    UPDATE orders
    SET stripe_session_id = ?
    WHERE id = ?
  `);

  statement.run(stripeSessionId, orderId);
}

export function markOrderPaidByStripeSessionId(stripeSessionId) {
  const statement = db.prepare(`
    UPDATE orders
    SET status = 'paid',
        paid_at = CURRENT_TIMESTAMP
    WHERE stripe_session_id = ?
  `);

  statement.run(stripeSessionId);
}

export function findOrderByStripeSessionId(stripeSessionId) {
  const statement = db.prepare(`
    SELECT
      orders.id,
      orders.status,
      orders.total_amount,
      orders.currency,
      orders.created_at,
      orders.paid_at,
      customers.name AS customer_name,
      customers.phone AS customer_phone
    FROM orders
    INNER JOIN customers ON customers.id = orders.customer_id
    WHERE orders.stripe_session_id = ?
  `);

  return statement.get(stripeSessionId) ?? null;
}

export function upsertAdmin({ email, passwordHash }) {
  const existingAdmin = db.prepare("SELECT id, email, password_hash FROM admins WHERE email = ?").get(email);

  if (existingAdmin) {
    db.prepare("UPDATE admins SET password_hash = ? WHERE id = ?").run(passwordHash, existingAdmin.id);
    return { id: existingAdmin.id, email };
  }

  return db.prepare(`
    INSERT INTO admins (email, password_hash)
    VALUES (?, ?)
    RETURNING id, email
  `).get(email, passwordHash);
}

export function findAdminByEmail(email) {
  return db.prepare(`
    SELECT id, email, password_hash, created_at
    FROM admins
    WHERE email = ?
  `).get(email) ?? null;
}

export function createAdminSession({ adminId, tokenHash, expiresAt }) {
  return db.prepare(`
    INSERT INTO admin_sessions (admin_id, session_token_hash, expires_at)
    VALUES (?, ?, ?)
    RETURNING id, admin_id, expires_at, created_at
  `).get(adminId, tokenHash, expiresAt);
}

export function findAdminSession(tokenHash) {
  return db.prepare(`
    SELECT
      admin_sessions.id,
      admin_sessions.expires_at,
      admins.id AS admin_id,
      admins.email
    FROM admin_sessions
    INNER JOIN admins ON admins.id = admin_sessions.admin_id
    WHERE admin_sessions.session_token_hash = ?
  `).get(tokenHash) ?? null;
}

export function deleteAdminSession(tokenHash) {
  db.prepare("DELETE FROM admin_sessions WHERE session_token_hash = ?").run(tokenHash);
}

export function deleteExpiredAdminSessions() {
  db.prepare("DELETE FROM admin_sessions WHERE expires_at <= datetime('now')").run();
}

export function listCustomers() {
  return db.prepare(`
    SELECT
      customers.id,
      customers.name,
      customers.phone,
      customers.created_at,
      COUNT(orders.id) AS orders_count,
      COALESCE(SUM(CASE WHEN orders.status = 'paid' THEN orders.total_amount ELSE 0 END), 0) AS total_paid_amount
    FROM customers
    LEFT JOIN orders ON orders.customer_id = customers.id
    GROUP BY customers.id
    ORDER BY customers.created_at DESC
  `).all();
}

export function listOrders() {
  return db.prepare(`
    SELECT
      orders.id,
      orders.status,
      orders.total_amount,
      orders.currency,
      orders.created_at,
      orders.paid_at,
      orders.stripe_session_id,
      customers.name AS customer_name,
      customers.phone AS customer_phone
    FROM orders
    INNER JOIN customers ON customers.id = orders.customer_id
    ORDER BY orders.created_at DESC
  `).all();
}
