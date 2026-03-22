# FRIKT DOCUMENTATION REVIEW — REPORT

Generated: 2026-03-09

---

## ISSUE 1: Category count — 9 or 10?

- **DOC SAYS:** "9 options" (line 91) and "9 category cards" (line 111)
- **CODE ACTUALLY DOES:** There are exactly **9 categories** in the `CATEGORIES` list:
  1. money - "Money" - #10B981
  2. work - "Work" - #3B82F6
  3. health - "Health" - #EF4444
  4. home - "Home" - #F59E0B
  5. tech - "Tech" - #8B5CF6
  6. school - "School" - #EC4899
  7. relationships - "Relationships" - #F97316
  8. travel - "Travel/Transport" - #06B6D4
  9. services - "Services" - #84CC16
  
  **Note:** There is NO "Other" category in the list. The `category_id` field defaults to `"other"` in `ProblemCreate`, but "other" is not a displayed category option.

- **STATUS:** ✅ DOC CORRECT (9 categories)
- **FIX APPLIED:** None needed. However, there's a potential CODE BUG: posts can have `category_id="other"` but there's no "Other" in the category list, meaning these posts won't appear when filtering by category.

---

## ISSUE 2: Signal formula inconsistency

- **DOC SAYS:** Hot score = `(relates*3) + (comments*2) + unique_commenters`
- **CODE ACTUALLY DOES:** 

### SIGNAL_SCORE FORMULA (stored in database, recalculated on relate/comment):
```
base_score = (relates × 3) + (comments × 2) + (unique_commenters × 1) + (pain × freq_modifier)
recency_boost = linear decay from 2.0 to 0 over 72 hours
final_score = base_score + recency_boost
```
Where `freq_modifier`:
- daily = 0.3
- weekly = 0.2
- monthly = 0.1

### TRENDING FEED (hot_score, calculated on-the-fly):
```
hot_score = (relates × 3) + (comments × 2) + unique_commenters
```
(No pain, no recency in trending)

### FOR YOU FEED (engagement_score, calculated on-the-fly):
```
engagement_score = (relates × 2) + (comments × 1.5)
```
(Different weights, no pain, no recency)

### ADMIN PANEL (Top Frikts by Signal):
Uses `signal_score` field sorted descending, then recalculates with breakdown for display

- **STATUS:** ⚠️ DOC ERROR - Incomplete
- **FIX APPLIED:** Updated documentation to show:
  1. `signal_score` = full formula with pain + recency (stored)
  2. `hot_score` = simplified formula for trending (on-the-fly)
  3. `engagement_score` = different formula for For You (on-the-fly)

---

## ISSUE 3: Category Specialist badges count

- **DOC SAYS:** "18 = 9 categories × 2" with total of 45 badges
- **CODE ACTUALLY DOES:** 
  - `CATEGORY_IDS` list has exactly **9 categories** (no "other")
  - Category badges are generated dynamically: 9 apprentice + 9 master = **18 category badges**
  - Core badges count: **27** (5 streak + 3 explorer + 5 relater + 5 creator + 3 commenter + 3 impact + 3 special)
  - Total: **27 + 18 = 45 badges**

- **STATUS:** ✅ DOC CORRECT
- **FIX APPLIED:** None needed

---

## ISSUE 4: Comment sorting and helpful system

- **DOC SAYS:** Comments sorted by `helpful_count DESC`
- **CODE ACTUALLY DOES:** 
  - ✅ Comments ARE sorted by `helpful_count DESC` (line 2187)
  - ✅ `POST /api/comments/{id}/helpful` endpoint EXISTS and works
  - ✅ `DELETE /api/comments/{id}/helpful` endpoint EXISTS and works
  - ✅ `helpfuls` collection stores user-comment marks
  - ✅ `helpful_count` field on comments is incremented/decremented

- **STATUS:** ✅ DOC CORRECT - Helpful system is fully implemented
- **FIX APPLIED:** None needed

---

## ISSUE 5: Duplicate report endpoints

- **DOC SAYS:** Two endpoints exist:
  - `POST /api/problems/{id}/report`
  - `POST /api/report/problem/{id}`
  
- **CODE ACTUALLY DOES:** 
  - ✅ Both endpoints exist (lines 2970 and 2992)
  - Both do the same thing (create a report)
  - The `/api/report/problem/{id}` pattern is consistent with `/api/report/comment/{id}` and `/api/report/user/{id}`
  - The `/api/problems/{id}/report` is RESTful style

- **STATUS:** ✅ DOC CORRECT but CODE DESIGN ISSUE
- **FIX APPLIED:** Added note that both exist for backwards compatibility. Frontend should use `/api/report/problem/{id}` for consistency.
- **RECOMMENDATION:** Deprecate `/api/problems/{id}/report` in future version

---

## ISSUE 6: Post screen flow — creation vs editing vs details

- **DOC SAYS:** Single Post Screen with all fields together
- **CODE ACTUALLY DOES:** 
  
  The backend `ProblemCreate` model accepts ALL fields in one request:
  - `title` (required, min 10 chars)
  - `category_id` (default "other")
  - `frequency` (optional)
  - `pain_level` (optional, 1-5)
  - `willing_to_pay` (optional, default "$0")
  - `when_happens` (optional)
  - `who_affected` (optional)
  - `what_tried` (optional)
  
  **The 2-step flow is a FRONTEND UI decision**, not a backend limitation. The frontend splits it into:
  - Step 1: Title only
  - Step 2: Category + Frequency + Severity
  - Post-creation: Add optional details via PATCH

