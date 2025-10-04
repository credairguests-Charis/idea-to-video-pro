# Admin Dashboard — Design Specification

## 1. Design Philosophy

**Principles:**
- **Security First**: Clear visual indicators of admin-only access
- **Information Density**: Maximize useful data without clutter
- **Consistent Language**: Match main app's design system
- **Professional Aesthetic**: Clean, modern, trustworthy
- **Desktop-Optimized**: Primary use case is desktop admin work

---

## 2. Visual Hierarchy & Layout

### 2.1 Overall Structure

```
┌─────────────────────────────────────────────────────────────┐
│  [Admin Logo] Admin Dashboard            [User] [Logout]    │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                   │
│  SIDEBAR │           MAIN CONTENT AREA                      │
│          │                                                   │
│  • Overview                                                  │
│  • Health │                                                  │
│  • Promos │                                                  │
│  • Bypass │                                                  │
│  • Logs   │                                                  │
│  • Users  │                                                  │
│          │                                                   │
└──────────┴──────────────────────────────────────────────────┘
```

### 2.2 Navigation Sidebar
- **Width**: 240px fixed
- **Background**: `bg-[#0f1729]` (dark navy)
- **Active Item**: Slightly lighter background, left border accent
- **Icons**: Lucide icons, 20px, white with 70% opacity
- **Text**: White, 14px, medium weight
- **Hover**: Background lightens to `bg-[#1a2236]`

---

## 3. Dashboard Overview Page

### 3.1 KPI Cards (Top Row)
Four metric cards in a grid:

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Total Users  │ │ Projects     │ │ Revenue      │ │ API Status   │
│              │ │              │ │              │ │              │
│   1,247      │ │   8,932      │ │  $12,450     │ │   ● Online   │
│ +12% this mo │ │ +5% this wk  │ │  MTD         │ │  99.8% up    │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

**Card Styling:**
- Border: `border border-gray-200`
- Background: `bg-white`
- Padding: `p-6`
- Rounded: `rounded-lg`
- Shadow: `shadow-sm`
- Number: 32px, font-bold, `text-gray-900`
- Label: 14px, `text-gray-500`
- Change: 12px, green for positive, red for negative

### 3.2 Quick Actions Section
Horizontal row of action buttons:

```
┌─────────────────────────────────────────────────────────┐
│  Quick Actions                                          │
│                                                         │
│  [+ Create Promo]  [🔗 Generate Link]  [🔍 Health Check]│
└─────────────────────────────────────────────────────────┘
```

**Button Styling:**
- Primary action: `bg-[#0f1729]` with white text
- Secondary: `border border-gray-300` with dark text
- Height: `h-10`
- Padding: `px-4`
- Gap between: `gap-3`

### 3.3 Recent Activity Feed
Table of last 10 admin actions:

```
┌──────────────────────────────────────────────────────────────┐
│ Recent Activity                                              │
├──────────┬─────────────┬──────────────┬─────────────────────┤
│ Action   │ Admin       │ Target       │ Timestamp           │
├──────────┼─────────────┼──────────────┼─────────────────────┤
│ Created  │ admin@ex... │ SUMMER20     │ 2 minutes ago       │
│ Generated│ admin@ex... │ Bypass Link  │ 15 minutes ago      │
│ ...      │ ...         │ ...          │ ...                 │
└──────────┴─────────────┴──────────────┴─────────────────────┘
```

---

## 4. Health Monitoring Page

### 4.1 Status Cards
Three service status indicators:

```
┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐
│ OmniHuman API      │ │ Stripe             │ │ Database           │
│                    │ │                    │ │                    │
│ ● Online           │ │ ● Online           │ │ ● Online           │
│ 127ms latency      │ │ No issues          │ │ 12ms avg query     │
│ 99.8% uptime       │ │ 50 webhooks/day    │ │ 45/100 connections │
│                    │ │                    │ │                    │
│ [🔄 Recheck]       │ │ [🔄 Recheck]       │ │ [🔄 Recheck]       │
└────────────────────┘ └────────────────────┘ └────────────────────┘
```

**Status Indicators:**
- ● Online: `text-green-500`
- ● Warning: `text-yellow-500`
- ● Down: `text-red-500`

### 4.2 Health History Graph
Line chart showing uptime over last 24h (future enhancement)

### 4.3 Error Logs Table
Most recent API errors with expandable details

---

## 5. Promotions Page

### 5.1 Promo List Table

```
┌──────────────────────────────────────────────────────────────────────┐
│ Active Promotions                          [+ Create Promo Code]     │
├────────────┬──────────┬─────────┬──────────┬──────────┬─────────────┤
│ Code       │ Discount │ Uses    │ Expires  │ Status   │ Actions     │
├────────────┼──────────┼─────────┼──────────┼──────────┼─────────────┤
│ SUMMER20   │ 20%      │ 47/100  │ 30d left │ ✓ Active │ [📋] [🗑️]  │
│ WELCOME10  │ $10      │ 12/∞    │ No exp   │ ✓ Active │ [📋] [🗑️]  │
│ ...        │ ...      │ ...     │ ...      │ ...      │ ...         │
└────────────┴──────────┴─────────┴──────────┴──────────┴─────────────┘
```

### 5.2 Create Promo Modal

