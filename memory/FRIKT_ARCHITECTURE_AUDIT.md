# FRIKT — Complete Technical Architecture Audit

---

## 1. PROJECT STRUCTURE

### Repositories / Projects
There is **one single monorepo** at `/app` containing everything. There is no separate web project. The "web" experience is simply the Expo Web export of the same React Native app.

### Folder Map

```
/app
├── backend/
│   ├── server.py          ← THE entire backend (4,844 lines, single file)
│   ├── storage.py          ← Emergent Object Storage wrapper for avatars
│   ├── .env                ← MongoDB URL, JWT secret, admin emails
│   ├── requirements.txt    ← Python dependencies
│   ├── tests/              ← Backend pytest files
│   └── uploads/avatars/    ← Legacy local upload folder (deprecated)
│
├── frontend/               ← Expo/React Native mobile + web app
│   ├── app/                ← Expo Router file-based routing
│   │   ├── (auth)/         ← Login, Register, Forgot Password screens
│   │   ├── (tabs)/         ← Main tab screens: Home, Search, Post, Categories, Profile
│   │   ├── _layout.tsx     ← Root layout: providers, nav, notification listener
│   │   ├── admin.tsx       ← Admin panel (single screen)
│   │   ├── community/[id]  ← Community detail screen
│   │   ├── problem/[id]    ← Problem (Frikt) detail screen
│   │   ├── user/[id]       ← Other user's profile
│   │   └── ...             ← 15+ other screens
│   ├── src/
│   │   ├── components/     ← ProblemCard, PostWizard, BadgeSection, etc.
│   │   ├── context/        ← AuthContext (login/token state)
│   │   ├── contexts/       ← BadgeContext, NotificationContext
│   │   ├── services/
│   │   │   ├── api.ts      ← API client (725 lines, all backend calls)
│   │   │   └── notifications.ts ← Expo push notification service
│   │   ├── theme/          ← Colors, category styles
│   │   └── utils/          ← formatTimeAgo
│   ├── app.json            ← Expo config (SDK 57, Firebase, plugins)
│   ├── eas.json            ← EAS Build config
│   ├── package.json        ← Dependencies
│   └── google-services.json ← Firebase config (Android)
│
├── railway.toml            ← Railway deployment config
├── railway_deploy/         ← Duplicate deployment files for Railway
├── deployment_package/     ← Docker-based deployment alternative
├── memory/                 ← PRD, documentation
└── test_reports/           ← Automated test results
```

### What belongs to what

| Layer | Files |
|-------|-------|
| **Mobile app** | `frontend/app/**`, `frontend/src/**`, `app.json`, `eas.json` |
| **Web** | SAME files — Expo compiles them to web via `expo export --platform web` |
| **Backend / API** | `backend/server.py` (single monolithic file) |
| **Database** | MongoDB, configured in `backend/.env` → `MONGO_URL` |
| **Authentication** | `backend/server.py` lines 549–596 (JWT), `frontend/src/context/AuthContext.tsx` |
| **Notifications** | `backend/server.py` lines 4193–4288, `frontend/src/services/notifications.ts` |
| **Storage** | `backend/storage.py` (Emergent Object Storage for avatars) |

### Architecture Diagram (actual)

```
┌─────────────────┐     ┌─────────────────┐
│   iOS / Android  │     │   Web (Expo Web) │
│   (Expo Native)  │     │   (Same codebase)│
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         │  HTTPS + Bearer JWT    │
         ▼                        ▼
┌──────────────────────────────────────────┐
│          FastAPI Backend                  │
│       (backend/server.py)                │
│    Railway: frikt-backend-production     │
│          .up.railway.app                 │
├──────────────────────────────────────────┤
│  CORS: allow_origins=["*"]              │
│  Auth: JWT (HS256, 30-day expiry)        │
│  Routes: /api/* (120+ endpoints)         │
└────────┬──────────┬──────────┬───────────┘
         │          │          │
         ▼          ▼          ▼
┌──────────┐ ┌───────────┐ ┌──────────────┐
│ MongoDB  │ │ Expo Push  │ │   Resend     │
│ (Atlas)  │ │ Service    │ │ (Email/PWD   │
│          │ │ (HTTP API) │ │  Reset)      │
└──────────┘ └───────────┘ └──────────────┘
```

