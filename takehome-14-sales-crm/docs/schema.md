# Schema

## Table by table

**users** (`accounts.User`, custom user model, email as `USERNAME_FIELD`)
- `email` (unique, indexed), `first_name`, `last_name`
- `role` — `MANAGER` / `REP` (`TextChoices`, indexed)
- `is_staff`, `is_active`, `date_joined`, `updated_at`

**companies** (`companies.Company`)
- `name` (indexed), `industry` (indexed), `website`
- `owner` → FK to `users`, `on_delete=PROTECT` (a company can't be orphaned by
  deleting its owning rep)
- `is_archived` (indexed), `created_at`, `updated_at`
- Composite indexes on `(name, is_archived)` and `(owner, is_archived)` for the
  common list/filter queries.

**deals** (`deals.Deal`)
- `title` (indexed), `company` → FK to `companies` (`CASCADE`)
- `owner` → FK to `users` (`PROTECT`)
- `stage` — fixed `TextChoices` (`NEW/QUALIFIED/PROPOSAL/NEGOTIATION/WON/LOST`),
  never a free-text field
- `previous_stage` — nullable, set when a deal closes so reopen can restore it
- `value` — `DecimalField(max_digits=14, decimal_places=2)`, never a float
- `expected_close_date` (indexed), `closed_at`
- `collaborators` — M2M to `users` through `DealCollaborator`
- Composite indexes on `(stage, expected_close_date)` (alerts/dashboard queries) and
  `(owner, stage)` (rep's own pipeline view)

**deal_collaborators** (`deals.DealCollaborator`, explicit through-model)
- `deal` FK, `user` FK, `role` (`CONTRIBUTOR`/`VIEWER`), `added_at`
- `unique_together (deal, user)` — a user can't be added twice to the same deal

**deal_history** (`deals.DealHistory`) — the append-only audit trail
- `deal` FK, `user` FK (`SET_NULL` — history survives even if the actor is deleted)
- `action` (`CREATED/STAGE_CHANGE/REOPENED/OWNER_REASSIGNED/COLLABORATOR_ADDED/
  COLLABORATOR_REMOVED/UPDATED`)
- `from_stage`, `to_stage`, `notes` (used for the required backward-transition reason)
- `created_at`
- Immutability isn't just a convention: `save()` raises if called on an existing pk,
  and `delete()` raises unconditionally.

**deal_alerts** (`alerts.DealAlert`)
- `deal` FK, `user` FK, `alert_type` (currently just `PAST_DUE`)
- `is_dismissed`, `dismissed_at`
- `last_expected_close_date` — the field that makes reappearance work: dismissing
  stamps the close date at time of dismissal, so if the deal's close date changes
  and later passes again, the stored value no longer matches and the alert can fire
  again instead of staying permanently dismissed.
- `unique_together (deal, user, alert_type)`

## Which relationships are one-to-many, and which are many-to-many?

One-to-many: `User → Company` (owner), `User → Deal` (owner), `Company → Deal`,
`Deal → DealHistory`, `Deal → DealAlert`.
Many-to-many: `Deal ↔ User` via `DealCollaborator` (explicit through-model rather than
a bare `ManyToManyField`, so role and `added_at` can be attached to the membership).

## Which constraints are enforced by the database, and which by application code — and why did you draw the line there?

Database-enforced: uniqueness (`unique_together` on collaborators and alerts), FK
integrity and delete behavior (`PROTECT` vs `CASCADE` vs `SET_NULL` chosen per-table
above), non-negative deal value (`MinValueValidator`), fixed choice sets for `role`
and `stage` (no arbitrary strings).

Application-enforced (in `deals/services.py`, not in views or the database): the
stage-transition graph (forward-only, one-step-back-with-reason, closed-unless-reopened
-by-manager), owner/collaborator visibility filtering, and bulk-action per-item
eligibility. These are business rules that change independently of the schema and
need richer error messages than a DB constraint can give — a `CHECK` constraint can't
say "rejected: deal is already closed" back to the caller.

## What did you deliberately denormalise?

*(Yours to answer — e.g. did you store `previous_stage` on the Deal itself rather than
deriving it by querying the last `DealHistory` row? That's the one denormalisation
visible in the schema above, done for O(1) reopen instead of a history scan.)*

## What would break first if this had 100x the data?

Likely candidates given this schema: the dashboard's "deals won per week for 8 weeks"
aggregation and the past-due alert scan, since both do date-range filtering across the
full `deals`/`deal_alerts` tables rather than a pre-aggregated rollup. The composite
indexes above cover the common filters but not necessarily every dashboard breakdown.
