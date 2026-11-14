import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID, randomBytes } from 'node:crypto';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();
const isProd = process.env.NODE_ENV === 'production';
const app = express();
const PORT = Number(process.env.PORT || 5001);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-this-secret-before-deploying';
if (isProd && (!process.env.JWT_SECRET || JWT_SECRET.length < 32)) {
  throw new Error('Set a unique JWT_SECRET of at least 32 characters before production deployment.');
}
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const SEED_PATH = path.join(__dirname, 'data', 'db.json');
const DIST_DIR = path.join(__dirname, '..', 'dist');
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:5174,http://localhost:5183,http://127.0.0.1:5173')
  .split(',').map((s) => s.trim()).filter(Boolean);

if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : process.env.TRUST_PROXY);
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'img-src': ["'self'", 'data:', 'https:'],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'connect-src': ["'self'"],
      'upgrade-insecure-requests': null,
    },
  },
}));
app.use(cors({ origin(origin, callback) {
  if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(null, false);
} }));
app.use(express.json({ limit: '1mb' }));

// ---------- JSON database ----------
let db;
let writeQueue = Promise.resolve();
async function loadDb() {
  await mkdir(DATA_DIR, { recursive: true });
  for (const file of [DB_PATH, SEED_PATH]) {
    try { db = JSON.parse(await readFile(file, 'utf8')); break; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  db ||= {};
  for (const key of ['users', 'authors', 'books', 'orders']) if (!Array.isArray(db[key])) db[key] = [];
  for (const user of db.users) user.role ||= 'customer';
  await seedAdmin();
  await persistDb();
}
function persistDb() {
  const snapshot = JSON.stringify(db, null, 2);
  const tmp = `${DB_PATH}.${process.pid}.tmp`;
  writeQueue = writeQueue.catch(() => {}).then(async () => { await writeFile(tmp, snapshot, 'utf8'); await rename(tmp, DB_PATH); });
  return writeQueue;
}
async function seedAdmin() {
  let email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  let password = process.env.ADMIN_PASSWORD || '';
  if (!email || !password) {
    if (db.users.some((u) => u.role === 'admin')) return;
    if (isProd) { console.warn('[admin] No admin account exists. Set ADMIN_EMAIL and ADMIN_PASSWORD, then restart.'); return; }
    email = 'admin@bookstack.local'; password = 'admin12345';
    console.warn('[admin] DEV ONLY: created default admin admin@bookstack.local / admin12345');
  }
  if (isProd && password.length < 10) throw new Error('ADMIN_PASSWORD must be at least 10 characters in production.');
  const existing = db.users.find((u) => u.email === email);
  if (existing) {
    existing.role = 'admin';
    if (!(await bcrypt.compare(password, existing.passwordHash))) existing.passwordHash = await bcrypt.hash(password, 12);
    return;
  }
  db.users.push({ id: randomUUID(), name: 'Administrator', email, passwordHash: await bcrypt.hash(password, 12), role: 'admin', createdAt: new Date().toISOString() });
  console.log(`[admin] Admin account ready: ${email}`);
}

// ---------- helpers ----------
const publicUser = ({ id, name, email, role, createdAt }) => ({ id, name, email, role: role || 'customer', createdAt });
const createToken = (user) => jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' });
const authRequired = (req, res, next) => {
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Please sign in to continue.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.users.find((item) => item.id === payload.sub);
    if (!user) return res.status(401).json({ message: 'Your session is no longer valid. Please sign in again.' });
    req.user = user;
    next();
  } catch { return res.status(401).json({ message: 'Your session has expired. Please sign in again.' }); }
};
const adminRequired = [authRequired, (req, res, next) =>
  req.user.role === 'admin' ? next() : res.status(403).json({ message: 'Administrator access required.' })];
const notFound = (res, label) => res.status(404).json({ message: `${label} not found.` });
const bad = (res, message, status = 400) => res.status(status).json({ message });
const text = (value) => typeof value === 'string' ? value.trim() : '';
const contains = (a, b) => String(a || '').toLowerCase().includes(String(b).toLowerCase());
const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'item';
const isUrl = (v) => { try { return ['http:', 'https:'].includes(new URL(v).protocol); } catch { return false; } };
const ORDER_STATUSES = ['received', 'processing', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['unpaid', 'paid', 'refunded'];
const trackStock = (book) => Number.isFinite(book.stock);

const limiter = (max) => rateLimit({ windowMs: 15 * 60 * 1000, limit: max, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many attempts. Please try again in a few minutes.' } });

app.get('/api/health', (_req, res) => res.json({ status: 'ok', database: 'json', message: 'BookStack API is running.' }));

// ---------- Authentication ----------
app.post('/api/auth/register', limiter(20), async (req, res, next) => {
  try {
    const name = text(req.body.name);
    const email = text(req.body.email).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!name || !email || !password) return bad(res, 'Name, email and password are required.');
    if (name.length > 80) return bad(res, 'Name must be 80 characters or fewer.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad(res, 'Enter a valid email address.');
    if (password.length < 8) return bad(res, 'Password must be at least 8 characters.');
    if (db.users.some((user) => user.email === email)) return bad(res, 'An account with this email already exists.', 409);
    const user = { id: randomUUID(), name, email, passwordHash: await bcrypt.hash(password, 12), role: 'customer', createdAt: new Date().toISOString() };
    db.users.push(user); await persistDb();
    res.status(201).json({ message: 'Your account has been created.', token: createToken(user), user: publicUser(user) });
  } catch (error) { next(error); }
});
app.post('/api/auth/login', limiter(30), async (req, res, next) => {
  try {
    const email = text(req.body.email).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!email || !password) return bad(res, 'Email and password are required.');
    const user = db.users.find((item) => item.email === email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return bad(res, 'Email or password is incorrect.', 401);
    res.json({ message: 'Welcome back.', token: createToken(user), user: publicUser(user) });
  } catch (error) { next(error); }
});
app.get('/api/auth/me', authRequired, (req, res) => res.json({ user: publicUser(req.user) }));
app.post('/api/auth/logout', (_req, res) => res.json({ message: 'You have been signed out on this device.' }));

// ---------- Public catalogue ----------
app.get('/api/authors', (req, res) => {
  const q = text(req.query.search);
  res.json(db.authors.filter((author) => !q || contains(author.name, q) || contains(author.bio, q)));
});
app.get('/api/authors/:id', (req, res) => {
  const author = db.authors.find((item) => item.id === req.params.id);
  return author ? res.json(author) : notFound(res, 'Author');
});
app.get('/api/books', (req, res) => {
  const q = text(req.query.search);
  const authorId = text(req.query.authorId);
  const category = text(req.query.category);
  res.json(db.books.filter((book) => (!q || contains(book.title, q) || contains(book.authorName, q) || contains(book.description, q)) && (!authorId || book.authorId === authorId) && (!category || book.category === category)));
});
app.get('/api/books/:id', (req, res) => {
  const book = db.books.find((item) => item.id === req.params.id);
  return book ? res.json(book) : notFound(res, 'Book');
});

// ---------- Admin: books ----------
function parseBook(body) {
  const title = text(body.title);
  const authorId = text(body.authorId);
  const description = text(body.description);
  const coverUrl = text(body.coverUrl);
  const category = text(body.category);
  const color = text(body.color) || '#2f5bff';
  const price = Number(body.price);
  const stock = Number(body.stock);
  const publishedYear = body.publishedYear === '' || body.publishedYear == null ? null : Number(body.publishedYear);
  if (!title || title.length > 200) return { error: 'Title is required (max 200 characters).' };
  const author = db.authors.find((a) => a.id === authorId);
  if (!author) return { error: 'Choose a valid author.' };
  if (description.length > 2000) return { error: 'Description must be 2000 characters or fewer.' };
  if (coverUrl && !isUrl(coverUrl)) return { error: 'Cover URL must start with http:// or https://.' };
  if (category.length > 60) return { error: 'Category must be 60 characters or fewer.' };
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return { error: 'Color must be a hex value like #2f5bff.' };
  if (!Number.isInteger(price) || price < 0 || price > 10_000_000) return { error: 'Price must be a whole number of 0 or more.' };
  if (!Number.isInteger(stock) || stock < 0 || stock > 1_000_000) return { error: 'Stock must be a whole number of 0 or more.' };
  if (publishedYear !== null && (!Number.isInteger(publishedYear) || publishedYear < 1400 || publishedYear > new Date().getFullYear() + 1)) return { error: 'Enter a valid publication year.' };
  return { author, value: { title, authorId, authorName: author.name, description, coverUrl, category, publishedYear, price, stock, color } };
}
const linkBook = (authorId, bookId) => { const a = db.authors.find((x) => x.id === authorId); if (a && !a.bookIds.includes(bookId)) a.bookIds.push(bookId); };
const unlinkBook = (authorId, bookId) => { const a = db.authors.find((x) => x.id === authorId); if (a) a.bookIds = a.bookIds.filter((id) => id !== bookId); };

app.post('/api/books', adminRequired, async (req, res, next) => {
  try {
    const { error, value } = parseBook(req.body);
    if (error) return bad(res, error);
    const book = { id: `${slug(value.title)}-${randomBytes(2).toString('hex')}`, ...value };
    db.books.push(book); linkBook(book.authorId, book.id);
    await persistDb(); res.status(201).json(book);
  } catch (e) { next(e); }
});
app.put('/api/books/:id', adminRequired, async (req, res, next) => {
  try {
    const book = db.books.find((item) => item.id === req.params.id);
    if (!book) return notFound(res, 'Book');
    const { error, value } = parseBook(req.body);
    if (error) return bad(res, error);
    if (book.authorId !== value.authorId) { unlinkBook(book.authorId, book.id); linkBook(value.authorId, book.id); }
    Object.assign(book, value);
    await persistDb(); res.json(book);
  } catch (e) { next(e); }
});
app.delete('/api/books/:id', adminRequired, async (req, res, next) => {
  try {
    const book = db.books.find((item) => item.id === req.params.id);
    if (!book) return notFound(res, 'Book');
    db.books = db.books.filter((item) => item.id !== book.id);
    unlinkBook(book.authorId, book.id);
    await persistDb(); res.json({ message: 'Book deleted.' });
  } catch (e) { next(e); }
});

// ---------- Admin: authors ----------
function parseAuthor(body) {
  const name = text(body.name), bio = text(body.bio), imageUrl = text(body.imageUrl), profileUrl = text(body.profileUrl);
  if (!name || name.length > 120) return { error: 'Name is required (max 120 characters).' };
  if (bio.length > 500) return { error: 'Bio must be 500 characters or fewer.' };
  if (imageUrl && !isUrl(imageUrl)) return { error: 'Image URL must start with http:// or https://.' };
  if (profileUrl && !isUrl(profileUrl)) return { error: 'Profile URL must start with http:// or https://.' };
  return { value: { name, bio, imageUrl, profileUrl } };
}
app.post('/api/authors', adminRequired, async (req, res, next) => {
  try {
    const { error, value } = parseAuthor(req.body);
    if (error) return bad(res, error);
    const author = { id: `author-${slug(value.name)}-${randomBytes(2).toString('hex')}`, ...value, bookIds: [] };
    db.authors.push(author); await persistDb(); res.status(201).json(author);
  } catch (e) { next(e); }
});
app.put('/api/authors/:id', adminRequired, async (req, res, next) => {
  try {
    const author = db.authors.find((item) => item.id === req.params.id);
    if (!author) return notFound(res, 'Author');
    const { error, value } = parseAuthor(req.body);
    if (error) return bad(res, error);
    Object.assign(author, value);
    for (const book of db.books) if (book.authorId === author.id) book.authorName = author.name;
    await persistDb(); res.json(author);
  } catch (e) { next(e); }
});
app.delete('/api/authors/:id', adminRequired, async (req, res, next) => {
  try {
    const author = db.authors.find((item) => item.id === req.params.id);
    if (!author) return notFound(res, 'Author');
    if (db.books.some((book) => book.authorId === author.id)) return bad(res, 'This author still has books. Reassign or delete those books first.', 409);
    db.authors = db.authors.filter((item) => item.id !== author.id);
    await persistDb(); res.json({ message: 'Author deleted.' });
  } catch (e) { next(e); }
});

// ---------- Customer orders ----------
app.post('/api/orders', authRequired, async (req, res, next) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!items.length || items.length > 30) return bad(res, 'Your cart must contain between 1 and 30 items.');
    const merged = new Map();
    for (const item of items) {
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) return bad(res, 'One or more cart items are invalid.');
      merged.set(item.bookId, (merged.get(item.bookId) || 0) + quantity);
    }
    const normalized = [];
    for (const [bookId, quantity] of merged) {
      const book = db.books.find((entry) => entry.id === bookId);
      if (!book || quantity > 20) return bad(res, 'One or more cart items are invalid.');
      if (trackStock(book) && book.stock < quantity) return bad(res, `Only ${book.stock} copies of "${book.title}" left in stock.`, 409);
      normalized.push({ bookId: book.id, title: book.title, unitPrice: Number(book.price || 0), quantity, lineTotal: Number(book.price || 0) * quantity });
    }
    for (const line of normalized) { const book = db.books.find((b) => b.id === line.bookId); if (trackStock(book)) book.stock -= line.quantity; }
    const now = new Date().toISOString();
    const order = { id: randomUUID(), userId: req.user.id, items: normalized, total: normalized.reduce((sum, item) => sum + item.lineTotal, 0), status: 'received', paymentStatus: 'unpaid', createdAt: now, updatedAt: now };
    db.orders.push(order); await persistDb();
    res.status(201).json({ message: 'Your order request has been received. Payment is not collected in this MVP.', order });
  } catch (error) { next(error); }
});
app.get('/api/orders/mine', authRequired, (req, res) => res.json(db.orders.filter((order) => order.userId === req.user.id)));

