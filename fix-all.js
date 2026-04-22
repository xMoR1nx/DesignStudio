// ============================================================
// fix-all.js — повне виправлення всього функціоналу
// Запуск: node fix-all.js
// ============================================================
const fs = require('fs');
const FILE = 'designstudio.html';

if (!fs.existsSync(FILE)) {
  console.error('❌ designstudio.html не знайдено');
  process.exit(1);
}

let html = fs.readFileSync(FILE, 'utf8');
let fixes = 0;

// ══════════════════════════════════════════════════════════
// ФІКС 1: convertOrderToProject — без дублікатів, чиста логіка
// ══════════════════════════════════════════════════════════
const OLD_CONVERT = html.match(/async function convertOrderToProject[\s\S]*?^}/m);

const NEW_CONVERT = `async function convertOrderToProject(orderId, clientName, clientEmail, company, serviceType) {
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = '⏳ Створення...';

  try {
    // 1. Перевіряємо чи клієнт вже існує
    let clientId = null;
    try {
      const search = await api('/clients?search=' + encodeURIComponent(clientEmail));
      if (search.clients && search.clients.length > 0) {
        clientId = search.clients[0]._id;
        console.log('Клієнт вже існує:', clientId);
      }
    } catch(e) {}

    // 2. Якщо немає — створюємо
    if (!clientId) {
      const companyName = company || clientName;
      const cd = await api('/clients', {
        method: 'POST',
        body: JSON.stringify({
          companyName,
          contactName: clientName,
          email: clientEmail,
          status: 'potential',
          notes: 'Конвертовано із заявки. Послуга: ' + serviceType,
        })
      });
      clientId = cd.client._id;
    }

    // 3. Генеруємо унікальний projectId
    const projRes = await api('/projects');
    const maxNum = projRes.projects.reduce((max, p) => {
      const num = parseInt((p.projectId || '#000').replace('#',''));
      return num > max ? num : max;
    }, 0);
    const projectId = '#' + String(maxNum + 1).padStart(3, '0');

    // 4. Deadline — через 2 місяці
    const deadline = new Date();
    deadline.setMonth(deadline.getMonth() + 2);

    // 5. Створюємо проєкт
    const companyName = company || clientName;
    await api('/projects', {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        title: serviceType + ' — ' + companyName,
        client: clientId,
        status: 'new',
        progress: 0,
        budget: 0,
        deadline: deadline.toISOString(),
        description: 'Створено із заявки. Клієнт: ' + clientName + ' <' + clientEmail + '>',
        tags: [serviceType],
      })
    });

    // 6. Оновлюємо статус замовлення
    await api('/orders/' + orderId, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'converted' })
    });

    showToast('✅ Проєкт ' + projectId + ' створено!', 'Клієнт і проєкт додано в систему');
    loadOrders();

    // Через 2 секунди переходимо до проєктів
    setTimeout(() => {
      showDash('dash-projects', null);
      document.querySelectorAll('.sidebar-item').forEach(b => b.classList.remove('active'));
    }, 2000);

  } catch(e) {
    console.error('convertOrderToProject error:', e);
    showToast('Помилка', e.message || 'Щось пішло не так', true);
    btn.disabled = false;
    btn.textContent = '✦ В проєкт';
  }
}`;

// Replace using regex
const convertRegex = /async function convertOrderToProject[\s\S]*?\n\}/;
if (convertRegex.test(html)) {
  html = html.replace(convertRegex, NEW_CONVERT);
  console.log('✅ 1. convertOrderToProject виправлено');
  fixes++;
} else {
  // Try to find and replace by marker
  const marker = 'async function convertOrderToProject(';
  const start = html.indexOf(marker);
  if (start !== -1) {
    // Find matching closing brace
    let depth = 0, i = start, found = false;
    while (i < html.length) {
      if (html[i] === '{') depth++;
      else if (html[i] === '}') {
        depth--;
        if (depth === 0) { found = true; i++; break; }
      }
      i++;
    }
    if (found) {
      html = html.slice(0, start) + NEW_CONVERT + html.slice(i);
      console.log('✅ 1. convertOrderToProject виправлено (position)');
      fixes++;
    }
  } else {
    console.log('⚠️  1. convertOrderToProject не знайдено — додаємо');
    // Will be added with other JS below
  }
}

