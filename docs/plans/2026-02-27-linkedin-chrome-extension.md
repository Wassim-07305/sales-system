# LinkedIn Chrome Extension Bridge — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Chrome extension (Manifest V3) that bridges LinkedIn with Sales System via Supabase, enabling profile scraping, bidirectional message sync, and DM sending from the Sales System inbox.

**Architecture:** Background service worker intercepts LinkedIn's CSRF token and calls Voyager APIs for data. Content script injects UI badges on profiles. Popup provides quick status/actions. All data flows through Supabase (direct client, no custom backend).

**Tech Stack:** Chrome Extension Manifest V3, TypeScript, tsup (bundler), @supabase/supabase-js, Chrome APIs (webRequest, storage, alarms, runtime)

**Design doc:** `docs/plans/2026-02-27-linkedin-chrome-extension-design.md`

---

## Task 1: Scaffold the Chrome extension project

**Files:**
- Create: `chrome-extension/package.json`
- Create: `chrome-extension/tsconfig.json`
- Create: `chrome-extension/tsup.config.ts`
- Create: `chrome-extension/manifest.json`
- Create: `chrome-extension/.gitignore`

**Notes:** Manifest V3, tsup as bundler (IIFE format for Chrome), @supabase/supabase-js + @types/chrome as deps.

**Step 1:** Create all config files
**Step 2:** Run `cd chrome-extension && npm install`
**Step 3:** Commit

---

## Task 2: Shared utilities (types, storage, constants)

**Files:**
- Create: `chrome-extension/src/shared/types.ts`
- Create: `chrome-extension/src/shared/constants.ts`
- Create: `chrome-extension/src/shared/storage.ts`

**Notes:**
- `types.ts`: LinkedInProfile, LinkedInConversation, LinkedInMessage, SyncState, AuthState, LinkedInAuth, ExtensionMessage (discriminated union for all message types)
- `constants.ts`: LinkedIn API base URL, Voyager endpoints, sync intervals (2 min conversations, 30s pending messages), rate limit config (20 calls/hour, 3-8s random delay)
- `storage.ts`: Typed wrappers around chrome.storage.local (auth, sync state) and chrome.storage.session (CSRF token). Rate limiting helpers (canMakeApiCall, recordApiCall, randomDelay)

**Step 1:** Create all 3 files
**Step 2:** Commit

---

## Task 3: Background — Supabase client + LinkedIn API

**Files:**
- Create: `chrome-extension/src/background/supabase-client.ts`
- Create: `chrome-extension/src/background/linkedin-api.ts`

**Notes:**

`supabase-client.ts` provides:
- `getSupabaseClient()` — creates/returns client with stored auth token
- `loginToSupabase(email, password, url, key)` — auth + store JWT
- `logoutSupabase()` — sign out + clear storage
- `upsertProspect(data)` — check by profile_url, insert if new
- `getProspectByUrl(url)` — lookup
- `getConversationByLinkedinId(id)` — lookup by linkedin_conversation_id
- `upsertConversation(data)` — create or update conversation with messages
- `getPendingMessages()` — find messages with pending_send=true
- `markMessageSent(conversationId, messageIndex)` — set pending_send=false, sent_at

`linkedin-api.ts` provides:
- `linkedInFetch(url, options)` — wrapper with CSRF token injection, rate limiting, random delay
- `fetchProfile(slug)` — GET /voyager/api/identity/profiles/{slug}
- `fetchConversations(count)` — GET /voyager/api/messaging/conversations
- `fetchMessages(conversationId, count)` — GET /voyager/api/messaging/conversations/{id}/events
- `sendLinkedInMessage(conversationId, body)` — POST message event

**Step 1:** Create both files
**Step 2:** Commit

---

## Task 4: Background — Main entry + sync engine

**Files:**
- Create: `chrome-extension/src/background/sync-engine.ts`
- Create: `chrome-extension/src/background/index.ts`

**Notes:**

`sync-engine.ts`:
- `runSync()` — fetch LinkedIn conversations, for each: upsert prospect, fetch messages, merge with existing (dedupe by linkedin_message_id), upsert conversation. Update sync state.
- `processPendingMessages()` — get pending messages from Supabase, send each via LinkedIn API, mark as sent

