# SIH Aligned Distributed Git Repository Security Scan Dashboard

> **Domain:** Full Stack Development  
> **Academic Context:** 5th Semester Computer Science Mini-Project  
> **Target:** Open-Source Government Project Contributions  

---

## 1. Project Overview

A production-style full-stack security scanning platform allowing authenticated users to add Git/GitHub repositories, trigger on-demand security scans, detect exposed secrets (via **Gitleaks**) and repository/dependency vulnerabilities (via **Trivy**), store normalized scan results, and view aggregated insights on an interactive web dashboard.

### Core Architectural Principles
- **Leverage Existing Security Scanners**: Directly integrate industry-standard scanners (`Gitleaks` and `Trivy`) without implementing custom vulnerability databases or proprietary scanning engines.
- **Security-First Architecture**: 
  - Secrets discovered during scans are masked before rendering in UI and reports.
  - Command injection prevention during scanner invocation.
  - Per-user data isolation (users access only their own repositories and scans).
  - Encrypted passwords (bcrypt) and protected JWT routes.
- **Independent Services**: Frontend and backend can run and build completely independently or orchestrated concurrently.

---

## 2. Technology Stack

### Frontend (`frontend/`)
- **Framework & Build Tool:** React 19, Vite (JavaScript)
- **Routing:** React Router v7
- **HTTP Client:** Axios
- **Visualization:** Recharts
- **Icons:** Lucide React

### Backend (`backend/`)
- **Runtime & Framework:** Node.js (ES Modules), Express.js
- **Database & ODM:** MongoDB, Mongoose
- **Authentication & Security:** JSON Web Tokens (JWT), bcryptjs, CORS
- **Process Management:** Nodemon (development)

### Security Scanners (Integration Phase)
- **Secret Detection:** [Gitleaks](https://github.com/gitleaks/gitleaks)
- **Vulnerability Scanning:** [Trivy](https://github.com/aquasecurity/trivy)

### Planned Future Infrastructure
- Redis & BullMQ (distributed job queue for asynchronous repository scans)
- Docker & Docker Compose

---

## 3. Directory Structure

```text
git-security-dashboard/
├── frontend/
│   ├── src/
│   │   ├── assets/               # Static assets & logos
│   │   ├── components/           # UI components (common & layout)
│   │   ├── context/              # Authentication & global application state
│   │   ├── hooks/                # Custom React hooks
│   │   ├── pages/                # Route views (Auth, Dashboard, Repos, Findings)
│   │   ├── services/             # Axios API client (`api.js`)
│   │   ├── utils/                # Formatters, secret masking helpers
│   │   ├── App.jsx               # React Router root setup
│   │   ├── index.css             # Base CSS styles & resets
│   │   └── main.jsx              # React DOM render entrypoint
│   ├── .env.example              # Frontend environment variables template
│   ├── .gitignore                # Frontend-specific ignore rules
│   ├── index.html                # Single-page application entry HTML
│   ├── package.json              # Frontend dependencies & scripts
│   └── vite.config.js            # Vite configuration with backend API proxy
│
├── backend/
│   ├── src/
│   │   ├── config/               # Database connection (`db.js`)
│   │   ├── controllers/          # Route handlers
│   │   ├── middleware/           # Middleware (Auth, error handler, validators)
│   │   ├── models/               # Mongoose schemas
│   │   ├── routes/               # Express API routes
│   │   ├── services/             # Scanner process adapters & normalizers
│   │   └── app.js                # Express app configuration & middlewares
│   ├── .env.example              # Backend environment variables template
│   ├── .gitignore                # Backend-specific ignore rules
│   ├── package.json              # Backend dependencies & scripts
│   └── server.js                 # HTTP server bootstrap & DB connection
│
├── .gitignore                    # Root repository ignore rules
└── README.md                     # Project documentation & architecture
```

---

## 4. Development Setup

### Prerequisites
- **Node.js** (v18+ or v20+ recommended)
- **npm** (v9+)
- **MongoDB** (running locally or MongoDB Atlas connection string)
- **Git**

### Independent Startup

#### 1. Backend
```bash
cd backend
npm install
npm run dev
```
- API starts at: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`

#### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
- UI starts at: `http://localhost:5173`
- Pre-configured Vite reverse proxy directs `/api` requests to `http://localhost:5000`

#### 3. Concurrent Startup (from root)
```bash
npm run dev
```
Runs both backend and frontend concurrently in a single terminal.
