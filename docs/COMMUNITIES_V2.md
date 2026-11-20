# Communities v2: guide for the app and the web

This document describes the backend changes for the new Frikt direction
("Communities" + `frikt.com/<slug>`) and what the **app** (Emergent) and the **web** (Lovable) need to do.
The backend is already implemented and tested (branch `claude/communities-backend`).

## Key ideas

- **Local → Communities ("Comm")**. The data model is still the same (`communities`, `problems` with `is_local: true` + `community_id`).
- **A user can be in many communities.** There is no more Join/Leave/Switch. `community_members` now means "communities this user has accessed".
- **Each community has a `slug`** → `frikt.com/<slug>` and a QR code that points to that URL.
- **Visibility**:
  - `public`: appears in Explore and search. Anyone can open it and post.
  - `unlisted`: does NOT appear in Explore or search. Anyone with the link can open it.
  - `private`: does NOT appear anywhere. It needs an **access code**.
- **Any registered user can create communities from the app** (max 10). They become its **owner**: they can edit it, copy the link, download the QR and view a dashboard.
- **Web without an account**: someone who posts or relates from `frikt.com/<slug>` becomes a **guest** user with a generated name (e.g. `Flower590`). In the app their frikts look like any other frikt, with that name. **"Anonymous" is never shown.**
- Existing communities (St. Kilda, Baltimore, T-comm) are kept as **private**, with their code and an automatic slug. Their owner can change the type from the app.

## Compatibility

The app version currently in the stores keeps working:
`/communities/join`, `/communities/switch`, `/communities/leave` and `/communities/me` still exist.
`join` no longer returns 409 ("switch?"): it simply adds the community.
`/communities/me` returns the most recently accessed community.

---

## APP (Emergent): endpoints

All of them require `Authorization: Bearer <user token>` (except where noted).
**Community object** (fields common to every response):

```json
{
  "id": "…", "name": "Migrants Australia", "slug": "migrantsaus",
  "description": "…", "avatar_url": null, "visibility": "public|unlisted|private",
  "requires_code": false, "member_count": 12, "frikt_count": 48,
  "created_at": "…", "owner_user_id": "…"
}
```

Responses for the **owner** also include `access_code` (private only), `access_codes` and `owner_email`.

| Method | Route | What it's for |
|---|---|---|
| GET | `/api/communities/mine` | **Comm tab: "My communities"**. Every community I've accessed or own. Each one has `is_owner` and `joined_at`. |
| GET | `/api/communities/explore?search=&limit=30&skip=0` | **Explore**: public only. Each one has `has_access`. |
| GET | `/api/communities/by-slug/{slug}` | Open a community from a link/slug. If it's private and I don't have access, it returns just `{id, slug, name, avatar_url, requires_code: true, has_access: false}`. |
| POST | `/api/communities/{id}/access` body `{ "code": "ABC123" }` | Add the community to my list. For public/unlisted no `code` is needed. Wrong code → 403 `Invalid access code`. |
| DELETE | `/api/communities/{id}/access` | Remove it from my list. |
| GET | `/api/problems?feed=local&community_id={id}&sort_by=new\|top\|trending` | A community's feed (same as before). Private without access → 403. |
| POST | `/api/problems` body `{ title, …, "is_local": true, "community_id": "{id}" }` | Post in a specific community. **You must now always send `community_id`.** |
| GET | `/api/communities/owned` | **Profile → "My communities"**: the ones I own (with `access_code` if private). |
| GET | `/api/communities/slug-available?slug=...` | While typing the link: `{slug, available, reason}`. `slug` comes back normalized (lowercase, hyphens). |
| POST | `/api/communities` | **Create community** (see below). |
| PATCH | `/api/communities/{id}` | Edit (owner only): `name`, `description`, `slug`, `visibility`, `access_code`, `owner_email`. |
| GET | `/api/communities/{id}/dashboard?days=90&limit=50&skip=0` | **Owner dashboard** (see below). |

### Create community

`POST /api/communities`

```json
{
  "name": "Migrants Australia",          // 3-60 characters
  "description": "Life as a migrant…",   // optional, max 280
  "slug": "migrantsaus",                 // 3-40: a-z, 0-9, hyphens
  "visibility": "public",                // public | unlisted | private
  "access_code": "MIGR2026",             // private only, optional (generated if missing). 4-32: A-Z 0-9 _
  "owner_email": "contact@example.com"   // optional, defaults to the account email
}
```

Errors (show `detail` to the user): 400 invalid slug/reserved/profanity/more than 10 communities, 409 `This link is already taken`, 400 code already in use.

