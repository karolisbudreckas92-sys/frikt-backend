# FRIKT App - Product Requirements Document

## Original Problem Statement
FRIKT is a mobile app (Expo/React Native + FastAPI + MongoDB) for sharing daily frictions and frustrations. Users post "Frikts", relate to others' problems, comment, earn badges through gamification, and explore content by categories and feeds.

## Core Features Implemented
- **Auth**: JWT-based authentication with expo-secure-store
- **Posts (Frikts)**: Create, relate, comment, save, follow, report
- **Gamification**: Badges, streaks, leaderboard, Rocket 10 challenge
- **Admin Panel**: User management, content moderation, broadcast, audit, communities
- **Push Notifications**: Expo + Firebase (FCM) for Android
- **Comment Threading**: Nested replies with soft-delete support
- **Local Communities**: Location-based community feeds (March 2026)

## Local Communities Feature (Complete)

### Backend
- 16 community endpoints (user + admin)
- Modified 6 existing endpoints for local/global awareness
- Community creation requests expire after 3 days (`expires_at` filter)
- Join requests expire after 7 days (`expires_at` filter)
- Analytics includes LOCAL stats section
- User profile includes community_name
- Search includes local frikts
- Export format: anonymous, no author/signal/pain/frequency. Single-line `RELATES | DATE | COMMENTS`

## Onboarding Flow (Complete - March 2026)
- 4-screen horizontal swipeable onboarding for new user registrations
- Persistence via AsyncStorage key `onboarding_complete`
- index.tsx checks flag before routing authenticated users
- login.tsx sets flag for existing users (skip onboarding)
- register.tsx routes to /onboarding after successful registration

## Category Follow/Unfollow Fix (Complete - March 2026)
- Added `extraData={followedCategories}` to FlatList in categories.tsx
- Ensures optimistic UI updates render immediately without manual refresh

## DisplayName Propagation Fix (Complete - March 2026)
- PUT /api/users/me/profile now propagates displayName to: problems.user_name, comments.user_name, comments.reply_to_user_name, feedback.user_name
- Fixed comment creation to use displayName instead of registration name

## Add Details Fields Relocation (Complete - March 2026)
- Moved 'Add details' (when_happens, who_affected, what_tried) from frikt detail view to Step 2 of PostWizard
- Collapsible section below Severity in creation flow, collapsed by default
- Removed context section and 'Add details' card entirely from problem/[id].tsx
- Edit screen shows all detail fields directly (no collapsible toggle)

## Security Fixes (Complete - March 2026)
- FIX 1: Banned users get 403 on all authenticated requests (require_auth + require_admin check)
- FIX 2: Password reset brute force protection — max 5 attempts per token (with email tracking), max 3 requests/email/hour, generic error messages
- FIX 3: Account deletion preserves community content — anonymizes problems/comments to '[deleted user]', cleans up community data, recalculates counts
- FIX 4: All admin endpoints verified with require_admin, denied access logged to admin_audit_logs
- FIX 5: Shadowban content filtering — cached helper (60s), feeds/comments exclude shadowbanned content, users see own content, cache invalidated on admin actions

## Documentation
- `FRIKT_COMPLETE_DOCUMENTATION.md` regenerated from scratch (1586 lines, 20 sections, March 2026)
- FIX 1: Soft-deleted parent no longer blocks replies (only admin-hidden does)
- FIX 2: Shadowbanned user actions no longer generate notifications
- FIX BUG2: Admin join requests stay visible after Send Code (status=sent, grayed out)
- FIX BUG3: Admin community creation requests now have Contact + Dismiss action buttons
- New endpoint: PUT /api/admin/community-requests/{id} (dismiss/archive)
- New endpoint: GET /api/admin/communities/{id}/members (members list with search)

### Frontend
- Home: Global/Local toggle with join code input
- Post Wizard: Local toggle
- ProblemCard: Local tag (coral pin + "Local")
- Profile: CommunityCard with leave
- Search: Communities tab
- Categories: Local card -> Home (no follow button)
- Community Detail: `/community/[id].tsx` with Request to Join
- Request Community: `/request-community.tsx`
- Admin: Communities tab (requests, create, active list, join requests, export)
- User Profile: Community tag below name

### Testing
- iteration_6.json: 33/33 PASS
- iteration_7.json: 42/46 PASS (4 rate-limit)
- Manual curl: All 8 spec fixes verified

## Pending Issues
- P3: ESLint/TypeScript errors (backlog)

## Backlog
- Refactor server.py into FastAPI routers
- Refactor problem/[id].tsx (1600+ lines)
- Deep Linking
- Device regression testing

## Credentials
- Admin: karolisbudreckas92@gmail.com / Admin123!
