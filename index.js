// ============================================================
// models/index.js — усі Mongoose-схеми DesignStudioDB
// ============================================================
const mongoose = require('mongoose');

const { User, Client, Project, Task, File, Invoice, Payment, Notification, Order, RefreshToken } = require('./models');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/designstudio';