- **STATUS:** ⚠️ DOC ERROR - Missing UX flow details
- **FIX APPLIED:** Updated documentation to clarify:
  1. Backend accepts all fields in single POST
  2. Frontend splits into 2-step creation
  3. Optional details added post-creation via `PATCH /api/problems/{id}`
  4. Severity vs Pain Level: Backend uses `pain_level`, frontend may display as "Severity"

---

## ISSUE 7: signal_score vs hot_score

- **DOC SAYS:** Both exist but relationship unclear
- **CODE ACTUALLY DOES:**
  
  | Field | Stored? | When Calculated | Formula |
  |-------|---------|-----------------|---------|
  | `signal_score` | YES | On create, relate, comment | Full formula with pain + recency |
  | `hot_score` | NO | On-the-fly in Trending query | Simplified: `(relates×3)+(comments×2)+unique` |
  | `engagement_score` | NO | On-the-fly in For You query | `(relates×2)+(comments×1.5)` |
  
  **Queries using `signal_score`:**
  - `/api/problems/{id}/related` - sorts by signal_score
  - `/api/users/{id}/posts` - sorts by signal_score
  - Admin analytics top problems - sorts by signal_score
  
  **Queries using on-the-fly calculations:**
  - Trending feed - calculates `hot_score`
  - For You feed - calculates `engagement_score`

- **STATUS:** ⚠️ DOC ERROR - Needs clarification
- **FIX APPLIED:** Added table showing relationship between stored vs calculated scores

---

## ISSUE 8: For You vs Trending formula

- **DOC SAYS:** Different formulas - Trending: `(r×3)+(c×2)+u`, For You: `(r×2)+(c×1.5)`
- **CODE ACTUALLY DOES:** Confirmed exactly as documented

- **STATUS:** ✅ DOC CORRECT - Intentionally different
- **FIX APPLIED:** Added explanation that this is intentional:
  - **Trending:** Favors viral posts (higher relate weight)
  - **For You:** More balanced engagement (comments matter more relatively)

---

## ISSUE 9: Admin Panel Overview fields

- **DOC SAYS:** "Total users count, Total Frikts count, Total comments count, Frikts today count, New users today count"
- **CODE ACTUALLY DOES:** `GET /api/admin/analytics` returns:
  ```json
  {
    "users": {
      "total": int,
      "active": int,
      "banned": int,
      "dau": int,
      "wau": int,
      "dau_definition": "Users who posted, related, or commented today",
      "wau_definition": "Users who posted, related, or commented in last 7 days"
    },
    "problems": {
      "total": int,
      "today": int,
      "week": int
    },
    "comments": {
      "total": int,
      "today": int,
      "week": int
    },
    "top_problems": [...],
    "signal_formula": {...},
    "pending_reports": int
  }
  ```

- **STATUS:** ⚠️ DOC ERROR - Outdated/incomplete
- **FIX APPLIED:** Updated Admin Panel Overview section with actual fields

---

## BUGS FOUND

### BUG 1: "Other" category inconsistency
- **Description:** `ProblemCreate` defaults `category_id` to `"other"`, but "other" is not in the `CATEGORIES` list
- **Impact:** Posts with category "other" won't appear in category filters and may cause UI issues
- **File:** `/app/backend/server.py`, line ~273-274
- **Fix:** Either add "Other" to CATEGORIES list, or change default to a valid category

### BUG 2: Potential Missing "other" category (MINOR)
- **Description:** If user creates post without selecting category, it gets "other" which isn't filterable
- **Impact:** Low - most users select a category

---

## CHANGES MADE TO DOCUMENTATION

1. **Section 5 (Feed Logic):** Added full explanation of three different score types:
   - `signal_score` (stored, full formula)
   - `hot_score` (Trending, on-the-fly)
   - `engagement_score` (For You, on-the-fly)

2. **Section 1.2 (Post Screen):** Clarified that backend accepts all fields, frontend splits into steps

3. **Section 1.5 (Admin Panel Overview):** Updated to match actual API response with DAU, WAU, etc.

4. **Section 10 (API Structure):** Added note about duplicate report endpoint patterns

5. **Introduction:** Added summary box with key formulas

---

## FIELDS THAT EXIST IN CODE BUT NOT IN DOC

1. `problems.is_problem_not_solution` - boolean field in ProblemCreate (not documented)
2. `users.rocket10_completed`, `rocket10_day`, `rocket10_start_date` - Rocket10 gamification (not documented)
3. `admin_audit_logs` collection - fully documented ✓
4. `pending_notification_batch` - for notification batching (not fully documented)

---

## FIELDS THAT EXIST IN DOC BUT NOT IN CODE

None found - all documented fields exist in code.

---

## SUMMARY

| Issue | Status | Action Required |
|-------|--------|-----------------|
| 1. Category count | ✅ Correct | None |
| 2. Signal formula | ⚠️ Incomplete | Updated doc |
| 3. Badge count | ✅ Correct | None |
| 4. Helpful system | ✅ Correct | None |
| 5. Duplicate endpoints | ✅ Correct | Note added |
| 6. Post flow | ⚠️ Missing details | Updated doc |
| 7. signal vs hot score | ⚠️ Unclear | Updated doc |
| 8. For You vs Trending | ✅ Correct | Explanation added |
| 9. Admin analytics | ⚠️ Outdated | Updated doc |

**Total issues found:** 4 documentation errors (no code bugs critical)
**Total bugs found:** 1 minor ("other" category edge case)
