#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  FRIKT - A social mobile app where users can post "Frikts" (friction points/problems), 
  get "relates" (votes), and comment. Features include:
  - User authentication (register/login)
  - Create, edit, delete Frikts
  - Relate to and comment on Frikts
  - Save/bookmark Frikts
  - Profile editing with avatar upload
  - Unique nickname enforcement
  - Home feed with For You / Trending / New tabs
  - Category-based organization with consistent colors
  - Admin panel for moderation (admin email: karolisbudreckas92@gmail.com)
  - Signal score system for ranking posts

backend:
  - task: "User Registration & Login"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "testing"
        comment: "Previously tested and working"
      - working: "NA"
        agent: "main"
        comment: "Needs comprehensive retest for AppStore readiness"

  - task: "User Profile Update with Unique Nickname"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "PUT /api/users/me/profile - enforces unique displayName (case-insensitive). Returns 409 if name taken."

  - task: "Avatar Upload (Base64)"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "POST /api/users/me/avatar-base64 - accepts base64 image, saves to uploads folder"

  - task: "Create Problem (Frikt)"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "POST /api/problems - creates new frikt with title, optional context, category"

  - task: "Edit Problem"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "PATCH /api/problems/{id} - owner or admin can edit title/context"

  - task: "Delete Problem"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "DELETE /api/problems/{id} - owner or admin can delete"

  - task: "Get Problems Feed (New/Trending/ForYou)"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          GET /api/problems?feed=new|trending|foryou
          - new: sorted by created_at desc
          - trending: hot score (relates*3 + comments*2 + unique*1) for last 7 days
          - foryou: personalized by followed categories

  - task: "Relate to Problem"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "POST /api/problems/{id}/relate - toggle relate on/off"

  - task: "Comment on Problem"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "POST /api/problems/{id}/comments - add comment to problem"

  - task: "Save/Unsave Problem"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "POST /api/problems/{id}/save - toggle save bookmark"

  - task: "Admin Analytics with Signal Breakdown"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "testing"
        comment: "Previously tested"
      - working: "NA"
        agent: "main"
        comment: "Updated with DAU/WAU definitions (active = post/relate/comment), signal breakdown per frikt"

  - task: "Admin User Management (Ban/Unban)"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "testing"
        comment: "Previously tested and working"

  - task: "Admin Reports Management"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "testing"
        comment: "Previously tested and working"

  - task: "Signal Score Calculation"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          New formula: (relates*3) + (comments*2) + (unique_commenters*1) + pain_bonus + recency_boost
          Recency decays to 0 over 72h. Posts with engagement beat posts without.

frontend:
  - task: "Login/Register Flow"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/(auth)/login.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Email/password auth with JWT tokens"

  - task: "Home Feed with Tabs"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/(tabs)/home.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "For You / Trending / New tabs with helper text explaining each"

  - task: "Create Frikt Flow"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/components/PostWizard.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "2-step wizard: title -> category selection"

  - task: "Edit/Delete Frikt"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/edit-problem.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Edit screen with delete confirmation"

  - task: "Profile Page with Edit"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/(tabs)/profile.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Shows user stats, edit profile button, sign out"

  - task: "Edit Profile with Avatar Upload"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/edit-profile.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Name/nickname (unique), bio, city, avatar via base64 upload"

  - task: "Sign Out Functionality"
    implemented: true
    working: true
    file: "/app/frontend/app/(tabs)/profile.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: false
        agent: "user"
        comment: "User reported sign out not working"
      - working: true
        agent: "main"
        comment: "Fixed - uses window.confirm on web, Alert.alert on native"

  - task: "Admin Panel UI"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/admin.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Overview with signal breakdown, Reports, Users, Audit tabs"

  - task: "Category Color Consistency"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/theme/categoryStyles.ts"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Single source of truth for category colors used across all screens"

metadata:
  created_by: "main_agent"
  version: "2.0"
  test_sequence: 2
  run_ui: true

test_plan:
  current_focus:
    - "User Registration & Login"
    - "User Profile Update with Unique Nickname"
    - "Create Problem (Frikt)"
    - "Edit Problem"
    - "Delete Problem"
    - "Get Problems Feed (New/Trending/ForYou)"
    - "Relate to Problem"
    - "Comment on Problem"
    - "Save/Unsave Problem"
    - "Admin Analytics with Signal Breakdown"
  stuck_tasks: []
  test_all: true
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      COMPREHENSIVE APPSTORE READINESS TEST REQUESTED
      
      Please test ALL backend endpoints thoroughly. This is for AppStore submission.
      
      Test Credentials:
      - Admin email: karolisbudreckas92@gmail.com
      - Admin password: Admin123!
      - Can also register new test users
      
      Key Backend Endpoints to Test:
      
      AUTH:
      - POST /api/auth/register - {email, password, name}
      - POST /api/auth/login - {email, password}
      - GET /api/auth/me
      
      PROFILE:
      - PUT /api/users/me/profile - {displayName, bio, city, showCity}
        * Test unique nickname: same name with different case should fail (409)
      - POST /api/users/me/avatar-base64 - {image: base64string}
      
      PROBLEMS (FRIKTS):
      - GET /api/problems?feed=new|trending|foryou
      - POST /api/problems - {title, category_id, context (optional)}
      - GET /api/problems/{id}
      - PATCH /api/problems/{id} - {title, context}
      - DELETE /api/problems/{id}
      - POST /api/problems/{id}/relate
      - POST /api/problems/{id}/comments - {content}
      - POST /api/problems/{id}/save
      
      ADMIN (requires admin token):
      - GET /api/admin/analytics - should return signal_formula and signal_breakdown per top problem
      - GET /api/admin/users
      - POST /api/admin/users/{id}/ban
      - POST /api/admin/users/{id}/unban
      - GET /api/admin/reports
      - GET /api/admin/audit-log
      
      Categories available: money, work, health, home, tech, school, relationships, travel, services, other
      
      Please verify:
      1. All endpoints return correct status codes
      2. Auth protection works (401 for unauthenticated, 403 for non-admin)
      3. Unique nickname validation (409 on duplicate)
      4. Feed sorting is correct (new=recent, trending=hot score)
      5. Signal score breakdown is included in analytics
      6. CRUD operations work correctly