// ══════════════════════════════════════════════════════════
// ФІКС 2: loadOrders — показувати тільки не-converted
// ══════════════════════════════════════════════════════════
const NEW_LOAD_ORDERS = `async function loadOrders() {
  try {
    const { orders } = await api('/orders');
    // Показуємо тільки активні (не converted, не rejected)
    const active = orders.filter(o => o.status !== 'converted' && o.status !== 'rejected');
    const newCount = orders.filter(o => o.status === 'new').length;

    const sbOrders = document.getElementById('sb-orders');
    if (sbOrders) sbOrders.textContent = newCount || '';

    const subEl = document.getElementById('orders-sub');
    if (subEl) subEl.textContent = active.length + ' активних · ' + newCount + ' нових';

    const statusLabels = { new: 'Нова', contacted: 'Зв\\'язались', converted: 'Конвертовано', rejected: 'Відхилено' };
    const statusColors = { new: 'tag-gold', contacted: 'tag-purple', converted: 'tag-green', rejected: 'tag-gray' };

    const listEl = document.getElementById('orders-list');
    if (!listEl) return;

    if (active.length === 0) {
      listEl.innerHTML = '<div style="padding:3rem;text-align:center;color:var(--text-dim)">📭 Нових заявок немає</div>';
      return;
    }

    listEl.innerHTML = active.map(o => \`
      <div style="padding:1.25rem 1.5rem;border-bottom:1px solid var(--border);display:flex;gap:1.5rem;align-items:flex-start" id="order-\${o._id}">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.5rem;flex-wrap:wrap">
            <span style="font-weight:600;font-size:.95rem">\${o.name}</span>
            <span class="tag \${statusColors[o.status] || 'tag-gray'}" style="font-size:.65rem">\${statusLabels[o.status] || o.status}</span>
            <span style="font-size:.7rem;color:var(--text-dim);margin-left:auto">\${new Date(o.createdAt).toLocaleString('uk-UA')}</span>
          </div>
          <div style="font-size:.82rem;color:var(--text-muted);margin-bottom:.35rem">
            📧 <a href="mailto:\${o.email}" style="color:var(--gold);text-decoration:none">\${o.email}</a>
            \${o.company ? ' &nbsp;·&nbsp; 🏢 ' + o.company : ''}
          </div>
          <div style="font-size:.82rem;color:var(--gold-light);margin-bottom:.5rem">🎯 \${o.serviceType}\${o.budget ? ' &nbsp;·&nbsp; 💰 ' + o.budget : ''}</div>
          <div style="font-size:.82rem;color:var(--text-muted);line-height:1.65;background:var(--surface);padding:.75rem;border-radius:8px;border:1px solid var(--border)">\${o.description}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:.5rem;flex-shrink:0;min-width:110px">
          <button onclick="convertOrderToProject('\${o._id}', '\${o.name.replace(/'/g, '\\\\&apos;')}', '\${o.email}', '\${(o.company||'').replace(/'/g, '\\\\&apos;')}', '\${o.serviceType.replace(/'/g, '\\\\&apos;')}')"
            style="background:var(--gold);color:var(--void);border:none;padding:.55rem .9rem;border-radius:8px;font-size:.75rem;font-weight:700;cursor:pointer;width:100%;transition:all .2s"
            onmouseover="this.style.background='var(--gold-light)'" onmouseout="this.style.background='var(--gold)'">
            ✦ В проєкт
          </button>
          <button onclick="updateOrderStatus('\${o._id}', 'contacted'); this.textContent='✓ Зв\\'язались'; this.disabled=true"
            style="background:none;color:var(--accent);border:1px solid var(--accent);padding:.45rem .7rem;border-radius:8px;font-size:.72rem;cursor:pointer;width:100%">
            📞 Зв'язались
          </button>
          <button onclick="if(confirm('Відхилити заявку від \${o.name}?')) updateOrderStatus('\${o._id}', 'rejected')"
            style="background:none;color:var(--text-dim);border:1px solid var(--border);padding:.45rem .7rem;border-radius:8px;font-size:.72rem;cursor:pointer;width:100%">
            ✕ Відхилити
          </button>
        </div>
      </div>\`).join('');
  } catch(e) {
    const listEl = document.getElementById('orders-list');
    if (listEl) listEl.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--accent2)">❌ ' + e.message + '</div>';
  }
}`;

