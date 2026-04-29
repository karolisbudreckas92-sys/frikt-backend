# FRIKT App - Product Requirements Document

## Overview
FRIKT is a social platform for sharing everyday frustrations ("frikts"). Users can post, relate to, and comment on frikts within global and local community feeds.

## Tech Stack
- **Frontend**: React Native / Expo Router
- **Backend**: FastAPI / Python
- **Database**: MongoDB
- **Image Storage**: Cloudinary
- **Build/Deploy**: EAS (Expo Application Services)
- **Custom Fonts**: Plus Jakarta Sans (4 weights: 400, 500, 600, 700) - embedded via expo-font config plugin + runtime loading

## Critical Technical Notes
- **DO NOT** use `useFocusEffect` or imports from `@react-navigation/native` — causes crashes with Expo Router
- **DO NOT** add `fontWeight` to any style that has a custom `fontFamily` — causes iOS crashes
- **Font embedding**: Fonts MUST be in `expo-font` config plugin (`app.json`) pointing to `./assets/fonts/` for production builds. Runtime `useFonts` alone works in Expo Go but NOT in production.
- **Git sync**: Always verify `git log --oneline -3` matches Emergent's latest commit before building

## Font Weight Rules
- Frikt text in feeds = `fonts.medium` (500)
- Frikt text on detail page = `fonts.semibold` (600)
- Headings and titles = `fonts.bold` (700)
- User names = `fonts.semibold` (600)

## Recently Fixed (Apr 2026)
- CRITICAL: Production crash on Profile/Create Frikt — caused by code not syncing to local repo (git pull failures)
- Fonts embedded in iOS binary via expo-font config plugin with local asset files
- Duplicate StyleSheet keys in home.tsx, profile.tsx, community/[id].tsx
- Global trending fallback (same logic as local — falls back to hot_score if < 5 frikts)
- Frikt card title weight reduced from semibold to medium
- Problem detail title weight reduced from bold to semibold
- Global ErrorHandler added for native crash capture
- ErrorBoundary wrappers on Profile and CreateFrikt screens

## Recently Completed (Tandas — Apr 2026)
### Tanda 1 — Security (DONE, in production)
- `slowapi` rate limiting on auth endpoints
- `re.escape` applied to all `$regex` MongoDB queries
- Pydantic `max_length` caps on Problem/Comment models
- Explicit CORS origin list

### Tanda 2 — Stability (DONE)
- Sentry crash reporting (frontend `@sentry/react-native`, backend `sentry-sdk[fastapi]`)
- Cloudinary explicit transformations (size/format)
- Push token rotation listener

### Tanda 3 — Apple UGC Compliance (DONE — pending deploy)
- `better-profanity` with `/app/backend/moderation/blocklist.txt` custom slurs
- `check_profanity()` injected on:
  - `POST /api/problems` (title, when, who, what)
  - `POST /api/comments` (content)
  - `PUT /api/comments/{id}` (content)
  - `PUT /api/users/me/profile` (displayName, bio)
- Returns 400 with `"Content violates community guidelines. Please rephrase."`
- Admin alerts on every report (`/api/report/problem|comment|user`):
  - Push notifications to all admins (throttled 5 min/target_type)
  - Email to `ADMIN_ALERT_EMAIL` (no throttle)
- Frontend toasts surface backend 400 detail (PostWizard, edit-profile, problem comments)
- Admin badge shows pending reports count via `GET /api/admin/reports/pending-count`
- `better-profanity==0.7.0` added to ROOT `/app/requirements.txt` (Railway-critical)

## Auth Credentials
- Admin: karolisbudreckas92@gmail.com / Admin123!
- Test: karolis@test.com / Test123!

## Backlog
- (P2) Refactor `backend/server.py` into FastAPI routers
- (P2) Refactor `frontend/app/admin.tsx` into components
- (P3) ESLint/TypeScript/expo-doctor warnings
- (P3) Deep linking setup
