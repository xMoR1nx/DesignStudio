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
DesignStudio/
├── server-all.js        # Головний файл бекенду (моделі, роути та логіка в одному файлі)
├── seed.js              # Скрипт для наповнення БД тестовими даними
├── .env                 # Змінні середовища 
├── package.json         # Залежності та скрипти
└── designstudio.html    # Frontend сторінка (клієнтська частина)
```

---

## Встановлення та запуск

## Запуск через Docker (Для перевірки)

Проєкт повністю налаштований для запуску через Docker. Вам не потрібно встановлювати Node.js або MongoDB локально.

### 1. Запуск проєкту
Відкрийте термінал у папці проєкту та виконайте:
\`\`\`bash
docker-compose up --build -d
\`\`\`
Після цього сервер буде доступний за адресою: http://localhost:3000

### 2. Наповнення бази тестовими даними (Seed)
Щоб створити демо-користувачів та тестові дані, виконайте команду:
\`\`\`bash
docker-compose exec app node seed.js
\`\`\`

### 3. Зупинка проєкту
\`\`\`bash
docker-compose down
\`\`\`

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
