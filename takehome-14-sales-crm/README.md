# Sales CRM / Deal Pipeline

A production-grade, full-stack Sales CRM and Deal Pipeline web application built with a **Django REST Framework (DRF)** backend and a **React + Vite** frontend.

---

## Architecture & Technology Stack

### Backend
- **Framework**: Python 3.11+ / Django 5.1 / Django REST Framework
- **Authentication**: JWT authentication with token rotation & blacklist (`djangorestframework-simplejwt`)
- **Database**: PostgreSQL with `psycopg` (with SQLite fallback for instant zero-dependency local development)
- **Permissions**: Reusable object-level DRF permissions (`IsSalesManager`, `IsSalesRep`, `IsCompanyOwner`, `IsDealOwner`, etc.)
- **Service Layer**: Dedicated domain services in `deals/services.py`, `dashboard/services.py`, and `alerts/services.py` for transactional business logic and validations.
- **Audit Logging**: Append-only, immutable `DealHistory` records tracking all stage transitions, reassignments, and notes.
- **Production Serving**: Gunicorn + WhiteNoise for static file serving.
- **Testing**: `pytest` & `pytest-django`.

### Frontend
- **Framework**: React 18 (JavaScript) + Vite
- **Styling**: Tailwind CSS with custom CRM design tokens & badge palettes
- **State & Server Cache**: TanStack React Query (`@tanstack/react-query`)
- **Routing**: React Router DOM v6 with protected routes and layouts
- **HTTP Client**: Centralized Axios client with automatic JWT bearer attachment and 401 token refresh interceptors
- **Forms & Validation**: React Hook Form + Zod
- **Data Visualization**: Recharts (Pipeline distribution & weekly win trends)
- **Icons**: Lucide React

---

## Monorepo Structure

```text
sales-crm/
├── frontend/
│   ├── src/
│   │   ├── api/             # Centralized Axios client & API resource modules
│   │   │   ├── client.js
│   │   │   ├── auth.js
│   │   │   ├── companies.js
│   │   │   ├── deals.js
│   │   │   ├── dashboard.js
│   │   │   └── alerts.js
│   │   ├── components/ui/   # Reusable UI primitives (Button, Card, Badge, Modal, Alert, etc.)
│   │   ├── context/         # AuthContext with role helpers and token persistence
│   │   ├── layouts/         # AuthLayout and MainLayout (CRM Shell with sidebar & header)
│   │   ├── pages/           # Pages: Login, Dashboard, Deals, Companies, Alerts, Profile
│   │   ├── routes/          # ProtectedRoute guard & AppRoutes definition
│   │   ├── lib/             # Utility helpers (cn, formatCurrency, formatDate)
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── public/
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── backend/
│   ├── manage.py
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   └── production.py
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── apps/
│   │   ├── accounts/        # Custom User model, roles (MANAGER, REP), JWT auth
│   │   ├── companies/       # Company model, CRUD, archive/restore
│   │   ├── deals/           # Deal model, service layer, transitions, history, collaborators
│   │   ├── dashboard/       # Backend ORM analytics & aggregation
│   │   └── alerts/          # Past-due deal alerts & automatic lifecycle
│   ├── requirements.txt
│   ├── .env.example
│   └── pytest.ini
│
├── .gitignore
├── README.md
└── docker-compose.yml       # Local PostgreSQL 16 container service
```

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- (Optional) Docker and Docker Compose for running PostgreSQL locally

---

### Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**:
   ```bash
   python3.11 -m venv .venv
   source .venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```

5. **Run database migrations**:
   ```bash
   python manage.py migrate
   ```

6. **Create a superuser (Sales Manager)**:
   ```bash
   python manage.py createsuperuser
   ```

7. **Start the Django development server**:
   ```bash
   python manage.py runserver
   ```
   Backend API runs at: `http://127.0.0.1:8000/api/v1/`

---

### Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install npm packages**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

4. **Start the Vite development server**:
   ```bash
   npm run dev
   ```
   Frontend runs at: `http://localhost:5173/`

---

### Using PostgreSQL with Docker (Optional)

To use PostgreSQL instead of SQLite:
```bash
# Start PostgreSQL container from the project root
docker compose up -d db

# Set in backend/.env:
DATABASE_URL=postgresql://crm_user:crm_secret@localhost:5432/sales_crm

# Run migrations
python manage.py migrate
```

---

## API Routes Overview (`/api/v1/`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login/` | Obtain JWT access + refresh tokens and user profile |
| `POST` | `/api/v1/auth/refresh/` | Refresh expired access token |
| `POST` | `/api/v1/auth/logout/` | Blacklist refresh token |
| `GET` | `/api/v1/auth/me/` | Retrieve current authenticated user |
| `GET` | `/api/v1/companies/` | List companies with search, filter, and pagination |
| `POST` | `/api/v1/companies/` | Create new company |
| `GET` | `/api/v1/companies/{id}/` | Retrieve company details |
| `PATCH`| `/api/v1/companies/{id}/` | Update company |
| `POST` | `/api/v1/companies/{id}/archive/` | Archive company |
| `POST` | `/api/v1/companies/{id}/restore/` | Restore archived company |
| `GET` | `/api/v1/deals/` | List deals with stage, value, and date filters |
| `POST` | `/api/v1/deals/` | Create new deal |
| `GET` | `/api/v1/deals/{id}/` | Retrieve deal details |
| `PATCH`| `/api/v1/deals/{id}/` | Update deal fields |
| `DELETE`| `/api/v1/deals/{id}/` | Delete deal (Manager only) |
| `POST` | `/api/v1/deals/{id}/stage/` | Transition deal stage with server-side validation |
| `POST` | `/api/v1/deals/{id}/reopen/` | Reopen closed deal (Manager only) |
| `GET` | `/api/v1/deals/{id}/history/` | Retrieve immutable audit timeline |
| `POST` | `/api/v1/deals/{id}/collaborators/` | Add collaborator to deal |
| `DELETE`| `/api/v1/deals/{id}/collaborators/{user_id}/` | Remove collaborator |
| `POST` | `/api/v1/deals/bulk-advance/` | Advance multiple deals to next stage |
| `POST` | `/api/v1/deals/bulk-reassign/` | Reassign multiple deals to new owner (Manager) |
| `GET` | `/api/v1/deals/export/` | Download deals data as CSV |
| `GET` | `/api/v1/dashboard/` | Aggregated ORM metrics & 8-week win trend |
| `GET` | `/api/v1/alerts/` | List active past-due deal alerts & badge count |
| `POST` | `/api/v1/alerts/{id}/dismiss/` | Dismiss alert |

---

## Deal Stage State Machine & Business Rules

1. **Stages**: `NEW` → `QUALIFIED` → `PROPOSAL` → `NEGOTIATION` → `WON` / `LOST`.
2. **Sequential Progression**: Deals must follow forward stage order. Arbitrary forward jumps (e.g. `NEW` → `PROPOSAL`) are rejected.
3. **Backward Transitions**: Moving backward is permitted **only 1 stage at a time** and **requires a written reason/justification**.
4. **Closed Deals**: Deals in `WON` or `LOST` cannot change stage unless reopened by a user with the **Sales Manager** role.
5. **Audit Trail**: Every stage change, owner reassignment, collaborator action, or reopening appends an immutable entry to `DealHistory`. History entries cannot be modified or deleted.

---

## Running Tests

Run backend automated tests:
```bash
cd backend
.venv/bin/pytest
```

Run frontend build check:
```bash
cd frontend
npm run build
```
