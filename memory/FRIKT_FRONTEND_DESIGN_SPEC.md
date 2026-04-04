# FRIKT FRONTEND DESIGN SPEC
> Auto-generated from codebase on April 4, 2026. Every value extracted from actual StyleSheet objects and inline styles.

---

## DESIGN TOKENS

### Colors (from `/app/frontend/src/theme/colors.ts`)

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#E85D3A` | Buttons, links, tabs active, FAB, icons |
| `primaryDark` | `#C94A30` | FAB pressed state |
| `primaryLight` | `#FFF1EB` | Soft coral backgrounds (streak, badges, chips) |
| `disabledBg` | `#E7E3DC` | Disabled button bg |
| `disabledText` | `#A19A90` | Disabled button text |
| `background` | `#FAF8F3` | Page background |
| `surface` | `#FFFFFF` | Cards, inputs, modals |
| `surfaceLight` | `#FAFAF8` | Unused |
| `text` | `#2D2D2D` | Primary text |
| `textSecondary` | `#6B6B6B` | Secondary labels, stat counts |
| `textMuted` | `#9A9A9A` | Timestamps, placeholders, hints |
| `accent` | `#2F6F5E` | Success, green accents |
| `accentLight` | `#E8F5F1` | Green soft bg |
| `amber` / `warning` | `#B45309` | Warning, followed state |
| `error` | `#B00020` | Error text, error borders |
| `relateActive` | `#E85D3A` | Heart icon active |
| `relateInactive` | `#9A9A9A` | Heart icon inactive |
| `border` | `#E8E1D6` | Input borders, card borders, dividers |
| `borderLight` | `#EFE9DF` | Lighter borders |
| `divider` | `#EFE9DF` | Divider lines |
| `cardBorder` | `#E8E1D6` | Card borders |
| `overlay` | `rgba(45, 45, 45, 0.5)` | Modal overlays |
| `white` | `#FFFFFF` | Button text on primary |
| `black` | `#2D2D2D` | Same as text |
| `softRed` | `#FFF1EB` | Soft coral bg |
| `softGreen` | `#E8F5F1` | Green badges |
| `softAmber` | `#FFF1EB` | Streak bg, badge bg |
| `softCoral` | `#FFF1EB` | Same as softRed |

