// ============================================================
// server-all.js — DesignStudio Manager (ВСЕ В ОДНОМУ ФАЙЛІ)
// Козак М.В. · ПП-32 · Запуск: node server-all.js
// ============================================================
const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const path       = require('path');
const nodemailer = require('nodemailer');

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET  = 'designstudio_secret_2026';
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/designstudio';

// ── Email конфіг (Gmail) ──────────────────────────────────
const GMAIL_USER = 'kozakmarian06@gmail.com';
const GMAIL_PASS = 'etjqhskqibjjhago';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const NOTIFY_TO  = 'kozakmarian06@gmail.com';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,  // kozakmarian06@gmail.com
    pass: process.env.EMAIL_PASS,  // 16-символьний код
  },
});

transporter.verify((err) => {
  if (err) console.log('\u26a0\ufe0f  Email не налаштовано:', err.message);
  else     console.log('\u2705 Email (Gmail) підключено:', GMAIL_USER);
});

async function sendEmail({ to, subject, html }) {
  try {
    await transporter.sendMail({
      from: `"DesignStudio Manager" <${GMAIL_USER}>`,
      to, subject, html
    });
    console.log('\U0001f4e7 Email відправлено \u2192', to);
  } catch (e) {
    console.error('\u274c Email помилка:', e.message);
  }
}

// ── Middleware ────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Логер
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const color = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
    console.log(`${color}[${res.statusCode}]\x1b[0m ${req.method} ${req.path} — ${Date.now()-start}ms`);
  });
  next();
});

// ══════════════════════════════════════════════════════════
// MONGOOSE МОДЕЛІ
// ══════════════════════════════════════════════════════════
const { Schema } = mongoose;

