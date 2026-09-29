# Yard code/HTML audit

**Audit only.** No production deploy. No worker, DNS, or secret changes from this branch.

Audited: 2026-09-04  
Source of truth for paths: `cursor/yard-floor-url-3926` (live HTML stamp **build 18 · The Yard**)  
Compared against: standalone CRM on `cursor/crm-owner-dedupe-e69c` (`cbss-crm/`), open PRs 29 / 61 / 63 / 65 / 66 / 67  
Live hosts probed for **Location headers and HTML identity only**. TLS/HTTP/3 quality is out of scope except where **code** sends people onto another hostname.

Christopher is losing money because the floor tool is unreliable. The code explains most of that without blaming Cloudflare SSL.

---

## 1. Where The Yard lives

`main` in this repo is an empty README. The house CRM is a Cloudflare Worker named `cbssos` plus two alias workers. All UI is one server-rendered HTML string with inline CSS and a ~1,500-line inline `<script>`. There are no separate asset files to 404.

| Piece | Path | Role |
| --- | --- | --- |
| House worker | `cbss-os/wrangler.jsonc` (`name: cbssos`) | Login, session, CRM/Desk/Proposal/Pay/Invoice proxy, quote match, Desk new-contact, campaign KV |
| Floor alias | `cbss-os/wrangler.cbss-yard.jsonc` + `cbss-os/src/yard-floor.ts` | `cbss-yard.cbss.workers.dev` → `HOUSE` (cbssos). No 302. |
| Company alias | `cbss-os/wrangler.harbor.jsonc` + `cbss-os/src/harbor-alias.ts` | Worker `theyard`. Routes `yard.` / `theyard.` / `crm.` on `cbshippingsolutions.app`. Proxies to `HOUSE`. **GET `crm.` 302s to `YARD_PUBLIC` in this branch.** |
| Auth / session | `cbss-os/src/auth.ts` | Company email only. HMAC cookie `cbss_os`. Tool cookies in KV `SESSIONS`. |
| Routes | `cbss-os/src/index.ts` | `/`, `/auth/login`, `/session`, `/x/{crm,desk,proposal,pay,invoice}/…`, `/quote/match`, `/proposal/submit`, `/desk/contact`, `/campaign*` |
| HTML + client JS | `cbss-os/src/page.ts` (`pageHtml`) | Entire floor UI |
| Brand / bookmark | `cbss-os/src/brand.ts` | `YARD_PUBLIC = https://cbss-yard.cbss.workers.dev` |
| Backends (not this folder) | live workers | `cbsscrm`, `cbssbrain`, `cbsscompletetool`, `cbsspay`, `cbssinvoice` |

The standalone CRM that still has Google Voice and archive review is **not** in the Yard tree. It lives on other branches under `cbss-crm/` and is still served at `https://cbsscrm.cbss.workers.dev` (title `CBShippingSolutions CRM`).

---

## 2. What bots wrote (hostname thrash)

Open, overlapping PRs — none of this is on `main`. Production is whatever the last agent deployed.

| When | PR / commit | What the bot did | Floor effect |
| --- | --- | --- | --- |
| 2026-08-24 | PR 29 `crm-owner-dedupe-e69c` | Fold `james@…` → James; merge `contactsAdded` instead of replace; restore wiped ported contacts | Correct CRM fix. **Not in the Yard worker.** Yard has its own thinner `titleOwner`. |
| 2026-08-30 | `befb653` / PR 44 | Renamed Harbor → The Yard; one HTML shell | Birth of the floor tool |
| 2026-08-31 | PRs 46–52 | Follow-up stamp, Desk Call pick, website ingest, Money/stage, Facebook | Real sales features, each on its own branch |
| 2026-09-01 | PR 61 `yard-safe-domain-e69c` | Bookmark + 302 to `theyard.cbshippingsolutions.app` because `workers.dev` looked “not safe” | Sent the floor onto `*.app` |
| 2026-09-01 | PR 63 `yard-login-stuck-e69c` | `/auth/login` HTML instead of JSON 404; form POST fallback | Login looked like an outage |
| 2026-09-03 | PR 65 `yard-safari-e69c` | WebKit height / CSP so Safari was not a blank tab | Partial |
| 2026-09-03 | PR 66 `website-ssl-pc-e69c` | Another hostname: `house.cbshippingsolutions.app`; `YARD_PUBLIC` still `theyard.…app` | More bookmarks |
| 2026-09-04 | PR 67 `yard-floor-url-3926` | New `cbss-yard` worker; **stop 302 from workers.dev onto `.app`**; bookmark `cbss-yard.cbss.workers.dev` | Current intended floor URL |

