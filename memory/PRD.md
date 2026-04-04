# FRIKT App - Product Requirements Document

## Original Problem Statement
Social platform for sharing everyday frustrations ("frikts"). Users post anonymously, others tap "Relate" to signal shared friction. Community-based local feeds via invite codes. Badge and streak gamification system.

## Tech Stack
- **Frontend**: React Native / Expo (iOS first via EAS builds)
- **Backend**: FastAPI / Python (monolithic `server.py`)
- **Database**: MongoDB (via Railway)
- **Image Storage**: Cloudinary
- **Font**: Plus Jakarta Sans (via @expo-google-fonts)

## Core Features (Implemented)
- Authentication (register, login, forgot password)
- Global feed (For You / Trending / New)
- Local community feed (invite code)
- Problem posting (2-step wizard, anonymous)
- Relate system (like/upvote)
- Comments
- Categories with follow
- User profiles + other user profiles
- Badges & Celebrations
- Push notifications
- Admin panel
- Community avatars (Cloudinary)
- User avatars (Cloudinary)
- Search with 300ms debounce

## Design System
- **Primary**: `#E85D3A` (coral)
- **Background**: `#FAF8F3`
- **Surface**: `#FFFFFF`
- **Font**: Plus Jakarta Sans (400, 500, 600, 700)
- **Disabled**: bg `#E7E3DC`, text `#A19A90`
- **Border**: `#E8E1D6`
- See `/app/memory/FRIKT_FRONTEND_DESIGN_SPEC.md` for full spec

## What's Been Implemented (Timeline)
- Schema cleanups (streak_days, rocket10, willing_to_pay removed)
- Onboarding flow
- Community Avatars + Cloudinary migration
- Visual Polish Round 1 (14+ screens, #E85D3A enforcement)
- Visual Polish Round 2:
  - Plus Jakarta Sans font (global, 32+ files)
  - Auth pages bg unified to #FAF8F3
  - All disabled buttons: solid bg instead of opacity
  - BadgeSection modal: #E4572E→#E85D3A, amber→coral
  - CelebrationModal: #E4572E→#E85D3A
  - Badge counter pill: amber→coral
  - Edit-problem: chip radius 18, severity height 36, font 14 medium
  - PostWizard Step 2 hint verified

## Recently Fixed (Apr 2026)
- Fixed duplicate StyleSheet keys in `home.tsx` (ctaButton x2, retryButton x2, mismatched toggleText/logo/badgeText refs)
- Fixed duplicate StyleSheet keys in `community/[id].tsx` (header, communityIcon, joinBanner, requestJoinButton, nonMemberNotice — 5 duplicates causing broken layout for join flow, community header, and non-member notice)

## Backlog
- (P2) Refactor `backend/server.py` into FastAPI routers
- (P2) Refactor `frontend/app/admin.tsx` into components
- (P3) ESLint/TypeScript/expo-doctor warnings
- (P3) Deep linking setup

## Test Credentials
- Admin: karolisbudreckas92@gmail.com / Admin123!
- Test: karolis@test.com / Test123!