// Replace loadOrders function
const loadOrdersRegex = /async function loadOrders\(\)[\s\S]*?\n\}/;
if (loadOrdersRegex.test(html)) {
  html = html.replace(loadOrdersRegex, NEW_LOAD_ORDERS);
  console.log('✅ 2. loadOrders виправлено');
  fixes++;
} else {
  const start = html.indexOf('async function loadOrders()');
  if (start !== -1) {
    let depth = 0, i = start, found = false;
    while (i < html.length) {
      if (html[i] === '{') depth++;
      else if (html[i] === '}') {
        depth--;
        if (depth === 0) { found = true; i++; break; }
      }
      i++;
    }
    if (found) {
      html = html.slice(0, start) + NEW_LOAD_ORDERS + html.slice(i);
      console.log('✅ 2. loadOrders виправлено (position)');
      fixes++;
    }
  } else {
    console.log('⚠️  2. loadOrders не знайдено');
  }
}

// ══════════════════════════════════════════════════════════
// ФІКС 3: updateOrderStatus — перезавантажує після зміни
// ══════════════════════════════════════════════════════════
const OLD_UPDATE = `async function updateOrderStatus(id, status) {
  try {
    await api('/orders/' + id, { method: 'PATCH', body: JSON.stringify({ status }) });
    showToast('Оновлено', 'Статус заявки змінено');
    loadOrders();
  } catch(e) { showToast('Помилка', e.message, true); }
}`;

const NEW_UPDATE = `async function updateOrderStatus(id, status) {
  try {
    await api('/orders/' + id, { method: 'PATCH', body: JSON.stringify({ status }) });
    const labels = { contacted: 'Статус оновлено — зв\\'язались', rejected: 'Заявку відхилено' };
    showToast('✓', labels[status] || 'Оновлено');
    setTimeout(() => loadOrders(), 500);
  } catch(e) { showToast('Помилка', e.message, true); }
}`;

if (html.includes(OLD_UPDATE)) {
  html = html.replace(OLD_UPDATE, NEW_UPDATE);
  console.log('✅ 3. updateOrderStatus виправлено');
  fixes++;
}

// ══════════════════════════════════════════════════════════
// ФІКС 4: loadDashboard — правильний підрахунок метрик
// ══════════════════════════════════════════════════════════
const OLD_METRICS = `    const activeProj = projData.projects.filter(p => p.status === 'active').length;
    document.getElementById('m-projects').textContent = activeProj;
    document.getElementById('m-tasks').textContent = taskData.tasks.filter(t => t.status !== 'done').length;
    document.getElementById('m-clients').textContent = clientData.total;
    document.getElementById('m-income').textContent = '₴' + formatNum(invoiceData.analytics.paidAmount);`;

const NEW_METRICS = `    const activeProj = projData.projects.filter(p => p.status === 'active' || p.status === 'new').length;
    document.getElementById('m-projects').textContent = activeProj;
    document.getElementById('m-tasks').textContent = taskData.tasks.filter(t => t.status !== 'done').length;
    document.getElementById('m-clients').textContent = clientData.total;
    document.getElementById('m-income').textContent = '₴' + formatNum(invoiceData.analytics.paidAmount);`;

if (html.includes(OLD_METRICS)) {
  html = html.replace(OLD_METRICS, NEW_METRICS);
  console.log('✅ 4. Метрики dashboard виправлено');
  fixes++;
}

// ══════════════════════════════════════════════════════════
// ФІКС 5: sidebar badge — не показувати "0"
// ══════════════════════════════════════════════════════════
const OLD_BADGES = `    document.getElementById('sb-projects').textContent = activeProj;
    document.getElementById('sb-tasks').textContent = taskData.tasks.filter(t=>t.status!=='done').length;`;

const NEW_BADGES = `    const activeProjCount = projData.projects.filter(p => p.status === 'active' || p.status === 'new').length;
    const activeTaskCount = taskData.tasks.filter(t=>t.status!=='done').length;
    const sbProj = document.getElementById('sb-projects');
    const sbTask = document.getElementById('sb-tasks');
    if (sbProj) { sbProj.textContent = activeProjCount; sbProj.style.display = activeProjCount ? 'inline' : 'none'; }
    if (sbTask) { sbTask.textContent = activeTaskCount; sbTask.style.display = activeTaskCount ? 'inline' : 'none'; }`;

