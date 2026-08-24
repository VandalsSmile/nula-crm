# Capturing Email Replies & Threads — Design Options

Status: **Design proposal** (not yet implemented).
Goal: capture **replies and full threads** — not just the first BCC'd message —
**without** building a full OAuth mailbox integration (Gmail API / Microsoft
Graph / IMAP sync).

---

## 1. Why replies aren't captured today

The current integration is a **passive BCC / forward dropbox** on the existing
Resend inbound webhook:

- Each user gets `me+{token}@inbox.nulacrm.ai` (`lib/email/mailbox.ts`,
  `dropboxAddressForToken`). They BCC it when emailing a contact.
- The webhook `POST /api/inbound/email` resolves the token →
  `email_connections`, then `logMailboxEmail()` writes a `messages` row +
  `email_sent`/`email_received` activity. Direction is decided by whether the
  `From` is in the user's `ownedEmails`.

The gap: **we only ever see mail delivered to the dropbox.** When the contact
replies, it goes to the user's real inbox (Gmail/Outlook) — it never touches
`me+{token}@…`, so no webhook fires and nothing is logged. There is also **no
threading** (no `Message-ID` / `In-Reply-To` / `References` handling; `externalId`
is used only for dedupe), so even captured messages only group loosely by
`contactId`.

Two structural truths shape every option below:

1. To see a reply that lands in the user's own mailbox, mail must be **routed to
   us** somehow (a reply-to alias, an auto-forward rule, or mailbox access). There
   is no way around that.
2. Good thread UX needs a **threading model**, independent of how mail arrives.

---

## 2. Recommended approach (layered, no mailbox OAuth)

### 2A. Primary: reply-routing aliases for mail sent *through* Nula ★

Make Nula the send surface for contact email and route replies back to us with a
per-thread **Reply-To alias** — the cleanest full-thread capture with zero
mailbox access.

- When `sendMessage` (`app/actions/messages.ts`) sends via Resend, set:
  - `Reply-To: reply+{routeToken}@inbox.nulacrm.ai`
  - a real `Message-ID` we generate and store.
- `routeToken` maps to `(workspaceId, contactId, threadId)` — either encoded
  (signed) in the local part (VERP-style) or looked up in a small `message_routes`
  table.
- The contact hits **Reply** in their normal email client → their reply is
  addressed to `reply+{routeToken}@…` → lands on the **existing** Resend inbound
  webhook → we resolve the token and insert an **inbound** message on the right
  thread. No BCC, no forwarding, no mailbox access.

**Why it's the best fit:** it reuses the inbound pipeline we already run, captures
**both** directions of any Nula-initiated thread, and sidesteps the fragile
"match the sender's From address to a stored contact email" step (the routeToken
is unambiguous even if the contact replies from an alias).

**Boundary:** it only covers threads *started/sent from Nula*. Email the user
sends from their own Gmail is covered by 2B.

### 2B. Secondary: one-time auto-forward rule for inbound (covers mail sent from the user's own client)

For users who email contacts from their own Gmail/Outlook, capture replies with a
**server-side forwarding rule** the user sets once:

- Gmail filter / Outlook rule: forward mail (optionally only from a label like
  "Clients", or from known senders) to `me+{token}@inbox.nulacrm.ai`.
- We already accept inbound there; the work is **parsing forwarded messages**
  correctly. A forward rewrites the envelope `From` to the user, so we must read
  the **original** sender/recipients/date from the forwarded headers. Resend's
  receiving API (`GET /emails/receiving/{id}`) already returns full headers, and
  Gmail/Outlook forwards preserve `X-Forwarded-For` / original `From:` we can
  parse. Add a "looks-forwarded" path in `logMailboxEmail` that extracts the real
  counterparty from those headers/body instead of the envelope `From`.

**Trade-offs:** user setup step; forwarded headers are messier than a Reply-To
alias; scope the filter to avoid forwarding the user's entire mailbox (privacy).
This is the pragmatic "quick win" and pairs well with 2A.

### 2C. Foundation: a real threading model (needed by 2A and 2B)

Independent of ingress, add threading so conversations render properly:

- **`messages`** new columns: `messageId`, `inReplyTo`, `references` (text),
  `threadId`.
