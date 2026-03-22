# FRIKT App - Complete Technical Documentation

*Last updated: March 2026*

---

## 1. SCREEN INVENTORY

### 1.1 Authentication Screens

#### Login Screen (`/app/(auth)/login.tsx`)
- **How to get there:** App opens -> user not logged in -> redirected here
- **Elements:**
  - Email input field (EmailStr, required)
  - Password input field (string, required)
  - "Login" button
  - "Forgot Password?" link
  - "Create Account" link
- **Actions:**
  - Login button -> `POST /api/auth/login` -> returns `{access_token, user}`
  - Forgot Password -> navigates to `/forgot-password`
  - Create Account -> navigates to `/register`

#### Register Screen (`/app/(auth)/register.tsx`)
- **How to get there:** Login screen -> "Create Account"
- **Elements:**
  - Name input field (string, required)
  - Email input field (EmailStr, required)
  - Password input field (string, min 6 chars)
  - "Create Account" button
  - Terms & Privacy links
- **Actions:**
  - Register button -> `POST /api/auth/register` -> returns `{access_token, user}`
  - Creates new user in `users` collection
  - Auto-assigns "admin" role if email in ADMIN_EMAILS env var

#### Forgot Password Screen (`/app/(auth)/forgot-password.tsx`)
- **How to get there:** Login screen -> "Forgot Password?"
- **Elements:**
  - Email input field
  - "Send Reset Code" button
  - Code input field (6 digits)
  - New password field
  - "Reset Password" button
- **Actions:**
  - Send Reset Code -> `POST /api/auth/forgot-password` -> sends email via Resend
  - Verify Code -> `POST /api/auth/verify-reset-code`
  - Reset Password -> `POST /api/auth/reset-password`

---

### 1.2 Tab Screens (Main Navigation)

#### Home Screen (`/app/(tabs)/home.tsx`)
- **How to get there:** Bottom tab "Home" (default screen after login)
- **Elements:**
  - Header with logo "frikt", feedback icon, notification bell (shows unread count badge)
  - **Global/Local toggle** (pill-shaped segmented control)
  - Pull-to-refresh
  - Infinite scroll pagination

**Global mode (default):**
  - Feed filter pills: "For You", "Trending", "New"
  - Helper text per feed ("Based on your categories", "Hot this week", "Latest frikts")
  - Mission of the Day banner (dismissible)
  - FlatList of ProblemCards

**Local mode (when user has a community):**
  - Community header row: location icon, community name, member count
  - Sort pills: "Trending", "New", "Top"
  - FlatList of local ProblemCards (community-only frikts)

**Local mode (when user has NO community):**
  - Location icon (56px)
  - "Join a local community" title
  - "See what's bugging your neighbours" subtitle
  - Code input field + "Join" button (accepts invite code, case-insensitive)
  - Switch community alert if already in a different community (409 handling)
  - "or" divider
  - "Browse Communities" button -> navigates to Search screen Communities tab
  - "Want a local community? Request one here" link -> navigates to `/request-community`

- **API Calls:**
  - Load global feed -> `GET /api/problems?feed={foryou|trending|new}&limit=50&skip=0`
  - Load local feed -> `GET /api/problems?feed=local&community_id={id}&sort_by={trending|new|top}`
  - Load community -> `GET /api/communities/me`
  - Join community -> `POST /api/communities/join`
  - Switch community -> `POST /api/communities/switch`
  - Notification count -> comes from NotificationContext

#### ProblemCard Elements (used in Home, Search, Community Detail, Category Detail):
- Category tag (colored pill)
- **Local tag** (coral location pin icon + "Local" text, only shown when `is_local=true`)
- Frikt title
- Timestamp (relative: "2h ago")
- Relate button + count
- Comment button + count

#### Search Screen (`/app/(tabs)/search.tsx`)
- **How to get there:** Bottom tab "Search"
- **Elements:**
  - Search input field
  - Tab pills: "Frikts", "Users", **"Communities"**
  - Results list depends on active tab

**Frikts tab:**
  - Results as ProblemCards
  - **API:** `GET /api/problems?search={query}`

**Users tab:**
  - User cards with avatar, name, bio, posts count
  - **API:** `GET /api/users/search?q={query}`

**Communities tab:**
  - Community cards with location icon (coral circle), name, member count, frikt count, chevron arrow
  - Tapping a card -> navigates to `/community/{id}`
  - Loads all communities on tab activation, searchable
  - Empty state: "No communities found" + "Request a Community" button
  - **API:** `GET /api/communities?search={query}`

#### Post Screen (`/app/(tabs)/post.tsx`)
- **How to get there:** Bottom tab "+" (center)
- **Elements (PostWizard component):**
  - **Step 1 - Quick Post:**
    - Title textarea (min 10 chars, required)
    - Character counter
    - **Local toggle** (only shown when user is in a community):
      - Row with location icon, "Post to {community_name}" text, hint "Only members of your community will see this", checkbox
      - When toggled ON: category auto-set to "local", frikt posted to user's community
    - Similar problems list (duplicate detection)
    - "Next" button
  - **Step 2 - Optional Tags:**
    - Category selector (10 options including "Local")
    - Frequency selector: Daily, Weekly, Monthly, Rare
    - Severity/Pain Level: 1-5
    - "Post" button
- **API Calls:**
  - Check similar -> `GET /api/problems/similar?title={title}&is_local={bool}&community_id={id}`
  - Create post -> `POST /api/problems` with `{title, category_id, frequency, pain_level, is_local}`

#### Categories Screen (`/app/(tabs)/categories.tsx`)
- **How to get there:** Bottom tab "Categories"
- **Elements:**
  - List of 10 category cards (including "Local")
  - Each card shows: icon, name, follow button (+ or checkmark)
- **API Calls:**
  - Get categories -> `GET /api/categories` (returns static CATEGORIES list)
  - Follow -> `POST /api/categories/{category_id}/follow`
  - Unfollow -> `DELETE /api/categories/{category_id}/follow`
- **Data Modified:** `users.followed_categories` array

#### Profile Screen (`/app/(tabs)/profile.tsx`)
- **How to get there:** Bottom tab "Profile"
- **Elements:**
  - Avatar image
  - Display name
  - City (if showCity=true)
  - Bio
  - Stats row: X Frikts, Y Comments, Z Relates
  - Streak card (if streak > 0)
  - **Community card:**
    - If in community: coral location icon, community name, member count, frikt count, "Leave" button (with confirm alert)
    - If not in community: outline icon, "No community yet", subtitle text
  - Badges section
  - "Edit Profile" button
  - Menu items: My Posts, Saved, Badges, Settings section
  - Logout button