**Key fact: Mobile and Web are the SAME Expo codebase, the SAME backend, and the SAME database.** There is no separate web project or web repository.

---

## 2. TECH STACK

| Layer | Technology | Version / Details |
|-------|-----------|-------------------|
| **Mobile framework** | Expo SDK (React Native) | 57.0.26 (RN 0.86.3, React 19.2.3) |
| **Frontend web** | Expo Web (same codebase) | Compiled via `expo export --platform web` |
| **Language (frontend)** | TypeScript | 6.0.3 |
| **Navigation** | expo-router | 5.0.24 (file-based routing) |
| **Backend** | FastAPI (Python) | Single file `server.py` |
| **Database** | MongoDB | Via Motor (async driver) |
| **Authentication** | Custom JWT | HS256 via PyJWT, bcrypt hashing, 30-day tokens |
| **Token storage** | expo-secure-store (native), AsyncStorage (web) | Per-platform split in AuthContext |
| **Hosting (backend)** | Railway | `frikt-backend-production.up.railway.app` |
| **Hosting (mobile)** | EAS Build / App Store / Google Play | Expo Application Services |
| **File storage** | Emergent Object Storage | For avatars (via `storage.py`) |
| **Push notifications** | Expo Push + Firebase FCM (Android) | `expo-notifications`, `google-services.json` |
| **Email** | Resend | Password reset only (optional) |
| **HTTP client (backend)** | httpx | For Expo Push API calls |
| **HTTP client (frontend)** | axios | For all API communication |
| **Analytics** | None (custom admin dashboard) | Built-in DAU/WAU counters |
| **AI services** | None | — |
| **State management** | React Context | AuthContext, BadgeContext, NotificationContext |
| **UI components** | React Native core | No third-party UI library |

**Key libraries (frontend):** react-native-reanimated, react-native-safe-area-context, @react-native-async-storage/async-storage, expo-image, expo-haptics, expo-web-browser, @expo/vector-icons

**Key libraries (backend):** fastapi, motor, pydantic, passlib[bcrypt], python-jose/PyJWT, httpx, python-dotenv, resend

---

## 3. DATABASE

MongoDB. All data lives in a single database (name: `pathgro_db`). No schema enforcement at DB level — schemas are enforced by Pydantic models in `server.py`.

### Collections