- On inbound (`/api/inbound/email`) parse `Message-ID` / `In-Reply-To` /
  `References` (already have full headers via the receiving API) and resolve
  `threadId` (match `inReplyTo`/`references` to a known `messageId`; else start a
  new thread; the routeToken from 2A pins the thread directly).
- On outbound (`sendMessage`) generate + store the `messageId` and `threadId`.
- Inbox groups by `threadId` (falling back to `contactId`) — `lib/queries.ts`
  `getInboxConversations` / `getMessagesForContact`.

### 2D. Reliability fixes to the current BCC path (small, do regardless)

From the current behavior, these bite users today:

1. **Ensure `RESEND_API_KEY` is set in production.** Outbound BCC counterparty
   resolution depends on `GET /emails/receiving/{id}`; without it, an outbound BCC
   can be skipped with `"no counterparty address"` — looks broken even for the
   first message.
2. **Set `Reply-To` (2A) on Inbox sends** so replies route back — the current
   `sendMessage` sends from `RESEND_FROM_EMAIL` with no reply routing.
3. **Unify activity types** — the mailbox path logs `email_received` while the
   lead path logs `email_opened` for inbound; pick one.
4. **Unread for logged inbound** — BCC-logged inbound uses `status: "logged"`, so
   `getInboxConversations` never marks it unread; replies won't show a "New"
   badge. Treat inbound `logged` like `received` for unread.
5. **Doc drift** — help text mentions `reply.nulacrm.ai`; code defaults to
   `inbox.nulacrm.ai`. Align, and document `INBOUND_EMAIL_DOMAIN`,
   `RESEND_INBOUND_SIGNING_SECRET` in `.env.example`.

---

## 3. Alternative middle grounds (more coverage, more setup)

| Option | Captures | Setup / cost | No OAuth? | Notes |
|---|---|---|---|---|
| **Reply-To aliases (2A)** | Both directions of Nula-sent threads | None for the user | ✅ | Reuses existing inbound; recommended |
| **Forward rule (2B)** | Replies to mail sent from the user's own client | One-time filter | ✅ | Forwarded-header parsing needed |
| **IMAP + app password** | Inbox **and** Sent, all clients | User pastes an app password; we poll IMAP | ✅ (not OAuth, but is credentialed access) | Middle ground: real two-way capture without OAuth scopes; needs polling, storage of a credential, and contact-email matching. Gmail/Outlook now often gate app passwords behind 2FA/admin policy. |
| **Provider inbound domain per workspace** | Anything sent to a workspace address | DNS/MX per workspace | ✅ | Heavier ops; overkill for reply capture |
| **Gmail API / MS Graph OAuth** | Everything, reliably, with threads/labels | OAuth app + review + token refresh | ❌ (the thing to avoid for now) | The eventual "real" integration; most robust but the heaviest |

**Recommendation:** ship **2A + 2C** first (full threads for Nula-sent mail with
zero user setup and no mailbox access), add **2B** for users who send from their
own client, and keep **IMAP app-password** as an optional power-user add-on before
committing to full OAuth.

---

## 4. Honest boundary

There is **no way** to capture a reply that lands only in the user's private
mailbox without *some* routing (Reply-To alias, forward rule) or *some* access
(IMAP/OAuth). 2A removes the need for mailbox access by making replies come to us;
2B/IMAP cover the "sent from their own client" case with increasing setup. Full
OAuth is only worth it once customers demand automatic, zero-config capture of
mail sent entirely outside Nula.

---

## 5. Suggested phases

- **Phase 1 — Threading + reliability (2C, 2D):** schema columns + header parsing;
  fix `RESEND_API_KEY`, unread, activity types, docs. Groundwork; no new ingress.
- **Phase 2 — Reply-To routing (2A):** routeToken model, `sendMessage` sets
  `Reply-To`/`Message-ID`, inbound resolves the token → threaded inbound. Delivers
  full two-way threads for Nula-sent email.
- **Phase 3 — Forward-rule capture (2B):** forwarded-message parser + in-app setup
  instructions for Gmail/Outlook filters.
- **Phase 4 (optional) — IMAP app-password sync:** poll Inbox+Sent for known
  contacts, before considering full OAuth.

Recommended first step: **Phase 1 + Phase 2 together** — threading is the
foundation and Reply-To routing is the highest-leverage, lowest-friction way to
finally capture replies.
