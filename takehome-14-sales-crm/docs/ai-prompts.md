# AI prompts

I used two AI tools: ChatGPT for planning/stack decisions, and Antigravity to scaffold
and build the actual code from that plan.

## Choosing the stack and architecture (ChatGPT)

### Prompt
"I've to build this project, and have to use python programming language so which
technologies i have to use and i have also have to host this on a freehosting" —
followed by the full assignment brief (accounts/roles, bulk actions, dashboard, etc.).

### What you got
A Django + DRF + PostgreSQL backend paired with **Django templates + Bootstrap +
Chart.js** on the frontend, justified mainly by free-hosting simplicity (one
deployable instead of two, no CORS).

### What you corrected
I didn't think templates were the right call given how interactive the spec is
(bulk selection, stage changes, dashboard charts, alerts) — asked "so are we going
use react for frontend?" and got back a revised stack: React + Vite + TanStack Query
+ shadcn/ui on top of the same Django/DRF/PostgreSQL backend, now with JWT auth and
CORS instead of session auth. This is the reversed decision recorded in
`decisions.md`.

### Prompt
"so write the whole stack that i need and libraries"

### What you got
The full library list (React Router, Axios, TanStack Query, React Hook Form + Zod,
Recharts, shadcn/ui, Lucide; Django, DRF, simplejwt, django-filter,
django-cors-headers, psycopg, gunicorn, whitenoise; pytest/pytest-django) with
install commands for each.

## Turning the plan into a single scaffolding prompt (ChatGPT → Antigravity)

### Prompt
"no just like a single promot so that i can share it with the antigravity to setup
the application intitial code archicture"

### What you got
A consolidated spec prompt (the one in `Temp.pdf`) covering the tech stack, monorepo
layout, the five Django apps and their responsibilities, the 16 architecture rules
(server-side authorization, no floats for money, append-only history, etc.), the
initial `/api/v1/` route table, the deal-stage state machine, and the instruction to
build scaffolding only — not full business logic — first.

### What you corrected
Nothing at this stage — this was a direct handoff to Antigravity, not a
back-and-forth with ChatGPT.

## Building and fixing the app (Antigravity)

### Prompt
The consolidated architecture prompt above, given to Antigravity as the initial
build instruction.

### What you got / corrected
*(This is the part only you have — what Antigravity actually generated, and what you
had to fix. You mentioned two real issues below; fill in what was actually wrong and
how you fixed each, since I don't have Antigravity's output or your fix:)*

- `deals/7` and the alerts page weren't working — prompted: "deals/7 page isn't
  workgn and even alerts."
  **What was actually wrong:** _______
  **What you did about it:** _______
- The "create new deal" feature was broken — prompted: "create new deal feature is
  not working."
  **What was actually wrong:** _______
  **What you did about it:** _______

### Prompt
A cross-check prompt verifying the RBAC rules and bulk-action behavior against the
original spec in plain language (roles enforced server-side, per-deal bulk-action
results with rejection reasons, CSV export of the open pipeline with stage-weighted
value).

### What you got
*(Fill in: did Antigravity's existing implementation already match, or did this
prompt surface gaps it then fixed?)*

---

**Note on the instructions above:** the template asks to "include at least one
prompt that produced something wrong, and what you did about it." The two bug-report
prompts above are that — but the actual defect and fix are things only you know from
working in the generated code, so those two blanks need your own words rather than
mine.