| Collection | Purpose | Key Fields | Primary Key | Relationships |
|-----------|---------|------------|-------------|---------------|
| **users** | User accounts | `id` (uuid), `email`, `name`, `displayName`, `password_hash`, `role` (user/admin), `status` (active/banned/shadowbanned), `avatarUrl`, `bio`, `city`, `showCity`, `rocket10_completed`, `rocket10_day`, `posts_today`, `last_post_date`, `streak_days`, `followed_categories[]`, `followed_problems[]`, `saved_problems[]`, `created_at` | `id` (uuid string) | Referenced by all other collections via `user_id` |
| **problems** | Frikts (posts) | `id` (uuid), `user_id`, `user_name`, `user_avatar_url`, `title`, `category_id`, `frequency`, `pain_level`, `willing_to_pay`, `when_happens`, `who_affected`, `what_tried`, `relates_count`, `comments_count`, `unique_commenters`, `signal_score`, `reports_count`, `is_hidden`, `status`, `is_pinned`, `needs_context`, `merged_into`, **`is_local`**, **`community_id`**, `created_at` | `id` (uuid string) | `user_id` → users, `community_id` → communities |
| **comments** | Comments + replies | `id`, `problem_id`, `user_id`, `user_name`, `content`, `parent_comment_id`, `reply_to_user_id`, `reply_to_user_name`, `helpful_count`, `is_pinned`, `status`, `reports_count`, `edited_at`, `created_at` | `id` (uuid string) | `problem_id` → problems, `user_id` → users, `parent_comment_id` → comments (self-referential) |
| **relates** | Relate actions (likes) | `id`, `problem_id`, `user_id`, `created_at` | `id` (uuid string) | `problem_id` → problems, `user_id` → users. **Unique constraint enforced in code**: 1 relate per user per problem |
| **communities** | Local communities | `id`, `name`, `active_code`, `moderator_email`, `created_at` | `id` (uuid string) | Referenced by community_members, problems |
| **community_members** | User↔Community membership | `id`, `user_id`, `community_id`, `joined_at` | `id` (uuid string) | `user_id` → users, `community_id` → communities. **1 user = max 1 community** (enforced in code) |
| **community_join_requests** | Pending join requests | `id`, `user_id`, `user_email`, `community_id`, `message`, `status`, `created_at`, **`expires_at`** (7 days) | `id` | `user_id` → users, `community_id` → communities |
| **community_requests** | Requests for new communities | `id`, `email`, `community_name`, `description`, `created_at`, **`expires_at`** (3 days) | `id` | — |
| **notifications** | In-app notifications | `id`, `user_id`, `type`, `problem_id`, `message`, `is_read`, `created_at` | `id` | `user_id` → users, `problem_id` → problems |
| **push_tokens** | Expo push tokens | `id`, `user_id`, `token`, `is_active`, `created_at` | `id` | `user_id` → users |
| **notification_settings** | Per-user notification prefs | `user_id`, `push_notifications`, `new_comments`, `new_relates`, `trending` | `user_id` | `user_id` → users |
| **pending_notification_batches** | Batched notification queue | `id`, `recipient_user_id`, `batch_type`, `target_id`, `target_title`, `user_ids[]`, `user_names[]`, `first_action_at`, `last_action_at`, `notification_sent` | `id` | — |
| **reports** | Content/user reports | `id`, `reporter_id`, `reporter_name`, `target_type` (problem/comment/user), `target_id`, `reason`, `details`, `status`, `created_at` | `id` | References problems/comments/users via `target_id` |
| **blocked_users** | User blocks | `id`, `blocker_user_id`, `blocked_user_id`, `created_at` | `id` | Both fields → users |
| **user_stats** | Gamification counters | `user_id`, `total_posts`, `total_relates_given`, `total_relates_received`, `total_comments`, `total_frikts_opened`, `users_followed`, `current_visit_streak`, `last_visit_date`, `streak_miss_count`, `posts_per_category`, `max_relates_on_single_post` | `user_id` | `user_id` → users |
| **user_achievements** | Earned badges | `id`, `user_id`, `badge_id`, `unlocked_at` | `id` | `user_id` → users |
| **pending_badge_notifications** | Badges to show on next open | `user_id`, `badge`, `created_at` | — | — |
| **password_reset_tokens** | PWD reset codes | `id`, `user_id`, `token` (6-digit), `email`, `expires_at`, `used`, `created_at` | `id` | `user_id` → users |
| **admin_audit_logs** | Admin action trail | `id`, `admin_id`, `admin_email`, `action`, `target_type`, `target_id`, `details`, `created_at` | `id` | — |
| **feedback** | User feedback | `id`, `user_id`, `user_email`, `user_name`, `message`, `app_version`, `created_at`, `is_read` | `id` | — |
| **user_follows** | User-to-user follows | `follower_id`, `following_id`, `created_at` | — | Both → users |

### GLOBAL vs LOCAL — Same Table

**Global and Local Frikts share the same `problems` collection.** They are distinguished by two fields:

- `is_local: bool` — `false` = global, `true` = local
- `community_id: str | null` — `null` for global, community UUID for local

The global feed filter explicitly excludes local: `{"is_local": {"$ne": True}}`.
The local feed filter explicitly includes: `{"is_local": True, "community_id": "xxx"}`.

This is **already a good foundation** for a shared model.

---

## 4. AUTHENTICATION

