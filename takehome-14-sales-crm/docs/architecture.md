# Architecture

## What are the moving pieces, and how do they talk to each other?

Two deployables:

- **Frontend** — React + Vite SPA (`frontend/`). Talks to the backend only through a
  centralized Axios client (`src/api/client.js`) plus per-resource modules
  (`api/auth.js`, `api/companies.js`, `api/deals.js`, `api/dashboard.js`, `api/alerts.js`).
  TanStack Query owns all server-state caching; the SPA holds no business logic — it
  renders what the API returns and re-fetches after mutations.
- **Backend** — Django + Django REST Framework (`backend/apps/`), split into five apps
  by responsibility: `accounts` (custom `User` + roles + JWT), `companies`,
  `deals` (the core domain — stage lifecycle, collaborators, history, bulk actions,
  CSV export), `dashboard` (read-only aggregation endpoints), `alerts` (past-due
  detection and dismissal).

They communicate over a versioned JSON REST API (`/api/v1/...`) with JWT bearer auth
(`djangorestframework-simplejwt`). PostgreSQL is the only source of truth; nothing is
cached or recomputed client-side that the server didn't already compute (dashboard
numbers, filtering, sorting, pagination are all server-side).

## Where does each piece run?

- Backend: Django app served by Gunicorn, static assets via WhiteNoise.
- Database: PostgreSQL.
- Frontend: static build output from Vite, served separately from the Django API.


## What is the request path for one representative user action, end to end?

Example — a manager reassigns a deal's owner:

1. React page collects the new owner via a form (React Hook Form + Zod validation is
   client-side UX only, not a security boundary).
2. Axios sends `PATCH /api/v1/deals/{id}/` (or the dedicated reassignment action) with
   a JWT access token attached by the client interceptor.
3. DRF authenticates the JWT, then a custom permission class (e.g. `IsSalesManager`)
   checks the role server-side before the view is even reached.
4. The view delegates to `deals/services.py` rather than mutating the model directly —
   the service function wraps the owner change and the `DealHistory` write in a single
   DB transaction.
5. `DealHistory.save()` enforces append-only at the model level (raises if called on an
   existing pk), so the audit row can't be edited even by a bug elsewhere in the code.
6. Response returns the updated deal; TanStack Query invalidates the relevant query
   keys and the UI re-renders from fresh server data.