**Hardcoded Colors Outside Theme:**
| Hex | Where |
|---|---|
| `#E85D3A` | `CORAL` constant in onboarding, community detail, request-community, home |
| `#333333` | Onboarding title text |
| `#999999` | Onboarding muted text |
| `#666666` | Onboarding body text |
| `#D9D9D9` | Onboarding dot inactive |
| `#F6F3EE` | Forgot-password bg (old value, should be `#FAF8F3`) |
| `#2B2F36` | Forgot-password title text |
| `#FFF3EF` | Community detail join banner bg, user profile community tag bg |
| `#1A1D24` | BadgeSection modal dark bg |
| `#2B2F36` | BadgeSection card bg (dark) |
| `#3A3F47` | BadgeSection surface (dark) |
| `#E4572E` | BadgeSection primary (close to #E85D3A) |
| `#F59E0B` | BadgeSection unlocked color, progress fills |
| `#4B5563` | BadgeSection locked color |
| `#9CA3AF` | BadgeSection text secondary (dark) |
| `#6B7280` | BadgeSection text muted (dark) |
| `#FFD700` | CelebrationModal gold glow |

### Category Colors (from `/app/frontend/src/theme/categoryStyles.ts`)

| Category | Text Color | Background |
|---|---|---|
| Money | `#059669` | `#D1FAE5` |
| Work | `#2563EB` | `#DBEAFE` |
| Health | `#DC2626` | `#FEE2E2` |
| Home | `#D97706` | `#FEF3C7` |
| Tech | `#7C3AED` | `#EDE9FE` |
| School | `#DB2777` | `#FCE7F3` |
| Relationships | `#EA580C` | `#FFEDD5` |
| Travel | `#0891B2` | `#CFFAFE` |
| Services | `#65A30D` | `#ECFCCB` |
| Other | `#6B7280` | `#F3F4F6` |

### Spacing Values (from `colors.ts` + all stylesheets)

| Token | Value | Usage |
|---|---|---|
| `spacing.sm` | 8 | Tight gaps, small padding |
| `spacing.md` | 12 | Standard internal padding |
| `spacing.lg` | 16 | Section padding, margins |
| `spacing.xl` | 20 | Larger spacing |

**Common padding patterns:**
- Page padding: `16px` horizontal
- Card padding: `12-16px` all
- Header padding: `16px` horizontal, `12px` vertical
- Input padding: `12-16px` horizontal, `12-16px` vertical
- Button padding: `12-16px` vertical

### Border Radius Values (from `colors.ts`)

| Token | Value | Usage |
|---|---|---|
| `radius.sm` | 8 | Small pills, chips |
| `radius.md` | 12 | Buttons, cards, inputs |
| `radius.lg` | 16 | Large cards |
| `radius.xl` | 20 | Pill shapes |
| `18` | hardcoded | Feed tab pills, segment pills |
| `24` | hardcoded | Toggle containers |
| `28` | hardcoded | FAB, celebrations modal |
| `30` | hardcoded | CTA button onboarding |
| `40` | hardcoded | Avatar circles |
| `50` | hardcoded | Avatar circles (large) |

### Shadow Values (from `colors.ts`)

```
shadows.subtle = { shadowColor: '#000', shadowOffset: {0,1}, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 }
shadows.card   = { shadowColor: '#000', shadowOffset: {0,2}, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }
shadows.medium = { shadowColor: '#000', shadowOffset: {0,4}, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 }
```

### Font Sizes Used

| Size | Context |
|---|---|
| 9 | Tab badge text, mini progress text |
| 10 | Admin tab text |
| 11 | Category pills on cards, badge labels, timestamps, category text |
| 12 | Timestamps, helper text, stat labels, settings desc, severity labels |
| 13 | Feed tab text, stat text, chip text, button text small, section subtitles |
| 14 | Body text, input placeholder text, links, form labels, notification messages |
| 15 | Medium body, input fields, post titles, edit profile inputs |
| 16 | Button text, input text, stat text, toggle labels, large body |
| 17 | Section titles, header titles, next text onboarding, community detail header |
| 18 | Page titles, headers, stat values (medium), severity numbers |
| 20 | No-community title, stat values |
| 22 | Community name, badge detail title, display name, edit problem title |
| 24 | Code input on forgot password |
| 26 | Onboarding slide title |
| 28 | Forgot-password main title, metric values |
| 32 | Avatar text (other user profile) |
| 36 | Onboarding logo text |
| 40 | Avatar initial text (edit profile) |
| 44 | Badge detail emoji |
| 52 | Celebration modal emoji |

---

## SHARED COMPONENTS

### ProblemCard (`/app/frontend/src/components/ProblemCard.tsx`)

**Card Container:**
- bg: `#FFFFFF`, border: `1px #E8E1D6`, radius: `16px`, padding: `16px`, margin: `16px horizontal, 12px top`
- Shadow: `shadows.card` (0,2 / 0.06 / 8px / elevation 2)

**Category Pill:**
- paddingH: `8px`, paddingV: `3px`, radius: `8px`
- Font: `11px` weight `600`
- bg: category bgColor, text: category color
- **Local posts**: Gray category pill is REMOVED if `is_local && category is 'local'`. Only coral pin tag shown.

**Local Tag:**
- bg: `#FFF1EB`, paddingH: `8px`, paddingV: `3px`, radius: `8px`
- Icon: location, 11px, `#E85D3A`
- Text: `12px`, weight `600`, `#E85D3A`

**Title:**
- Font: `16px`, weight `600`, color: `#2D2D2D`, lineHeight: `22px`

**Footer Stats:**
- statText: `13px`, color: `#6B6B6B`
- timeText: `11px`, color: `#9A9A9A`
- Heart icon: 14px, `#E85D3A` (related) or `#9A9A9A` (not)
- Chatbubble icon: 14px, `#9A9A9A`

### MissionBanner (`/app/frontend/src/components/MissionBanner.tsx`)

**Container:**
- bg: `#FFFFFF`, marginH: `16px`, marginT: `8px`, radius: `16px`, padding: `12px`
- border: `1px #E8E1D6`, shadow: `shadows.subtle`

**Icon Container:**
- `36x36`, radius: `8px`

**Content row:**
- marginBottom: `8px`

**Theme Name:**
- Font: `14px`, weight `700`, color: `#2D2D2D`

**Question:**
- Font: `14px`, color: `#6B6B6B`, lineHeight: `20px`

**Button:**
- bg: `#E85D3A`, radius: `12px`, paddingV: `10px`
- Text: `13px` weight `600`, white
- No "2 min" hint text

### PostWizard (`/app/frontend/src/components/PostWizard.tsx`)

**Step 1 - Main Input:**
- bg: `#FFFFFF`, border: `1px #E8E1D6`, radius: `16px`, padding: `20px`
- Font: `18px`, color: `#2D2D2D`, lineHeight: `26px`

**Continue Button (enabled):**
- bg: `#E85D3A`, radius: `12px`, paddingV: `16px`
- Text: `16px` weight `600`, white
- Shows arrow-forward icon

**Continue Button (disabled):**
- bg: `#E7E3DC`
- Text color: `#A19A90`
- No arrow icon

**Local Toggle (when community exists):**
- Uses `<View>` + `<Switch>` (not TouchableOpacity + checkbox)
- Default: bg `#FFFFFF`, border `1px #E8E1D6`, radius: `12px`, padding: `14px`
- Active: bg `#E85D3A`
- Switch trackColor: `{ false: '#E8E1D6', true: 'rgba(255,255,255,0.4)' }`
- Switch thumbColor: `isLocal ? '#FFFFFF' : '#E85D3A'`
- Subtitle: "This frikt will appear in your local community feed."

**Category/Frequency Chips:**
- paddingH: `14px`, paddingV: `8px`, radius: `18px`, height: `36px`
- border: `1px #E8E1D6`, bg: `#FFFFFF`
- Active: bg `#E85D3A`, border `#E85D3A`, text white
- Text: `14px` weight `500`

**Severity Pills (1-5):**
- Same chip style as category/frequency (36px height, oval, 18px radius)
- Active: coral fill + white text
- "Mild" / "Severe" labels below: `12px` `#9A9A9A`

**Details Toggle:**
- padding: `12px`, border: `0.5px #EFE9DF`, bg `#FFFFFF`, radius `12px`
- Title: `14px` weight `500`, color `#6B6B6B`
- Subtitle: `12px` color `#9A9A9A`

**Step 2 Footer:**
- "Skip details": text link only, no border/bg. `14px` weight `500`, `#6B6B6B`
- "Post Frikt": bg `#E85D3A`, radius `12px`. Text: `16px` weight `600`, white. Has checkmark icon.

### BadgeSection (`/app/frontend/src/components/BadgeSection.tsx`)

**Profile Row Button:**
- bg: `#FFFFFF`, paddingH: `16px`, paddingV: `14px`, marginH: `16px`, marginB: `8px`, radius: `12px`
- border: `1px #E5E5E5`
- Label: `16px` weight `500`, `#1A1A1A`

**Stats Badge Pill:**
- bg: `#FFF1EB`, paddingH: `12px`, paddingV: `6px`, radius: `20px`
- Count: `14px` weight `700`, `#D97706`

**Modal (Dark Theme):**
- Container bg: `#1A1D24`
- Card bg: `#2B2F36`
- Surface: `#3A3F47`
- Text primary: `#FFFFFF`
- Unlocked badge icon: bg `#FFF1EB`, border `2px #E85D3A`
- Locked badge icon: bg `#3A3F47`, border `2px #4B5563`
- Progress fill: `#F59E0B`

### CelebrationModal (`/app/frontend/src/components/CelebrationModal.tsx`)

- Overlay: `rgba(0,0,0,0.7)`, padding: `32px`
- Card: bg `#FFFFFF`, radius: `28px`, padding: `32px`, maxWidth: `340px`
- Badge glow: `#FFD700`, opacity `0.3`
- Badge icon: `100x100`, radius `50`, bg `#FFD700` at 30%, border `3px #FFD700`
- Emoji: `52px`
- Title "Badge Unlocked!": `14px` weight `600`, `#E4572E`, uppercase, letterSpacing `2`
- Badge name: `26px` weight `800`, `#1A1A1A`
- Description: `16px`, `#666666`, lineHeight `24`
- Dismiss button: bg `#E4572E`, radius `28`, paddingH `48`, paddingV `14`
- Dismiss text: `18px` weight `700`, white

---

## SCREENS

---

### LOGIN (`/app/frontend/app/(auth)/login.tsx`)

**Container:** bg `#F6F3EE`, flex 1

**Header:**
- Logo "frikt": `32px` weight `800`, `#E85D3A`, letterSpacing `-1`
- Title "Welcome back": `28px` weight `700`, `#2B2F36`
- Subtitle: `16px`, `colors.textSecondary`, lineHeight `24`

**Input Container:**
- bg: `colors.surface` (#FFFFFF), radius `12px`, border `1px colors.border` (#E8E1D6)
- Icon padding-left: `16px`, color: `colors.textMuted` (#9A9A9A)
- Input: flex 1, paddingV `16px`, paddingH `12px`, `16px`, color `#2B2F36`
- Props: `autoComplete="off"`, `textContentType="none"`, `autoCorrect={false}`

**Sign In Button:**
- bg: `colors.primary` (#E85D3A), radius `12px`, paddingV `16px`
- Text: `16px` weight `600`, white
- Disabled: opacity `0.7`

**Links:**
- "Forgot Password?" — `14px`, `colors.primary` (#E85D3A)
- "Sign Up" — `14px` weight `600`, `colors.primary` (#E85D3A)

---

### REGISTER (`/app/frontend/app/(auth)/register.tsx`)

**Container:** bg `#F6F3EE`

**Inputs:** Same as login (white bg, #E8E1D6 border, autoComplete="off", textContentType="none")

**Checkbox:**
- `22x22`, radius `6px`, border `2px colors.primary` (#E85D3A), bg `#FFFFFF`
- Checked: bg `colors.primary`, checkmark icon white

**Create Account Button (enabled):**
- bg `#E85D3A`, text white `16px` weight `600`

**Create Account Button (disabled):**
- bg `#E7E3DC`, text `#A19A90` (NOT opacity)

**Links:**
- "Sign In" — `14px` weight `600`, `colors.primary`

---

### FORGOT PASSWORD (`/app/frontend/app/(auth)/forgot-password.tsx`)

**Container:** bg `#F6F3EE`

**Icon Circle:** `80x80`, radius `40`, bg `colors.primaryLight` (#FFF1EB)

**Title:** `28px` weight `700`, `#2B2F36`

**Subtitle:** `16px`, `colors.textSecondary`, lineHeight `24`

**Input:** Same container style as login. Code input: `24px` weight `600`, centered, letterSpacing `8`

**Buttons:** bg `colors.primary`, radius `12`, paddingV `16`. Disabled: opacity `0.7`

**Resend link:** `14px`, `colors.primary`

---

### ONBOARDING (`/app/frontend/app/onboarding.tsx`) — DO NOT CHANGE

**Container:** bg `#FAF8F3`

**Skip button:** absolute top `60`, right `24`. Text: `15px` weight `500`, `#999999`

**Slide:**
- width: screen width, centered, paddingH `40`, paddingBottom `80`
- Icon circle: `120x120`, radius `60`, bg `#FFF`, shadow (0,2/0.06/12/elevation 3)
- Logo "frikt": `36px` weight `800`, `#E85D3A`, letterSpacing `-1`
- Title: `26px` weight `700`, `#333333`, lineHeight `32`
- Body: `16px`, `#666666`, lineHeight `24`, marginBottom `40`

**Next button:** paddingV `14`, paddingH `32`. Text `17px` weight `600`, `#E85D3A`. Arrow icon `18px`.

**CTA "Get Started":** bg `#E85D3A`, paddingV `16`, paddingH `48`, radius `30`, full width. Text `17px` weight `700`, white.

**Dots:** gap `8`. Dot: `8x8`, radius `4`. Active: bg `#E85D3A`, width `24`. Inactive: bg `#D9D9D9`.

---

### TAB BAR (`/app/frontend/app/(tabs)/_layout.tsx`)

**Tab Bar:**
- bg: `colors.surface` (#FFFFFF), borderTop: `1px colors.border` (#E8E1D6)
- Height: iOS `88px`, Android `64px`
- paddingTop: `8px`, paddingBottom: iOS `28px`, Android `8px`

**Tab Labels:** `11px` weight `500`

**Colors:** active `colors.primary` (#E85D3A), inactive `colors.textMuted` (#9A9A9A)

**FAB (Post button):**
- `56x56`, radius `28`, bg `colors.primary` (#E85D3A), marginTop `-20`
- Shadow: color `colors.primary`, offset (0,4), opacity 0.3, radius 8, elevation 8
- Active: bg `colors.primaryDark` (#C94A30)
- Icon: "add", 28px, white

---

### HOME — GLOBAL FEED (`/app/frontend/app/(tabs)/home.tsx`)

**Header:**
- paddingH `16`, paddingV `8`
- Logo "frikt": `24px` weight `800`, `#E85D3A`
- Right side: notification bell icon, badge dot `8x8` radius `4` `colors.primary`

**Global/Local Toggle:**
- marginH `16`, marginTop `8`, bg `colors.surface`, radius `24`, padding `3`
- border: `1px colors.border`
- Active tab: bg `colors.primary` (#E85D3A), radius `20`, text white `14px` weight `600`
- Inactive tab: text `colors.textSecondary`

**Feed Tabs (For You / Trending / New):**
- paddingH `16`, paddingTop `8`, gap `8`
- Each pill: paddingV `8`, paddingH `14`, radius `18`, height `36`
- Default: bg `colors.surface`, border `1px colors.border`, text `13px` weight `500` `#2D2D2D`
- Active: bg `#E85D3A`, border `#E85D3A`, text `#FFFFFF`

**MissionBanner:** See shared components above.

**Feed Cards:** Uses `ProblemCard` component. See shared components.

---

### HOME — LOCAL (NO COMMUNITY) (`/app/frontend/app/(tabs)/home.tsx`)

**No Community View:**
- centered, paddingV `32`, paddingH `32`
- Pin icon: `48x48`, radius `24`, bg `#FFF1EB`, location icon `24px` `#E85D3A`
- Title "Join a local community": `20px` weight `700`, `#2D2D2D`, marginTop `12`
- Subtitle: `14px`, `colors.textSecondary`, lineHeight `20`

**Join Input:**
- bg `#FFFFFF`, border `1px #E8E1D6`, radius `12`, paddingH `16`, paddingV `12`
- Placeholder: "Enter code"
- Props: `autoComplete="off"`, `autoCorrect={false}`, `textContentType="none"`

**Join Button:**
- bg `colors.primary` (#E85D3A), radius `12`, paddingV `12`, paddingH `20`
- Text: `14px` weight `600`, white
- Disabled: opacity `0.7`

**Browse Communities Button:**
- bg `colors.surface`, border `1px colors.primary`, radius `12`, paddingV `12`
- Text: `14px` weight `600`, `colors.primary` (#E85D3A)

**Request link:** `13px`, `colors.primary`

---

### HOME — LOCAL (WITH COMMUNITY) (`/app/frontend/app/(tabs)/home.tsx`)

**Community Header:**
- bg `colors.surface`, marginH `16`, marginTop `12`, radius `16`, padding `16`, border `1px colors.border`
- Community name: `18px` weight `700`, `#2D2D2D`
- Avatar: `44x44` radius `22`

**Sort Tabs (Trending / New / Top):**
- Same pill style as global feed tabs (36px height, 18px radius, coral active)

**Feed:** Uses `ProblemCard`. Local posts show coral pin tag only (no duplicate gray category pill).

---

### SEARCH (`/app/frontend/app/(tabs)/search.tsx`)

**Header:**
- paddingH `16`, paddingV `12`, borderBottom `1px colors.border`
- Title: `22px` weight `700`, `#2D2D2D`

**Segment Tabs (Frikts / Users / Communities):**
- marginH `16`, marginTop `8`, bg `colors.surface`, radius `18`, padding `3`
- border: `1px colors.border`
- Each button: flex 1, paddingV `8`, radius `16`, height `36`
- Active: bg `colors.primary`, text white `14px` weight `500`
- Inactive: text `colors.textSecondary`

**Search Box (FULL WIDTH, no separate button):**
- marginH `16`, paddingV `8`
- bg `#FFFFFF`, radius `12`, paddingH `12`, border `1px #E8E1D6`
- Search icon: 20px, `colors.textMuted`
- Input: flex 1, paddingV `12`, paddingH `8`, `15px`, color `#2D2D2D`
- Props: `autoComplete="off"`, `autoCorrect={false}`, `textContentType="none"`
- Clear button on right when query > 0
- **No separate search button** — triggers on `onSubmitEditing` + 300ms debounce on type

**Empty State:**
- paddingV `48`, centered
- Icon: `48px`, `colors.textMuted`
- Title: `16px` weight `600`, `#2D2D2D`
- Subtitle: `14px`, `colors.textMuted`

**User Result Card:**
- bg `colors.surface`, radius `12`, padding `14`, marginBottom `10`
- Avatar: `40x40` radius `20`
- Name: `15px` weight `600`
- Stats: `13px` `colors.textSecondary`
- Follow button: bg `colors.primary`, radius `8`, paddingV `8`, paddingH `16`

**Community Result Card:**
- bg `colors.surface`, radius `12`, padding `14`, marginBottom `10`
- Icon: `44x44` radius `22` bg `colors.primary`
- Name: `15px` weight `600`
- Stats: `13px` `colors.textMuted`

---

### CATEGORIES (`/app/frontend/app/(tabs)/categories.tsx`)

**Header:**
- paddingH `16`, paddingV `12`
- Title "Categories": `22px` weight `700`
- Subtitle: `14px` `colors.textSecondary`

**Category Card:**
- bg `colors.surface`, radius `16`, padding `12`, marginBottom `8`
- border: `1px colors.border`

**Icon Container:** `44x44`, radius `12`, bg: category bgColor

**Card Text:**
- Name: `16px` weight `600`, `colors.text`
- Hint: `13px`, `colors.textMuted`

**Follow Button:**
- `32x32`, radius `16`, border `2px colors.primary`
- Icon "+": 16px, `colors.primary`
- Followed state: bg `colors.primary`, icon white, checkmark

---

### PROFILE (OWN) (`/app/frontend/app/(tabs)/profile.tsx`)

**Header:**
- paddingH `16`, paddingV `8`, bg `colors.surface`
- Settings gear icon right side

**Profile Header:**
- centered, paddingV `20`
- Avatar: `80x80` radius `40`
- Avatar placeholder: bg `colors.primary`, initial `32px` weight `700` white
- Display name: `22px` weight `700`
- Community tag: bg `#FFF3EF`, border `1px #E85D3A30`, paddingH `10`, paddingV `4`, radius `12`
  - Text: `13px` weight `600` `#E85D3A`, location icon `13px`

**Stats Row:**
- bg `colors.surface`, paddingV `12`, 3 columns
- Value: `20px` weight `700`
- Label: `12px` `colors.textSecondary`

**Action Buttons (My Frikts, Saved, Edit profile):**
- bg `colors.surface`, paddingH `16`, paddingV `14`, marginH `16`, marginB `8`, radius `12`
- border: `1px colors.border`
- chevron-forward: `18px` `#9A9A9A`

**Section Order (top to bottom):**
1. Profile Header
2. Stats Row
3. Community Card (or "No community yet" card)
4. Badges Section
5. Streak Card (if streak > 0)
6. My Frikts button
7. Saved button
8. Edit Profile button
9. Admin Panel link (if admin)
10. Logout / Delete Account

**Community Card (no community):**
- bg `colors.surface`, paddingH `16`, paddingV `14`, marginH `16`, radius `12`, border `1px colors.border`
- **Tappable (TouchableOpacity)** → navigates to Home Local tab
- Location icon: `22px` `#E85D3A`
- Title: "No community yet", `15px` weight `600`
- Subtitle: "Join a local community"
- Chevron-forward: `20px` `#9A9A9A`

**Streak Card:**
- bg `#FFF1EB` (coral, NOT yellow), marginH `16`, marginT `12`, radius `12`, padding `14`, gap `12`
- Flame icon: `24px` `#E85D3A`
- Title: `15px` weight `600`, `#2D2D2D`
- Subtitle: `13px`, `colors.textMuted`

**Admin Badge:** bg `colors.softRed`, padding `6`, radius `8`. Text: `12px` weight `600` `colors.primary`

---

### PROFILE (OTHER USER) (`/app/frontend/app/user/[id].tsx`)

**Header:** bg `colors.surface`, borderBottom. Title "Profile" `18px` weight `600`. Menu button (ellipsis) on right.

**Profile Header:**
- bg `colors.surface`, paddingV `24`, borderBottom
- Avatar: `80x80` radius `40`
- Display name: `22px` weight `700`
- Bio: `14px` `colors.textSecondary`, lineHeight `20`
- Community tag: same as own profile

**Stats Row:** bg `colors.surface`, paddingV `16`. Same as own profile.

**Sort Tabs (Newest / Top):**
- bg `colors.surface`, radius `12`, padding `4`
- Active: bg `colors.primary`, text white
- Inactive: text `colors.textSecondary`

**Post Card (inline):**
- bg `colors.surface`, marginH `16`, marginB `12`, padding `14`, radius `12`, border `1px colors.border`
- Category pill: alignSelf flex-start, paddingH `10`, paddingV `4`, radius `8`
- Title: `15px` weight `600`, lineHeight `21`
- Footer stats: heart 14px `colors.primary`, chatbubble 14px `colors.textMuted`, text `13px`
- Time: `12px` `colors.textMuted`

**Menu Modal (Block/Report):**
- Overlay: `rgba(0,0,0,0.5)`, bottom sheet
- Container: bg `colors.surface`, borderTopRadius `20`, paddingBottom `34`
- Items: paddingV `16`, paddingH `20`, gap `12`, borderBottom
- Block text: `16px` `colors.error`
- Report text: `16px` `colors.text`

**Report Modal:**
- Bottom sheet, bg `colors.surface`, borderTopRadius `20`, padding `20`
- Title: `20px` weight `700`
- Reason items: bg `colors.background`, radius `12`, paddingV `14`, paddingH `16`
- Selected: bg `colors.primary + '15'`, border `1px colors.primary`
- Submit: bg `colors.primary`, paddingV `16`, radius `12`. Disabled: opacity `0.6`

---

### POST WIZARD STEP 1 (`/app/frontend/src/components/PostWizard.tsx`)

See **PostWizard** in shared components above.

---

### POST WIZARD STEP 2 (`/app/frontend/src/components/PostWizard.tsx`)

**Step Hint:** "Help others find your problem" — `14px` `colors.textMuted`

**Category Chips:** See shared component chip style.

**Frequency Chips:** Same as category chips.

**Severity Pills:** Same chip style (36px oval, not squares).

**Details Toggle:** See shared component.

**Footer:** "Skip details" (text link) + "Post Frikt" (primary button).

---

### PROBLEM DETAIL (`/app/frontend/app/problem/[id].tsx`)

**Header:**
- bg `colors.surface`, paddingH `16`, paddingV `10`, borderBottom
- Back arrow, title "Frikt" `17px` weight `600`

**Author Row:**
- Avatar: `32x32` radius `16`
- Name: `14px` weight `600`
- Time: `12px` `colors.textMuted`

**Problem Title:** `20px` weight `700`, lineHeight `28`

**Category Pill:** paddingH `10`, paddingV `4`, radius `8`

**Stats Bar (Relates / Comments / Frequency / Pain):**
- bg `colors.surface`, radius `12`, padding `14`
- Label: `12px` `colors.textMuted`
- Value: `16px` weight `600`

**Action Buttons:**
- paddingV `8`, paddingH `12`, radius `12`
- **Relate (PRIMARY):** bg `#FFF1EB`, border `1px #FFF1EB`. Icon `22px` `#E85D3A` always. Text `12px` weight `600` `#E85D3A`
- **Save/Follow/Report (SECONDARY):** icon `20px` `#9A9A9A`, text `12px` `#9A9A9A`
- Active states: bg `colors.softRed`

**Quick Reply Chips:**
- bg `colors.surface` (#FFFFFF), paddingH `10`, paddingV `6`, radius `16`
- border: `1px colors.primary` (#E85D3A)
- Text: `12px` weight `500` `colors.primary`

**Comment Input:**
- bg `#FFFFFF`, radius `12`, padding `14`, border `1px colors.border`
- minHeight `60`, font `14px`

**Comments:**
- Avatar: `28x28` radius `14`
- Name: `13px` weight `600`
- Text: `14px`, lineHeight `20`
- Actions: "Helpful" / "Reply" — `12px` weight `500` `colors.textMuted`

---

### EDIT PROBLEM (`/app/frontend/app/edit-problem.tsx`)

**Header:** Cancel/Save pattern. Title "Edit Frikt" `17px` weight `600`. Save text `16px` weight `600` `colors.primary`.

**Main Input:** bg `colors.surface`, radius `16`, padding `16`, `17px`, minHeight `120`, border `1px colors.border`

**Chips:** paddingH `16`, paddingV `10`, radius `20px` (radius.xl), border `1px colors.border`

**Severity:** `flex: 1`, paddingV `14`, radius `12`, border `1px colors.border`. Text `18px` weight `600`.

**Detail Inputs:** bg `colors.surface`, radius `12`, padding `14`, `15px`, minHeight `80`, border `1px colors.border`

**Delete Button:** marginH `16`, paddingV `14`, radius `12`, border `1px colors.error+'40'`. Text `16px` weight `600` `colors.error`.

---

### COMMUNITY DETAIL (`/app/frontend/app/community/[id].tsx`)

**Header:** bg `colors.surface`, borderBottom. Title `17px` weight `600` centered.

**Community Info:**
- centered, paddingV `20`
- Icon: `56x56` radius `28` bg `#E85D3A` (or avatar image)
- Name: `22px` weight `700`
- Stats: `14px` `colors.textMuted`

**Join Banner (non-member):**
- marginH `16`, padding `16`, radius `16`
- bg `#FFF3EF`, border `1px #E85D3A30`
- Title: `16px` weight `600`
- Message input: bg `colors.surface`, border `1px colors.border`, radius `12`, padding `12`
- Request button: bg `#E85D3A`, radius `12`, paddingV `12`

**Non-member Notice:**
- bg `colors.surface`, radius `8`, paddingV `8`, paddingH `12`
- Info icon `16px` + text `12px` `colors.textMuted`

**Sort Pills:**
- paddingV `8`, paddingH `16`, radius `20`, bg `colors.surface`
- Active: bg `#E85D3A`, text white

---

### REQUEST COMMUNITY (`/app/frontend/app/request-community.tsx`)

**Header:** bg `colors.surface`, borderBottom. Title `18px` weight `600` centered.

**Content:** padding `24`

**Title:** `22px` weight `700`, centered

**Inputs:** bg `colors.surface`, border `1px colors.border`, radius `12`, padding `14`, `15px`

**Submit Button:** bg `#E85D3A`, radius `12`, paddingV `16`. Disabled: opacity `0.5`.

**Success State:** centered. Checkmark `64px` `#E85D3A`. Title `22px` weight `700`.

---

### NOTIFICATIONS (`/app/frontend/app/notifications.tsx`)

**Header:** paddingH `16`, paddingV `12`, borderBottom. Title `18px` weight `600`.

**Notification Card:**
- bg `colors.surface`, radius `12`, padding `14`, marginBottom `10`
- Unread: borderLeft `3px colors.primary`

**Icon Circle:** `40x40` radius `20`, bg: `iconColor + '20'`

**Message:** `14px` `colors.text`, lineHeight `20`

**Time:** `12px` `colors.textMuted`

---

### NOTIFICATION SETTINGS (`/app/frontend/app/notification-settings.tsx`)

**Status Card:** bg `colors.surface`, radius `12`, padding `16`. Icon `48x48` radius `24`.

**Section Title:** `14px` weight `600` `colors.textSecondary`, uppercase, letterSpacing `0.5`

**Setting Card:** bg `colors.surface`, radius `12`, padding `14`. Disabled: opacity `0.5`.

**Setting Icon:** `40x40` radius `10`.

**Toggle Switch:** trackColor false `colors.border`, true `colors.accent` or `colors.primary`. Thumb: white.

---

### EDIT PROFILE (`/app/frontend/app/edit-profile.tsx`)

**Header:** bg `colors.surface`, borderBottom. Cancel text `16px` `colors.textSecondary`. Save text `16px` weight `600` `colors.primary`.

**Avatar:** `100x100` radius `50`. Placeholder bg `colors.primary`. Camera icon: `32x32` radius `16` bg `colors.primary`.

**Inputs:**
- bg `#FFFFFF`, radius `12`, paddingH `16`, paddingV `14`, `16px`, border `1px colors.border`
- Error state: border `colors.error`

**Show City Toggle:**
- bg `colors.surface`, radius `12`, padding `16`, border `1px colors.border`
- Switch: false=`colors.border`, true=`colors.primary+'60'`. Thumb: `colors.primary` or `colors.textMuted`.

---

### MY POSTS (`/app/frontend/app/my-posts.tsx`)

**Header:** standard pattern. Title "My Frikts" `18px` weight `600`.

**Empty State:**
- Icon `64px` `colors.textMuted`. Title `18px` weight `600`. Text `14px` `colors.textSecondary`.
- "Drop a Frikt" button: bg `colors.primary`, radius `12`, paddingV `12`, paddingH `20`. Text `14px` weight `600` white.

---

### SAVED (`/app/frontend/app/saved.tsx`)

**Header:** standard. Title "Saved Frikts" `18px` weight `600`.

**Empty State:** Icon `64px`. Title `18px`. Text `14px` `colors.textSecondary`.

---

### BLOCKED USERS (`/app/frontend/app/blocked-users.tsx`)

**Header:** Title "Blocked Users" `17px` weight `600`.

**User Row:** bg `colors.surface`, padding `12`, radius `12`. Avatar `44x44`. Name `16px` weight `600`. Date `12px` `colors.textMuted`.

**Unblock Button:** paddingH `16`, paddingV `8`, radius `8`, border `1px colors.primary`. Text `14px` weight `600` `colors.primary`.

---

### CHANGE PASSWORD (`/app/frontend/app/change-password.tsx`)

**Header:** standard. Title `17px` weight `600`.

**Description:** `15px` `colors.textSecondary`, lineHeight `22`.

**Error Box:** bg `colors.softRed`, radius `12`, padding `12`. Text `14px` `colors.error`.

**Inputs:** Same container style as login/register.

**Button:** bg `colors.primary`, radius `12`, paddingV `16`. Disabled: opacity `0.6`.

---

### FEEDBACK (`/app/frontend/app/feedback.tsx`)

**Header:** Close (X) icon instead of back arrow. Title "Send feedback" `17px` weight `600`.

**Input:** bg `colors.surface`, radius `12`, padding `16`, `16px`, minHeight `150`, border `1px colors.border`.

**Helper:** `13px` `colors.textMuted`.

**Send Button:** bg `colors.primary`, radius `12`, paddingV `14`. Disabled: bg `colors.textMuted`.

**Success:** centered. Checkmark `64px` `colors.accent`. "Sent" text `24px` weight `600` `colors.accent`.

---

### ADMIN PANEL (`/app/frontend/app/admin.tsx`)

**Header:** bg `colors.surface`, borderBottom. Title `18px` weight `600`. Admin badge: bg `colors.softRed` padding `6` radius `8`.

**Tabs:**
- bg `colors.surface`, borderBottom
- Each: flex 1, paddingV `10`, gap `2`
- Active: borderBottom `2px colors.primary`. Text `10px` weight `500` `colors.primary`.
- Inactive: text `colors.textMuted`
- Badge dot: bg `colors.error`, radius `8`, `16x16`. Text `9px` weight `700` white.

**Metric Cards:**
- bg `colors.surface`, padding `16`, radius `12`, border `1px colors.border`
- Value: `28px` weight `700`
- Label: `12px` `colors.textMuted`

**Section Title:** `14px` weight `600` `colors.textSecondary`, uppercase, letterSpacing `0.5`

---

## NOTES

1. **Font Family:** No explicit fontFamily set anywhere (uses system default / Poppins via Expo config).
2. **Background pattern:** All pages use `colors.background` (#FAF8F3) except auth pages which use `#F6F3EE` and BadgeSection modal which uses `#1A1D24` (dark theme).
3. **Disabled patterns:** Two approaches coexist:
   - New style: bg `#E7E3DC` + text `#A19A90` (register, PostWizard)
   - Old style: `opacity: 0.5-0.7` (forgot-password, change-password, request-community, home join)
4. **Badge modal** uses its own dark color scheme completely separate from the global theme.
5. **Celebration modal** uses hardcoded colors close to but not exactly matching the theme.
