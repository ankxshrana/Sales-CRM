# Decisions

## Decision 1

- **Chose:** Django + Django REST Framework for the backend.
- **Rejected:** Flask.
- **Why:** The assignment only mandated "Python," but the spec has substantial auth,
  role-based authorization, relational data, and admin/audit requirements — Django's
  batteries (ORM, auth, admin) covers most of that out of the box, where Flask would
  mean assembling the same pieces from smaller libraries for no real benefit here.

## Decision 2

- **Chose:** React (Vite) SPA talking to a DRF JSON API.
- **Rejected:** Django templates + Bootstrap + vanilla JS.
- **Why:** Django templates were the original plan — simpler to deploy as a single
  app, and enough for a CRUD-heavy business app. Given the amount of genuinely
  interactive UI the spec asks for (bulk selection, stage changes, collaborator
  management, dashboard charts, alerts, deal timeline, role-based UI), a component
  framework made those easier to keep clean, even at the cost of running two
  deployables and needing CORS.
- **Later reversed:** This *is* the reversed decision — templates were the initial
  choice, switched to React mid-planning once the amount of interactive state became
  clear.

## Decision 3

- **Chose:** JWT auth via `djangorestframework-simplejwt`.
- **Rejected:** Django's built-in session auth.
- **Why:** Once the frontend became a separately-hosted SPA rather than
  server-rendered templates, session cookies stop being the natural fit (separate
  origins, no shared session store by default) — stateless bearer tokens attached by
  the Axios client are the standard pairing for a decoupled SPA + API.

## Decision 4

- **Chose:** A service layer (`deals/services.py`) for stage transitions, reassignment,
  and bulk actions, rather than putting that logic in views or serializers.
- **Rejected:** Business logic inline in DRF views/serializers.
- **Why:** The stage-transition rules, backward-move-needs-a-reason logic, and
  per-item bulk-action outcomes are exactly the kind of rules that get tangled and
  hard to test if they live in request/response handling. A plain function
  (`change_deal_stage(deal, new_stage, user, reason=None)`) can be unit-tested
  without spinning up the API layer, and keeps views thin.

## Decision 5

- **Chose:** TanStack Query for server-state management on the frontend.
- **Rejected:** Redux (or hand-rolled context + fetch).
- **Why:** Almost everything the frontend needs is server data (deals, companies,
  dashboard numbers, alerts) — TanStack Query's caching, refetching, and mutation
  invalidation cover that directly, whereas Redux would mean writing the equivalent
  caching logic by hand for state that isn't really client-owned in the first place.

---
