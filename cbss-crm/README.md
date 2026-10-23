# CBSS CRM

Live app: https://cbsscrm.cbss.workers.dev

Company-email CRM for CB Shipping Solutions. Contacts, tasks/follow-ups, pipeline, and archive review.

## Speed and tasks

- First paint loads the book without the notes map, then notes fill in after.
- Search is debounced. Follow-ups, Tasks, and Pipeline render when you open the tab.
- The Tasks tab has a **Complete** button. Completing a task clears the follow-up, stores it on the contact under **Completed tasks**, and asks if you want to schedule another follow-up.
- **Meta leads** (Christopher): connect the Facebook Page, map each Instant Form to a rep, import existing leads, and keep new leads flowing into the CRM.

## Order proof

Each order can hold delivery photos and videos, the signed invoice or contract, payment records, the BOL or delivery receipt, customer sign-off, a status timeline, linked emails/texts/calls, and hauler payment proof. **Proof packet** downloads one PDF. Complaint lookup matches a name, phone, email, or order across the book.

This does not rewrite deals, contacts, or notes. The first save creates KV key `orderProof` (schema 1 on each record). File bytes need an R2 bucket named `cbss-crm-order-proof` bound as `PROOF_BUCKET`. Create that bucket before deploying this worker. Until the bucket exists, timeline, hauler, and communication links still save, and uploads return `PROOF_BUCKET_NOT_CONFIGURED`.

`GET /order-proof/public` lists delivery photos a rep marked **OK to show publicly**, with city and date only. It does not include names, phones, emails, or payment data. Card and bank numbers are redacted in the PDF and in stored payment references.