### Registration Flow
1. User fills email + name + password in `frontend/app/(auth)/register.tsx`
2. `api.register(name, email, password)` → `POST /api/auth/register`
3. Backend normalizes email to lowercase, checks uniqueness
4. Creates user record with `password_hash` (bcrypt), assigns UUID
5. If email is in `ADMIN_EMAILS` env var → `role: "admin"`
6. Returns `{ access_token: JWT, user: {...} }`
7. Frontend stores token in `expo-secure-store` (native) or `AsyncStorage` (web)

### Login Flow
1. User enters email + password in `frontend/app/(auth)/login.tsx`
2. `api.login(email, password)` → `POST /api/auth/login`
3. Backend finds user by lowercase email, verifies bcrypt hash
4. If banned → 403
5. Returns `{ access_token: JWT, user: {...} }`
6. Token stored same as registration

### Identity Storage
- **Backend**: `users` collection in MongoDB. User identified by `id` (UUID string)
- **JWT payload**: `{ sub: user_id, exp: 30_days_from_now }`
- **Frontend**: Token in SecureStore, user object in AsyncStorage

### How the app identifies the logged-in user
Every API call includes `Authorization: Bearer <JWT>`. Backend decodes JWT, extracts `sub` (user_id), and looks up the user in MongoDB.

### Anonymous / Guest users
**NOT currently supported.** Every action requires authentication:
- `get_problems` requires `require_auth`
- `relate_to_problem` requires `require_auth`
- `create_problem` requires `require_auth`
- Even viewing categories requires being logged in

**There is no concept of an anonymous user, guest session, or device-only identity in the current system.**

---

## 5. HOW A FRIKT IS CREATED

### Complete Flow

```
User taps Post tab
→ frontend/app/(tabs)/post.tsx
    → Renders PostWizard component
        → frontend/src/components/PostWizard.tsx

User fills form:
  - title (min 10 chars)
  - category (optional, default "other")
  - frequency, pain_level (optional)
  - when_happens, who_affected, what_tried (optional)
  - is_local toggle (if in a community)

User presses Submit
→ PostWizard calls api.createProblem(data)
    → frontend/src/services/api.ts → POST /api/problems

Backend: create_problem() [server.py line 1556]
  1. Validates title ≥ 10 chars
  2. Rate limit: max 10/day per user
  3. If is_local=true: verifies community_members membership
     → Forces category_id = "local"
     → Sets community_id from membership
  4. Creates Problem model (UUID, user fields, all data)
  5. Calculates signal_score
  6. db.problems.insert_one()
  7. Updates user post count (posts_today, last_post_date)
  8. GAMIFICATION: increment_user_stat("total_posts")
  9. GAMIFICATION: increment_category_posts
  10. check_and_award_badges (may trigger badge notifications)
  
Returns: ProblemResponse + newly_awarded_badges[]
```

### Fields Stored Per Frikt (in `problems` collection)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid string | auto | Primary key |
| user_id | string | yes | Author's user ID |
| user_name | string | yes | Denormalized display name |
| user_avatar_url | string | no | Denormalized avatar |
| title | string | yes | Min 10 chars (the Frikt text) |
| category_id | string | yes | "money", "work", "health", etc. |
| frequency | string | no | "daily", "weekly", "monthly", "rare" |
| pain_level | int (1-5) | no | Severity |
| willing_to_pay | string | no | "$0", "$1-10", "$10-50", "$50+" |
| when_happens | string | no | Context |
| who_affected | string | no | Context |
| what_tried | string | no | Context |
| relates_count | int | auto | Counter |
| comments_count | int | auto | Counter |
| unique_commenters | int | auto | Counter |
| signal_score | float | auto | Composite ranking metric |
| reports_count | int | auto | Moderation |
| is_hidden | bool | auto | Moderation |
| status | string | auto | "active"/"hidden"/"removed" |
| is_pinned | bool | admin | Admin pin |
| needs_context | bool | admin | Admin flag |
| merged_into | string | no | Duplicate merge |
| **is_local** | bool | auto | false=global, true=local |
| **community_id** | string | no | null=global, UUID=local community |
| created_at | datetime | auto | Timestamp |

---

## 6. HOW RELATE WORKS

### Complete Flow

