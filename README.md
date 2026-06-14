# KRYROS MOBILE - E-Commerce + Fintech Platform

A comprehensive multi-service commerce + fintech platform for **KRYROS MOBILE TECH LIMITED**.

## 🏗️ Project Structure

```
KRYROS_e-commerce/
├── Backend/                 # NestJS API Server (api.kryros.com)
│   ├── prisma/             # Database schema
│   └── src/                # API modules
├── Frontend/
│   ├── User-UI/           # Customer-facing app (kryros.com)
│   └── Admi-Panel/        # Admin dashboard (admin.kryros.com)
```

---

## ✨ Features

- **E-Commerce:** Product catalog, cart, wishlist, orders
- **Fintech:** Buy Now Pay Later, credit profiles, installments  
- **Wholesale:** Bulk pricing, MOQ, distributor accounts
- **Admin Panel:** Full CMS, analytics, user management

---

## 🚀 Quick Start (Local Development)

### 1. Clone & Install

```bash
git clone https://github.com/fremun1/KRYROS_e-commerce.git
cd KRYROS_e-commerce
```

### 2. Backend Setup

```bash
cd Backend
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your database URL and JWT_SECRET

# Run database migrations
npx prisma migrate dev

# Start backend
npm run start:dev
# Backend runs on http://localhost:8080
```

### 3. Frontend Setup (User UI)

```bash
cd Frontend/User-UI
npm install

# Start development server
npm run dev
# User UI runs on http://localhost:5000
```

### 4. Frontend Setup (Admin Panel)

```bash
cd Frontend/Admi-Panel
npm install
npm run dev
# Admin Panel runs on http://localhost:3000
```

---

## 🔧 Deployment (DigitalOcean / VPS)

### Backend
1. Set up a Node.js environment on your VPS.
2. Use PM2 to manage the NestJS process.
3. Configure Nginx as a reverse proxy for `api.kryros.com` pointing to port `8080`.

### Frontend (User UI)
1. Build the project: `npm run build`.
2. Serve the `dist/public` folder using Nginx for `kryros.com`.

### Admin Panel
1. Build the project: `npm run build`.
2. Serve the output using Nginx for `admin.kryros.com`.

---

## 🛠️ Recommended Environment Variables (Production)

### Backend
```env
PORT=8080
NODE_ENV=production
FRONTEND_URL=https://kryros.com
CORS_ORIGINS=https://kryros.com,https://www.kryros.com,https://admin.kryros.com
DATABASE_URL=...
JWT_SECRET=...
```

### Frontend (User UI)
```env
VITE_API_URL=https://api.kryros.com
```

### Admin Panel
```env
NEXT_PUBLIC_API_URL=https://api.kryros.com
```

---

## 📄 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite (User-UI), Next.js (Admin), Tailwind CSS |
| Backend | NestJS, Prisma ORM |
| Database | PostgreSQL |
| Auth | JWT |

---

## 📧 Contact

**KRYROS MOBILE TECH LIMITED**
- Phone: +260966423719
- Email: kryrosmobile@gmail.com