const UserSchema = new Schema({
  name:         { type: String, required: true },
  email:        { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role:         { type: String, enum: ['director','manager','designer','accountant'], default: 'designer' },
  avatar:       { type: String, default: '' },
  isActive:     { type: Boolean, default: true },
  lastLogin:    Date,
}, { timestamps: true });

const ClientSchema = new Schema({
  companyName:  { type: String, required: true },
  contactName:  { type: String, required: true },
  email:        { type: String, required: true },
  phone:        { type: String, default: '' },
  status:       { type: String, enum: ['active','potential','inactive'], default: 'potential' },
  manager:      { type: Schema.Types.ObjectId, ref: 'User' },
  totalPaid:    { type: Number, default: 0 },
  notes:        { type: String, default: '' },
}, { timestamps: true });

const ProjectSchema = new Schema({
  projectId:   { type: String, required: true, unique: true },
  title:       { type: String, required: true },
  client:      { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  manager:     { type: Schema.Types.ObjectId, ref: 'User' },
  status:      { type: String, enum: ['new','active','paused','completed','cancelled'], default: 'new' },
  progress:    { type: Number, min: 0, max: 100, default: 0 },
  budget:      { type: Number, required: true },
  deadline:    Date,
  description: { type: String, default: '' },
  tags:        [String],
}, { timestamps: true });

const TaskSchema = new Schema({
  title:       { type: String, required: true },
  project:     { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  assignee:    { type: Schema.Types.ObjectId, ref: 'User' },
  status:      { type: String, enum: ['todo','in_progress','done'], default: 'todo' },
  priority:    { type: String, enum: ['low','medium','high'], default: 'medium' },
  deadline:    Date,
  description: { type: String, default: '' },
  comments:    [{ author: { type: Schema.Types.ObjectId, ref: 'User' }, text: String, createdAt: { type: Date, default: Date.now } }],
}, { timestamps: true });

const FileSchema = new Schema({
  filename:     { type: String, required: true },
  originalName: { type: String, required: true },
  project:      { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  uploadedBy:   { type: Schema.Types.ObjectId, ref: 'User' },
  fileType:     String,
  size:         Number,
  version:      { type: String, default: 'v1' },
  url:          { type: String, default: '' },
}, { timestamps: true });

const InvoiceSchema = new Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  client:        { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  project:       { type: Schema.Types.ObjectId, ref: 'Project' },
  amount:        { type: Number, required: true },
  status:        { type: String, enum: ['pending','paid','overdue','cancelled'], default: 'pending' },
  issuedAt:      { type: Date, default: Date.now },
  paidAt:        Date,
  dueDate:       Date,
  description:   { type: String, default: '' },
}, { timestamps: true });

const PaymentSchema = new Schema({
  invoice:     { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
  client:      { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  amount:      { type: Number, required: true },
  method:      { type: String, enum: ['bank_transfer','card','cash'], default: 'bank_transfer' },
  paidAt:      { type: Date, default: Date.now },
  confirmedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  note:        { type: String, default: '' },
}, { timestamps: true });

const NotificationSchema = new Schema({
  user:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type:      { type: String, enum: ['task','payment','deadline','new_client','system'], default: 'system' },
  title:     { type: String, required: true },
  message:   { type: String, required: true },
  isRead:    { type: Boolean, default: false },
  relatedId: Schema.Types.ObjectId,
}, { timestamps: true });

const OrderSchema = new Schema({
  name:        { type: String, required: true },
  email:       { type: String, required: true },
  company:     { type: String, default: '' },
  serviceType: { type: String, required: true },
  budget:      { type: String, default: '' },
  description: { type: String, required: true },
  status:      { type: String, enum: ['new','contacted','converted','rejected'], default: 'new' },
}, { timestamps: true });

const RefreshTokenSchema = new Schema({
  token:     { type: String, required: true },
  user:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

const User         = mongoose.model('User', UserSchema);
const Client       = mongoose.model('Client', ClientSchema);
const Project      = mongoose.model('Project', ProjectSchema);
const Task         = mongoose.model('Task', TaskSchema);
const File         = mongoose.model('File', FileSchema);
const Invoice      = mongoose.model('Invoice', InvoiceSchema);
const Payment      = mongoose.model('Payment', PaymentSchema);
const Notification = mongoose.model('Notification', NotificationSchema);
const Order        = mongoose.model('Order', OrderSchema);
const RefreshToken = mongoose.model('RefreshToken', RefreshTokenSchema);

// ══════════════════════════════════════════════════════════
// AUTH MIDDLEWARE
// ══════════════════════════════════════════════════════════
const auth = async (req, res, next) => {
  try {
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer '))
      return res.status(401).json({ error: 'Токен відсутній' });
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-passwordHash');
    if (!user || !user.isActive)
      return res.status(401).json({ error: 'Користувача не знайдено' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Недійсний токен' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ error: 'Доступ заборонено' });
  next();
};

const genTokens = (userId) => ({
  accessToken:  jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' }),
  refreshToken: jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: '7d' }),
});

// ══════════════════════════════════════════════════════════
// ROUTES — AUTH
// ══════════════════════════════════════════════════════════
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email та пароль обов\'язкові' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !await bcrypt.compare(password, user.passwordHash))
      return res.status(401).json({ error: 'Невірний email або пароль' });
    if (!user.isActive)
      return res.status(403).json({ error: 'Акаунт деактивовано' });
    user.lastLogin = new Date();
    await user.save();
    const tokens = genTokens(user._id);
    await RefreshToken.create({ token: tokens.refreshToken, user: user._id, expiresAt: new Date(Date.now() + 7*24*60*60*1000) });
    res.json({ message: 'Авторизація успішна', ...tokens, user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/logout', auth, async (req, res) => {
  try {
    if (req.body.refreshToken) await RefreshToken.deleteOne({ token: req.body.refreshToken });
    res.json({ message: 'Вихід успішний' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token відсутній' });
    const stored = await RefreshToken.findOne({ token: refreshToken });
    if (!stored || stored.expiresAt < new Date()) return res.status(401).json({ error: 'Token застарів' });
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    const tokens = genTokens(decoded.userId);
    await RefreshToken.deleteOne({ _id: stored._id });
    await RefreshToken.create({ token: tokens.refreshToken, user: decoded.userId, expiresAt: new Date(Date.now() + 7*24*60*60*1000) });
    res.json(tokens);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/auth/me', auth, (req, res) => res.json({ user: req.user }));

// ── POST /api/auth/register — реєстрація ─────────────────
// Доступна якщо: 1) перший юзер в системі, або 2) запит від директора
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'name, email та password обов\'язкові' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Пароль мінімум 6 символів' });

    const userCount = await User.countDocuments();

    // Якщо є юзери — перевіряємо чи є JWT директора
    if (userCount > 0) {
      const authHeader = req.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer '))
        return res.status(403).json({ error: 'Реєстрація доступна тільки для директора або якщо це перший акаунт' });
      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
        const caller  = await User.findById(decoded.userId);
        if (!caller || caller.role !== 'director')
          return res.status(403).json({ error: 'Тільки директор може реєструвати нових користувачів' });
      } catch {
        return res.status(401).json({ error: 'Недійсний токен' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    // Перший юзер завжди director
    const finalRole = userCount === 0 ? 'director' : (role || 'designer');
    const user = await User.create({ name, email, passwordHash, role: finalRole });

    const tokens = genTokens(user._id);
    await RefreshToken.create({ token: tokens.refreshToken, user: user._id, expiresAt: new Date(Date.now() + 7*24*60*60*1000) });

    // Welcome email
    await sendEmail({
      to: email,
      subject: '✦ Ласкаво просимо до DesignStudio Manager',
      html: '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0c;color:#e8e4dc;padding:32px;border-radius:12px">' +
        '<h1 style="color:#c9a84c;text-align:center">DesignStudio Manager</h1>' +
        '<div style="background:#1c1c26;border:1px solid #2a2a3a;border-radius:10px;padding:24px">' +
        '<h2 style="color:#e8e4dc;margin:0 0 16px">Вітаємо, ' + name + '! 👋</h2>' +
        '<p style="color:#aaa">Ваш акаунт створено успішно.</p>' +
        '<p style="color:#aaa;margin-top:12px">Email: <strong style="color:#e8e4dc">' + email + '</strong></p>' +
        '<p style="color:#aaa">Роль: <strong style="color:#c9a84c">' + finalRole + '</strong></p>' +
        '</div>' +
        '<div style="text-align:center;margin-top:24px">' +
        '<a href="${BASE_URL}" style="background:#c9a84c;color:#0a0a0c;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700">Увійти до кабінету →</a>' +
        '</div></div>'
    });

    res.status(201).json({
      message: 'Акаунт створено успішно',
      ...tokens,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Цей email вже зареєстровано' });
    res.status(400).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════════════════
// ROUTES — CLIENTS
// ══════════════════════════════════════════════════════════
app.get('/api/clients', auth, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) filter.$or = [
      { companyName: { $regex: search, $options: 'i' } },
      { contactName: { $regex: search, $options: 'i' } },
    ];
    const total = await Client.countDocuments(filter);
    const clients = await Client.find(filter).populate('manager','name email role').sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit));
    const withStats = await Promise.all(clients.map(async c => ({
      ...c.toObject(), projectCount: await Project.countDocuments({ client: c._id })
    })));
    res.json({ clients: withStats, total, page: Number(page) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/clients', auth, requireRole('director','manager'), async (req, res) => {
  try {
    const client = await Client.create({ ...req.body, manager: req.user._id });
    res.status(201).json({ message: 'Клієнта додано', client });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.get('/api/clients/:id', auth, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id).populate('manager','name email');
    if (!client) return res.status(404).json({ error: 'Не знайдено' });
    const projects = await Project.find({ client: client._id }).select('title status progress budget deadline');
    const invoices = await Invoice.find({ client: client._id }).select('invoiceNumber amount status issuedAt');
    res.json({ client, projects, invoices });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/clients/:id', auth, requireRole('director','manager'), async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!client) return res.status(404).json({ error: 'Не знайдено' });
    res.json({ message: 'Оновлено', client });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/clients/:id', auth, requireRole('director'), async (req, res) => {
  try {
    await Client.findByIdAndDelete(req.params.id);
    res.json({ message: 'Видалено' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════
// ROUTES — PROJECTS
// ══════════════════════════════════════════════════════════
app.get('/api/projects', auth, async (req, res) => {
  try {
    const { status, client } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (client) filter.client = client;
    const total = await Project.countDocuments(filter);
    const projects = await Project.find(filter)
      .populate('client','companyName contactName email')
      .populate('manager','name email role')
      .sort({ createdAt: -1 });
    res.json({ projects, total });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/projects', auth, requireRole('director','manager'), async (req, res) => {
  try {
    const project = await Project.create({ ...req.body, manager: req.body.manager || req.user._id });
    await Notification.create({ user: project.manager, type: 'system', title: 'Новий проєкт', message: `Вам призначено проєкт: «${project.title}»`, relatedId: project._id });
    await project.populate(['client','manager']);
    res.status(201).json({ message: 'Проєкт створено', project });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.get('/api/projects/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate('client').populate('manager','name email role avatar');
    if (!project) return res.status(404).json({ error: 'Не знайдено' });
    res.json({ project });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/projects/:id', auth, requireRole('director','manager'), async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('client','companyName').populate('manager','name');
    if (!project) return res.status(404).json({ error: 'Не знайдено' });
    res.json({ message: 'Оновлено', project });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/projects/:id', auth, requireRole('director'), async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    await Task.deleteMany({ project: req.params.id });
    res.json({ message: 'Видалено' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/projects/:id/tasks', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ project: req.params.id }).populate('assignee','name avatar role').sort({ createdAt: -1 });
    const grouped = { todo: tasks.filter(t=>t.status==='todo'), in_progress: tasks.filter(t=>t.status==='in_progress'), done: tasks.filter(t=>t.status==='done') };
    res.json({ tasks, grouped });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════
// ROUTES — TASKS
// ══════════════════════════════════════════════════════════
app.get('/api/tasks', auth, async (req, res) => {
  try {
    const { status, assignee, project, priority } = req.query;
    const filter = {};
    if (status)   filter.status = status;
    if (project)  filter.project = project;
    if (priority) filter.priority = priority;
    if (assignee && assignee !== 'all') filter.assignee = assignee;
    const tasks = await Task.find(filter).populate('project','title projectId').populate('assignee','name avatar role').sort({ createdAt: -1 });
    const grouped = { todo: tasks.filter(t=>t.status==='todo'), in_progress: tasks.filter(t=>t.status==='in_progress'), done: tasks.filter(t=>t.status==='done') };
    res.json({ tasks, grouped });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tasks', auth, requireRole('director','manager'), async (req, res) => {
  try {
    const task = await Task.create(req.body);
    if (req.body.assignee) await Notification.create({ user: req.body.assignee, type: 'task', title: 'Нова задача', message: `Вам призначено: «${task.title}»`, relatedId: task._id });
    await task.populate(['project','assignee']);
    res.status(201).json({ message: 'Задачу створено', task });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.patch('/api/tasks/:id', auth, async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('project','title').populate('assignee','name');
    if (!task) return res.status(404).json({ error: 'Не знайдено' });
    res.json({ message: 'Оновлено', task });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/tasks/:id/comments', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Не знайдено' });
    task.comments.push({ author: req.user._id, text: req.body.text });
    await task.save();
    res.status(201).json({ message: 'Коментар додано', comments: task.comments });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/tasks/:id', auth, requireRole('director','manager'), async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Видалено' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════
// ROUTES — INVOICES & PAYMENTS
// ══════════════════════════════════════════════════════════
app.get('/api/invoices', auth, async (req, res) => {
  try {
    const { status, client } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (client) filter.client = client;
    const invoices = await Invoice.find(filter).populate('client','companyName contactName').populate('project','title projectId').sort({ issuedAt: -1 });
    const totalAmount   = invoices.reduce((s,i) => s+i.amount, 0);
    const paidAmount    = invoices.filter(i=>i.status==='paid').reduce((s,i) => s+i.amount, 0);
    const pendingAmount = invoices.filter(i=>i.status==='pending').reduce((s,i) => s+i.amount, 0);
    res.json({ invoices, analytics: { totalAmount, paidAmount, pendingAmount } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/invoices', auth, requireRole('director','accountant','manager'), async (req, res) => {
  try {
    const invoice = await Invoice.create(req.body);
    res.status(201).json({ message: 'Рахунок створено', invoice });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.patch('/api/invoices/:id', auth, requireRole('director','accountant','manager'), async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!invoice) return res.status(404).json({ error: 'Не знайдено' });
    res.json({ message: 'Оновлено', invoice });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.get('/api/payments', auth, async (req, res) => {
  try {
    const payments = await Payment.find().populate('invoice','invoiceNumber amount').populate('client','companyName').populate('confirmedBy','name').sort({ paidAt: -1 });
    res.json({ payments });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/payments', auth, requireRole('director','accountant','manager'), async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.body.invoice).populate('client');
    if (!invoice) return res.status(404).json({ error: 'Рахунок не знайдено' });
    const payment = await Payment.create({ ...req.body, client: invoice.client._id, confirmedBy: req.user._id });
    invoice.status = 'paid'; invoice.paidAt = payment.paidAt; await invoice.save();
    await Client.findByIdAndUpdate(invoice.client._id, { $inc: { totalPaid: payment.amount } });
    res.status(201).json({ message: 'Оплату підтверджено', payment });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════
// ROUTES — FILES
// ══════════════════════════════════════════════════════════
app.get('/api/files', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.project) filter.project = req.query.project;
    const files = await File.find(filter).populate('project','title projectId').populate('uploadedBy','name avatar').sort({ createdAt: -1 });
    res.json({ files });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/files', auth, async (req, res) => {
  try {
    const file = await File.create({ ...req.body, uploadedBy: req.user._id });
    await file.populate(['project','uploadedBy']);
    res.status(201).json({ message: 'Файл зареєстровано', file });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/files/:id', auth, requireRole('director','manager'), async (req, res) => {
  try {
    await File.findByIdAndDelete(req.params.id);
    res.json({ message: 'Видалено' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════
// ROUTES — NOTIFICATIONS
// ══════════════════════════════════════════════════════════
app.get('/api/notifications/:userId', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.params.userId }).sort({ createdAt: -1 }).limit(50);
    res.json({ notifications, unreadCount: notifications.filter(n=>!n.isRead).length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/notifications/:id/read', auth, async (req, res) => {
  try {
    const n = await Notification.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
    res.json({ message: 'Прочитано', notification: n });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════
// ROUTES — ORDERS (публічний)
// ══════════════════════════════════════════════════════════
app.post('/api/orders', async (req, res) => {
  try {
    const { name, email, serviceType, description } = req.body;
    if (!name || !email || !serviceType || !description)
      return res.status(400).json({ error: 'Заповніть всі обов\'язкові поля' });

    const order = await Order.create(req.body);

    // Сповіщення в БД для директорів
    const directors = await User.find({ role: 'director' });
    for (const d of directors) {
      await Notification.create({
        user: d._id, type: 'new_client',
        title: 'Нова заявка з сайту',
        message: `${name} — ${serviceType}`,
        relatedId: order._id
      });
    }

    // Email адміну
    const adminHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0c;color:#e8e4dc;padding:32px;border-radius:12px">
        <div style="text-align:center;margin-bottom:24px">
          <div style="display:inline-block;background:#c9a84c;width:40px;height:40px;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);line-height:40px;font-weight:700;color:#0a0a0c;font-size:14px">DS</div>
          <h1 style="color:#c9a84c;font-size:22px;margin:12px 0 4px">DesignStudio Manager</h1>
          <p style="color:#888;font-size:13px;margin:0">Нова заявка з сайту</p>
        </div>
        <div style="background:#1c1c26;border:1px solid #2a2a3a;border-radius:10px;padding:24px;margin-bottom:20px">
          <h2 style="color:#e8e4dc;font-size:18px;margin:0 0 20px">📋 Деталі заявки</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="color:#888;padding:8px 0;border-bottom:1px solid #2a2a3a;width:140px">Ім\'я:</td><td style="color:#e8e4dc;padding:8px 0;border-bottom:1px solid #2a2a3a"><strong>${name}</strong></td></tr>
            <tr><td style="color:#888;padding:8px 0;border-bottom:1px solid #2a2a3a">Email:</td><td style="padding:8px 0;border-bottom:1px solid #2a2a3a"><a href="mailto:${email}" style="color:#c9a84c">${email}</a></td></tr>
            <tr><td style="color:#888;padding:8px 0;border-bottom:1px solid #2a2a3a">Компанія:</td><td style="color:#e8e4dc;padding:8px 0;border-bottom:1px solid #2a2a3a">${req.body.company || '—'}</td></tr>
            <tr><td style="color:#888;padding:8px 0;border-bottom:1px solid #2a2a3a">Послуга:</td><td style="padding:8px 0;border-bottom:1px solid #2a2a3a"><span style="background:#c9a84c22;color:#c9a84c;padding:3px 10px;border-radius:20px;font-size:13px">${serviceType}</span></td></tr>
            <tr><td style="color:#888;padding:8px 0;border-bottom:1px solid #2a2a3a">Бюджет:</td><td style="color:#e8e4dc;padding:8px 0;border-bottom:1px solid #2a2a3a">${req.body.budget || '—'}</td></tr>
            <tr><td style="color:#888;padding:8px 0;vertical-align:top">Опис:</td><td style="color:#e8e4dc;padding:8px 0">${description}</td></tr>
          </table>
        </div>
        <div style="text-align:center">
          <a href="${BASE_URL}" style="display:inline-block;background:#c9a84c;color:#0a0a0c;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">Відкрити кабінет →</a>
        </div>
        <p style="text-align:center;color:#555;font-size:12px;margin-top:20px">DesignStudio Manager · Козак М.В. · ПП-32</p>
      </div>`;

    await sendEmail({
      to: NOTIFY_TO,
      subject: `✦ Нова заявка: ${name} — ${serviceType}`,
      html: adminHtml,
    });

    // Email клієнту — підтвердження
    const clientHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0c;color:#e8e4dc;padding:32px;border-radius:12px">
        <div style="text-align:center;margin-bottom:24px">
          <h1 style="color:#c9a84c;font-size:22px;margin:0 0 8px">DesignStudio Manager</h1>
          <p style="color:#888;font-size:13px;margin:0">Підтвердження заявки</p>
        </div>
        <div style="background:#1c1c26;border:1px solid #2a2a3a;border-radius:10px;padding:24px;margin-bottom:20px">
          <h2 style="color:#e8e4dc;font-size:18px;margin:0 0 12px">Дякуємо, ${name}! ✦</h2>
          <p style="color:#aaa;line-height:1.7;margin:0">Ваша заявка на послугу <strong style="color:#c9a84c">${serviceType}</strong> успішно отримана. Наш менеджер зв\'яжеться з вами протягом <strong style="color:#e8e4dc">1 робочого дня</strong>.</p>
        </div>
        <div style="background:#1c1c2622;border:1px solid #2a2a3a;border-radius:10px;padding:20px;margin-bottom:20px">
          <p style="color:#888;font-size:13px;margin:0 0 8px">Ваш опис проєкту:</p>
          <p style="color:#e8e4dc;font-size:14px;margin:0;line-height:1.6">${description}</p>
        </div>
        <div style="text-align:center;border-top:1px solid #2a2a3a;padding-top:20px">
          <p style="color:#555;font-size:12px;margin:0">📍 вул. Дорошенка, 17, оф. 305, Львів · hello@designstudio.ua</p>
        </div>
      </div>`;

    await sendEmail({
      to: email,
      subject: '✦ Заявку отримано — DesignStudio Manager',
      html: clientHtml,
    });

    res.status(201).json({
      message: 'Заявку отримано! Ми зв\'яжемося з вами протягом 1 робочого дня. Підтвердження надіслано на вашу пошту.',
      orderId: order._id
    });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.patch('/api/orders/:id', auth, requireRole('director','manager'), async (req, res) => {
  try {
    // Знаходимо замовлення, щоб отримати його поточний стан
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Заявку не знайдено' });

    const oldStatus = order.status;
    order.status = req.body.status;
    await order.save();

    // Якщо заявку відхилено – надіслати email клієнту
    if (order.status === 'rejected' && oldStatus !== 'rejected') {
      const clientHtml = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0c;color:#e8e4dc;padding:32px;border-radius:12px">
          <h1 style="color:#c9a84c;text-align:center">DesignStudio Manager</h1>
          <div style="background:#1c1c26;border:1px solid #2a2a3a;border-radius:10px;padding:24px;margin:20px 0">
            <h2 style="color:#e8e4dc;margin:0 0 12px">Шановний(а) ${order.name},</h2>
            <p style="color:#aaa;line-height:1.7">Дякуємо за ваш інтерес. На жаль, ми не можемо прийняти вашу заявку на послугу <strong style="color:#c9a84c">${order.serviceType}</strong> наразі.</p>
            <p style="color:#aaa">Якщо у вас є додаткові запитання, зв'яжіться з нами: <a href="mailto:hello@designstudio.ua" style="color:#c9a84c">hello@designstudio.ua</a></p>
          </div>
          <p style="color:#555;font-size:12px;text-align:center">DesignStudio Manager · Козак М.В. · ПП-32</p>
        </div>`;
      await sendEmail({
        to: order.email,
        subject: '✦ Вашу заявку відхилено — DesignStudio Manager',
        html: clientHtml,
      });
    }

    res.json({ message: 'Оновлено', order });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/orders', auth, requireRole('director','manager'), async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ orders });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════
// ROUTES — ADMIN
// ══════════════════════════════════════════════════════════
app.get('/api/admin/stats', auth, requireRole('director'), async (req, res) => {
  try {
    const [users, clients, projects, tasks, orders] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Client.countDocuments(),
      Project.countDocuments(),
      Task.countDocuments({ status: { $ne: 'done' } }),
      Order.countDocuments({ status: 'new' }),
    ]);
    const invoices = await Invoice.aggregate([{ $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } }]);
    const invoiceStats = {};
    invoices.forEach(i => { invoiceStats[i._id] = { total: i.total, count: i.count }; });
    res.json({ users, clients, projects, tasks: { active: tasks }, invoices: invoiceStats, newOrders: orders });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/users', auth, requireRole('director'), async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    res.json({ users });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/users', auth, requireRole('director'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email та password обов\'язкові' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, role });

    // Надіслати welcome email новому користувачу
    const roleLabels = { director: 'Директор', manager: 'Менеджер', designer: 'Дизайнер', accountant: 'Бухгалтер' };
    await sendEmail({
      to: email,
      subject: '✦ Ласкаво просимо до DesignStudio Manager',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0c;color:#e8e4dc;padding:32px;border-radius:12px">
          <h1 style="color:#c9a84c;text-align:center;margin:0 0 24px">DesignStudio Manager</h1>
          <div style="background:#1c1c26;border:1px solid #2a2a3a;border-radius:10px;padding:24px">
            <h2 style="color:#e8e4dc;margin:0 0 16px">Вітаємо, ${name}! 👋</h2>
            <p style="color:#aaa;line-height:1.7">Вам створено акаунт у системі управління дизайн-студією.</p>
            <table style="width:100%;margin-top:16px;border-collapse:collapse">
              <tr><td style="color:#888;padding:6px 0;width:120px">Роль:</td><td style="color:#c9a84c;font-weight:700">${roleLabels[role] || role}</td></tr>
              <tr><td style="color:#888;padding:6px 0">Email:</td><td style="color:#e8e4dc">${email}</td></tr>
              <tr><td style="color:#888;padding:6px 0">Пароль:</td><td style="color:#e8e4dc;font-family:monospace;background:#111;padding:4px 8px;border-radius:4px">${password}</td></tr>
            </table>
          </div>
          <div style="text-align:center;margin-top:24px">
            <a href="${BASE_URL}" style="display:inline-block;background:#c9a84c;color:#0a0a0c;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700">Увійти до кабінету →</a>
          </div>
          <p style="text-align:center;color:#555;font-size:12px;margin-top:16px">Збережіть ці дані для входу в систему.</p>
        </div>`
    });

    res.status(201).json({ message: 'Користувача створено, дані надіслано на email', user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.patch('/api/admin/users/:id', auth, requireRole('director'), async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.password) { updates.passwordHash = await bcrypt.hash(updates.password, 12); delete updates.password; }
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-passwordHash');
    res.json({ message: 'Оновлено', user });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════
// HEALTH CHECK
// ══════════════════════════════════════════════════════════
app.get('/api/stats/public', async (req, res) => {
  try {
    const projects = await Project.countDocuments();
    const clients = await Client.countDocuments();
    res.json({ projects, clients, experience: 4 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    server: 'DesignStudio Manager API',
    version: '1.0.0',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: Math.floor(process.uptime()) + 's',
    timestamp: new Date().toISOString(),
  });
});

// Роздача designstudio.html для будь-якого шляху
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'designstudio.html'), err => {
    if (err) res.status(404).json({ error: 'Frontend не знайдено' });
  });
});

// Обробник помилок
app.use((err, req, res, next) => {
  if (err.code === 11000) return res.status(409).json({ error: `Значення вже існує: ${Object.keys(err.keyValue)[0]}` });
  res.status(500).json({ error: err.message });
});

// ══════════════════════════════════════════════════════════
// SEED ФУНКЦІЯ — запускається автоматично якщо БД порожня
// ══════════════════════════════════════════════════════════
async function seedIfEmpty() {
  const count = await User.countDocuments();
  if (count > 0) { console.log(`ℹ️  БД вже містить ${count} користувачів — seed пропущено`); return; }

  console.log('🌱 БД порожня — наповнюємо тестовими даними...');
  const hash = await bcrypt.hash('admin123', 12);

  const [olena, dmytro, yuliia, andriy] = await User.create([
    { name: 'Олена Бондаренко', email: 'olena.bondarenko@designstudio.com', passwordHash: hash, role: 'director', avatar: '👩‍💼' },
    { name: 'Дмитро Савченко',  email: 'dmytro.savchenko@designstudio.com',  passwordHash: hash, role: 'manager',  avatar: '👨‍💻' },
    { name: 'Юлія Коваль',      email: 'yuliia.koval@designstudio.com',      passwordHash: hash, role: 'designer', avatar: '👩‍🎨' },
    { name: 'Андрій Литвин',    email: 'andriy.lytvyn@designstudio.com',     passwordHash: hash, role: 'designer', avatar: '👨‍🎨' },
  ]);

  const [techvision, greenleaf, stellar] = await Client.create([
    { companyName: 'TechVision UA',  contactName: 'Сергій Мельник',    email: 's.melnyk@techvision.ua',        phone: '+380 44 123-45-67', status: 'active',    manager: dmytro._id, totalPaid: 42500 },
    { companyName: 'GreenLeaf Brand',contactName: 'Ірина Захарченко',  email: 'i.zakharchenko@greenleaf.com',  phone: '+380 67 234-56-78', status: 'active',    manager: dmytro._id, totalPaid: 45000 },
    { companyName: 'Stellar Events', contactName: 'Максим Романенко',  email: 'm.romanenko@stellar.events',   phone: '+380 50 345-67-89', status: 'potential', manager: dmytro._id, totalPaid: 0 },
  ]);

  const [proj1, proj2, proj3] = await Project.create([
    { projectId: '#001', title: 'Ребрендинг TechVision UA',  client: techvision._id, manager: dmytro._id, status: 'active',    progress: 60,  budget: 85000, deadline: new Date('2026-04-30') },
    { projectId: '#002', title: 'UX/UI GreenLeaf Brand',     client: greenleaf._id,  manager: dmytro._id, status: 'completed', progress: 100, budget: 45000, deadline: new Date('2025-12-31') },
    { projectId: '#003', title: 'SMM Stellar Events',        client: stellar._id,    manager: dmytro._id, status: 'new',       progress: 15,  budget: 18000, deadline: new Date('2026-03-15') },
  ]);

  await Task.create([
    { title: 'Розробка варіантів логотипу',   project: proj1._id, assignee: yuliia._id, status: 'in_progress', priority: 'high',   deadline: new Date('2026-03-10') },
    { title: 'Концепція мудборду',            project: proj1._id, assignee: yuliia._id, status: 'in_progress', priority: 'high',   deadline: new Date('2026-02-15') },
    { title: 'Палітра кольорів та типографіка',project: proj1._id, assignee: yuliia._id, status: 'todo',       priority: 'medium', deadline: new Date('2026-03-20') },
    { title: 'Шаблони Stories Instagram',     project: proj3._id, assignee: andriy._id, status: 'todo',       priority: 'medium', deadline: new Date('2026-02-25') },
    { title: 'Технічне завдання SMM',         project: proj3._id, assignee: dmytro._id, status: 'todo',       priority: 'low',    deadline: new Date('2026-02-10') },
    { title: 'Wireframes GreenLeaf',          project: proj2._id, assignee: yuliia._id, status: 'done',       priority: 'high',   deadline: new Date('2025-10-31') },
    { title: 'UI Design GreenLeaf',           project: proj2._id, assignee: yuliia._id, status: 'done',       priority: 'high',   deadline: new Date('2025-11-30') },
  ]);

  await File.create([
    { filename: 'logo_variant_1.ai',        originalName: 'logo_variant_1.ai',        project: proj1._id, uploadedBy: yuliia._id, fileType: 'Illustrator', size: 2097152, version: 'v1' },
    { filename: 'logo_variant_2.ai',        originalName: 'logo_variant_2.ai',        project: proj1._id, uploadedBy: yuliia._id, fileType: 'Illustrator', size: 1994752, version: 'v1' },
    { filename: 'moodboard_techvision.pdf', originalName: 'moodboard_techvision.pdf', project: proj1._id, uploadedBy: yuliia._id, fileType: 'PDF',         size: 5242880, version: 'v1' },
    { filename: 'greenleaf_final.fig',      originalName: 'greenleaf_final.fig',      project: proj2._id, uploadedBy: yuliia._id, fileType: 'Figma',       size: 8388608, version: 'v3' },
  ]);

  const [inv1,,inv3] = await Invoice.create([
    { invoiceNumber: 'INV-2026-001', client: techvision._id, project: proj1._id, amount: 42500, status: 'paid',    issuedAt: new Date('2026-01-15'), paidAt: new Date('2026-01-28') },
    { invoiceNumber: 'INV-2026-002', client: techvision._id, project: proj1._id, amount: 42500, status: 'pending', issuedAt: new Date('2026-03-15') },
    { invoiceNumber: 'INV-2025-008', client: greenleaf._id,  project: proj2._id, amount: 45000, status: 'paid',    issuedAt: new Date('2025-12-31'), paidAt: new Date('2026-01-07') },
  ]);

  await Payment.create([
    { invoice: inv1._id, client: techvision._id, amount: 42500, method: 'bank_transfer', paidAt: new Date('2026-01-28'), confirmedBy: olena._id },
    { invoice: inv3._id, client: greenleaf._id,  amount: 45000, method: 'bank_transfer', paidAt: new Date('2026-01-07'), confirmedBy: olena._id },
  ]);

  await Notification.create([
    { user: olena._id, type: 'task',       title: 'Нова задача',         message: 'Вам призначено: «Розробка варіантів логотипу»', isRead: false },
    { user: olena._id, type: 'payment',    title: 'Оплата отримана',     message: 'Отримано ₴42 500 від TechVision UA (INV-2026-001)', isRead: false },
    { user: olena._id, type: 'deadline',   title: 'Дедлайн наближається',message: 'Дедлайн задачі «Шаблони Stories» — 25 лютого', isRead: false },
    { user: olena._id, type: 'task',       title: 'Задача виконана',     message: '«Мудборд концепції» позначено як виконана', isRead: false },
    { user: olena._id, type: 'new_client', title: 'Новий клієнт',        message: 'Додано: Stellar Events', isRead: true },
  ]);

  console.log('✅ Seed виконано! Користувачі (пароль: admin123):');
  console.log('   olena.bondarenko@designstudio.com — director');
  console.log('   dmytro.savchenko@designstudio.com  — manager');
}

// ══════════════════════════════════════════════════════════
// ЗАПУСК
// ══════════════════════════════════════════════════════════
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB підключено');
    app.listen(PORT, () => {
      console.log(`🚀 Сервер запущено на порті ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Помилка підключення до MongoDB:', err.message);
    process.exit(1);
  });