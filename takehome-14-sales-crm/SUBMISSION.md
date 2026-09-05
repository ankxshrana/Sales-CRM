# Submission

## Links

- **GitHub repository:** [https://github.com/ankxshrana/Sales-CRM](https://github.com/ankxshrana/Sales-CRM)
- **Live application:** [https://sales-crm-1uby.vercel.app](https://sales-crm-1uby.vercel.app)

## Notes for the reviewer

First, click on Demo Accounts (select either Sales Manager or Sales Rep), and it will automatically fill in the email address and password. Then click on 'Sign In ->', The user will be able to log in within 8 seconds, provided they have a good internet connection.

## Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Manager | manager@example.com | password123 |
| Rep | rep@example.com | password123 |

## Stack

| Layer | What you used | Why |
|-------|---------------|-----|
| Frontend | React + Vite, TanStack Query, React Hook Form + Zod, shadcn/ui, Recharts | Interactive UI (bulk selection, stage changes, dashboard) was easier to keep clean as components than as templates — see `decisions.md` |
| Backend | Django + DRF, service-layer business logic | Auth/roles/ORM/admin out of the box; service layer keeps stage-transition rules testable and out of views |
| Database | PostgreSQL, `DecimalField` for money | Exact decimal values, relational integrity, needed aggregation for the dashboard |
| Hosting | Vercel | Easy and free of cost! |

## Goal checklist

Mark each honestly — this is not filled in below because only you know the true
status of each. Pull the ten goals from the original spec (roles/RBAC, company CRUD,
deal CRUD, stage lifecycle, collaborators, search/filter/sort/pagination, history,
bulk actions + CSV export, dashboard, alerts) and mark Done/Partial/Not done against
what's actually working in your deployed app right now.

| # | Goal | Status | Notes |
|---|------|--------|-------|
| 1 | Accounts & roles (server-enforced) | Done | Working perfectly fine.|
| 2 | Company CRUD + archive/restore | Done | Working as per the guidlines |
| 3 | Deal CRUD + ownership | Done | Working |
| 4 | Stage lifecycle (forward/backward-with-reason/reopen) | Done | Checked and Verified |
| 5 | Collaborators | Done | Working fine. |
| 6 | Server-side search/filter/sort/pagination | Done | This function is working. |
| 7 | Append-only deal history | Done | Working perfectly. |
| 8 | Bulk reassign/advance with per-deal results | Done | This feature is added. |
| 9 | CSV export | Done | Able to export the CSV file. |
| 10 | Dashboard + alerts | Done | Well-designed. |

## How much time did you actually spend?

Spend more than 12 hours.

## What would you do next, with another 12 hours?

I will try to figure-out how I include Automation for generating weekly reports and how it would be enhanced using AI and Analytics feature can be added. 

## What are you least happy with in this codebase, and why?

Currently using basic UI, better interface can be used which may include features like DarkMODE, increase FontStyle,FontSize etc.