```
User taps "RELATE" button on a ProblemCard
→ frontend/src/components/ProblemCard.tsx
    → calls api.relateToProblem(problemId)
        → POST /api/problems/{problem_id}/relate

Backend: relate_to_problem() [server.py line 2002]
  1. Find the problem by ID
  2. PREVENT self-relate: user cannot relate to own post
  3. If LOCAL frikt: verify user is community member
  4. DUPLICATE CHECK: db.relates.find_one({problem_id, user_id})
     → if exists → 400 "Already related"
  5. Create Relate record: { id, problem_id, user_id, created_at }
  6. db.relates.insert_one()
  7. Increment problem.relates_count + recalculate signal_score
  8. db.problems.update_one() with new count + score
  9. GAMIFICATION (relater): increment total_relates_given, check badges
  10. GAMIFICATION (author): increment total_relates_received,
      check max_relates_on_single_post, check impact/viral badges
  11. NOTIFICATION (if not self, not banned):
      - Check user's notification settings
      - Use batched notifications (5-min window for relates)
      - First relate = immediate push; subsequent = batched

Returns: { relates_count, signal_score, newly_awarded_badges[] }
```

### Key Facts
- **One relate per user per problem** — enforced by code-level duplicate check
- **Unrelate is supported**: `DELETE /api/problems/{problem_id}/relate` removes the record and decrements count
- **Feed update**: No push-based real-time update. Frontend re-fetches feed. The `signal_score` changes affect future Trending feed ordering
- **Relates collection**: `{ id, problem_id, user_id, created_at }` — simple pivot table

---

## 7. GLOBAL VS LOCAL

### How Local Works Today

| Aspect | Implementation |
|--------|---------------|
| **Data model** | Same `problems` collection. `is_local: true` + `community_id: "xxx"` |
| **What is a "community"** | A named group with an `active_code` (invite code). NOT location/postcode-based. |
| **How users join** | Enter a code → `POST /api/communities/join` → creates `community_members` record |
| **Membership limit** | 1 user = 1 community at a time (switching removes old membership) |
| **Community creation** | Admin only via `POST /api/admin/communities` |
| **Feed filtering** | `GET /api/problems?feed=local&community_id=xxx` |
| **Global feed exclusion** | `query["is_local"] = {"$ne": True}` — local frikts never appear in global feeds |
| **Search behavior** | Text search INCLUDES local frikts (no exclusion filter) |
| **Relate restriction** | Only community members can relate to that community's local frikts |
| **Join requests** | Users can request to join (expires after 7 days). Admin manually processes |
| **Community requests** | Users can request creation of new communities (expires after 3 days) |

### Is "Local" actually location-based?
**No.** Despite the name, it is a **group/community model**, not a geolocation model. There is no postcode, coordinates, or address in the community or problem model. Communities are identified by a name and join code (e.g., "MigrantsAus" with code "MIGRANTSAUS").

### Could it be converted to a broader Community model?
**It already IS a community model.** The database structure supports arbitrary named communities. The URL pattern `frikt.com/migrantsaus` could map directly to `communities.active_code = "migrantsaus"`. The data layer needs minimal changes — the missing piece is **the web client and anonymous access**.

---

## 8. WEB

### Current State

The Frikt web experience is **the same Expo codebase compiled to web**. It is NOT a separate Next.js, Remix, or standalone web project.

| Question | Answer |
|----------|--------|
| Does it connect to the same backend? | **YES** — same `EXPO_PUBLIC_BACKEND_URL` → same FastAPI server |
| Does it connect to the same database? | **YES** — via the same backend |
| Can it read real Frikts? | **YES** — if the user logs in |
| Can it write Frikts? | **YES** — if the user logs in |
| Is authentication shared? | **YES** — same `/api/auth/login` endpoint, same JWT tokens |
| Are users shared? | **YES** — same `users` collection |
| Can you use it without an account? | **NO** — every route requires authentication |
| Does it use `expo-secure-store`? | **NO** — AuthContext detects web and falls back to `AsyncStorage` (localStorage) |
| Is it currently deployed as a website? | **Not evidenced** — no frikt.com web deployment found. The Expo Web export works but doesn't appear to be hosted anywhere as a standalone website |
| Is it optimized for web? | **Partially** — Expo components render on web, but the UI is designed mobile-first. Some deprecation warnings exist (`shadow*` → `boxShadow`) |

