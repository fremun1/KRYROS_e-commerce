# KRYROS MOBILE - E-Commerce + Fintech Platform

A comprehensive multi-service commerce + fintech platform for **KRYROS MOBILE TECH LIMITED**.

## 📦 GitHub Repository
https://github.com/StarkTol/KRYROS_MOBILE_PROJECT

---

## 🏗️ Project Structure

```
KRYROS_MOBILE_PROJECT/
├── Backend/                 # NestJS API Server
│   ├── prisma/             # Database schema (50+ models)
│   └── src/                # API modules
├── Frontend/
│   ├── User-UI/           # Customer-facing app
│   └── Admi-Panel/        # Admin dashboard
└── render.yaml            # Render.com deployment config
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
git clone https://github.com/StarkTol/KRYROS_MOBILE_PROJECT.git
cd KRYROS_MOBILE_PROJECT
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
# Backend runs on http://localhost:3000
```

### 3. Frontend Setup (User UI)

```bash
cd Frontend/User-UI
npm install

# Copy and configure environment
cp .env.example .env

# Start development server
npm run dev
# User UI runs on http://localhost:3000
```

### 4. Frontend Setup (Admin Panel)

```bash
cd Frontend/Admi-Panel
npm install
npm run dev
# Admin Panel runs on http://localhost:3001
```

---

## 🔧 Deployment on Render.com

### Prerequisites
1. Create a Render.com account
2. Create a PostgreSQL database on Render

### Manual Deployment Steps

1. **Deploy Backend:**
   - Create new Web Service
   - Build Command: `cd Backend && npm install && npx prisma generate`
   - Start Command: `cd Backend && npm run start:prod`
   - Add Environment Variables:
     - `DATABASE_URL`: Your Neon PostgreSQL connection string
     - `JWT_SECRET`: A random secure string

2. **Deploy User UI:**
   - Create new Web Service
   - Build Command: `cd Frontend/User-UI && npm install && npm run build`
   - Start Command: `cd Frontend/User-UI && npm run start`
   - Add Environment Variables:
     - `NEXT_PUBLIC_API_URL`: Your backend API base (e.g., https://kryrosbackend-hxfp.onrender.com/api)
     - `NEXT_PUBLIC_FRONTEND_URL`: https://kryros.com
     - `NEXT_PUBLIC_ADMIN_URL`: https://kryrosadmin.onrender.com

3. **Deploy Admin Panel:**
   - Create new Web Service  
   - Build Command: `cd Frontend/Admi-Panel && npm install && npm run build`
   - Start Command: `cd Frontend/Admi-Panel && npm run start`
   - Add Environment Variables:
     - `NEXT_PUBLIC_API_URL`: Your backend API base (e.g., https://kryrosbackend-hxfp.onrender.com/api)

### Or Use render.yaml
The `render.yaml` file contains the deployment configuration. Connect your GitHub repo to Render and it will auto-detect the configuration.

---

## 🛠️ Recommended Environment Variables (Production)

### Backend
```env
FRONTEND_URL=https://kryros.com
CORS_ORIGINS=https://kryros.com,https://www.kryros.com,https://kryrosweb-dr6p.onrender.com,https://kryrosadmin.onrender.com
DATABASE_URL=...
JWT_SECRET=...
```

### Frontend (User UI & Admin)
```env
NEXT_PUBLIC_API_URL=https://kryrosbackend-hxfp.onrender.com/api
NEXT_PUBLIC_FRONTEND_URL=https://kryros.com
NEXT_PUBLIC_ADMIN_URL=https://kryrosadmin.onrender.com
```

Tip: copy the provided .env.example files in each app to .env.local or .env.production as needed.

---

## 📄 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, Tailwind CSS, Framer Motion |
| Backend | NestJS, Prisma ORM |
| Database | PostgreSQL (Neon) |
| Auth | JWT |
| Payments | Paystack, Flutterwave |

---

## 📧 Contact

**KRYROS MOBILE TECH LIMITED**
- Phone: +260966423719
- Email: kryrosmobile@gmail.com