// ---------- Admin: orders, customers, stats ----------
const withCustomer = (order) => {
  const u = db.users.find((x) => x.id === order.userId);
  return { ...order, customer: u ? { id: u.id, name: u.name, email: u.email } : { id: order.userId, name: 'Deleted user', email: '' } };
};
app.get('/api/admin/orders', adminRequired, (req, res) => {
  const status = text(req.query.status), q = text(req.query.search);
  const list = db.orders.map(withCustomer)
    .filter((o) => (!status || o.status === status) && (!q || contains(o.id, q) || contains(o.customer.name, q) || contains(o.customer.email, q)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(list);
});
app.patch('/api/admin/orders/:id', adminRequired, async (req, res, next) => {
  try {
    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) return notFound(res, 'Order');
    const { status, paymentStatus } = req.body;
    if (status !== undefined && !ORDER_STATUSES.includes(status)) return bad(res, 'Invalid order status.');
    if (paymentStatus !== undefined && !PAYMENT_STATUSES.includes(paymentStatus)) return bad(res, 'Invalid payment status.');
    if (status && status !== order.status) {
      const wasCancelled = order.status === 'cancelled';
      if (status === 'cancelled') {
        for (const line of order.items) { const b = db.books.find((x) => x.id === line.bookId); if (b && trackStock(b)) b.stock += line.quantity; }
      } else if (wasCancelled) {
        for (const line of order.items) { const b = db.books.find((x) => x.id === line.bookId); if (b && trackStock(b) && b.stock < line.quantity) return bad(res, `Not enough stock of "${line.title}" to reopen this order.`, 409); }
        for (const line of order.items) { const b = db.books.find((x) => x.id === line.bookId); if (b && trackStock(b)) b.stock -= line.quantity; }
      }
      order.status = status;
    }
    if (paymentStatus) order.paymentStatus = paymentStatus;
    order.updatedAt = new Date().toISOString();
    await persistDb(); res.json(withCustomer(order));
  } catch (e) { next(e); }
});
app.get('/api/admin/customers', adminRequired, (_req, res) => {
  res.json(db.users.map((u) => {
    const orders = db.orders.filter((o) => o.userId === u.id);
    const live = orders.filter((o) => o.status !== 'cancelled');
    return { ...publicUser(u), orderCount: orders.length, totalSpent: live.reduce((s, o) => s + o.total, 0), lastOrderAt: orders.map((o) => o.createdAt).sort().pop() || null };
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});
app.get('/api/admin/stats', adminRequired, (_req, res) => {
  const live = db.orders.filter((o) => o.status !== 'cancelled');
  const days = [];
  for (let i = 13; i >= 0; i--) { const d = new Date(); d.setUTCDate(d.getUTCDate() - i); days.push({ date: d.toISOString().slice(0, 10), orders: 0, revenue: 0 }); }
  for (const o of live) { const row = days.find((d) => d.date === o.createdAt.slice(0, 10)); if (row) { row.orders += 1; row.revenue += o.total; } }
  const units = new Map();
  for (const o of live) for (const l of o.items) { const r = units.get(l.bookId) || { bookId: l.bookId, title: l.title, units: 0, revenue: 0 }; r.units += l.quantity; r.revenue += l.lineTotal; units.set(l.bookId, r); }
  const statusCounts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, db.orders.filter((o) => o.status === s).length]));
  res.json({
    revenue: live.reduce((s, o) => s + o.total, 0),
    paidRevenue: live.filter((o) => o.paymentStatus === 'paid').reduce((s, o) => s + o.total, 0),
    orders: db.orders.length,
    openOrders: statusCounts.received + statusCounts.processing,
    customers: db.users.filter((u) => u.role !== 'admin').length,
    books: db.books.length,
    authors: db.authors.length,
    statusCounts,
    daily: days,
    topBooks: [...units.values()].sort((a, b) => b.units - a.units).slice(0, 5),
    lowStock: db.books.filter((b) => trackStock(b) && b.stock <= 5).sort((a, b) => a.stock - b.stock).map(({ id, title, stock }) => ({ id, title, stock })),
    recentOrders: db.orders.map(withCustomer).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6),
  });
});

// ---------- Frontend (production) ----------
app.use('/api', (_req, res) => notFound(res, 'Endpoint'));
if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR, { index: false, maxAge: '1h' }));
  app.get('*', (_req, res) => res.sendFile(path.join(DIST_DIR, 'index.html')));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

await loadDb();
app.listen(PORT, () => console.log(`BookStack API ready on port ${PORT}${existsSync(DIST_DIR) ? ' (serving built frontend)' : ''}`));