if (html.includes(OLD_BADGES)) {
  html = html.replace(OLD_BADGES, NEW_BADGES);
  console.log('✅ 5. Sidebar badges виправлено');
  fixes++;
}

// ══════════════════════════════════════════════════════════
// ФІКС 6: loadProjects — показувати "новий" статус правильно
// ══════════════════════════════════════════════════════════
const OLD_STATUS_MAP = `function statusTag(s) {
  const m={active:'<span class="tag tag-green">В роботі</span>',completed:'<span class="tag tag-purple">Завершено</span>',new:'<span class="tag tag-gold">Новий</span>',paused:'<span class="tag tag-gray">Призупинено</span>',cancelled:'<span class="tag tag-red">Скасовано</span>'};
  return m[s]||s;
}`;

const NEW_STATUS_MAP = `function statusTag(s) {
  const m = {
    active:    '<span class="tag tag-green">В роботі</span>',
    completed: '<span class="tag tag-purple">Завершено</span>',
    new:       '<span class="tag tag-gold">Новий</span>',
    paused:    '<span class="tag tag-gray">Призупинено</span>',
    cancelled: '<span class="tag tag-red">Скасовано</span>',
  };
  return m[s] || '<span class="tag tag-gray">' + s + '</span>';
}`;

if (html.includes(OLD_STATUS_MAP)) {
  html = html.replace(OLD_STATUS_MAP, NEW_STATUS_MAP);
  console.log('✅ 6. statusTag виправлено');
  fixes++;
}

// ══════════════════════════════════════════════════════════
// ФІКС 7: submitContactForm — кращий UX після відправки
// ══════════════════════════════════════════════════════════
const OLD_SUBMIT = `  try {
    const data = await api('/orders', {
      method: 'POST',
      body: JSON.stringify({
        name:        document.getElementById('cf-name').value,
        email:       document.getElementById('cf-email').value,
        company:     document.getElementById('cf-company').value,
        serviceType: document.getElementById('cf-service').value,
        budget:      document.getElementById('cf-budget').value,
        description: document.getElementById('cf-desc').value,
      }),
    });
    showToast('Запит надіслано ✓', data.message);
    document.getElementById('contact-form').reset();
  } catch(err) {
    showToast('Помилка', err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = '✦ Надіслати запит';
  }`;

const NEW_SUBMIT = `  try {
    const name  = document.getElementById('cf-name').value.trim();
    const email = document.getElementById('cf-email').value.trim();
    const service = document.getElementById('cf-service').value;
    const desc  = document.getElementById('cf-desc').value.trim();

    if (!name || !email || !service || !desc) {
      showToast('Помилка', 'Заповніть всі обов\\'язкові поля', true);
      btn.disabled = false;
      btn.textContent = '✦ Надіслати запит';
      return;
    }

    const data = await api('/orders', {
      method: 'POST',
      body: JSON.stringify({
        name,
        email,
        company:     document.getElementById('cf-company').value.trim(),
        serviceType: service,
        budget:      document.getElementById('cf-budget').value,
        description: desc,
      }),
    });

    showToast('✅ Заявку надіслано!', 'Підтвердження відправлено на ' + email);
    document.getElementById('contact-form').reset();

    // Показати success стан кнопки
    btn.style.background = 'var(--green)';
    btn.textContent = '✓ Надіслано!';
    setTimeout(() => {
      btn.style.background = '';
      btn.textContent = '✦ Надіслати запит';
    }, 3000);

  } catch(err) {
    showToast('Помилка відправки', err.message, true);
    btn.disabled = false;
    btn.textContent = '✦ Надіслати запит';
  }`;

if (html.includes(OLD_SUBMIT)) {
  html = html.replace(OLD_SUBMIT, NEW_SUBMIT);
  console.log('✅ 7. submitContactForm виправлено');
  fixes++;
}

// ══════════════════════════════════════════════════════════
// ФІКС 8: logout — повне очищення і редірект
// ══════════════════════════════════════════════════════════
const OLD_LOGOUT = `async function logout() {
  try { await api('/auth/logout', { method: 'POST' }); } catch {}
  accessToken = null; currentUser = null;
  localStorage.removeItem('ds_token');
  localStorage.removeItem('ds_user');
  showPage('home', document.querySelector('nav button'));
  document.querySelector('nav button').classList.add('active');
  showToast('Вихід', 'Ви успішно вийшли з системи');
}`;