The response is the owner community object (with `slug`, `access_code` if private, `is_owner: true`).

### Owner dashboard

`GET /api/communities/{id}/dashboard`

```json
{
  "community": { …owner community… },
  "total_frikts": 487,
  "total_relates": 1203,
  "frikts_by_date": [ { "date": "2026-03-22", "count": 64 }, … ],   // newest first
  "frikts": [ { "id", "title", "created_at", "relates_count", "comments_count", "author_name", "source": "app|web" } ]
}
```

### Screens to change in the app

1. **Tab "Local" → "Comm"**
   - Top section: **My communities** (`GET /communities/mine`). Tapping one opens its feed.
   - Section **Explore** with search (`GET /communities/explore`).
   - Button/field **"Have a link or code?"**: if the user pastes `frikt.com/xxx`, extract `xxx` and call `by-slug`; if `requires_code`, ask for the code and call `POST /communities/{id}/access`.
   - Remove Join / Leave / Switch from the interface.
2. **Community screen**: name, description, feed (same as the current local feed) and "Post" button that sends `community_id`. If it's public/unlisted and not in my list yet, call `POST /communities/{id}/access` (no code) when the user opens it or posts.
3. **PostWizard**: when posting in a community, send the `community_id` of the community the user is in (no longer "my only community").
4. **Profile → "My communities"** (new button):
   - List (`GET /communities/owned`) + **Create community** button.
   - Create form: name, description, link (`frikt.com/` + slug, checking availability as you type), type (Public / Unlisted / Private with an explanation for each one), code (private only, editable or auto-generated), contact email.
   - Community detail: **Copy link** (`https://frikt.com/<slug>`), **Download / share QR** (generated in the app with a QR library, e.g. `react-native-qrcode-svg`, pointing to `https://frikt.com/<slug>`), **Edit**, **Dashboard**.
5. **Frikts from the web** look like any other frikt (author = generated name). They have `source: "web"` if you want to show something small (optional).

---

## WEB (Lovable): endpoints for `frikt.com/<slug>`

No login. The page keeps two things in `localStorage`:
- `frikt_guest_token`: is returned **only the first time** the browser posts or relates (`guest_token` field). Send it afterwards as `Authorization: Bearer <guest_token>`.
- `frikt_access_<slug>`: for private communities, the token returned by `unlock`. Send it as the `X-Community-Access: <token>` header.

Base: `https://frikt-backend-production.up.railway.app/api`

| Method | Route | Response |
|---|---|---|
| GET | `/web/communities/{slug}` | `{id, slug, name, avatar_url, requires_code, unlocked, description?, visibility?, frikt_count?}`. If `unlocked: false` → show "This is a private Frikt Community" + code field. 404 if it doesn't exist. |
| POST | `/web/communities/{slug}/unlock` body `{code}` | `{access_token}`. 403 wrong code. |
| GET | `/web/communities/{slug}/frikts?sort=new\|top&limit=30&skip=0` | `[{id, title, created_at, relates_count, comments_count, author_name, author_avatar_url, is_mine, user_has_related}]` |
| POST | `/web/communities/{slug}/frikts` body `{title}` (10-200 characters) | `{frikt, guest_token, guest_name}`. If `guest_token` is not null, store it. |
| POST | `/web/frikts/{id}/relate` | `{relates_count, user_has_related: true, guest_token, guest_name}` |
| DELETE | `/web/frikts/{id}/relate` | `{relates_count, user_has_related: false}` |

Errors: show `detail`. 400 (profanity, too short, own frikt), 403 (private community without code / banned), 429 (too many posts: "Try again later").

CORS: `frikt.com`, `www.frikt.com` and Lovable previews (`*.lovable.app`, `*.lovableproject.com`) are allowed.

Slugs reserved for landing pages (can't be communities): `letitgo`, `privacy`, `terms`, `vision` (+ others such as `admin`, `login`, `about`…).

---

## ADMIN (Karolis): CSV exports

Require an admin token:
- `GET /api/admin/communities/{id}/export.csv?period=all|7d|30d|90d`: every frikt (text, date, relates, comments, source web/app, author, whether they're a guest).
- `GET /api/admin/communities/{id}/relates.csv?period=…`: every relate (which frikt, when, pseudonymous user id).

## Anti-spam (web)

- Posting: 5/minute and 20/hour per IP; 10/day per guest.
- Relate: 30/minute and 300/hour per IP; 1 per guest and frikt.
- Private codes: 10/minute, 30/hour per IP.
- Profanity filter, reports and moderation (ban / shadowban / hide) also apply to guests.
- IP is only used for the limits; it's never stored.
