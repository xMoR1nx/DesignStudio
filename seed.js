// ============================================================
// seed.js — наповнення MongoDB тестовими даними
// Запуск: node seed.js
// ============================================================
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const {
  User, Client, Project, Task, File, Invoice, Payment, Notification, Order, RefreshToken
} = require('./models');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/DesignStudioDB';

async function seed() {
  console.log('\n🌱 DesignStudio Manager — Seed Script');
  console.log('=====================================');

  await mongoose.connect(MONGODB_URI);
  console.log('✅ MongoDB підключено:', MONGODB_URI);

  // Очистити всі колекції
  await Promise.all([
    User.deleteMany(), Client.deleteMany(), Project.deleteMany(),
    Task.deleteMany(), File.deleteMany(), Invoice.deleteMany(),
    Payment.deleteMany(), Notification.deleteMany(), Order.deleteMany(),
    RefreshToken.deleteMany(),
  ]);
  console.log('🗑️  Колекції очищено');

  // ── КОРИСТУВАЧІ ───────────────────────────────────────────
  const passwordHash = await bcrypt.hash('admin123', 12);
  const [olena, dmytro, yuliia, andriy] = await User.create([
    {
      name: 'Олена Бондаренко',
      email: 'olena.bondarenko@designstudio.com',
      passwordHash,
      role: 'director',
      avatar: '👩‍💼',
    },
    {
      name: 'Дмитро Савченко',
      email: 'dmytro.savchenko@designstudio.com',
      passwordHash,
      role: 'manager',
      avatar: '👨‍💻',
    },
    {
      name: 'Юлія Коваль',
      email: 'yuliia.koval@designstudio.com',
      passwordHash,
      role: 'designer',
      avatar: '👩‍🎨',
    },
    {
      name: 'Андрій Литвин',
      email: 'andriy.lytvyn@designstudio.com',
      passwordHash,
      role: 'designer',
      avatar: '👨‍🎨',
    },
  ]);
  console.log('👥 Користувачів створено: 4');

  // ── КЛІЄНТИ ───────────────────────────────────────────────
  const [techvision, greenleaf, stellar, urban] = await Client.create([
    {
      companyName: 'TechVision UA',
      contactName: 'Сергій Мельник',
      email: 's.melnyk@techvision.ua',
      phone: '+380 44 123-45-67',
      status: 'active',
      manager: dmytro._id,
      totalPaid: 42500,
      notes: 'Ключовий клієнт. Потребує щотижневих апдейтів.',
    },
    {
      companyName: 'GreenLeaf Brand',
      contactName: 'Ірина Захарченко',
      email: 'i.zakharchenko@greenleaf.com',
      phone: '+380 67 234-56-78',
      status: 'active',
      manager: dmytro._id,
      totalPaid: 45000,
    },
    {
      companyName: 'Stellar Events',
      contactName: 'Максим Романенко',
      email: 'm.romanenko@stellar.events',
      phone: '+380 50 345-67-89',
      status: 'potential',
      manager: dmytro._id,
      totalPaid: 0,
      notes: 'Новий клієнт, ще на етапі погодження.',
    },
    {
      companyName: 'Urban Cafe Network',
      contactName: 'Оксана Білоус',
      email: 'o.bilous@urbancafe.com.ua',
      phone: '+380 63 456-78-90',
      status: 'inactive',
      manager: dmytro._id,
      totalPaid: 38000,
    },
  ]);
  console.log('🏢 Клієнтів створено: 4');

  // ── ПРОЄКТИ ───────────────────────────────────────────────
  const [proj1, proj2, proj3] = await Project.create([
    {
      projectId: '#001',
      title: 'Ребрендинг TechVision UA',
      client: techvision._id,
      manager: dmytro._id,
      status: 'active',
      progress: 60,
      budget: 85000,
      deadline: new Date('2026-04-30'),
      description: 'Повний ребрендинг IT-компанії: новий логотип, фірмовий стиль, брендбук.',
      tags: ['брендинг', 'логотип', 'брендбук'],
    },
    {
      projectId: '#002',
      title: 'UX/UI GreenLeaf Brand',
      client: greenleaf._id,
      manager: dmytro._id,
      status: 'completed',
      progress: 100,
      budget: 45000,
      deadline: new Date('2025-12-31'),
      description: 'UX/UI дизайн корпоративного сайту з мобільною адаптацією.',
      tags: ['ux/ui', 'figma', 'сайт'],
    },
    {
      projectId: '#003',
      title: 'SMM Stellar Events',
      client: stellar._id,
      manager: dmytro._id,
      status: 'new',
      progress: 15,
      budget: 18000,
      deadline: new Date('2026-03-15'),
      description: 'SMM-kit для Instagram та Facebook: Stories, пости, обкладинки.',
      tags: ['smm', 'instagram', 'контент'],
    },
  ]);
  console.log('📁 Проєктів створено: 3');

  // ── ЗАДАЧІ ────────────────────────────────────────────────
  await Task.create([
    {
      title: 'Розробка варіантів логотипу',
      project: proj1._id, assignee: yuliia._id,
      status: 'in_progress', priority: 'high',
      deadline: new Date('2026-03-10'),
    },
    {
      title: 'Концепція мудборду',
      project: proj1._id, assignee: yuliia._id,
      status: 'in_progress', priority: 'high',
      deadline: new Date('2026-02-15'),
    },
    {
      title: 'Палітра кольорів та типографіка',
      project: proj1._id, assignee: yuliia._id,
      status: 'todo', priority: 'medium',
      deadline: new Date('2026-03-20'),
    },
    {
      title: 'Шаблони Stories Instagram',
      project: proj3._id, assignee: andriy._id,
      status: 'todo', priority: 'medium',
      deadline: new Date('2026-02-25'),
    },
    {
      title: 'Технічне завдання SMM',
      project: proj3._id, assignee: dmytro._id,
      status: 'todo', priority: 'low',
      deadline: new Date('2026-02-10'),
    },
    {
      title: 'Wireframes GreenLeaf',
      project: proj2._id, assignee: yuliia._id,
      status: 'done', priority: 'high',
      deadline: new Date('2025-10-31'),
    },
    {
      title: 'UI Design GreenLeaf',
      project: proj2._id, assignee: yuliia._id,
      status: 'done', priority: 'high',
      deadline: new Date('2025-11-30'),
    },
  ]);
  console.log('✅ Задач створено: 7');

  // ── ФАЙЛИ ─────────────────────────────────────────────────
  await File.create([
    {
      filename: 'logo_variant_1.ai', originalName: 'logo_variant_1.ai',
      project: proj1._id, uploadedBy: yuliia._id,
      fileType: 'Illustrator', size: 2097152, version: 'v1',
      createdAt: new Date('2026-03-10'),
    },
    {
      filename: 'logo_variant_2.ai', originalName: 'logo_variant_2.ai',
      project: proj1._id, uploadedBy: yuliia._id,
      fileType: 'Illustrator', size: 1994752, version: 'v1',
      createdAt: new Date('2026-03-10'),
    },
    {
      filename: 'moodboard_techvision.pdf', originalName: 'moodboard_techvision.pdf',
      project: proj1._id, uploadedBy: yuliia._id,
      fileType: 'PDF', size: 5242880, version: 'v1',
      createdAt: new Date('2026-02-15'),
    },
    {
      filename: 'greenleaf_final_design.fig', originalName: 'greenleaf_final_design.fig',
      project: proj2._id, uploadedBy: yuliia._id,
      fileType: 'Figma', size: 8388608, version: 'v3',
      createdAt: new Date('2025-12-30'),
    },
  ]);
  console.log('🗂️  Файлів створено: 4');

  // ── РАХУНКИ-ФАКТУРИ ───────────────────────────────────────
  const [inv1, inv2, inv3] = await Invoice.create([
    {
      invoiceNumber: 'INV-2026-001',
      client: techvision._id, project: proj1._id,
      amount: 42500, status: 'paid',
      issuedAt: new Date('2026-01-15'),
      paidAt:   new Date('2026-01-28'),
      dueDate:  new Date('2026-02-01'),
    },
    {
      invoiceNumber: 'INV-2026-002',
      client: techvision._id, project: proj1._id,
      amount: 42500, status: 'pending',
      issuedAt: new Date('2026-03-15'),
      dueDate:  new Date('2026-04-01'),
    },
    {
      invoiceNumber: 'INV-2025-008',
      client: greenleaf._id, project: proj2._id,
      amount: 45000, status: 'paid',
      issuedAt: new Date('2025-12-31'),
      paidAt:   new Date('2026-01-07'),
      dueDate:  new Date('2026-01-15'),
    },
  ]);
  console.log('💳 Рахунків створено: 3');

  // ── ПЛАТЕЖІ ───────────────────────────────────────────────
  await Payment.create([
    {
      invoice: inv1._id, client: techvision._id,
      amount: 42500, method: 'bank_transfer',
      paidAt: new Date('2026-01-28'), confirmedBy: olena._id,
    },
    {
      invoice: inv3._id, client: greenleaf._id,
      amount: 45000, method: 'bank_transfer',
      paidAt: new Date('2026-01-07'), confirmedBy: olena._id,
    },
  ]);
  console.log('💰 Платежів створено: 2');

  // ── СПОВІЩЕННЯ ────────────────────────────────────────────
  await Notification.create([
    {
      user: olena._id, type: 'task',
      title: 'Нова задача',
      message: 'Вам призначено задачу: «Розробка варіантів логотипу»',
      isRead: false,
    },
    {
      user: olena._id, type: 'payment',
      title: 'Оплата отримана',
      message: 'Отримано оплату ₴42 500 від TechVision UA (INV-2026-001)',
      isRead: false,
    },
    {
      user: olena._id, type: 'deadline',
      title: 'Дедлайн наближається',
      message: 'Нагадування: дедлайн задачі «Шаблони Stories Instagram» — 25 лютого 2026',
      isRead: false,
    },
    {
      user: olena._id, type: 'task',
      title: 'Задача виконана',
      message: 'Задача «Мудборд концепції» позначена як виконана',
      isRead: false,
    },
    {
      user: olena._id, type: 'new_client',
      title: 'Новий клієнт',
      message: 'Додано нового клієнта: Stellar Events',
      isRead: true,
    },
  ]);
  console.log('🔔 Сповіщень створено: 5');

  // ── ТЕСТОВА ЗАЯВКА ────────────────────────────────────────
  await Order.create({
    name: 'Тестовий замовник',
    email: 'test@example.com',
    company: 'Test Company',
    serviceType: 'Брендинг та айдентика',
    budget: '₴10 000 – ₴30 000',
    description: 'Потрібен логотип та фірмовий стиль для нового стартапу.',
  });
  console.log('📬 Тестову заявку створено: 1');

  console.log('\n=====================================');
  console.log('✅ Seed виконано успішно!\n');
  console.log('🔑 Demo-акаунти (пароль: admin123):');
  console.log('   olena.bondarenko@designstudio.com  — director');
  console.log('   dmytro.savchenko@designstudio.com  — manager');
  console.log('   yuliia.koval@designstudio.com      — designer');
  console.log('   andriy.lytvyn@designstudio.com     — designer');
  console.log('=====================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed помилка:', err.message);
  process.exit(1);
});
