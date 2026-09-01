# CRM Foundational Research

Before starting the data modeling phase, I researched core CRM concepts and the philosophy of building internal tools to ensure the architecture aligns with real-world business strategies.

## What is a CRM?
Customer Relationship Management (CRM) is a technology framework and business strategy designed to manage interactions with customers throughout their lifecycle. By centralizing communication, it ensures interactions are personalized, timely, and impactful. 

Based on general principles, this project is an **Operational CRM**, focusing on streamlining customer-facing processes like sales, contact management, and pipeline tracking.

## The "Lean Internal Tool" Philosophy
Most commercial CRM software is built to sell to tens of thousands of companies, resulting in bloated, complex tools where core features are buried. The goal of this project is to build a lean, customized system that does exactly what a specific sales team needs, without unnecessary complexity.

**Key Design Takeaways for this Build:**
*   **Deciding what NOT to build:** Defining out-of-scope features is just as important as in-scope features to prevent "feature creep" (slop).
*   **Hard-coding over Configuration:** Because this is an internal tool and not a commercial SaaS, we do not need to build complex UIs for "custom fields" or "custom pipeline stages." We can hard-code the strict business logic (e.g., *New → Qualified → Proposal → Negotiation*) directly into the application, saving immense development time while strictly enforcing the rules.

## Core Features Required
Based on the lean CRM approach, the essential features to build include:
1.  **Contacts/Companies:** Centralizing details and organizing data into clean profiles.
2.  **Deal Tracking & Pipeline:** A visual way (like a Kanban board or list) to move deals through strict stages, assigning exact dollar values to forecast revenue.
3.  **Activity Log (Immutable History):** Tracking every event, note, and stage change with timestamps to prevent data loss or silent deal deletions.
4.  **Follow-ups & Alerts:** A system to remind reps of past-due deals and next actions.

---
**Sources:** 
* [GeeksforGeeks - Customer Relationship Management (CRM)](https://www.geeksforgeeks.org/software-engineering/customer-relationship-management-crm/)
* [YouTube - Brian Castle: "I built a Custom CRM in 1 hour (Start to finish)"](https://youtu.be/s1iwU5OlIOE)