# Submission

## Links

- **GitHub repository:** <[https://github.com/ankxshrana/Sales-CRM](https://github.com/ankxshrana/Sales-CRM)>
- **Live application:** <[https://sales-crm-1uby.vercel.app](https://sales-crm-1uby.vercel.app)>

## Notes for the reviewer

<First, click on Demo Accounts (select either Sales Manager or Sales Rep), and it will automatically fill in the email address and password. Then click on 'Sign In ->', The user will be able to log in within 8 seconds, provided they have a good internet connection.>

## Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Manager | | |
| Rep | | |

## Stack

| Layer | What you used | Why |
|-------|---------------|-----|
| Frontend | React + Vite, TanStack Query, React Hook Form + Zod, shadcn/ui, Recharts | Interactive UI (bulk selection, stage changes, dashboard) was easier to keep clean as components than as templates — see `decisions.md` |
| Backend | Django + DRF, service-layer business logic | Auth/roles/ORM/admin out of the box; service layer keeps stage-transition rules testable and out of views |
| Database | PostgreSQL, `DecimalField` for money | Exact decimal values, relational integrity, needed aggregation for the dashboard |
| Hosting | <your actual host> | |

## Goal checklist

Mark each honestly — this is not filled in below because only you know the true
status of each. Pull the ten goals from the original spec (roles/RBAC, company CRUD,
deal CRUD, stage lifecycle, collaborators, search/filter/sort/pagination, history,
bulk actions + CSV export, dashboard, alerts) and mark Done/Partial/Not done against
what's actually working in your deployed app right now.

| # | Goal | Status | Notes |
|---|------|--------|-------|
| 1 | Accounts & roles (server-enforced) | | |
| 2 | Company CRUD + archive/restore | | |
| 3 | Deal CRUD + ownership | | |
| 4 | Stage lifecycle (forward/backward-with-reason/reopen) | | |
| 5 | Collaborators | | |
| 6 | Server-side search/filter/sort/pagination | | |
| 7 | Append-only deal history | | |
| 8 | Bulk reassign/advance with per-deal results | | |
| 9 | CSV export | | |
| 10 | Dashboard + alerts | | |

## How much time did you actually spend?

*(Yours to fill in.)*

## What would you do next, with another 12 hours?

*(Yours to fill in — the `deals/7`/alerts bug and the create-deal bug you mentioned
are good candidates if anything about them still feels unfinished.)*

## What are you least happy with in this codebase, and why?

*(Yours to fill in honestly — this is the one question in the whole template that
specifically wants self-critique, not a clean narrative.)*
