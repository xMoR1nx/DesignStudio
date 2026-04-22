# DesignStudio Manager — Backend API Server
**Козак М.В. · ПП-32 · Львівська політехніка**  
Курс: «Проектування та розробка інформаційних систем»

---

## Стек технологій

| Рівень | Технологія |
|--------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express.js 4.18 |
| База даних | MongoDB 6+ (Mongoose ODM) |
| Авторизація | JWT (jsonwebtoken + bcryptjs) |
| Frontend | Vanilla JS SPA (index.html) |

---

## Структура проєкту

```
designstudio-server/
├── server.js              # Головний файл — запуск сервера
├── seed.js                # Наповнення БД тестовими даними
├── .env                   # Змінні середовища
├── package.json
├── models/
│   └── index.js           # 10 Mongoose-схем (User, Client, Project, ...)
├── middleware/
│   └── index.js           # auth (JWT), requireRole, errorHandler, logger
├── routes/
│   ├── auth.js            # POST /login, /logout, /refresh · GET /me
│   ├── clients.js         # CRUD клієнтів
│   ├── projects.js        # CRUD проєктів + GET /tasks проєкту
│   ├── tasks.js           # CRUD задач + коментарі
│   ├── invoices.js        # CRUD рахунків-фактур
│   ├── payments.js        # Підтвердження оплат
│   ├── notifications.js   # Сповіщення + позначити прочитаним
│   ├── files.js           # Файловий реєстр
│   ├── orders.js          # Публічна форма замовлення
│   └── admin.js           # Статистика, управління юзерами
└── public/
    └── index.html         # Frontend SPA (з реальними fetch()-запитами)
```

---

## Встановлення та запуск

### 1. Встановити залежності
```bash
cd designstudio-server
npm install
```

### 2. Запустити MongoDB
```bash
# macOS / Linux
mongod --dbpath ./data

# або якщо MongoDB встановлено як сервіс
sudo systemctl start mongod     # Linux
brew services start mongodb-community  # macOS
```

### 3. Наповнити базу тестовими даними
```bash
node seed.js
```
Виведе:
```
✅ Seed виконано успішно!
🔑 Demo-акаунти (пароль: admin123):
   olena.bondarenko@designstudio.com  — director
   dmytro.savchenko@designstudio.com  — manager
   yuliia.koval@designstudio.com      — designer
   andriy.lytvyn@designstudio.com     — designer
```

### 4. Запустити сервер
```bash
# Продакшен
npm start

# Або з автоперезавантаженням (для розробки)
npm run dev
```

### 5. Відкрити в браузері
```
http://localhost:3000
```

---

## API Endpoints

### Авторизація
| Метод | URL | Опис |
|-------|-----|------|
| POST | `/api/auth/login` | Вхід (повертає JWT) |
| POST | `/api/auth/logout` | Вихід |
| POST | `/api/auth/refresh` | Оновити токен |
| GET | `/api/auth/me` | Поточний користувач |

### Клієнти
| Метод | URL | Роль |
|-------|-----|------|
| GET | `/api/clients` | всі |
| POST | `/api/clients` | director, manager |
| GET | `/api/clients/:id` | всі |
| PATCH | `/api/clients/:id` | director, manager |
| DELETE | `/api/clients/:id` | director |

### Проєкти
| Метод | URL | Опис |
|-------|-----|------|
| GET | `/api/projects` | список (фільтр: status, client) |
| POST | `/api/projects` | створити |
| GET | `/api/projects/:id` | деталі |
| PATCH | `/api/projects/:id` | оновити |
| DELETE | `/api/projects/:id` | видалити |
| GET | `/api/projects/:id/tasks` | задачі проєкту (Kanban) |

### Задачі, Фінанси, Файли
| GET/POST/PATCH | `/api/tasks` | Kanban-задачі |
| GET/POST/PATCH | `/api/invoices` | рахунки-фактури |
| POST | `/api/payments` | підтвердити оплату |
| GET | `/api/files` | файловий реєстр |
| POST | `/api/orders` | **публічна** форма замовлення |
| GET | `/api/notifications/:userId` | сповіщення |
| GET | `/api/admin/stats` | статистика (director) |
| GET | `/api/health` | health check |

---

## Demo-авторизація

```
Email:  olena.bondarenko@designstudio.com
Пароль: admin123
Роль:   director (повний доступ)
```

---

## Приклад запиту (curl)

```bash
# Логін
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"olena.bondarenko@designstudio.com","password":"admin123"}'

# Список проєктів (з токеном)
curl http://localhost:3000/api/projects \
  -H "Authorization: Bearer <ваш_токен>"

# Публічна форма замовлення (без токену)
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"name":"Іван","email":"ivan@test.com","serviceType":"Брендинг та айдентика","description":"Потрібен логотип"}'
```

---

## Моделі MongoDB

| Колекція | Опис |
|----------|------|
| `users` | Користувачі системи (director / manager / designer) |
| `clients` | CRM — клієнти студії |
| `projects` | Проєкти з прогресом, бюджетом, дедлайном |
| `tasks` | Kanban-задачі з коментарями |
| `files` | Файловий реєстр проєктів |
| `invoices` | Рахунки-фактури |
| `payments` | Підтверджені оплати |
| `notifications` | Push-сповіщення для юзерів |
| `orders` | Заявки з публічної форми сайту |
| `refreshtokens` | JWT refresh token rotation |