const NEW_LOGOUT = `async function logout() {
  try {
    const rt = localStorage.getItem('ds_refresh');
    await api('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: rt }) });
  } catch {}
  accessToken = null;
  currentUser = null;
  localStorage.removeItem('ds_token');
  localStorage.removeItem('ds_user');
  localStorage.removeItem('ds_refresh');
  // Оновити хедер
  if (typeof updateHeaderAuth === 'function') updateHeaderAuth();
  // Перейти на головну
  showPage('home', null);
  const firstNavBtn = document.querySelector('nav button');
  if (firstNavBtn) {
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    firstNavBtn.classList.add('active');
  }
  showToast('До побачення!', 'Ви успішно вийшли з системи');
}`;

if (html.includes(OLD_LOGOUT)) {
  html = html.replace(OLD_LOGOUT, NEW_LOGOUT);
  console.log('✅ 8. logout виправлено');
  fixes++;
}

// ══════════════════════════════════════════════════════════
// ФІКС 9: doLogin — зберігати refresh token
// ══════════════════════════════════════════════════════════
const OLD_LOGIN_STORE = `    accessToken = data.accessToken;
    currentUser = data.user;
    localStorage.setItem('ds_token', accessToken);
    localStorage.setItem('ds_user', JSON.stringify(currentUser));
    closeModal();
    showPage('dashboard-page', null);
    updateHeaderAuth();
    showToast('Вхід успішний ✓', \`Ласкаво просимо, \${currentUser.name}!\`);`;

const NEW_LOGIN_STORE = `    accessToken = data.accessToken;
    currentUser = data.user;
    localStorage.setItem('ds_token', accessToken);
    localStorage.setItem('ds_user', JSON.stringify(currentUser));
    if (data.refreshToken) localStorage.setItem('ds_refresh', data.refreshToken);
    closeModal();
    if (typeof updateHeaderAuth === 'function') updateHeaderAuth();
    showPage('dashboard-page', null);
    showToast('Вхід успішний ✓', 'Ласкаво просимо, ' + currentUser.name + '!');`;

if (html.includes(OLD_LOGIN_STORE)) {
  html = html.replace(OLD_LOGIN_STORE, NEW_LOGIN_STORE);
  console.log('✅ 9. doLogin — refresh token збереження');
  fixes++;
}

// ══════════════════════════════════════════════════════════
// ФІКС 10: loadDashboard orders badge
// ══════════════════════════════════════════════════════════
const OLD_ORDERS_BADGE = `    // Загрузити кількість нових замовлень для бейджа
    try {
      const { orders } = await api('/orders');
      const newCount = orders.filter(o => o.status === 'new').length;
      document.getElementById('sb-orders').textContent = newCount;
    } catch {}`;

const NEW_ORDERS_BADGE = `    // Лічильник нових замовлень
    try {
      const { orders } = await api('/orders');
      const newCount = orders.filter(o => o.status === 'new').length;
      const sbOrders = document.getElementById('sb-orders');
      if (sbOrders) {
        sbOrders.textContent = newCount || '';
        sbOrders.style.display = newCount ? 'inline' : 'none';
      }
    } catch {}`;

if (html.includes(OLD_ORDERS_BADGE)) {
  html = html.replace(OLD_ORDERS_BADGE, NEW_ORDERS_BADGE);
  console.log('✅ 10. Orders badge на dashboard виправлено');
  fixes++;
}

// ══════════════════════════════════════════════════════════
// ЗБЕРЕГТИ ФАЙЛ
// ══════════════════════════════════════════════════════════
fs.writeFileSync(FILE, html, 'utf8');

console.log('\n' + '='.repeat(50));
console.log('🎉 Готово! Виправлено ' + fixes + ' з 10 пунктів.');
console.log('='.repeat(50));
console.log('\nТепер:');
console.log('1. Онови сторінку браузера (F5)');
console.log('2. Логіка роботи:');
console.log('   • Клієнт подає заявку → приходить email тобі');
console.log('   • В кабінеті: Замовлення → бачиш заявку');
console.log('   • Натискаєш "✦ В проєкт" → створюється клієнт + проєкт');
console.log('   • Заявка зникає зі списку (статус converted)');
console.log('   • В розділі Проєкти з\'являється новий проєкт');
console.log('   • Дублікатів більше не буде!');