Bots also wrote: Desk New contact, CTE/follow-up prompt, name-as-`<select>`, Kyle Hodgkiss on the owner list, Modified builder, two-box proposal, invoice PDF/Gmail outbox, follow-up `updatedAt` slack so complete-then-save does not vanish.

They did **not** port Google Voice, archive request/review, or CRM owner canonicalize into The Yard.

---

## 3. Live hosts (2026-09-04 probe)

HEAD requests: all **HTTP 200**, no `Location`. Code on this branch *would* 302 GET `crm.cbshippingsolutions.app` → `https://cbss-yard.cbss.workers.dev` (`cbss-os/src/harbor-alias.ts`). **Live `crm.` does not 302.** Production alias ≠ this branch.

| URL | Live HTML |
| --- | --- |
| `https://cbss-yard.cbss.workers.dev/` | The Yard · build 18 · bookmark `cbss-yard` |
| `https://cbssos.cbss.workers.dev/` | Same |
| `https://theyard.cbss.workers.dev/` | Same brand, slightly larger body |
| `https://theyard.cbshippingsolutions.app/` | Same |
| `https://yard.cbshippingsolutions.app/` | Same |
| `https://house.cbshippingsolutions.app/` | Same |
| `https://crm.cbshippingsolutions.app/` | **The Yard**, not standalone CRM |
| `https://cbsscrm.cbss.workers.dev/` | Standalone CRM · Google Voice · Archive review |

Session cookie `cbss_os` is **host-only** (`cbss-os/src/auth.ts` `cookieHeader` — Path=/, no `Domain=`). Seven Yard URLs = seven logins. A rep who bookmarks `theyard.` and later follows the on-screen `cbss-yard` bookmark is “signed out.”

---

## 4. Findings, ranked by floor-sales impact

### P0 — money walking out today

#### P0-1. Seven URLs, one cookie per host

- **Impact:** “CRM is down” / “I have to sign in again” / Safari vs Chrome using different bookmarks. Half a morning gone.
- **Code:** `cbss-os/src/auth.ts` (`cookieHeader`), `cbss-os/src/brand.ts` (`YARD_PUBLIC`), `cbss-os/wrangler.harbor.jsonc` (still attaches `yard.` + `theyard.` + `crm.`), `cbss-os/src/harbor-alias.ts` (proxies `.app` instead of sending everyone to one host).
- **Live:** All seven hosts serve build 18. Bookmark copy says `cbss-yard.cbss.workers.dev`. Muscle memory and older PRs still say `theyard.` / `yard.` / `house.` / `crm.`.
- **Fix (later, one change):** Pick **one** hostname. 301 every other Yard host to it. Do not 302 onto a host the floor cannot open. Until then, tape the `cbss-yard` URL to the monitors.

#### P0-2. Login can “succeed” with Proposal / Desk / Invoice dead

- **Impact:** Rep is on Home with CRM connected. Get CBSS Price and invoice return `503 That module did not sign in.` No quote, no invoice, deal cools off.
- **Code:** `cbss-os/src/auth.ts` `loginAllTools` — CRM is required; `desk` / `proposal` / `pay` / `invoice` run in parallel and **empty cookies are stored as success**. `cbss-os/src/index.ts` `proxyTool` then 503s. `cbss-os/src/page.ts` `paintTools` shows “not signed in” chips but still `show("app")`.
- **Fix (later):** Fail the login (or block Proposal/Money) unless proposal + desk + invoice cookies exist. Show which module died.

#### P0-3. Call / Text do not open Google Voice

- **Impact:** Floor dials from Google Voice. Standalone CRM (`cbss-crm/public/index.html`) has Call · Google Voice, Text · Google Voice, and a helper extension. The Yard emits `tel:+1…` and `sms:+1…` (`cbss-os/src/page.ts` `openContact`). On a Windows Chrome desk those links do nothing useful or open the wrong app. Email opens Gmail compose (correct for “do not send Gmail from this tool”) but Call/Text are the revenue buttons.
- **Missing:** No `googleVoiceUrl`, no reused `cbss-google-voice` tab, no helper connect button.
- **Fix (later):** Port the CRM GV buttons into `page.ts`. Keep `tel:` as a fallback only.

---

### P1 — daily sales blockers

#### P1-1. Archive flow is missing

- **Impact:** Dead leads stay on the working book, or approved archives vanish with no restore. Christopher cannot review archive requests from The Yard.
- **Code:** `working()` hides `c.archived` and `status === "DNC"` (`page.ts`). No Archive button, no `saveArchiveRequests`, no Archive review view. `loadCrm` never reads `archiveRequests`.
- **Standalone CRM:** request → Christopher approve/deny → `c.archived = true` (`cbss-crm/public/index.html`).
- **If CRM already marked `archived`:** those people are invisible in The Yard with no unarchive.
- **If archive lives only in `archiveRequests`:** The Yard still shows them as live. Two wrong answers.

