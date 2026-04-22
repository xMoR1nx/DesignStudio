// ============================================================
// designstudio.test.js — Юніт-тести DesignStudio Manager
// Запуск: npm test
// ============================================================

// ── Мок для mongoose ─────────────────────────────────────
jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue({}),
  Schema: class Schema {
    constructor() {}
    static Types = { ObjectId: 'ObjectId' }
  },
  model: jest.fn().mockReturnValue({}),
}));

// ── Допоміжні функції (ті самі що в server-all.js) ───────

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');

const JWT_SECRET = 'designstudio_secret_2026';

function genTokens(userId) {
  const accessToken  = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

function formatNum(n) {
  return Number(n || 0).toLocaleString('uk-UA');
}

function statusTag(s) {
  const m = {
    active:    'В роботі',
    completed: 'Завершено',
    new:       'Новий',
    paused:    'Призупинено',
    cancelled: 'Скасовано',
  };
  return m[s] || s;
}

function roleLabel(r) {
  return { director:'Director', manager:'Manager', designer:'Designer', accountant:'Accountant' }[r] || r;
}

function priorityLabel(p) {
  return { high:'High', medium:'Medium', low:'Low' }[p] || p;
}

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const h    = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (h < 1)   return 'щойно';
  if (h < 24)  return `${h} год. тому`;
  if (days < 7) return `${days} дн. тому`;
  return `${Math.floor(days / 7)} тиж. тому`;
}

function generateProjectId(existingProjects) {
  const maxNum = existingProjects.reduce((m, p) => {
    const n = parseInt((p.projectId || '#0').replace('#', ''));
    return n > m ? n : m;
  }, 0);
  return '#' + String(maxNum + 1).padStart(3, '0');
}

function validateOrderFields({ name, email, serviceType, description }) {
  const errors = [];
  if (!name || name.trim() === '')            errors.push('name обов\'язкове');
  if (!email || !email.includes('@'))         errors.push('email невірний формат');
  if (!serviceType || serviceType.trim() === '') errors.push('serviceType обов\'язкове');
  if (!description || description.trim() === '') errors.push('description обов\'язкове');
  return errors;
}

function calculateFinanceAnalytics(invoices) {
  const totalAmount   = invoices.reduce((s, i) => s + i.amount, 0);
  const paidAmount    = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const pendingAmount = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0);
  return { totalAmount, paidAmount, pendingAmount };
}

// ════════════════════════════════════════════════════════
// ТЕСТ 1: Генерація JWT токенів
// ════════════════════════════════════════════════════════
describe('JWT Авторизація', () => {

  test('TC-U01: genTokens повертає accessToken та refreshToken', () => {
    const { accessToken, refreshToken } = genTokens('user123');
    expect(accessToken).toBeDefined();
    expect(refreshToken).toBeDefined();
    expect(typeof accessToken).toBe('string');
    expect(typeof refreshToken).toBe('string');
  });

  test('TC-U02: accessToken містить правильний userId', () => {
    const userId = 'user_abc_123';
    const { accessToken } = genTokens(userId);
    const decoded = jwt.verify(accessToken, JWT_SECRET);
    expect(decoded.userId).toBe(userId);
  });

  test('TC-U03: refreshToken містить type=refresh', () => {
    const { refreshToken } = genTokens('user123');
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    expect(decoded.type).toBe('refresh');
  });

  test('TC-U04: невалідний токен викидає помилку', () => {
    expect(() => {
      jwt.verify('invalid.token.here', JWT_SECRET);
    }).toThrow();
  });

});

// ════════════════════════════════════════════════════════
// ТЕСТ 2: Хешування паролів (bcrypt)
// ════════════════════════════════════════════════════════
describe('Хешування паролів (bcrypt)', () => {

  test('TC-U05: пароль успішно хешується', async () => {
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 12);
    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.startsWith('$2b$')).toBe(true);
  });

  test('TC-U06: правильний пароль проходить перевірку', async () => {
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 12);
    const isMatch = await bcrypt.compare(password, hash);
    expect(isMatch).toBe(true);
  });

  test('TC-U07: неправильний пароль не проходить перевірку', async () => {
    const hash = await bcrypt.hash('admin123', 12);
    const isMatch = await bcrypt.compare('wrongpassword', hash);
    expect(isMatch).toBe(false);
  });

});