### Critical insight for your plan
The web and mobile app are **already fully connected** at the data layer. They share the same backend, same database, same user accounts, same Frikts, same Relates, same Communities. The gap is **not** in data connectivity — it's in:
1. **Anonymous access** (not supported)
2. **Web-specific UI/routing** (Expo Web renders the mobile UI, not a web-optimized experience)
3. **SEO / public URLs** (Expo Router can do `frikt.com/migrantsaus` but needs configuration)

---

## 9. GITHUB / DEPLOYMENT

### Repositories
Based on the codebase structure:
- **One repository** contains both frontend and backend
- Multiple deployment configs exist:
  - `/app/railway.toml` — Main Railway deployment config
  - `/app/railway_deploy/` — Alternative Railway deployment package
  - `/app/deployment_package/` — Docker-based alternative (Dockerfile, docker-compose)

### How the backend deploys
```
Railway reads railway.toml:
  build: nixpacks
  start: cd backend && python -m uvicorn server:app --host 0.0.0.0 --port $PORT
  healthcheck: /api/health
```
The production backend runs at `frikt-backend-production.up.railway.app`.

### How the mobile app deploys
```
EAS Build → generates .apk / .ipa
EAS Submit → uploads to App Store / Google Play
```
Configured in `eas.json` with development/preview/production profiles.

### How the web currently deploys
**No dedicated web deployment found.** The web can be built with `npx expo export --platform web` but there's no hosting config (no Vercel, no Netlify, no Railway static site) for a web deployment.

### Emergent vs production
- **Emergent** (this environment) is for development only — code editing, preview, testing
- **Production** is Railway (backend) + EAS (mobile)
- Changes in Emergent don't affect production until: (a) pushed to GitHub → Railway redeploys, (b) EAS build is triggered

### Risk of overwrites
If another tool (like Lovable) edits the same repository branch, they could overwrite each other. No branching strategy or merge protection is evidenced.

---

## 10. WHAT WOULD NEED TO CHANGE FOR THE NEW MODEL

### Target experience
```
User opens: frikt.com/migrantsaus
→ Sees "Migrants Australia" community feed
→ Posts a Frikt anonymously (no account)
→ Presses Relate anonymously
→ Frikt appears immediately in mobile app
→ Relates sync between web and app in real-time
→ Later, anonymous user creates account and keeps activity
```

### How close is the architecture TODAY?

**Very close at the data layer. Far at the access layer.**

| Component | Current state | Gap |
|-----------|--------------|-----|
| **Shared backend** | ✅ Already shared between mobile and web | None |
| **Shared database** | ✅ Same MongoDB for all clients | None |
| **Same Frikt IDs** | ✅ UUID, shared across all access paths | None |
| **Same Community IDs** | ✅ UUID, queryable by `active_code` | None |
| **Community→URL mapping** | ⚠️ `active_code` exists but no web routing to it | Need: web route `/community_code` → lookup by `active_code` |
| **Anonymous posting** | ❌ All endpoints require `require_auth` | Need: anonymous user model + endpoints that accept optional auth |
| **Anonymous relating** | ❌ `require_auth` on relate endpoint | Same as above |
| **Device/session identity** | ❌ No concept of anonymous sessions | Need: device fingerprint or session token for anonymous users |
| **Activity claiming** | ❌ No way to link previous anonymous activity to a new account | Need: migration flow — reassign `user_id` on anonymous records |
| **Web-optimized UI** | ❌ Current web is mobile Expo layout | Need: responsive web UI (or separate Next.js frontend) |
| **SEO / Public pages** | ❌ No server-side rendering, no public meta tags | Need: SSR or static generation for community pages |
| **Real-time sync** | ❌ No WebSocket/SSE. Clients poll on refresh | Could add, but polling works for MVP |

### Conceptual architecture needed

