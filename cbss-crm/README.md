# CBSS CRM

Live app: https://cbsscrm.cbss.workers.dev

Company-email CRM for CB Shipping Solutions. Contacts, tasks/follow-ups, pipeline, and archive review.

## Speed and tasks

- First paint loads the book without the notes map, then notes fill in after.
- Search is debounced. Follow-ups, Tasks, and Pipeline render when you open the tab.
- The Tasks tab has a **Complete** button. Completing a task clears the follow-up slot, writes a `Completed:` note, and asks if you want to schedule another follow-up.