// ════════════════════════════════════════════════════════
// ТЕСТ 3: Валідація полів замовлення
// ════════════════════════════════════════════════════════
describe('Валідація форми замовлення', () => {

  test('TC-U08: валідне замовлення без помилок', () => {
    const errors = validateOrderFields({
      name: 'Іван Іваненко',
      email: 'ivan@example.com',
      serviceType: 'Брендинг та айдентика',
      description: 'Потрібен логотип для стартапу',
    });
    expect(errors).toHaveLength(0);
  });

  test('TC-U09: відсутній name — помилка', () => {
    const errors = validateOrderFields({
      name: '',
      email: 'ivan@example.com',
      serviceType: 'UX/UI Дизайн',
      description: 'Опис проєкту',
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('name');
  });

  test('TC-U10: невірний email — помилка', () => {
    const errors = validateOrderFields({
      name: 'Іван',
      email: 'not-an-email',
      serviceType: 'SMM та контент',
      description: 'Опис',
    });
    expect(errors.some(e => e.includes('email'))).toBe(true);
  });

  test('TC-U11: всі поля порожні — 4 помилки', () => {
    const errors = validateOrderFields({
      name: '', email: '', serviceType: '', description: '',
    });
    expect(errors).toHaveLength(4);
  });

});

// ════════════════════════════════════════════════════════
// ТЕСТ 4: Фінансова аналітика
// ════════════════════════════════════════════════════════
describe('Фінансова аналітика', () => {

  const testInvoices = [
    { invoiceNumber: 'INV-2026-001', amount: 42500, status: 'paid' },
    { invoiceNumber: 'INV-2026-002', amount: 42500, status: 'pending' },
    { invoiceNumber: 'INV-2025-008', amount: 45000, status: 'paid' },
  ];

  test('TC-U12: розрахунок загальної суми рахунків', () => {
    const { totalAmount } = calculateFinanceAnalytics(testInvoices);
    expect(totalAmount).toBe(130000);
  });

  test('TC-U13: розрахунок оплаченої суми', () => {
    const { paidAmount } = calculateFinanceAnalytics(testInvoices);
    expect(paidAmount).toBe(87500);
  });

  test('TC-U14: розрахунок суми що очікує оплати', () => {
    const { pendingAmount } = calculateFinanceAnalytics(testInvoices);
    expect(pendingAmount).toBe(42500);
  });

  test('TC-U15: порожній масив — всі суми 0', () => {
    const { totalAmount, paidAmount, pendingAmount } = calculateFinanceAnalytics([]);
    expect(totalAmount).toBe(0);
    expect(paidAmount).toBe(0);
    expect(pendingAmount).toBe(0);
  });

});

// ════════════════════════════════════════════════════════
// ТЕСТ 5: Генерація ID проєктів
// ════════════════════════════════════════════════════════
describe('Генерація ID проєктів', () => {

  test('TC-U16: перший проєкт отримує #001', () => {
    const id = generateProjectId([]);
    expect(id).toBe('#001');
  });

  test('TC-U17: наступний після #003 — #004', () => {
    const existing = [
      { projectId: '#001' },
      { projectId: '#002' },
      { projectId: '#003' },
    ];
    const id = generateProjectId(existing);
    expect(id).toBe('#004');
  });

  test('TC-U18: ID завжди має 3 цифри з нулями (#007)', () => {
    const existing = Array.from({length: 6}, (_, i) => ({
      projectId: '#' + String(i + 1).padStart(3, '0')
    }));
    const id = generateProjectId(existing);
    expect(id).toBe('#007');
    expect(id).toMatch(/^#\d{3}$/);
  });

});

// ════════════════════════════════════════════════════════
// ТЕСТ 6: Допоміжні функції форматування
// ════════════════════════════════════════════════════════
describe('Функції форматування та UI-хелпери', () => {

  test('TC-U19: formatNum форматує число в українському форматі', () => {
    expect(formatNum(87500)).toBe('87\u00a0500');
    expect(formatNum(0)).toBe('0');
    expect(formatNum(undefined)).toBe('0');
  });

  test('TC-U20: statusTag повертає правильні мітки', () => {
    expect(statusTag('active')).toBe('В роботі');
    expect(statusTag('completed')).toBe('Завершено');
    expect(statusTag('new')).toBe('Новий');
    expect(statusTag('cancelled')).toBe('Скасовано');
  });

  test('TC-U21: roleLabel повертає правильні ролі', () => {
    expect(roleLabel('director')).toBe('Director');
    expect(roleLabel('manager')).toBe('Manager');
    expect(roleLabel('designer')).toBe('Designer');
    expect(roleLabel('accountant')).toBe('Accountant');
  });

  test('TC-U22: priorityLabel повертає мітки пріоритетів', () => {
    expect(priorityLabel('high')).toBe('High');
    expect(priorityLabel('medium')).toBe('Medium');
    expect(priorityLabel('low')).toBe('Low');
  });

  test('TC-U23: timeAgo повертає «щойно» для нового часу', () => {
    const result = timeAgo(new Date());
    expect(result).toBe('щойно');
  });

  test('TC-U24: timeAgo повертає дні для старих дат', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const result = timeAgo(threeDaysAgo);
    expect(result).toContain('дн.');
  });

});