```
            frikt.com/migrantsaus
                    │
                    ▼
         ┌────────────────────┐
         │  Web Frontend       │  ← New (Next.js / Expo Web / separate)
         │  - Anonymous browse │
         │  - Anonymous post   │
         │  - Anonymous relate │
         │  - Optional sign-up │
         └──────────┬─────────┘
                    │  HTTPS + JWT or anon-session
                    ▼
         ┌────────────────────┐
         │  SHARED BACKEND     │  ← Same FastAPI (extended)
         │  (FastAPI)          │
         └──────────┬─────────┘
                    │
                    ▼
         ┌────────────────────┐
         │  SHARED DATABASE    │  ← Same MongoDB
         │  (MongoDB)          │
         └──────────┬─────────┘
                    │
                    ▲
         ┌──────────┴─────────┐
         │  Mobile App         │  ← Same Expo app (unchanged)
         │  (Expo/RN)          │
         └────────────────────┘
```

---

## 11. GAP ANALYSIS

| Area | Current State | Required Change | Difficulty |
|------|--------------|----------------|------------|
| **Database (Frikts)** | ✅ Shared `problems` collection with `is_local`/`community_id` | Add `source: "app"/"web"` field. Add `anonymous_session_id` field | **LOW** |
| **Database (Relates)** | ✅ Shared `relates` collection | Add `anonymous_session_id` as alternative to `user_id` | **LOW** |
| **Database (Communities)** | ✅ `communities` with `active_code` for URL mapping | No changes needed | **NONE** |
| **Database (Users)** | ✅ Registered users with UUID | Add optional `anonymous_sessions` collection | **LOW** |
| **Authentication** | ❌ All endpoints require JWT | Add `get_current_user_or_anonymous` dependency. Create anonymous session endpoints | **MEDIUM** |
| **Anonymous users** | ❌ No concept of anonymous users | Add `anonymous_sessions` collection (session_id, device_fingerprint, community_id, created_at). Add cookie/token-based tracking | **MEDIUM** |
| **Anonymous posting** | ❌ `create_problem` requires `require_auth` | Allow anonymous session ID. Store `user_id=null` + `anonymous_session_id`. Display as "Anonymous" | **MEDIUM** |
| **Anonymous relating** | ❌ `relate_to_problem` requires `require_auth` | Same pattern — allow anonymous session, prevent duplicates by session | **MEDIUM** |
| **Activity claiming** | ❌ Not supported | On registration/login: update all records with `anonymous_session_id` to real `user_id` | **MEDIUM** |
| **Web frontend** | ⚠️ Expo Web exists but mobile-first, requires login | Build community landing pages with anonymous access. Options: Next.js (best for SEO) or enhanced Expo Web | **HIGH** |
| **Community URL routing** | ❌ No `frikt.com/slug` routing | Add web route that resolves `slug` → `communities.active_code` → community feed | **LOW** |
| **Mobile syncing** | ✅ Already shared DB | No change needed — mobile already reads from same `problems` collection | **NONE** |
| **Real-time updates** | ❌ No real-time (pull-to-refresh) | Optional: add WebSocket/SSE for live feed updates | **MEDIUM** (optional) |
| **Creator/admin perms** | ✅ Admin can manage all communities | Add `moderator` role per community for community admins | **LOW** |
| **Reports/moderation** | ✅ Full reporting system exists | Extend to handle anonymous reports (by session) | **LOW** |
| **Rate limiting** | ⚠️ 10 posts/day per user (by user_id) | Add rate limiting for anonymous users (by IP or session) | **MEDIUM** |
| **Deployment (web)** | ❌ No web hosting configured | Deploy web frontend (Vercel/Netlify/Railway static) | **MEDIUM** |
| **SEO** | ❌ No SSR, no public meta tags | Add server-side rendering for community pages (Next.js or Expo SSG) | **HIGH** |
| **Spam prevention** | ⚠️ Only user-based rate limits | Add CAPTCHA, IP throttling, fingerprint-based limits for anonymous | **MEDIUM** |

---

## 12. RECOMMENDATION

### A. What Should NOT Be Rebuilt

