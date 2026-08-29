# Plan

# 5-Day Project Plan

**Estimated time:** Around 2–2.5 hours per day, for a total of approximately 12 hours.

The goal is to build the project step by step, focusing on the most important functionality first. If something takes longer than expected, prioritize the core functionality over visual polish.

---

## Day 1 — Project Setup & Database

**Time: ~2.5 hours**

### Goal

Get the basic project infrastructure working so development can start smoothly.

### Tasks

* Create a public GitHub repository and push the initial project structure.
* Set up the database using a service such as Supabase.
* Design the initial database structure and document it in `docs/schema.md`.
* Set up authentication so users can log in.
* Add role-based access for **Managers** and **Reps**.
* Deploy a basic version of the application to make sure the hosting/deployment pipeline works.
* Make sure the login page is accessible through the live URL.

### By the end of Day 1

You should have:

* A working GitHub repository.
* A connected database.
* Basic authentication and roles.
* A deployed application with a login screen.
* Initial database/architecture documentation.

**If you're running behind:** Don't spend time making the UI look perfect. Focus on getting the database tables for **Users, Companies, Deals, and History** properly defined and connected.

---

## Day 2 — Companies & Deals

**Time: ~2.5 hours**

### Goal

Build the main CRM functionality around companies and deals.

### Tasks

* Create the **Companies** section.
* Add functionality to:

  * Create a company.
  * Edit company details.
  * Archive a company.
* Create the **Deals** section inside each company.
* Add functionality to:

  * Create a deal.
  * Edit a deal.
  * Associate a deal with a company.
* Implement collaborators so reps can be assigned to specific deals.
* Update `docs/plan.md` with what was completed and any important decisions made.

### By the end of Day 2

A user should be able to:

**Log in → Create a company → Open the company → Create a deal → Add collaborators to the deal.**

That should be the basic working flow by the end of the day.

---

## Day 3 — Deal Stages & History

**Time: ~2.5 hours**

### Goal

Make sure deals follow the required lifecycle rules and that important actions are properly recorded.

### Tasks

* Implement the Deal Lifecycle/Stage system.
* Prevent users from skipping stages.
* Prevent invalid stage changes.
* If a deal needs to move backward, require the user to provide a reason.
* Create an immutable **History** table.
* Record important events such as:

  * Deal creation.
  * Stage changes.
  * Notes or important updates.
* Create a history/timeline section on the deal page so users can see what happened and when.
* Document important validation decisions in `docs/decisions.md`.

### By the end of Day 3

You should have a deal system where:

**Every valid stage change is allowed → every invalid change is rejected → every important action is recorded in the history timeline.**

**If you're running behind:** Prioritize the server-side validation. The UI can be simple for now. The most important thing is that users cannot bypass the lifecycle rules.

---

## Day 4 — Search, Bulk Actions & Alerts

**Time: ~2.5 hours**

### Goal

Make the CRM practical to use when there are many deals.

### Tasks

* Add server-side search for deals.
* Add filtering options.
* Add pagination to the deals list.
* Build bulk actions so managers can work with multiple deals at once.
* Make sure the bulk-action API clearly reports:

  * Which deals were successfully updated.
  * Which deals failed.
  * Why they failed.
* Add CSV export functionality.
* Implement alerts for past-due deals.
* Add a dismissible badge/notification for overdue deals.

### By the end of Day 4

The main deals/pipeline view should be functional enough for a manager to:

**Search → Filter → Select multiple deals → Perform an action → See which updates succeeded or failed → Export data → Identify overdue deals.**

This is where the project should start feeling like a real CRM rather than just a basic CRUD application.

---

## Day 5 — Dashboard, Testing & Final Submission

**Time: ~2 hours**

### Goal

Bring everything together, make the application presentable, and prepare it for review.

### Tasks

* Build the main Dashboard.
* Add important headline metrics such as:

  * Total deals.
  * Active deals.
  * Won/lost deals.
  * Other relevant CRM statistics.
* Add breakdowns and the required **8-week chart**.
* Create realistic seed data so the live application doesn't look empty.
* Test the major user flows from beginning to end.
* Fix critical bugs and permission issues.
* Give the UI a final cleanup if time allows.
* Complete `docs/ai-prompts.md`.
* Include at least:

  * The prompts you used.
  * An example of a prompt that didn't work well.
  * How you corrected/improved that prompt.
* Complete `SUBMISSION.md`.
* Add demo credentials and your self-assessment.
* Verify the GitHub repository and live URL one final time.

### By the end of Day 5

You should have a **complete, functional CRM application** with:

**Authentication → Companies → Deals → Deal Lifecycle → History → Search & Filters → Bulk Actions → CSV Export → Alerts → Dashboard → Documentation**

The application should also have realistic demo data and be ready for the reviewer to test.

---

# Final Priority Order

If you start running out of time, don't try to finish everything equally. Follow this priority:

**1. Authentication & Roles**
↓
**2. Companies & Deals**
↓
**3. Deal Lifecycle Validation**
↓
**4. History/Audit Trail**
↓
**5. Search & Filtering**
↓
**6. Bulk Actions**
↓
**7. CSV Export & Alerts**
↓
**8. Dashboard & Analytics**
↓
**9. UI Polish**

The key idea is: **make the application work first, then make it look good.**

A simple but reliable CRM is much better than a beautiful interface with broken business rules.

