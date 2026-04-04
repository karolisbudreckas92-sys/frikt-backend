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

## Auth Credentials
- Admin: karolisbudreckas92@gmail.com / Admin123!
- Test: karolis@test.com / Test123!

## Backlog
- (P2) Refactor `backend/server.py` into FastAPI routers
- (P2) Refactor `frontend/app/admin.tsx` into components
- (P3) ESLint/TypeScript/expo-doctor warnings
- (P3) Deep linking setup
