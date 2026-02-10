

# Two-Part Fix: Sidebar Overflow + Admin Credit Usage Charts

## Part 1: Fix Project Title Sidebar Overflow (Root Cause)

The root cause (confirmed by CSS-Tricks and the CSS spec) is that flex children have a default `min-width: auto`, which prevents them from shrinking below their content size. Even though `truncate` and `overflow-hidden` are on inner elements, the outermost sidebar container lacks a hard constraint preventing horizontal growth.

### Changes to `src/components/ProjectSidebar.tsx`

1. **Add `overflow-hidden` to the root sidebar div** (line 178) -- this creates the hard boundary that prevents any child from pushing the sidebar wider than `w-64`:
   - Change: `"flex flex-col h-full bg-sidebar border-r ..."` to include `overflow-hidden`

2. **Add `w-full` to the wrapper divs** for standalone projects (line 327) and folder projects (line 284) -- ensures the `group flex` row is constrained to parent width:
   - The `group flex items-center min-w-0 overflow-hidden` row containers need `w-full` added

3. **Add `max-w-full` to Button elements** for project titles -- belt-and-suspenders to prevent the button's intrinsic width from exceeding the container

This is a 3-line CSS-only fix with no layout or feature changes.

---

## Part 2: Per-User and All-Users Credit Usage Charts

### Overview

Enhance the existing Admin Credits page (`src/pages/admin/AdminCredits.tsx`) with:
- A **user selector** dropdown to filter charts by individual user
- An **"All Users"** default view showing aggregate consumption
- The existing daily/weekly toggle remains and applies to both views

### Changes to `src/pages/admin/AdminCredits.tsx`

1. **Add a user selector** (combobox/select) next to the daily/weekly toggle in the Credit Usage Trends card header:
   - Default option: "All Users"
   - Populated from the unique user emails already fetched from the profiles table
   - Selecting a user filters the chart data to that user's transactions only

2. **Modify `fetchData` logic**:
   - Store the raw transaction data in state (already done as `transactions`)
   - Add a `selectedUserId` state variable (default: `null` meaning all users)
   - Create a `useMemo`-derived `filteredChartData` that recalculates daily/weekly aggregations based on `selectedUserId`
   - When a user is selected, the bar chart and area chart only show that user's issued vs. used credits

3. **Add a per-user summary row** below the user selector showing:
   - Total issued to this user
   - Total used by this user
   - Current balance (from profiles)

4. **Update KPI cards** to reflect the selected filter:
   - When a specific user is selected, the "Credits Issued" and "Credits Used" cards update to show that user's totals
   - "All Users" shows the aggregate (current behavior)

### No database changes needed
The existing `transaction_logs` table has `user_id` and `credits_change` fields, which is all that's needed.

### No new dependencies
Uses existing `recharts`, `date-fns`, and Radix Select components already in the project.