#### P1-2. “Email campaign” removes the lead and sends nothing

- **Impact:** Rep clicks Add to email campaign. Contact leaves the working list (`onCampaign`). Copy says *“the future campaign tool will work this list.”* There is no sender. The name sits in `SESSIONS` key `campaign:leads` (`cbss-os/src/campaign.ts`) — not even in the CRM worker. Return to book is manual.
- **Floor read:** the lead is gone; nobody is working them.

#### P1-3. Contact name is a dropdown of existing names

- **Impact:** Cannot type “John” if the book only has “Jon.” Typo stays. Callback goes to the wrong spelling; search misses them.
- **Code:** `<select id="m-name">` + `fillNameList` (`page.ts`). Tests in `cbss-os/test/platform.test.mjs` **lock this in**.
- **Fix (later):** Text input (or select + “other”).

#### P1-4. Contact list hard-caps at 200

- **Impact:** Mine / All owners without a search string shows 200 rows (`filtered()`, `page.ts`). The rest exist only if someone searches. Missed follow-ups.
- **Fix (later):** Raise cap, paginate, or default sort by next follow-up and do not hide the rest.

#### P1-5. CTE is a note, not three tasks

- **Impact:** Desk New “CTE” writes Call / Text / Email **into a note** (`cbss-os/src/desk-contact.ts` `scheduleDeskTrack`). The CRM follow-up slot is **only the first call**. Text-day and email-day never appear on Follow-ups. CTE dies after one dial.

#### P1-6. `crm.` now serves The Yard, not the real CRM

- **Impact:** Anyone still using `crm.cbshippingsolutions.app` gets the thin shell (no GV, no archive). The full book is still at `cbsscrm.cbss.workers.dev`. README says do not send people there; the company hostname now *is* The Yard.
- **Code vs live:** this branch 302s GET `crm.` → `YARD_PUBLIC`. Live does not. Either way the floor lost the old CRM UI on that host.

#### P1-7. Owner names will split the book again

- **Yard** (`cbss-os/src/brand.ts`): Kyle → **Kyle Hodgkiss**; team includes Brittni, Derrek; drops Ivyanna.
- **CRM** (`cbss-crm/src/owners.js` on PR 29): Kyle → **Kyle**; still Ivyanna, Mery, Terrell, Joshua.
- **Impact:** The Yard writes `Kyle Hodgkiss`. Live CRM may still store `Kyle`. Two owner buckets. James was already wiped once by a split owner (`james@` vs `James`) — PR 29. This is the same class of bug.
- **Also:** `ownerScope` Mine uses `owner.toLowerCase().indexOf(user.name.toLowerCase())` (`page.ts`). A name like “James” matches any owner string containing “james”.

#### P1-8. `saveDeals` posts the whole in-memory deal list

- **Impact:** Pipeline or stage edit calls `saveDeals` with `book.deals` (`page.ts` `persistContactPatch`, pipeline `change`). If GET ever returns a partial list, the write can drop other reps’ deals. Same pattern that wiped ported contacts when `contactsAdded` was replaced (PR 29).
- **Fix (later):** Patch one deal, or merge server-side.

#### P1-9. `AUTH_SECRET` is not in wrangler

- **Impact:** If the secret is missing, login HTML says “Platform is not set up yet.” (`index.ts`). Looks like an outage. Binding is optional in `worker-configuration.d.ts`. Confirm the live `cbssos` secret still exists after the `cbss-yard` / `theyard` alias deploys (aliases do not need it; `HOUSE` does).

---

### P2 — missing or half-built