- **Backend API** — The FastAPI server already handles all the data operations correctly. Extend it, don't replace it.
- **Database schema** — The `problems`, `relates`, `communities`, `community_members` collections are already designed correctly for a shared model. Add fields, don't restructure.
- **Mobile app** — Zero changes needed to the mobile app for phase 1. It already reads from the shared database.
- **Authentication system** — The JWT auth works. Add anonymous on top of it, don't replace it.
- **Community model** — `active_code` already maps to URL slugs. The data model is ready.
- **Notification system** — Batched push notifications are well-engineered. Keep them.
- **Gamification** — 45 badges, stats, streaks. All working. Anonymous users can be excluded from gamification initially.

### B. Existing Infrastructure to Reuse

1. **Same FastAPI backend** (add ~200 lines for anonymous endpoints)
2. **Same MongoDB database** (add 2-3 fields to existing collections + 1 new collection)
3. **Same `communities` collection and `active_code`** for URL slug resolution
4. **Same `problems` and `relates` collections** for all Frikts and Relates
5. **Same Railway hosting** for the backend
6. **Same admin panel** for moderation (already handles community management)
7. **Same Expo Push system** (mobile users still get notifications when web users interact)

### C. Minimum Architecture Changes Required

1. **Backend**: Add `anonymous_sessions` collection + `GET /api/communities/by-code/{code}` public endpoint
2. **Backend**: Create `get_user_or_anon()` auth dependency that allows both JWT and anonymous session tokens
3. **Backend**: Add `anonymous_session_id` field to `problems` and `relates` for anonymous entries
4. **Backend**: Add activity-claim endpoint: `POST /api/auth/claim-anonymous` that migrates records
5. **Backend**: Add rate limiting per IP/session for anonymous actions
6. **Web**: Build a lightweight web frontend (Next.js recommended for SEO) that:
   - Resolves `/migrantsaus` → community feed
   - Shows Frikts from `problems` collection
   - Allows anonymous post + relate
   - Offers optional signup
7. **Deployment**: Deploy web frontend to Vercel/Netlify with custom domain

### D. Safest Implementation Order

1. **Backend anonymous endpoints** (LOW risk — additive changes only, no breaking changes to existing mobile behavior)
2. **Community public endpoint** (`GET /api/communities/by-code/{code}` — no auth required)
3. **Anonymous session system** (new collection + cookie/token)
4. **Anonymous post + relate** (modify `create_problem` and `relate_to_problem` to accept either auth mode)
5. **Activity claiming** (migration endpoint)
6. **Web frontend MVP** (community page + anonymous post + relate)
7. **Web deployment** (Vercel + custom domain)
8. **SEO optimization** (meta tags, OG images, SSR)
9. **Spam protection** (CAPTCHA, rate limits)
10. **Real-time updates** (WebSocket — nice-to-have, not MVP)

### E. Architectural Risks

| Risk | Level | Mitigation |
|------|-------|------------|
| **Spam from anonymous users** | HIGH | IP-based rate limiting + CAPTCHA on post/relate. This is the #1 risk. Without protection, bots will flood communities |
| **Monolithic backend** | MEDIUM | `server.py` is 4,844 lines. Adding more features increases fragility. Consider splitting into routers before adding web endpoints |
| **No database indexes** | MEDIUM | No evidence of MongoDB indexes. As anonymous traffic grows, queries on `community_id`, `is_local`, `active_code` need proper indexes |
| **CORS wildcard** | LOW | Currently `allow_origins=["*"]`. Fine for now, but should be restricted to specific domains (frikt.com + app) in production |
| **JWT secret in .env** | LOW | The secret is a static string. Consider rotating on deploy. Anonymous sessions should use a different mechanism (cookies, not JWT) |
| **Expo Web vs Next.js** | MEDIUM | Using Expo Web for the public site means no SSR → no SEO → communities won't be discoverable on Google. Next.js is strongly recommended for the web frontend |
| **Anonymous to registered migration** | LOW | The claim flow is straightforward (update `user_id` where `anonymous_session_id` matches), but edge cases exist (what if they related to their own future posts?) |

---

*End of audit. No code was modified.*
