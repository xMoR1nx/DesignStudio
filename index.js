// ============================================================
// models/index.js — усі Mongoose-схеми DesignStudioDB
// ============================================================
const mongoose = require('mongoose');
const { Schema } = mongoose;

// ── 1. USER ──────────────────────────────────────────────────
const userSchema = new Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role:         { type: String, enum: ['director','manager','designer','accountant'], default: 'designer' },
  avatar:       { type: String, default: '' },
  isActive:     { type: Boolean, default: true },
  lastLogin:    { type: Date },
}, { timestamps: true });

// ── 2. CLIENT ─────────────────────────────────────────────────
const clientSchema = new Schema({
  companyName:  { type: String, required: true },
  contactName:  { type: String, required: true },
  email:        { type: String, required: true },
  phone:        { type: String, default: '' },
  status:       { type: String, enum: ['active','potential','inactive'], default: 'potential' },
  manager:      { type: Schema.Types.ObjectId, ref: 'User' },
  totalPaid:    { type: Number, default: 0 },
  notes:        { type: String, default: '' },
}, { timestamps: true });

// ── 3. PROJECT ────────────────────────────────────────────────
const projectSchema = new Schema({
  projectId:    { type: String, required: true, unique: true },   // #001
  title:        { type: String, required: true },
  client:       { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  manager:      { type: Schema.Types.ObjectId, ref: 'User' },
  status:       { type: String, enum: ['new','active','paused','completed','cancelled'], default: 'new' },
  progress:     { type: Number, min: 0, max: 100, default: 0 },
  budget:       { type: Number, required: true },
  deadline:     { type: Date },
  description:  { type: String, default: '' },
  tags:         [{ type: String }],
}, { timestamps: true });

// ── 4. TASK ───────────────────────────────────────────────────
const taskSchema = new Schema({
  title:        { type: String, required: true },
  project:      { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  assignee:     { type: Schema.Types.ObjectId, ref: 'User' },
  status:       { type: String, enum: ['todo','in_progress','done'], default: 'todo' },
  priority:     { type: String, enum: ['low','medium','high'], default: 'medium' },
  deadline:     { type: Date },
  description:  { type: String, default: '' },
  comments:     [{
    author:  { type: Schema.Types.ObjectId, ref: 'User' },
    text:    { type: String },
    createdAt: { type: Date, default: Date.now },
  }],
  tags:         [{ type: String }],
}, { timestamps: true });

// ── 5. FILE ───────────────────────────────────────────────────
const fileSchema = new Schema({
  filename:     { type: String, required: true },
  originalName: { type: String, required: true },
  project:      { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  uploadedBy:   { type: Schema.Types.ObjectId, ref: 'User' },
  fileType:     { type: String },          // 'Illustrator','PDF','Figma',...
  size:         { type: Number },          // bytes
  version:      { type: String, default: 'v1' },
  url:          { type: String, default: '' },
}, { timestamps: true });

// ── 6. INVOICE ────────────────────────────────────────────────
const invoiceSchema = new Schema({
  invoiceNumber:{ type: String, required: true, unique: true },
  client:       { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  project:      { type: Schema.Types.ObjectId, ref: 'Project' },
  amount:       { type: Number, required: true },
  status:       { type: String, enum: ['pending','paid','overdue','cancelled'], default: 'pending' },
  issuedAt:     { type: Date, default: Date.now },
  paidAt:       { type: Date },
  dueDate:      { type: Date },
  description:  { type: String, default: '' },
}, { timestamps: true });

// ── 7. PAYMENT ────────────────────────────────────────────────
const paymentSchema = new Schema({
  invoice:      { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
  client:       { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  amount:       { type: Number, required: true },
  method:       { type: String, enum: ['bank_transfer','card','cash'], default: 'bank_transfer' },
  paidAt:       { type: Date, default: Date.now },
  confirmedBy:  { type: Schema.Types.ObjectId, ref: 'User' },
  note:         { type: String, default: '' },
}, { timestamps: true });

// ── 8. NOTIFICATION ───────────────────────────────────────────
const notificationSchema = new Schema({
  user:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type:         { type: String, enum: ['task','payment','deadline','new_client','system'], default: 'system' },
  title:        { type: String, required: true },
  message:      { type: String, required: true },
  isRead:       { type: Boolean, default: false },
  relatedId:    { type: Schema.Types.ObjectId },   // project/task/invoice id
}, { timestamps: true });

// ── 9. ORDER (публічна форма) ─────────────────────────────────
const orderSchema = new Schema({
  name:         { type: String, required: true },
  email:        { type: String, required: true },
  company:      { type: String, default: '' },
  serviceType:  { type: String, required: true },
  budget:       { type: String, default: '' },
  description:  { type: String, required: true },
  status:       { type: String, enum: ['new','contacted','converted','rejected'], default: 'new' },
}, { timestamps: true });

// ── 10. REFRESH TOKEN ─────────────────────────────────────────
const refreshTokenSchema = new Schema({
  token:        { type: String, required: true },
  user:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt:    { type: Date, required: true },
}, { timestamps: true });

module.exports = {
  User:         mongoose.model('User', userSchema),
  Client:       mongoose.model('Client', clientSchema),
  Project:      mongoose.model('Project', projectSchema),
  Task:         mongoose.model('Task', taskSchema),
  File:         mongoose.model('File', fileSchema),
  Invoice:      mongoose.model('Invoice', invoiceSchema),
  Payment:      mongoose.model('Payment', paymentSchema),
  Notification: mongoose.model('Notification', notificationSchema),
  Order:        mongoose.model('Order', orderSchema),
  RefreshToken: mongoose.model('RefreshToken', refreshTokenSchema),
};
