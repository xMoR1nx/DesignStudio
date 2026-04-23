# DesignStudio Manager

**Інформаційна система управління дизайн-студією**  
_Курсова робота з дисципліни «Проектування та розробка інформаційних систем»_  
**Автор: Козак М.В. • ПП-32 • Національний університет «Львівська політехніка»**

[![Live Demo](https://img.shields.io/badge/🚀_Демо-Render-46a2f1?style=flat-square)](https://designstudio-7x2v.onrender.com)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-18%2B-brightgreen?style=flat-square&logo=node.js)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-6%2B-4ea94b?style=flat-square&logo=mongodb)](https://www.mongodb.com/atlas)
[![Docker](https://img.shields.io/badge/Docker-✔-2496ed?style=flat-square&logo=docker)](https://www.docker.com/)

---

## 📖 Опис

**DesignStudio Manager** — повноцінна веб-система для автоматизації роботи дизайн-студії. Включає **CRM для клієнтів**, **Kanban-дошку для задач**, **фінансовий облік** (рахунки, платежі, аналітика), **файловий реєстр** та **публічний сайт** із формою замовлення. Реалізовано рівні доступу (RBAC), JWT-авторизацію, email-сповіщення через Gmail та адаптивний dark-інтерфейс українською мовою.

---

## 🚀 Демо

**🌍 Публічний доступ:** [https://designstudio-7x2v.onrender.com](https://designstudio-7x2v.onrender.com)

**Демо-логін (роль Director):**  
- Email: `kozakmarian06@gmail.com`  
- Пароль: `admin123`

> Після входу можна оглянути всі модулі системи (Dashboard, Проєкти, Задачі, Клієнти, Фінанси тощо).

---

## 🧰 Стек технологій

| Категорія | Інструменти |
|-----------|--------------|
| **Backend** | Node.js 18+, Express.js 4.18, Mongoose ODM |
| **База даних** | MongoDB 6+ (MongoDB Atlas) |
| **Авторизація** | JSON Web Token (JWT), bcryptjs, refresh token rotation |
| **Email** | Nodemailer + Gmail SMTP (HTML-листи) |
| **Frontend** | HTML5, CSS3 (Flexbox, Grid, Custom Properties), Vanilla JavaScript SPA |
| **Тестування** | Jest 29 (24 юніт-тести) |
| **Контейнеризація** | Docker, Docker Compose |
| **Деплой** | Render (Docker Web Service) |
| **Моніторинг** | Health check endpoint `/api/health` |

---

## 📁 Структура проєкту
DesignStudio/
├── server-all.js # Основний бекенд-файл (моделі, роути, middleware)
├── designstudio.html # Повний фронтенд (SPA – всі сторінки)
├── designstudio.test.js # Юніт-тести (Jest)
├── Dockerfile # Інструкція для збірки Docker-образу
├── docker-compose.yml # Конфігурація для локального Docker-запуску
├── package.json # Залежності та скрипти
├── .gitignore
├── .env.example # Приклад змінних оточення
└── README.md # Цей файл


---

## 🔧 Встановлення та локальний запуск

### 📦 Через Docker (рекомендовано)

```bash
# 1. Клонуйте репозиторій
git clone https://github.com/xMoR1nx/DesignStudio.git
cd DesignStudio

# 2. Запустіть MongoDB та сервер
docker-compose up --build -d

# 3. Наповніть базу тестовими даними
docker-compose exec app node seed.js
Сервер буде доступний за адресою http://localhost:3000

🖥️ Локально без Docker (потрібен Node.js та MongoDB)
bash
npm install
# налаштуйте MONGO_URI та JWT_SECRET у .env
npm start
🌐 API Endpoints
🔐 Авторизація
Метод	URL	Опис
POST	/api/auth/login	Отримати JWT
POST	/api/auth/logout	Вихід
POST	/api/auth/refresh	Оновити токен
GET	/api/auth/me	Дані поточного користувача
👥 Клієнти (CRM)
Метод	URL	Права доступу
GET	/api/clients	будь-яка роль
POST	/api/clients	director, manager
GET	/api/clients/:id	будь-яка
PATCH	/api/clients/:id	director, manager
DELETE	/api/clients/:id	director
📂 Проєкти
GET /api/projects – список (з фільтрами),
POST /api/projects – створити,
GET /api/projects/:id – деталі,
PATCH /api/projects/:id – оновити,
DELETE /api/projects/:id – видалити,
GET /api/projects/:id/tasks – Kanban-задачі проєкту.

✅ Задачі (Kanban)
GET /api/tasks – всі задачі (фільтри: status, priority, assignee),
POST /api/tasks – створити,
PATCH /api/tasks/:id – змінити статус / виконавця,
DELETE /api/tasks/:id – видалити.

💰 Фінанси
GET /api/invoices – рахунки + аналітика,
POST /api/invoices – виставити рахунок,
PATCH /api/invoices/:id – оновити статус,
POST /api/payments – підтвердити оплату.

🗂️ Файли
GET /api/files – файловий реєстр (з фільтром за проєктом),
POST /api/files – зареєструвати файл.

📬 Замовлення (публічні)
POST /api/orders – заявка з сайту (без авторизації),
GET /api/orders – список заявок (director/manager),
PATCH /api/orders/:id – зміна статусу.

🔔 Сповіщення
GET /api/notifications/:userId – сповіщення користувача,
PATCH /api/notifications/:id/read – позначити прочитаним.

📊 Адміністрування (тільки director)
GET /api/admin/stats – загальна статистика,
GET /api/admin/users – список користувачів,
POST /api/admin/users – створити нового користувача.

🫀 Health check
GET /api/health – статус сервера та БД.

🗃️ Моделі MongoDB (Mongoose)
Колекція	Призначення
users	Користувачі системи (4 ролі)
clients	CRM-клієнти
projects	Проєкти (статус, бюджет, прогрес)
tasks	Kanban-задачі з коментарями
invoices	Рахунки-фактури
payments	Підтверджені оплати
files	Реєстр файлів проєктів
notifications	Внутрішні сповіщення
orders	Заявки з публічної форми
refreshtokens	Refresh-токени для безпечного оновлення JWT

🧪 Тестування
Проєкт містить 24 юніт-тести (Jest), які покривають:
JWT-авторизацію
Хешування паролів (bcrypt)
Валідацію форм замовлень
Фінансову аналітику
Генерацію ID проєктів
Допоміжні функції форматування

bash
npm test
Результат: 24 passed, 24 total ✅

📧 Email-сповіщення
Система автоматично надсилає HTML-листи через Gmail SMTP:
Адміністратору – при надходженні нової заявки (деталі + посилання на кабінет)
Клієнту – підтвердження отримання заявки
Новому користувачу – дані для входу
Налаштування пошти виконується через змінні оточення EMAIL_USER та EMAIL_PASS (пароль додатку Gmail).

🚢 Деплой
Система розгорнута на платформі Render як Docker Web Service.
База даних: MongoDB Atlas (хмарний кластер)
Автоматичний деплой: з гілки main репозиторію GitHub
Для розгортання власного екземпляра достатньо:
Форкнути репозиторій
Підключити його до Render (або іншої Docker-сумісної платформи)
Вказати змінні оточення: MONGO_URI, JWT_SECRET, EMAIL_USER, EMAIL_PASS, BASE_URL

📝 Ліцензія
Цей проєкт створено виключно в навчальних цілях.
© 2026 Козак М.В., Національний університет «Львівська політехніка».