| ID | Issue | Path | Why it costs deals |
| --- | --- | --- | --- |
| P2-1 | No New contact on the CRM tab | `page.ts` CRM section | Walk-in has to leave CRM → Desk → New |
| P2-2 | Pipeline stage does not update contact `status` | `page.ts` pipeline `change` | Board says Proposal Sent; contact still New Lead |
| P2-3 | CRM “Add note” tagged `Desk` | `page.ts` `addNote` | Book looks like Desk noise; real Desk notes mixed in |
| P2-4 | Proposal submit hardcodes `clientType: "Residential"` and `paymentMode: "cash"` | `page.ts` `p-form` submit | Commercial / Flex Buy quotes lie |
| P2-5 | Home chips skip Pay | `page.ts` `paintTools` | Dead pay session is invisible |
| P2-6 | Facebook card is on every CRM nav | `page.ts` + `index.ts` 403 | Reps hit a Christopher-only error |
| P2-7 | `loadCrm` uses `omitNotes=1` and no `archiveRequests` | `page.ts` | Archive/DNC/notes state incomplete until a contact is opened |
| P2-8 | Website form ingest is not in this worker | other PRs (`website-yard-leads-e69c`) | New web leads may never hit New/Unassigned if that worker is stale |
| P2-9 | `tel:+1` after stripping to 7–11 digits | `page.ts` `openContact` | Non-US or already-E.164 numbers get a second `+1` |
| P2-10 | Desk Call search hits `/x/desk/contacts`, not the Yard-merged book | `page.ts` `desk-q` | Fresh Desk-added rows can miss the pick list |
| P2-11 | Conflicting open PRs 61 vs 67 | `YARD_PUBLIC` theyard.app vs cbss-yard | Next bot deploy can 302 Safari back onto `.app` |
| P2-12 | Tests **forbid** `theyard.cbshippingsolutions.app` in HTML while wrangler still routes it | `test/platform.test.mjs`, `test/harbor-alias.test.mjs` | Bots are trained to hide the hostname, not to retire it |

---

### P3 — bot debris, low sales impact

- File names still say Harbor: `wrangler.harbor.jsonc`, `harbor-alias.ts`.
- Sales-spark rotator on Home (`SALES_SPARKS` in `brand.ts`).
- Hard-coded skip `{ Ivyanna: true }` in `fillOwners` (`page.ts`).
- Client token stored in `SESSIONS` (`facebook:client-token`) next to campaign leads and sessions.
- No favicon; CSS/JS are inline — assets are not the outage (good).
- `stamp: "build 18 · The Yard"` — useful; keep bumping it when HTML changes so the floor can say which build they have.

---

## 5. What is working (do not break)

Verified in `cbss-os` unit tests (53/53 pass, 2026-09-04) and by reading the live build-18 HTML:

- Company-email login, `/auth/login` HTML + JSON, Safari form POST fallback, `boot()` will not kick a just-signed-in user back to login.
- Session tool cookies in KV (cookie stays small).
- Follow-up `updatedAt` slack so complete → save next does not get eaten by live CRM build 23.
- Desk New contact → CRM with CTE or follow-up; Kyle/James owner fold on the Yard side.
- Proposal: posted wholesale only, two boxes, Enter submits, low-margin flag.
- Money: invoice PDF download then Gmail to the **rep** (not the customer).
- `cbss-yard` / `cbssos` workers.dev do **not** 302 to `.app` in this branch (`yard-floor.ts`, tests).
- Hard rules in copy: do not invent a price; OS 2D / OS 4D / Full open stay separate.

---

## 6. Suggested fix order (not this PR)

Do not redeploy a hostname change until Christopher picks **one** URL and the floor is told once.

1. **One bookmark.** Keep `https://cbss-yard.cbss.workers.dev` (current live copy) **or** a single healthy company host — not both. 301 the rest. Close or supersede PRs 61 and 66 so a bot cannot put `YARD_PUBLIC` back on `theyard.` / `house.`.
2. **Login must connect Proposal + Desk + Invoice**, or refuse to open the shell.
3. **Port Google Voice Call/Text** from `cbss-crm/public/index.html` into `page.ts`.
4. **Port archive request + Christopher review.** Load `archiveRequests` on `loadCrm`.
5. **Name field is a text box again.**
6. **One `canonicalizeOwner` shared with `cbss-crm/src/owners.js`.** Do not write `Kyle Hodgkiss` if the book is `Kyle` until CRM is migrated.
7. **Stop hiding campaign leads** until a real send exists.
8. **Patch deals, do not replace the array.**
9. Raise the 200-row cap; schedule Text/Email CTE as real follow-ups; stop hardcoding Residential/cash.

---

## 7. Break-glass

No single-line production hotfix was deployed from this audit.

Closest operational emergency: **tell the floor to use only `https://cbss-yard.cbss.workers.dev` tonight** and ignore `theyard.` / `yard.` / `house.` / `crm.`. That is a human instruction, not a code push.

If `AUTH_SECRET` is missing on `cbssos`, login will print “Platform is not set up yet.” Check the secret in the dashboard before writing more workers.

---

## 8. Evidence

- Live HTML titles/stamps collected 2026-09-04 (seven Yard hosts + standalone CRM).
- `cd cbss-os && npm test` — 53 passed, 0 failed.
- Granola MCP was not authenticated; meeting notes were not pulled.
- TLS/HTTP/3 on `*.cbshippingsolutions.app` not evaluated, per brief.
