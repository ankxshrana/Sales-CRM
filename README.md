<div align="center">

# 📊 Busy InfoTech — Sales CRM & Deal Pipeline

**A full-stack, role-based Sales CRM built with React and Django REST Framework**

*Server-enforced permissions · Auditable deal lifecycle · Bulk actions with per-item results · Live dashboard*

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-5.1-092E20?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![DRF](https://img.shields.io/badge/Django%20REST%20Framework-3.15-red)](https://www.django-rest-framework.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-database-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

</div>

---

## About this project

This was a **take-home assignment** given as part of a hiring process — the spec
(roles, stage rules, bulk-action behavior, dashboard, alerts) was provided, not
self-chosen. What's below documents how it was approached and built.

Most CRM take-homes stop at CRUD. This one implements the parts that actually
separate a working system from a demo: **server-side authorization that can't be
bypassed from the client**, a **deal-stage state machine** with validated forward/
backward transitions, an **append-only audit trail**, and **bulk operations that
report partial success per item** instead of failing the whole batch.

## ✨ Features

| Area | What it does |
|---|---|
| 🔐 **Auth & Roles** | Custom `User` model, JWT auth, two roles (`MANAGER` / `REP`) enforced with dedicated DRF permission classes — never just hidden in the UI |
| 🏢 **Companies** | CRUD, ownership, archive/restore |
| 🤝 **Deals** | Full lifecycle — creation, ownership, collaborators (many-to-many with role), owner reassignment |
| 🔄 **Stage Engine** | Fixed stages (`NEW → QUALIFIED → PROPOSAL → NEGOTIATION → WON/LOST`); one-step-back requires a reason; closed deals can only be reopened by a manager, restoring the exact prior stage |
| 📜 **Audit Trail** | `DealHistory` model — immutable at the model level (`save()`/`delete()` raise on existing rows), not just "we don't expose an endpoint for it" |
| ⚡ **Bulk Actions** | Bulk reassign / bulk advance across many deals in one call, with a per-deal success/rejection report and reason |
| 📤 **CSV Export** | Full open pipeline — company, stage, value, and stage-weighted value |
| 📈 **Dashboard** | Server-computed: open deal count, weighted pipeline, won/lost this month, breakdowns by stage and owner, 8-week won-deals trend |
| 🔔 **Alerts** | Past-due deal detection with dismissal that correctly *reappears* if the expected close date changes and lapses again |

## 🛠️ Tech Stack

**Frontend** — React 18 · Vite · TanStack Query · React Router · React Hook Form + Zod · Axios · Recharts · Tailwind CSS · Lucide Icons

**Backend** — Django 5.1 · Django REST Framework · SimpleJWT · django-filter · django-cors-headers · PostgreSQL (via `psycopg`) · Gunicorn · WhiteNoise

**Architecture principle:** React handles presentation only. Every permission check,
every stage transition, and every monetary calculation (`DecimalField`, never a
float) is validated and computed on the Django server.

## 🏗️ Project Structure

```
busy-infotech/
├── backend/
│   └── apps/
│       ├── accounts/     # Custom User model, JWT auth, roles
│       ├── companies/    # Company CRUD, ownership, archive
│       ├── deals/        # Core domain: stage engine, collaborators, history, bulk actions
│       ├── dashboard/    # Server-side aggregation endpoints
│       └── alerts/       # Past-due detection & dismissal logic
└── frontend/
    └── src/
        ├── pages/        # Dashboard, Companies, Deals, Alerts, Profile
        ├── api/          # Centralized API service modules
        ├── context/      # Auth context
        └── components/   # Reusable UI
```

## 🚀 Getting Started

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend
cd frontend
npm install
npm run dev
```

> Add your own `DATABASE_URL`, `SECRET_KEY`, and CORS settings in `.env` — see
> `.env.example`.

## 📡 API Overview

```
POST   /api/v1/auth/login/              GET   /api/v1/deals/
POST   /api/v1/auth/refresh/            POST  /api/v1/deals/
GET    /api/v1/auth/me/                 GET   /api/v1/deals/{id}/
GET    /api/v1/companies/               POST  /api/v1/deals/bulk-advance/
POST   /api/v1/companies/{id}/archive/  POST  /api/v1/deals/bulk-reassign/
                                         GET   /api/v1/deals/export/
GET    /api/v1/dashboard/               DELETE /api/v1/deals/{id}/collaborators/{user_id}/
GET    /api/v1/alerts/
POST   /api/v1/alerts/{id}/dismiss/
```

## 👤 About the Developer

**Ankush Rana**
MCA student at Thapar Institute of Engineering & Technology (TIET), Patiala · B.Sc.
in Electronic Science, University of Delhi

Currently serving as **Research Secretary** at the CODE METRICS Research Society
(machine learning, deep learning, and NLP projects) and **Student Placement
Representative** at TIET, liaising between students, recruiters, and the placement
cell. Previously a **Research Analyst Intern** at Cosmic Attire and a **Student
Intern at DRDO**, where he built a computer-vision face-mask detection and alert
system using deep learning — the same instinct for pairing a working model with a
real alerting mechanism shows up here in this project's own alert system.

Earlier research at the SPIE Student Chapter (Univ. of Delhi) spanned quantum dots,
superconductivity, and Mixed Reality, and included two years as chapter President —
during which the chapter won a SPIE Outreach Grant and the SPIE Presidential Award
for Outstanding Student Chapter. His undergraduate dissertation on 3D-printing in
science pedagogy led to two published papers in the *International Journal Physics
Education*.

📧 [ankxsh.rana@gmail.com](mailto:ankxsh.rana@gmail.com)
🔗 [LinkedIn](https://linkedin.com/in/ankxshrana)

---

<div align="center">

*Built in response to an assigned take-home specification, as a demonstration of
production-oriented full-stack architecture — not just a UI that looks correct, but
a backend that enforces the rules underneath it.*

</div>