`index.ts` (service worker entry):
- CSRF capture: `chrome.webRequest.onSendHeaders` on linkedin.com/voyager/api/* — extract csrf-token header
- Alarms: sync-conversations every 2 min, process-pending every 30s
- Message handler for all ExtensionMessage types (get_status, login, logout, scrape_profile, force_sync)

**Step 1:** Create both files
**Step 2:** Commit

---

## Task 5: Content script — Profile badge + floating panel

**Files:**
- Create: `chrome-extension/src/content/index.ts`
- Create: `chrome-extension/src/content/profile-badge.ts`
- Create: `chrome-extension/src/content/panel.ts`
- Create: `chrome-extension/src/content/styles.css`

**Notes:**

`profile-badge.ts`:
- `injectProfileBadge(inCrm, name)` — adds a green badge on LinkedIn profiles that are in Sales System, or an "Import" button for new ones
- Use textContent for text and createElement for DOM (no raw HTML injection for security)

`panel.ts`:
- `createFloatingPanel()` — fixed bottom-right panel on linkedin.com showing: connection status, sync stats, last sync time, sync button
- Dark theme matching Sales System sidebar (#14080e)

`index.ts`:
- Inject panel on page load
- Detect profile pages via URL pattern /in/{slug}/
- MutationObserver for SPA navigation (LinkedIn is an SPA)
- Listen for background messages

`styles.css`: Dark theme, green accent (#7af17a), matching Sales System branding

**Step 1:** Create all 4 files
**Step 2:** Commit

---

## Task 6: Popup UI

**Files:**
- Create: `chrome-extension/src/popup/popup.html`
- Create: `chrome-extension/src/popup/popup.ts`
- Create: `chrome-extension/src/popup/popup.css`

**Notes:**

Two states:
1. **Not authenticated** — Login form (email + password) connecting to Sales System via Supabase
2. **Authenticated** — Status card (Sales System connected + LinkedIn status), stats (prospects/conversations synced), last sync time, sync button, logout button

Dark theme (#14080e), green accent (#7af17a), compact 300px width.

**Step 1:** Create all 3 files
**Step 2:** Commit

---

## Task 7: Icons + build config + static file copy

**Files:**
- Create: `chrome-extension/icons/` (copy logo.png from main project)
- Modify: `chrome-extension/tsup.config.ts` (onSuccess hook to copy manifest.json, popup.html, popup.css, styles.css, icons to dist/)

**Step 1:** Copy icons, update tsup config
**Step 2:** Run `npm run build`, verify dist/ has all files
**Step 3:** Commit

---

## Task 8: Sales System DB migration — linkedin_conversation_id + linkedin_sync

**Files:**
- Create: `supabase/migration-linkedin-sync.sql`
- Modify: `src/lib/types/database.ts`

**Notes:**

SQL migration:
- `ALTER TABLE dm_conversations ADD COLUMN linkedin_conversation_id TEXT`
- Index on linkedin_conversation_id
- `CREATE TABLE linkedin_sync` (user_id, linkedin_profile_id, last_sync_at, sync_status, conversations_synced, prospects_synced)
- RLS: users can only see/manage their own sync row

TypeScript: Update DmConversation interface to include `linkedin_conversation_id: string | null` and extend message type with `pending_send?: boolean`, `sent_at?: string`, `linkedin_message_id?: string`

**Step 1:** Create migration SQL
**Step 2:** Run migration against Supabase
**Step 3:** Update types
**Step 4:** Verify typecheck
**Step 5:** Commit

---

## Task 9: Update inbox sendMessage — pending_send flag for LinkedIn

**Files:**
- Modify: `src/lib/actions/inbox.ts`

**Notes:** When sending a message on a conversation that has a `linkedin_conversation_id`, add `pending_send: true` to the message object. The extension will pick it up and send it via LinkedIn API, then set pending_send to false.

**Step 1:** Modify sendMessage function
**Step 2:** Verify typecheck + build
**Step 3:** Commit

---

## Task 10: LinkedIn page — extension status indicator

**Files:**
- Modify: `src/app/(app)/prospecting/linkedin/linkedin-view.tsx`

**Notes:** Add a status bar at the top showing extension sync status (reads from linkedin_sync table). Shows: connected/disconnected, last sync time, number of synced conversations.

**Step 1:** Add server action to read linkedin_sync
**Step 2:** Add status component to linkedin-view
**Step 3:** Verify build
**Step 4:** Commit

---

## Task 11: Final build + test + push

**Step 1:** Build extension: `cd chrome-extension && npm run build`
**Step 2:** Build Sales System: `npm run build`
**Step 3:** Commit all remaining changes
**Step 4:** Push to origin