- **API Calls:**
  - Get profile -> `GET /api/auth/me`
  - Get community -> `GET /api/communities/me`
  - Leave community -> `DELETE /api/communities/leave`

---

### 1.3 Detail Screens

#### Problem Detail Screen (`/app/problem/[id].tsx`)
- **How to get there:** Tap any ProblemCard
- **Elements:**
  - Full Frikt details (title, category, frequency, pain, willing_to_pay, when_happens, who_affected, what_tried)
  - User info (avatar, name)
  - Relate button + count
  - Save button
  - Follow button
  - Share button
  - **For local frikts:** community name, viewer_is_community_member flag
  - **Threaded comments list** (see Section 6)
  - Comment input with quick-reply pills
  - 3-dot menu (Report, Block, Edit/Delete if owner)
- **API Calls:**
  - Get problem -> `GET /api/problems/{problem_id}` (returns `community_name`, `viewer_is_community_member` for local frikts)
  - Get comments -> `GET /api/problems/{problem_id}/comments` (returns threaded structure with `replies[]` and `is_community_member` per comment)
  - Relate -> `POST /api/problems/{problem_id}/relate` (403 if non-member on local frikt)
  - Unrelate -> `DELETE /api/problems/{problem_id}/relate`
  - Save -> `POST /api/problems/{problem_id}/save`
  - Unsave -> `DELETE /api/problems/{problem_id}/save`
  - Follow -> `POST /api/problems/{problem_id}/follow`
  - Unfollow -> `DELETE /api/problems/{problem_id}/follow`
  - Post comment -> `POST /api/comments`
  - Post reply -> `POST /api/comments` with `parent_comment_id` and `reply_to_user_id`

#### Quick Reply Pills:
- "I relate because..." - prefills comment
- "One thing I tried..." - prefills comment
- "Have you tried...?" - prefills comment

#### Community Detail Screen (`/app/community/[id].tsx`)
- **How to get there:** Tap a community card in Search -> Communities tab, or any community link
- **Elements:**
  - Header with back button and community name
  - Community info: coral location icon (56px), community name, member/frikt count
  - **Request to Join banner** (non-members only):
    - "Want to join {name}?" title
    - Optional message input (multiline)
    - "Request to Join" button
    - After submission: checkmark icon + "Request sent!" confirmation text
  - **Non-member notice:** "You can browse and comment, but only members can relate to local frikts."
  - Sort pills: "Trending", "New", "Top"
  - FlatList of ProblemCards (local frikts in this community)
  - Empty state: "No frikts yet" + contextual message
- **API Calls:**
  - Get community -> `GET /api/communities/{community_id}` (returns `is_member`, `has_pending_request`)
  - Get local feed -> `GET /api/problems?feed=local&community_id={id}&sort_by={trending|new|top}`
  - Request to join -> `POST /api/communities/{community_id}/request-join`
  - Relate -> `POST /api/problems/{problem_id}/relate` (403 if non-member)

#### User Profile Screen (`/app/user/[id].tsx`)
- **How to get there:** Tap any user avatar/name
- **Elements:**
  - Avatar, name, city, bio
  - Follow/Unfollow button
  - Stats
  - User's Frikts list
- **API Calls:**
  - Get profile -> `GET /api/users/{user_id}/profile`
  - Get posts -> `GET /api/users/{user_id}/posts`
  - Follow -> `POST /api/users/{user_id}/follow`
  - Unfollow -> `DELETE /api/users/{user_id}/follow`

#### Category Detail Screen (`/app/category/[id].tsx`)
- **How to get there:** Tap category card or category pill on Frikt
- **Elements:**
  - Category header (icon, name, color)
  - Follow button
  - Frikts list filtered by category
- **API Calls:**
  - Get Frikts -> `GET /api/problems?category_id={category_id}`

