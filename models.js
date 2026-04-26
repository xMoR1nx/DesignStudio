const mongoose = require('mongoose');
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

module.exports = {
  User, Client, Project, Task, File,
  Invoice, Payment, Notification, Order, RefreshToken
};
