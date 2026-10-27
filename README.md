# YouFlow 💰

A modern, aesthetic, self-hosted personal finance tracker for managing daily expenses, tracking stocks, mutual funds, and fixed deposits in one unified command center. Designed for single-user privacy, full data ownership, and responsive mobile-first usage.

---

## ✨ Features

- 🔐 **Privacy & Security First**: Single-user architecture with bcrypt-hashed credentials and JWT authentication. No third-party data tracking.
- 💸 **Expense Tracker with Justification**: Categorize expenditures and capture a mandatory *"Why I spent this"* note for deliberate spending habits.
- 📈 **Real-Time Stock Portfolio**: Live price quotes for NSE & BSE stocks powered by `yfinance` with automated invested vs current value and unrealized P&L calculations.
- 🏦 **Mutual Funds & XIRR Tracking**: Real-time NAV sync from `mfapi.in` with live fund search typeahead and numerical XIRR returns calculation.
- 🏛️ **Fixed Deposits (FD) Planner**: Compounding projection, interest earned to date, maturity schedule, and ≤30 day maturity alerts.
- 📊 **Glossy Glassmorphic Dashboard**: Real-time net worth cards, asset allocation donut charts, 6-month expenditure trends, and transaction history.
- 🌓 **Dynamic Theme Switching**: Seamless toggle between sleek Light Mode and immersive Dark Mode.
- 📱 **Cross-Device Ready**: Progressive, mobile-optimized interface accessible from desktop, tablet, and mobile browsers.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with frosted glassmorphism utilities
- **Charts & Visuals**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Components & Modals**: [Radix UI](https://www.radix-ui.com/)

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11)
- **Database & ORM**: SQLite + [SQLAlchemy](https://www.sqlalchemy.org/)
- **Security & Cryptography**: Direct `bcrypt` + `python-jose` (JWT)
- **Financial Analytics**: `yfinance` (equities), `scipy.optimize` (XIRR calculation), `httpx` (MF API)

---

## 📁 Repository Structure

```text
YouFlow/
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   │   ├── auth.py         # Login, token generation, rate limiting
│   │   │   ├── dashboard.py    # Net worth & aggregate metrics
│   │   │   ├── expenses.py     # Expense CRUD & monthly breakdowns
│   │   │   ├── fd.py           # Fixed deposit projections
│   │   │   ├── mf.py           # Mutual fund NAV sync & XIRR
│   │   │   └── stocks.py       # Stock portfolio & live market pricing
│   │   ├── auth.py             # Bcrypt password verification & JWT handling
│   │   ├── config.py           # App settings via Pydantic
│   │   ├── database.py         # SQLite engine & session management
│   │   ├── models.py           # SQLAlchemy database models
│   │   ├── schemas.py          # Pydantic v2 schemas
│   │   └── main.py             # FastAPI entrypoint & SPA static file server
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/                # Axios API client handlers
│   │   ├── components/         # Glassmorphism cards, Header, Sidebar, Modals, Charts
│   │   ├── context/            # AuthContext & ThemeContext
│   │   ├── pages/              # Dashboard, Expenses, Stocks, MutualFunds, FDs, Login
│   │   └── types/              # TypeScript interfaces
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── Dockerfile                  # Multi-stage production container build
├── .dockerignore
└── .gitignore
```

---

## 🚀 Getting Started (Local Setup)

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & npm

---

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server (runs at http://localhost:8000)
python -m uvicorn app.main:app --reload --port 8000
```

> **Default Admin Account:**
> - Username: `admin`
> - Password: `changeme123`
> *(Configure custom credentials via environment variables `ADMIN_USERNAME` and `ADMIN_PASSWORD`)*

---

### 2. Frontend Setup

In a new terminal window:

```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Open **[http://localhost:5173](http://localhost:5173)** in your browser. API requests are automatically proxied to port 8000.

---

## 🌐 Free Remote & Mobile Access Options

### Option A: Free Cloudflare Tunnel (100% Free & Private)
Run YouFlow locally and securely expose it to your phone with zero port forwarding or cloud database fees:

1. Install `cloudflared`:
   ```bash
   winget install Cloudflare.cloudflared
   ```
2. Start the tunnel:
   ```bash
   cloudflared tunnel --url http://localhost:8000
   ```
3. Cloudflare gives you a free HTTPS address (e.g. `https://your-name.trycloudflare.com`) accessible from your mobile phone anywhere!

### Option B: Docker Container
Build and run the self-contained container locally:
```bash
docker build -t youflow .
docker run -p 8000:8000 -v youflow_data:/data youflow
```

---

## 📈 Stock & Mutual Fund Data Conventions

- **Indian Equities (NSE/BSE)**:
  - NSE: `RELIANCE.NS`, `TCS.NS`, `INFY.NS`, `HDFCBANK.NS`
  - BSE: `500325.BO`
  - US Stocks: `AAPL`, `MSFT`, `GOOGL`
- **Mutual Funds**:
  - Search directly by name (e.g., *"Parag Parikh"*, *"Quant Small Cap"*); scheme codes and NAVs auto-populate from `mfapi.in`.
- **API Keys**: Neither `yfinance` nor `mfapi.in` requires an API key or paid subscription.

---

## 📄 License
MIT License. Free for personal and commercial usage.