#### Request Community Screen (`/app/request-community.tsx`)
- **How to get there:** Home Local tab -> "Request one here" link, or Search Communities empty state
- **Elements:**
  - Header with back button
  - Location icon + "Want a local community?" title
  - Subtitle: "Tell us about the community you'd like and we'll set it up for you."
  - Email input (pre-filled from user's email)
  - Community name input
  - Description textarea (optional)
  - "Submit Request" button
  - Success state: checkmark icon, "Request Submitted!", info text, "Done" button
- **API Calls:**
  - Submit request -> `POST /api/community-requests`

---

### 1.4 Settings & User Screens

#### Edit Profile (`/app/edit-profile.tsx`)
- **Elements:** Display name, Bio, City, Show City toggle, Avatar picker
- **API:** `PUT /api/users/me/profile`, `POST /api/users/me/avatar-base64`

#### My Posts (`/app/my-posts.tsx`)
- **Elements:** List of user's own Frikts
- **API:** `GET /api/users/me/posts`

#### Saved (`/app/saved.tsx`)
- **Elements:** List of saved Frikts
- **API:** `GET /api/users/me/saved`

#### Notifications (`/app/notifications.tsx`)
- **Elements:** List of notifications (relates, comments, badges, replies)
- **API:** `GET /api/notifications`, `POST /api/notifications/read` (marks all read)

#### Notification Settings (`/app/notification-settings.tsx`)
- **Elements:** Toggles for push_notifications, new_comments, new_relates, trending
- **API:** `GET /api/push/settings`, `PUT /api/push/settings`

#### Change Password (`/app/change-password.tsx`)
- **API:** `POST /api/users/me/change-password`

#### Blocked Users (`/app/blocked-users.tsx`)
- **API:** `GET /api/users/me/blocked`, `DELETE /api/users/{user_id}/block`

#### Feedback (`/app/feedback.tsx`)
- **API:** `POST /api/feedback`

#### Terms (`/app/terms.tsx`) & Privacy Policy (`/app/privacy-policy.tsx`)
- Static content screens

---

### 1.5 Admin Panel (`/app/admin.tsx`)

**Access:** Only visible if user.role === "admin"

#### Tabs:

**Overview Tab:**
- Total users count
- Total Frikts count
- Total comments count
- Frikts today count
- New users today count
- **API:** `GET /api/admin/analytics`

**Feedback Tab:**
- List of user feedback submissions
- Mark as read/unread
- Delete
- **API:** `GET /api/admin/feedback`, `POST /api/admin/feedback/{id}/read`, `DELETE /api/admin/feedback/{id}`

**Reports Tab:**
- List of reported content (problems, comments, users)
- Filter by status: pending, reviewed, dismissed
- Actions: Dismiss, Mark Reviewed, Hide Content, Delete Content
- **API:** `GET /api/admin/reports`, `POST /api/admin/reports/{id}/dismiss`, `POST /api/admin/reports/{id}/reviewed`

**Broadcast Tab:**
- Title input
- Message textarea
- Send to: All Users / Admins Only toggle
- Send button
- Broadcast history list
- **API:** `POST /api/admin/broadcast-notification`, `GET /api/admin/broadcast-history`, `GET /api/admin/broadcast-stats`

**Users Tab:**
- Search users
- User list with status badges
- Actions: Ban, Shadowban, Unban
- **API:** `GET /api/admin/users`, `POST /api/admin/users/{id}/ban`, `POST /api/admin/users/{id}/shadowban`, `POST /api/admin/users/{id}/unban`

**Audit Tab:**
- Log of admin actions (action, target, admin, timestamp)
- **API:** `GET /api/admin/audit-log`

**Communities Tab (Local):**
- **Community Requests** section: List of pending community creation requests (name, email, description). Sourced from `community_requests` collection.
  - **API:** `GET /api/admin/community-requests`
- **Create Community** form: Name input, invite code input, moderator email input, "Create Community" button.
  - **API:** `POST /api/admin/communities`
- **Active Communities** list (searchable, collapsible rows):
  - Each row header: community name, current code, member count, frikt count, pending join requests count. Tap to expand.
  - **Expanded view:**
    - **Change Code:** Displays current code with pencil icon. Tap to edit. Save/Cancel buttons.
      - **API:** `PUT /api/admin/communities/{id}/code`
    - **Join Requests:** List of pending join requests (email, message). Each has a "Send Code" button that opens a `mailto:` link with pre-filled subject and body containing the invite code, and marks the request as "sent".
      - **API:** `GET /api/admin/communities/{id}/join-requests`, `PUT /api/admin/communities/{id}/join-requests/{id}`
    - **Export Data:** Period pills (All time, 7 days, 30 days, 90 days). "Export" button triggers Share sheet with structured text export.
      - **API:** `GET /api/admin/communities/{id}/export?period={all|7d|30d|90d}`
  - **API:** `GET /api/admin/communities?search={query}`

---

## 2. USER TYPES AND PERMISSIONS

### Logged-out User
- **Can see:** Nothing - redirected to login screen
- **Can do:** Register, Login, Forgot Password

### Logged-in User (role: "user")
- **Can see:** All feeds (global + local if in community), own profile, other profiles, categories, communities
- **Can do:**
  - Create Frikts (global or local)
  - Relate to others' Frikts (not own; local frikts only if community member)
  - Comment on any Frikt (including local frikts of non-member communities)
  - Reply to comments (threaded)
  - Save/Follow Frikts
  - Follow categories
  - Follow users
  - Edit own profile
  - Delete own posts/comments
  - Report content
  - Block users
  - Change password
  - Submit feedback
  - Join a community via invite code
  - Switch community
  - Leave community
  - Browse communities
  - Request to join a community
  - Request creation of a new community

### Community Member (additional context)
- User who has joined a community via invite code
- **Additional abilities:**
  - Post local Frikts visible only in community feed
  - Relate to local Frikts in their community
  - See "Local" tab on home screen with community-specific feed
  - One community at a time (switch available)

### Admin User (role: "admin")
- **All user permissions PLUS:**
- **Can see:** Admin panel with all tabs
- **Can do:**
  - View analytics
  - Review reports
  - Hide/Unhide posts
  - Delete any post/comment
  - Ban/Shadowban/Unban users
  - Send broadcast notifications
  - View audit log
  - Pin/Unpin posts
  - Mark posts as "needs context"
  - Merge duplicate posts
  - Create communities
  - Change community invite codes
  - View/manage community join requests (Send Code via mailto)
  - Export community data
  - View community creation requests
  - Sync user stats

### Banned User (status: "banned")
- Cannot login (returns 403)

### Shadowbanned User (status: "shadowbanned")
- Can login and use app normally
- Their content is hidden from others
- They don't receive notifications

---

## 3. DATA MODEL

### Collection: `users`
```
id: string (UUID) - primary key
email: string (unique, lowercase)
name: string
password_hash: string
created_at: datetime
role: "user" | "admin"
status: "active" | "banned" | "shadowbanned"
displayName: string | null
avatarUrl: string | null
bio: string | null
city: string | null
showCity: boolean (default: false)
rocket10_completed: boolean
rocket10_day: int
rocket10_start_date: datetime | null
posts_today: int
last_post_date: string | null
streak_days: int
followed_categories: string[] - array of category IDs
followed_problems: string[] - array of problem IDs
saved_problems: string[] - array of problem IDs
```

### Collection: `problems`
```
id: string (UUID) - primary key
user_id: string - FK to users.id
user_name: string (denormalized)
user_avatar_url: string | null
title: string (min 10 chars)
category_id: string - one of CATEGORIES
frequency: "daily" | "weekly" | "monthly" | "rare" | null
pain_level: int 1-5 | null
willing_to_pay: "$0" | "$1-10" | "$10-50" | "$50+"
when_happens: string | null
who_affected: string | null
what_tried: string | null
created_at: datetime
relates_count: int (default 0)
comments_count: int (default 0)
unique_commenters: int (default 0)
signal_score: float (calculated)
reports_count: int (default 0)
is_hidden: boolean (default false)
status: "active" | "hidden" | "removed"
is_pinned: boolean (default false)
needs_context: boolean (default false)
merged_into: string | null - FK to problems.id
is_local: boolean (default false)          # NEW - Local Communities
community_id: string | null                # NEW - FK to communities.id
```

### Collection: `comments`
```
id: string (UUID) - primary key
problem_id: string - FK to problems.id
user_id: string - FK to users.id
user_name: string (denormalized)
content: string (min 10 chars; Optional when status="removed" for soft-delete display)
created_at: datetime
edited_at: datetime | null
helpful_count: int (default 0)
is_pinned: boolean (default false)
status: "active" | "hidden" | "removed"
reports_count: int (default 0)
parent_comment_id: string | null           # NEW - null for top-level, comment.id for replies
reply_to_user_id: string | null            # NEW - user whose Reply button was tapped
reply_to_user_name: string | null          # NEW - denormalized for UI display
```

### Collection: `communities`
```
id: string (UUID) - primary key
name: string
active_code: string (invite code, case-insensitive matching)
moderator_email: string
created_at: datetime
```

### Collection: `community_members`
```
id: string (UUID)
user_id: string - FK to users.id
community_id: string - FK to communities.id
joined_at: datetime
```
**Constraint:** One community per user (enforced at application level)

### Collection: `community_join_requests`
```
id: string (UUID)
user_id: string - FK to users.id
user_email: string
community_id: string - FK to communities.id
message: string | null
status: "pending" | "sent"
created_at: datetime
expires_at: datetime (default: 7 days from creation)
```

### Collection: `community_requests`
```
id: string (UUID)
email: string
community_name: string
description: string | null
created_at: datetime
expires_at: datetime (default: 3 days from creation)
```

### Collection: `relates`
```
id: string (UUID)
problem_id: string - FK to problems.id
user_id: string - FK to users.id
created_at: datetime
```
**Unique constraint:** (problem_id, user_id)

### Collection: `helpfuls`
```
id: string (UUID)
comment_id: string - FK to comments.id
user_id: string - FK to users.id
created_at: datetime
```

### Collection: `notifications`
```
id: string (UUID)
user_id: string - FK to users.id
type: "new_comment" | "new_relate" | "problem_trending" | "new_follower" | "badge_earned" | "admin_broadcast" | "new_reply"
problem_id: string | null
message: string
is_read: boolean (default false)
created_at: datetime
```

### Collection: `notification_settings`
```
user_id: string - FK to users.id
push_notifications: boolean (default true)
new_comments: boolean (default true)
new_relates: boolean (default true)
trending: boolean (default true)
```

### Collection: `push_tokens`
```
id: string (UUID)
user_id: string - FK to users.id
token: string - Expo push token
created_at: datetime
is_active: boolean (default true)
```

### Collection: `reports`
```
id: string (UUID)
reporter_id: string - FK to users.id
reporter_name: string
target_type: "problem" | "comment" | "user"
target_id: string
reason: "spam" | "harassment" | "hate" | "sexual" | "other" | "abuse" | "off-topic" | "duplicate"
details: string | null
created_at: datetime
status: "pending" | "reviewed" | "dismissed"
```

### Collection: `blocked_users`
```
id: string (UUID)
blocker_user_id: string - FK to users.id
blocked_user_id: string - FK to users.id
created_at: datetime
```

### Collection: `user_stats`
```
user_id: string - FK to users.id
total_posts: int
total_relates_given: int
total_relates_received: int
total_comments: int
total_frikts_opened: int
users_followed: int
current_visit_streak: int
last_visit_date: string | null
streak_miss_count: int
posts_per_category: dict {category_id: count}
max_relates_on_single_post: int
```

### Collection: `user_achievements`
```
id: string (UUID)
user_id: string - FK to users.id
badge_id: string - key from BADGES dict
unlocked_at: datetime
```

### Collection: `pending_badge_notifications`
```
user_id: string
badge: dict {badge_id, name, icon, description}
created_at: datetime
```

### Collection: `pending_notification_batch`
```
batch_type: "relate_batch" | "comment_batch"
recipient_user_id: string
target_id: string (problem_id)
target_title: string
actor_user_ids: string[]
actor_user_names: string[]
created_at: datetime
last_updated: datetime
```

### Collection: `password_reset_tokens`
```
id: string (UUID)
user_id: string
token: string (6-digit code)
created_at: datetime
expires_at: datetime
used: boolean
```

### Collection: `feedback`
```
id: string (UUID)
user_id: string
user_email: string
type: "bug" | "feature" | "other"
message: string
created_at: datetime
is_read: boolean (default false)
```

### Collection: `admin_audit_logs`
```
id: string (UUID)
admin_id: string
admin_email: string
action: string
target_type: string
target_id: string
details: string
created_at: datetime
```

### Collection: `follows` (user-to-user)
```
id: string (UUID)
follower_id: string - FK to users.id
following_id: string - FK to users.id
created_at: datetime
```

---

## 4. FRIKT LIFECYCLE

### Creating a Global Frikt

1. User taps "+" tab -> Post Screen opens
2. User fills in:
   - `title` (required, min 10 chars)
   - Local toggle: OFF (default)
   - `category_id` (required, default "other")
   - `frequency` (optional)
   - `pain_level` (optional, 1-5)
   - `willing_to_pay` (default "$0")
   - `when_happens` (optional)
   - `who_affected` (optional)
   - `what_tried` (optional)
3. As user types title, `GET /api/problems/similar?title={title}` shows potential duplicates
4. User taps "Post" -> `POST /api/problems`

**Backend creates:**
- New document in `problems` collection with `is_local=false, community_id=null`
- Rate limit: max 10 Frikts per day per user

**Gamification triggered:**
- `increment_user_stat(user_id, "total_posts")`
- `increment_category_posts(user_id, category_id)`
- `check_and_award_badges(user_id, user, stats, "post")`

### Creating a Local Frikt

1. User taps "+" tab -> Post Screen opens
2. User toggles "Post to {community_name}" ON
3. `category_id` auto-set to "local"
4. User fills title and optional fields
5. Similar problems checked against community context: `GET /api/problems/similar?title={title}&is_local=true&community_id={id}`
6. `POST /api/problems` with `is_local=true`

**Backend:**
- Validates user is a community member (403 if not)
- Sets `community_id` from user's membership
- Forces `category_id = "local"`
- Frikt only appears in local feed, never in global feeds

### Where Frikts Appear

| Feed | Query Filter | Sort | Excludes Local? |
|------|-------------|------|-----------------|
| New | `is_hidden=false, status=active, is_local != true` | `created_at DESC` | Yes |
| Trending | Same + `created_at >= 7 days ago` | `hot_score DESC` | Yes |
| For You | Same + `category_id IN user.followed_categories` | `engagement_score DESC` | Yes |
| Local (Trending) | `is_local=true, community_id={id}, created_at >= 7 days` | `hot_score DESC` | N/A |
| Local (New) | `is_local=true, community_id={id}` | `created_at DESC` | N/A |
| Local (Top) | `is_local=true, community_id={id}` | `relates_count DESC` | N/A |

**Hot score formula:** `(relates_count * 3) + (comments_count * 2) + unique_commenters`
**Engagement score formula:** `(relates_count * 2) + (comments_count * 1.5)`

### Relate Flow

1. User taps "Relate" on Frikt
2. `POST /api/problems/{problem_id}/relate`
3. Backend:
   - Validates user isn't relating to own post
   - **For local frikts:** validates user is a community member (403 if not)
   - Creates `relates` document
   - Increments `problems.relates_count`
   - Recalculates `signal_score`
   - Updates relater's `user_stats.total_relates_given`
   - Updates author's `user_stats.total_relates_received`
   - Updates `max_relates_on_single_post` if applicable
   - Checks/awards badges for both users
   - Sends notification (batched if multiple in 5 min)
4. Returns `{relates_count, signal_score, newly_awarded_badges}`

### Comment Flow (Top-Level)

1. User types comment or taps quick-reply
2. `POST /api/comments` with `{problem_id, content}`
3. Backend:
   - Creates `comments` document with `parent_comment_id=null`
   - Increments `problems.comments_count`
   - Increments `problems.unique_commenters` if first comment from this user
   - Recalculates `signal_score`
   - Updates `user_stats.total_comments`
   - Checks/awards badges
   - Notifies problem owner (batched)
   - Notifies followers of the problem

### Reply Flow (Threaded)

1. User taps "Reply" on a comment
2. Reply UI appears (referencing parent comment)
3. `POST /api/comments` with `{problem_id, content, parent_comment_id, reply_to_user_id}`
4. Backend:
   - If replying to a reply (nested), **flattens** to the top-level parent: sets `parent_comment_id` to the root comment
   - Resolves `reply_to_user_name` from `reply_to_user_id`
   - Creates comment document with threading fields
   - Increments parent comment's `reply_count`
   - Same gamification as top-level comment
   - Sends reply notification to parent comment author

### Comment Deletion

- **Hard delete:** Comment with no replies -> permanently removed from DB
- **Soft delete:** Comment with replies -> `status="removed"`, `content="[deleted]"`, `user_name="[deleted]"`. Replies are preserved under it.
- Deleting removes from `comments_count` if hard-deleted

### Save Flow
- `POST /api/problems/{id}/save` -> adds to `users.saved_problems[]`
- `DELETE /api/problems/{id}/save` -> removes from array

### Follow Flow
- `POST /api/problems/{id}/follow` -> adds to `users.followed_problems[]`
- User gets notifications when someone comments on followed Frikt

### Report Flow
1. User taps 3-dot menu -> Report
2. Selects reason + optional details
3. `POST /api/report/problem/{id}` or `/report/comment/{id}` or `/report/user/{id}`
4. Creates `reports` document with status="pending"
5. Admin sees in Reports tab

---

## 5. FEED LOGIC

### Feed Loading (`GET /api/problems`)

**Parameters:**
- `feed`: "new" | "trending" | "foryou" | "local"
- `category_id`: optional filter
- `community_id`: required when feed="local"
- `sort_by`: for local feed - "trending" | "new" | "top"
- `search`: optional text search
- `limit`: default 50
- `skip`: for pagination

**Base Query:**
```python
query = {"is_hidden": False, "status": "active"}
# Global feeds exclude local frikts
if feed in ("new", "trending", "foryou"):
    query["is_local"] = {"$ne": True}
if user:
    blocked_ids = get_blocked_user_ids(user_id)
    query["user_id"] = {"$nin": blocked_ids}
```

### NEW Feed
```python
sort = [("created_at", -1)]
problems = db.problems.find(query).sort(sort).skip(skip).limit(limit)
```

### TRENDING Feed
```python
week_ago = datetime.utcnow() - timedelta(days=7)
query["created_at"] = {"$gte": week_ago}
pipeline = [
    {"$match": query},
    {"$addFields": {
        "hot_score": {
            "$add": [
                {"$multiply": ["$relates_count", 3]},
                {"$multiply": ["$comments_count", 2]},
                "$unique_commenters"
            ]
        }
    }},
    {"$sort": {"hot_score": -1, "created_at": -1}},
    {"$skip": skip},
    {"$limit": limit}
]
```

### FOR YOU Feed
```python
followed_cats = user.get("followed_categories", [])
if followed_cats:
    query["category_id"] = {"$in": followed_cats}
    pipeline = [
        {"$match": query},
        {"$addFields": {
            "engagement_score": {
                "$add": [
                    {"$multiply": ["$relates_count", 2]},
                    {"$multiply": ["$comments_count", 1.5]}
                ]
            }
        }},
        {"$sort": {"engagement_score": -1, "created_at": -1}}
    ]
else:
    # Fallback to NEW feed
```

### LOCAL Feed
```python
query["is_local"] = True
query["community_id"] = community_id
if sort_by == "new":
    sort = [("created_at", -1)]
elif sort_by == "top":
    sort = [("relates_count", -1)]
else:  # trending (default)
    # Uses hot_score aggregation, same as global trending, filtered to last 7 days
```

### Similar Problems (`GET /api/problems/similar`)
- Context-aware: `is_local=true&community_id={id}` searches only within community
- Default (no is_local): searches only global frikts (`is_local != true`)
- Keyword-based search on title words > 3 characters

### Pagination
- Infinite scroll: client increments `skip` by `limit`
- FlatList `onEndReached` triggers load more

---

## 6. COMMENT SYSTEM

### Structure
- **Threaded comments** with one level of nesting
- Top-level comments have `parent_comment_id = null`
- Replies have `parent_comment_id` pointing to a top-level comment
- Replies-to-replies are **flattened** to the top-level parent
- Sorted by `helpful_count DESC` for top-level, `created_at ASC` for replies

### Comment Response Structure
```json
{
  "id": "uuid",
  "problem_id": "uuid",
  "user_id": "uuid",
  "user_name": "string",
  "content": "string",
  "created_at": "datetime",
  "helpful_count": 0,
  "status": "active",
  "parent_comment_id": null,
  "reply_to_user_id": null,
  "reply_to_user_name": null,
  "user_marked_helpful": false,
  "is_community_member": true,
  "reply_count": 2,
  "replies": [
    {
      "id": "uuid",
      "user_name": "string",
      "content": "string",
      "parent_comment_id": "parent-uuid",
      "reply_to_user_name": "string",
      "is_community_member": true,
      ...
    }
  ]
}
```

### Threading Rules
- `parent_comment_id`: null for top-level, top-level comment's ID for replies
- `reply_to_user_id/reply_to_user_name`: identifies which user's reply button was tapped (can differ from parent comment author when replying within a thread)
- **Flatten rule:** If a reply targets another reply (not a top-level comment), the backend resolves the chain and sets `parent_comment_id` to the root top-level comment

### Soft Delete Behavior
- When deleting a comment that has replies:
  - `status` set to "removed"
  - `content` set to "[deleted]"
  - `user_name` set to "[deleted]"
  - Replies are preserved
  - In GET responses, soft-deleted comments show "[deleted]" for both content and user_name
- When deleting a comment with no replies: permanently removed

### `is_community_member` Field
- Added to each comment when the parent problem is a local frikt
- `true` if the commenter is a member of the problem's community
- `true` for all comments on global frikts (not applicable)

### Quick Reply Options
Tapping a quick reply pill prefills the comment input:
- "I relate because..."
- "One thing I tried..."
- "Have you tried...?"

### Helpful System
- Any user can mark any comment as "helpful"
- `POST /api/comments/{id}/helpful` -> creates `helpfuls` document, increments `comments.helpful_count`
- `DELETE /api/comments/{id}/helpful` -> removes and decrements

### Restrictions
- Must be logged in
- Content min 10 chars
- Can edit own comments
- Can delete own comments
- Cannot reply to a soft-deleted comment (`status != "active"` returns 400)

---

## 7. NOTIFICATIONS

### Trigger Events

| Event | Type | Recipient | Message |
|-------|------|-----------|---------|
| Someone relates to your Frikt | new_relate | Frikt owner | "{name} related to your Frikt" |
| Someone comments on your Frikt | new_comment | Frikt owner | "{name} commented on your Frikt" |
| Someone replies to your comment | new_reply | Comment author | "{name} replied to your comment" |
| Someone comments on followed Frikt | new_comment | Followers | "New comment on a Frikt you follow" |
| Someone follows you | new_follower | Followed user | "{name} started following you" |
| Badge earned | badge_earned | Badge earner | "You earned: {badge_name}" |
| Admin broadcast | admin_broadcast | All/Admins | Custom message |

### Batching
- Multiple relates within 5 minutes are batched
- Multiple comments within 3 minutes are batched
- Batched notification: "3 people related to your Frikt"

### Delivery
1. **In-app:** Stored in `notifications` collection, badge count on bell icon
2. **Push:** Sent via Expo Push Notifications if enabled

### Settings (per user)
- `push_notifications`: master toggle
- `new_comments`: receive comment notifications
- `new_relates`: receive relate notifications
- `trending`: receive trending alerts

---

## 8. COMMUNITIES SYSTEM

### Community Model
A community is a location-based or code-gated group. Users can belong to one community at a time and post local-only frikts visible within their community.

### Joining Flow
1. User enters invite code on Home Local tab or knows the code
2. `POST /api/communities/join` with `{code}` (case-insensitive matching)
3. Outcomes:
   - **Success (200):** User joined, community data returned
   - **Already in same community (400):** "You are already a member"
   - **Already in different community (409):** Returns current + new community names. Frontend shows Switch alert.
   - **Invalid code (404):** "Invalid community code"
4. Switch: `POST /api/communities/switch` with new code -> leaves old, joins new

### Leaving Flow
- `DELETE /api/communities/leave`
- Removes membership. Local frikts user posted remain in the community feed.

### Request to Join Flow
1. User browses communities in Search -> Communities tab
2. Taps a community -> Community Detail Screen
3. If not a member, sees "Request to Join" banner
4. Fills optional message + taps "Request to Join"
5. `POST /api/communities/{id}/request-join`
6. Creates a join request with `expires_at = created_at + 7 days`
7. Admin sees request in Communities tab, clicks "Send Code" which opens mailto with invite code
8. **Expired requests** (older than 7 days) are automatically filtered out from admin views

### Request New Community Flow
1. User taps "Request one here" on Home Local tab or empty state in Search Communities
2. `/request-community` screen: fills email, community name, optional description
3. `POST /api/community-requests`
4. Creates a community request with `expires_at = created_at + 3 days`
5. Admin sees in Communities tab -> Community Requests section
6. **Expired requests** (older than 3 days) are automatically filtered out from admin views

### Request Expiration Rules
| Request Type | Expires After | Filter Applied |
|-------------|--------------|----------------|
| Community creation request | 3 days | `expires_at > now()` on `GET /api/admin/community-requests` |
| Community join request | 7 days | `expires_at > now()` on `GET /api/admin/communities/{id}/join-requests` |

Expired requests remain in the database but are excluded from all admin API responses.

### Admin Community Management
- **Create:** Name + code + moderator email
- **Change Code:** Update active invite code (old codes stop working)
- **View Join Requests:** See pending, non-expired requests; send code via mailto
- **Export:** Download community frikt data as anonymous structured text (filterable by period)
- All admin actions logged in `admin_audit_logs`

### Export Format (`GET /api/admin/communities/{id}/export`)

The export is fully **anonymous** — no author names, no signal scores, no pain levels, no frequency data. Output format:

```
COMMUNITY EXPORT: {community_name}
Period: {period_label}
Members: {member_count}
Total frikts: {frikt_count}

============================================================

FRIKT: {frikt_text}
RELATES: {count} | DATE: {YYYY-MM-DD} | COMMENTS: {count}
COM1: {comment_text}
COM1.1: {reply_text}
COM2: {comment_text}

FRIKT: {frikt_text}
RELATES: {count} | DATE: {YYYY-MM-DD} | COMMENTS: {count}

============================================================
END OF EXPORT
```

**Period options:** `all` (default), `7d`, `30d`, `90d`

---

## 9. ADMIN PANEL

See Section 1.5 for full screen details and Section 8 for Communities tab specifics.

---

## 10. AUTHENTICATION

### Sign-up Flow
1. `POST /api/auth/register` with `{name, email, password}`
2. Email validated with regex
3. Check for existing email (case-insensitive)
4. Password hashed with bcrypt
5. User created with role="user" (or "admin" if email in ADMIN_EMAILS)
6. JWT token generated (30 day expiry)
7. Returns `{access_token, user}`

### Sign-in Flow
1. `POST /api/auth/login` with `{email, password}`
2. Find user by lowercase email
3. Verify password hash
4. Check status != "banned"
5. Generate JWT token
6. Returns `{access_token, user}`

### Token Management
- JWT stored in SecureStore (iOS/Android) via `expo-secure-store`
- Token includes `{sub: user_id, exp: timestamp}`
- All authenticated requests include `Authorization: Bearer {token}`
- `get_current_user()` extracts and validates token (optional auth)
- `require_auth()` same but raises 401 if missing (required auth)

### Password Reset
1. User enters email -> `POST /api/auth/forgot-password`
2. Backend generates 6-digit code, stores in `password_reset_tokens`
3. Email sent via Resend
4. User enters code -> `POST /api/auth/verify-reset-code`
5. User enters new password -> `POST /api/auth/reset-password`

---

## 11. CATEGORIES

10 categories total:

| ID | Name | Icon | Color |
|----|------|------|-------|
| money | Money | cash-outline | #10B981 |
| work | Work | briefcase-outline | #3B82F6 |
| health | Health | heart-outline | #EF4444 |
| home | Home | home-outline | #F59E0B |
| tech | Tech | hardware-chip-outline | #8B5CF6 |
| school | School | school-outline | #EC4899 |
| relationships | Relationships | people-outline | #F97316 |
| travel | Travel/Transport | car-outline | #06B6D4 |
| services | Services | construct-outline | #84CC16 |
| **local** | **Local** | **location-outline** | **#E85D3A** |

The "local" category is automatically assigned to local frikts. It cannot be manually selected by users; it is set when the local toggle is activated.

---

## 12. API STRUCTURE

### Public Endpoints (no auth required)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/verify-reset-code`
- `POST /api/auth/reset-password`
- `GET /api/categories`
- `GET /api/health`
- `GET /api/`

### Auth Required Endpoints
All other endpoints require valid JWT token.

### Complete Endpoint List

#### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |
| POST | /api/auth/forgot-password | Request password reset |
| POST | /api/auth/verify-reset-code | Verify reset code |
| POST | /api/auth/reset-password | Set new password |

#### Problems (Frikts)
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/problems | Get feed (global or local) |
| POST | /api/problems | Create Frikt (global or local) |
| GET | /api/problems/similar | Find duplicates (context-aware) |
| GET | /api/problems/{id} | Get single Frikt (includes community info for local) |
| PATCH | /api/problems/{id} | Edit Frikt |
| DELETE | /api/problems/{id} | Delete Frikt |
| GET | /api/problems/{id}/related | Get related Frikts |
| POST | /api/problems/{id}/relate | Relate to Frikt (community-gated for local) |
| DELETE | /api/problems/{id}/relate | Unrelate |
| POST | /api/problems/{id}/save | Save Frikt |
| DELETE | /api/problems/{id}/save | Unsave |
| POST | /api/problems/{id}/follow | Follow Frikt |
| DELETE | /api/problems/{id}/follow | Unfollow |
| GET | /api/problems/{id}/comments | Get threaded comments |
| POST | /api/problems/{id}/report | Report Frikt |

#### Comments
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/comments | Create comment or reply |
| PUT | /api/comments/{id} | Edit comment |
| DELETE | /api/comments/{id} | Delete comment (hard or soft) |
| POST | /api/comments/{id}/helpful | Mark helpful |
| DELETE | /api/comments/{id}/helpful | Unmark helpful |

#### Categories
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/categories | List all 10 categories |
| POST | /api/categories/{id}/follow | Follow category |
| DELETE | /api/categories/{id}/follow | Unfollow category |

#### Users
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/users/search | Search users |
| GET | /api/users/me/saved | Get saved Frikts |
| GET | /api/users/me/posts | Get own posts |
| GET | /api/users/me/badges | Get badges |
| GET | /api/users/me/gamification-stats | Get stats |
| POST | /api/users/me/visit | Record daily visit |
| PUT | /api/users/me/profile | Update profile |
| POST | /api/users/me/avatar | Upload avatar |
| POST | /api/users/me/avatar-base64 | Upload avatar (base64) |
| DELETE | /api/users/me | Delete account |
| POST | /api/users/me/change-password | Change password |
| GET | /api/users/me/blocked | Get blocked users |
| GET | /api/users/{id}/profile | Get user profile |
| GET | /api/users/{id}/posts | Get user's posts |
| GET | /api/users/{id}/badges | Get user's badges |
| GET | /api/users/{id}/stats | Get user's stats |
| POST | /api/users/{id}/follow | Follow user |
| DELETE | /api/users/{id}/follow | Unfollow user |
| GET | /api/users/{id}/is-following | Check if following |
| POST | /api/users/{id}/block | Block user |
| DELETE | /api/users/{id}/block | Unblock user |

#### Communities
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/communities/join | Join community via invite code |
| POST | /api/communities/switch | Switch to new community |
| DELETE | /api/communities/leave | Leave current community |
| GET | /api/communities | List all communities (searchable) |
| GET | /api/communities/me | Get user's current community |
| GET | /api/communities/{id} | Get community detail (is_member, has_pending_request) |
| POST | /api/community-requests | Request new community creation |
| POST | /api/communities/{id}/request-join | Request to join a community |

#### Notifications
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/notifications | Get notifications |
| POST | /api/notifications/read | Mark all read |
| POST | /api/notifications/{id}/read | Mark one read |

#### Push
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/push/register | Register push token |
| DELETE | /api/push/unregister | Unregister token |
| GET | /api/push/settings | Get notification settings |
| PUT | /api/push/settings | Update settings |
| POST | /api/push/test | Test push (admin) |

#### Reports
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/report/problem/{id} | Report Frikt |
| POST | /api/report/comment/{id} | Report comment |
| POST | /api/report/user/{id} | Report user |

#### Badges
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/badges/definitions | Get all badge definitions |

#### Other
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/mission | Get mission of the day |
| POST | /api/feedback | Submit feedback |
| GET | /api/health | Health check |

#### Admin (requires admin role)
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/admin/reports | Get all reports |
| GET | /api/admin/reported-problems | Get reported Frikts |
| GET | /api/admin/reported-comments | Get reported comments |
| POST | /api/admin/reports/{id}/dismiss | Dismiss report |
| POST | /api/admin/reports/{id}/reviewed | Mark reviewed |
| POST | /api/admin/problems/{id}/hide | Hide Frikt |
| POST | /api/admin/problems/{id}/unhide | Unhide Frikt |
| DELETE | /api/admin/problems/{id} | Delete Frikt |
| POST | /api/admin/problems/{id}/pin | Pin Frikt |
| POST | /api/admin/problems/{id}/unpin | Unpin Frikt |
| POST | /api/admin/problems/{id}/needs-context | Mark needs context |
| POST | /api/admin/problems/{id}/clear-needs-context | Clear flag |
| POST | /api/admin/problems/{id}/merge | Merge duplicates |
| POST | /api/admin/comments/{id}/hide | Hide comment |
| POST | /api/admin/comments/{id}/unhide | Unhide comment |
| DELETE | /api/admin/comments/{id} | Delete comment |
| POST | /api/admin/broadcast-notification | Send broadcast |
| GET | /api/admin/broadcast-history | Get broadcasts |
| GET | /api/admin/broadcast-stats | Get broadcast stats |
| GET | /api/admin/debug-push-tokens | Debug push tokens |
| POST | /api/admin/test-push | Test push notification |
| GET | /api/admin/users | List users |
| GET | /api/admin/users/{id} | Get user details |
| POST | /api/admin/users/{id}/ban | Ban user |
| POST | /api/admin/users/{id}/shadowban | Shadowban user |
| POST | /api/admin/users/{id}/unban | Unban user |
| GET | /api/admin/analytics | Get analytics |
| GET | /api/admin/audit-log | Get audit log |
| POST | /api/admin/sync-all-user-stats | Sync all user stats |
| POST | /api/admin/sync-user-stats/{id} | Sync single user |

#### Admin Communities
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/admin/communities | Create community |
| PUT | /api/admin/communities/{id}/code | Change invite code |
| GET | /api/admin/communities | List communities with stats |
| GET | /api/admin/community-requests | Get community creation requests |
| GET | /api/admin/communities/{id}/join-requests | Get join requests |
| PUT | /api/admin/communities/{id}/join-requests/{id} | Update join request (mark sent) |
| GET | /api/admin/communities/{id}/export | Export community data |

#### Admin Feedback
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/admin/feedback | Get all feedback |
| POST | /api/admin/feedback/{id}/read | Mark read |
| POST | /api/admin/feedback/{id}/unread | Mark unread |
| DELETE | /api/admin/feedback/{id} | Delete feedback |

---

## 13. SEARCH

### Frikt Search
- **Endpoint:** `GET /api/problems?search={query}`
- **Type:** Case-insensitive regex
- **Fields searched:** `title`, `when_happens`, `who_affected`
- **Note:** Search results exclude local frikts (same as global feed)
```python
query["$or"] = [
    {"title": {"$regex": search, "$options": "i"}},
    {"when_happens": {"$regex": search, "$options": "i"}},
    {"who_affected": {"$regex": search, "$options": "i"}},
]
```

### User Search
- **Endpoint:** `GET /api/users/search?q={query}`
- **Type:** Case-insensitive regex
- **Fields searched:** `name`, `displayName`
```python
query = {
    "status": {"$ne": "banned"},
    "$or": [
        {"name": {"$regex": q, "$options": "i"}},
        {"displayName": {"$regex": q, "$options": "i"}}
    ]
}
```

### Community Search
- **Endpoint:** `GET /api/communities?search={query}`
- **Type:** Case-insensitive regex
- **Fields searched:** `name`
- **Returns:** Communities with `member_count` and `frikt_count`

---

## 14. PROFILE & BADGES

### Profile Fields (User-editable)
- `displayName` - shown publicly
- `bio` - shown publicly
- `city` - shown if `showCity=true`
- `showCity` - toggle
- `avatarUrl` - uploaded image

### Profile Fields (System-managed)
- `email` - not editable after signup
- `name` - original signup name
- `created_at` - account creation date
- `role` - user/admin
- `status` - active/banned/shadowbanned
- `followed_categories`, `followed_problems`, `saved_problems`
- `streak_days`, `posts_today`

### Badge System

45 total badges across categories:

**A. Visit Streaks (5)**
- Just Browsing: 2 day streak
- Hooked: 7 day streak
- Regular Visitor: 14 day streak
- Mayor of Frikt: 30 day streak
- I Love Problems: 100 day streak

**B. Explorer (3)**
- Curious Human: 3 Frikts opened
- Nosey: 25 Frikts opened
- Rabbit Hole: 100 Frikts opened

**C. The Relater (5)**
- Not Alone: 1 relate given
- Empathy Expert: 10 relates given
- Honorary Therapist: 50 relates given
- Community Pillar: 200 relates given
- Frikt Saint: 500 relates given

**D. Friction Creator (5)**
- First Vent: 1 post created
- Professional Hater: 5 posts created
- Certified Complainer: 10 posts created
- Drama Influencer: 20+ relates on single post (hidden)
- Universal Problem: 50+ relates on single post (hidden)

**E. The Commenter (3)**
- Helpful Stranger: 1 comment
- Conversation Starter: 10 comments
- Internet Philosopher: 25 comments

**F. Social Impact (3)**
- You're Not Crazy: 5 relates received (total)
- Relatable Pain: 25 relates received
- Everyone Feels This: 100 relates received

**G. Special Milestones (3)**
- Nosey Neighbor: 5 users followed
- OG Member: Account created before 2026-03-15
- Early Frikter: Account created before 2026-06-01

**H. Category Specialist (18 = 9 categories x 2)**
- {Category} Apprentice: 1 post in category
- {Category} Master: 5 posts in category

### Badge Check Triggers
- `"post"`: After creating a Frikt
- `"relate"`: After relating to a Frikt
- `"comment"`: After commenting
- `"impact"`: When receiving relates
- `"viral"`: When a single post gets many relates
- `"follow"`: After following users
- `"visit"`: On daily app visit
- `"all"`: Full recalculation (admin sync)

---

## 15. TECH STACK

| Layer | Technology |
|-------|-----------|
| Frontend | Expo (React Native), TypeScript, expo-router |
| Backend | FastAPI, Python |
| Database | MongoDB (Atlas for production, local for dev) |
| Auth | JWT (30-day expiry), bcrypt for passwords |
| Token Storage | expo-secure-store (iOS/Android) |
| Push Notifications | Expo Push Notifications + Firebase (FCM) for Android |
| Email | Resend (password reset emails) |
| Hosting | Railway (backend), EAS Build (mobile builds) |
| Scheduling | APScheduler (notification batch processing) |

---

## END OF DOCUMENTATION
