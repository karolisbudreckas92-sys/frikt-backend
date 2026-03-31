# FRIKT App - Product Requirements Document

## Original Problem Statement
FRIKT is a mobile app (Expo/React Native + FastAPI + MongoDB) for sharing daily frictions and frustrations. Users post "Frikts", relate to others' problems, comment, earn badges through gamification, and explore content by categories and feeds.

## Core Features Implemented
- **Auth**: JWT-based authentication with expo-secure-store
- **Posts (Frikts)**: Create, relate, comment, save, follow, report
- **Gamification**: Badges, streaks, leaderboard
- **Admin Panel**: User management, content moderation, broadcast, audit, communities
- **Push Notifications**: Expo + Firebase (FCM) for Android
- **Comment Threading**: Nested replies with soft-delete support
- **Local Communities**: Location-based community feeds (March 2026)

## Local Communities Feature (Complete)

### Backend
- 16 community endpoints (user + admin)
- Modified 6 existing endpoints for local/global awareness
- Community creation requests expire after 3 days
- Join requests expire after 7 days
- Analytics includes LOCAL stats section
- User profile includes community_name
- Search includes local frikts

### Frontend
- Home: Global/Local toggle with join code input
- Post Wizard: Local toggle
- ProblemCard: Local tag (coral pin + "Local")
- Profile: CommunityCard with leave
- Search: Communities tab
- Categories: Local card -> Home
- Community Detail: `/community/[id].tsx` with Request to Join
- Request Community: `/request-community.tsx`
- Admin: Communities tab (requests, create, active list, join requests, export)

## Onboarding Flow (Complete - March 2026)
- 4-screen horizontal swipeable onboarding for new user registrations
- Persistence via AsyncStorage key `onboarding_complete` + server-side `onboarding_completed` field
- index.tsx checks flag before routing authenticated users
- login.tsx sets flag for existing users (skip onboarding)
- register.tsx routes to /onboarding after successful registration

## DisplayName Propagation Fix (Complete - March 2026)
- PUT /api/users/me/profile propagates displayName to: problems.user_name, comments.user_name, comments.reply_to_user_name, feedback.user_name

## Add Details Fields Relocation (Complete - March 2026)
- Moved 'Add details' (when_happens, who_affected, what_tried) from detail view to Step 2 of PostWizard (collapsible)
- Edit screen shows all detail fields directly

## Security Fixes (Complete - March 2026)
- FIX 1: Banned users get 403 on all authenticated requests
- FIX 2: Password reset brute force protection (max 5 attempts per token, max 3 requests/email/hour)
- FIX 3: Account deletion preserves community content (soft-delete, anonymizes to '[deleted user]')
- FIX 4: All admin endpoints verified with require_admin + audit logging
- FIX 5: Shadowban content filtering in feeds/comments

## Data Integrity Fixes (Complete - March 2026)
- FIX 6: Avatar URL propagated to problems/comments on profile update
- FIX 7: Unique index on community_members.user_id
- FIX 8: Community codes normalized to uppercase + unique index
- FIX 9: Unique compound index on blocked_users
- FIX 10: Bidirectional block filtering (403 on relate/comment/follow)
- FIX 11: Notification.problem_id nullable for follower/badge/broadcast types
- FIX 12: POST /api/admin/sync-problem-stats counter reconciliation

## Cleanup Fixes (Complete - March 2026)
- FIX 13: Added comment_replies and follows to Notification settings + Frontend UI
- FIX 14: Consolidated visit streak — removed `streak_days` from User model, use `user_stats.current_visit_streak` collection only
- FIX 15: Removed dead fields — `willing_to_pay` from Problem, `rocket10_completed/rocket10_day/rocket10_start_date` from User, `is_pinned` from Comment
- FIX 16: Server-side onboarding — added `onboarding_completed` bool to User/UserResponse/ProfileUpdate, startup migration marks existing users
- FIX 17: Empty community behavior documented — 0-member communities remain active, joinable, searchable
- FIX 18: Search only matches on `title` — removed `when_happens` and `who_affected` from search query

## Community Avatar Feature (Complete - March 2026)
- Added `avatar_url` field to Community model (string | null, default null)
- Admin endpoint `POST /api/admin/communities/{id}/avatar` for base64 image upload
- Admin panel: Tappable avatar in expanded community rows with image picker
- Frontend: All community views (Home local header, Community Detail, Search, Profile) show avatar if set, fallback to pin icon
- API responses: GET /communities, GET /communities/{id}, GET /communities/me, GET /admin/communities all include avatar_url

## Anonymous Reminder (Complete - March 2026)
- Subtle helper text in PostWizard Step 1 below character counter
- Text: "This is anonymous. Focus on the problem, not the person."
- Gray (#999), 12px, centered, always visible

## Testing
- iteration_6.json: 33/33 PASS
- iteration_7.json: 42/46 PASS (4 rate-limit)
- iteration_10-11: Manual verification passed
- iteration_12.json: Security fixes - 100% pass
- iteration_13.json: Data integrity fixes - 100% pass
- iteration_14.json: Cleanup fixes - 14/14 PASS (100%)
- iteration_15.json: Community avatar - 12/12 PASS (100%)

## Pending Issues
- P3: ESLint/TypeScript warnings (backlog)

## Backlog
- Refactor server.py into FastAPI routers (post-launch)
- Refactor admin.tsx into smaller components
- Deep Linking
- Device regression testing

## Credentials
- Admin: karolisbudreckas92@gmail.com / Admin123!