```
┌─────────────────────────────────────────────┐
│  Create Promotional Code                    │
│                                             │
│  Promo Code *                               │
│  [SUMMER20________________]                 │
│                                             │
│  Discount Type                              │
│  ( ) Percentage  (•) Fixed Amount           │
│                                             │
│  Discount Value *                           │
│  [20________________________]               │
│                                             │
│  Usage Limit                                │
│  [100_______________________] (0 = unlimited)│
│                                             │
│  Expiration Date                            │
│  [2025-12-31________________]               │
│                                             │
│  ☑ Auto-create Stripe coupon                │
│                                             │
│              [Cancel] [Create Promo]        │
└─────────────────────────────────────────────┘
```

---

## 6. Admin Bypass Page

### 6.1 Generate Bypass Link

```
┌─────────────────────────────────────────────┐
│ Generate Admin Bypass Link                  │
│                                             │
│ Link will grant full access without payment │
│                                             │
│ Expiration Time                             │
│ ( ) 1 hour                                  │
│ (•) 24 hours                                │
│ ( ) 7 days                                  │
│ ( ) Custom: [___________]                   │
│                                             │
│ Purpose (optional)                          │
│ [Customer support - user xyz_____________]  │
│                                             │
│              [Cancel] [Generate Link]       │
└─────────────────────────────────────────────┘
```

### 6.2 Active Bypass Links Table
Show active bypass tokens with revoke option

---

## 7. Audit Logs Page

### 7.1 Filters Bar
```
┌─────────────────────────────────────────────────────────────┐
│ Filters:                                                    │
│ Action Type: [All ▼] Admin: [All ▼] Date: [Last 7d ▼]     │
│                                         [Apply] [Reset]     │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Audit Log Table
```
┌──────────────────────────────────────────────────────────────────────┐
│ Admin Audit Logs                                    [📥 Export CSV]  │
├────────────────┬─────────────┬──────────────┬──────────────────────┤
│ Timestamp      │ Admin       │ Action       │ Details              │
├────────────────┼─────────────┼──────────────┼──────────────────────┤
│ 2025-10-04 3pm │ admin@ex... │ Created Promo│ Code: SUMMER20       │
│ 2025-10-04 2pm │ admin@ex... │ Generated    │ Expires: 2025-10-05  │
│ ...            │ ...         │ ...          │ ...                  │
└────────────────┴─────────────┴──────────────┴──────────────────────┘
```

---

## 8. User Management Page (Future)

### 8.1 User Search
Search bar with autocomplete for email/name lookup

### 8.2 User Detail View
- Profile information
- Subscription status
- Usage statistics
- Quick actions: Grant access, refund, suspend

---

## 9. Color Palette

**Primary Colors:**
- Navy Dark: `#0f1729` — Headers, primary buttons
- Navy Light: `#1a2236` — Hover states
- White: `#ffffff` — Backgrounds, text on dark

**Status Colors:**
- Success Green: `#10b981` — Online, active, positive
- Warning Yellow: `#f59e0b` — Warnings, pending
- Error Red: `#ef4444` — Errors, down, negative
- Info Blue: `#3b82f6` — Informational

**Neutral Grays:**
- Gray 50: `#f9fafb` — Subtle backgrounds
- Gray 100: `#f3f4f6` — Card borders
- Gray 500: `#6b7280` — Secondary text
- Gray 900: `#111827` — Primary text

---

## 10. Typography

**Font Family:** Inter (system default)

**Sizes:**
- Headings: 24px (bold)
- Subheadings: 18px (semibold)
- Body: 14px (regular)
- Captions: 12px (regular)
- Numbers (KPIs): 32px (bold)

---

## 11. Component Patterns

### Buttons
- Primary: Dark navy, white text, rounded-md
- Secondary: White with gray border, dark text
- Destructive: Red background, white text
- Icon-only: Square, transparent, icon centered

### Modals
- Overlay: Black with 50% opacity
- Container: White, rounded-lg, shadow-xl
- Max width: 500px
- Padding: 24px
- Close button: Top-right corner

### Tables
- Striped rows (alternating gray background)
- Hover: Slight background color change
- Borders: Subtle gray dividers
- Sticky header on scroll

### Form Inputs
- Border: Gray 300
- Focus: Blue ring
- Height: 40px
- Rounded: 6px
- Label: 14px, gray 700, above input

---

## 12. Responsive Behavior

**Desktop (1280px+):** Full layout as designed
**Tablet (768px - 1279px):** Sidebar collapses to icons only
**Mobile (<768px):** View-only mode, limited functionality

---

## 13. Accessibility

- ✅ ARIA labels on all interactive elements
- ✅ Keyboard navigation support (Tab, Enter, Escape)
- ✅ Focus indicators visible
- ✅ Color contrast ratio ≥4.5:1 for text
- ✅ Error messages announced to screen readers
- ✅ Semantic HTML (nav, main, article, section)

---

## 14. Loading & Error States

**Loading:**
- Skeleton screens for tables/cards
- Spinner for action buttons
- Progress bar for long operations

**Error:**
- Toast notifications for transient errors
- Inline error messages for form validation
- Error boundary for catastrophic failures

**Empty States:**
- Friendly illustration + message
- Call-to-action button (e.g., "Create your first promo")

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-04  
**Status:** Ready for Implementation
