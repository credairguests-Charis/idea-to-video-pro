# Admin Dashboard — Product Requirements Document (PRD)

## 1. Overview & Goals

### Purpose
Create a secure, comprehensive Admin Dashboard that allows authorized administrators to:
- Monitor system health (OmniHuman API, Stripe, backend services)
- Manage promotional codes and lifetime deals
- Generate admin bypass links for testing and support
- View audit logs and user analytics
- Manage pricing and subscriptions via Stripe
- Perform manual administrative actions

### Success Criteria
- ✅ Secure role-based access control (admin-only)
- ✅ Real-time API health monitoring
- ✅ Promo code creation and management
- ✅ Stripe integration for billing management
- ✅ Complete audit trail of admin actions
- ✅ Zero impact on existing user-facing features
- ✅ Clean, professional UI matching app design language

---

## 2. Target Users

**Primary:** System Administrators
**Secondary:** Support Staff (future), DevOps (future)

---

## 3. Core Features

### 3.1 Dashboard Overview
- **KPI Cards**: Total users, active projects, revenue (MTD), queue status
- **Quick Stats**: Videos generated today, API success rate, active subscriptions
- **Quick Actions**: Create promo, generate bypass link, run health check
- **Recent Activity**: Last 10 admin actions, recent errors

### 3.2 API Health Monitoring
- **OmniHuman API Status**: Real-time status, latency, uptime percentage
- **Stripe Status**: Connection health, recent webhooks, failed payments
- **Database Status**: Connection pool, query performance
- **Manual Health Checks**: Trigger diagnostics on-demand
- **Alert Indicators**: OK (green), WARN (yellow), DOWN (red)

### 3.3 Promotion Management
- **Create Promo Codes**: 
  - Discount percentage or fixed amount
  - Usage limits (total uses, per-user)
  - Expiration date
  - Stripe coupon auto-creation
- **Generate Promo Links**: One-click redemption URLs
- **Lifetime Deals**: Create permanent access offers
- **Promo Analytics**: Redemption count, revenue impact
- **Active/Expired Status**: Visual indicators

### 3.4 Admin Bypass System
- **Generate Bypass Links**: Time-limited tokens for full access
- **Use Cases**: Testing, customer support, demos
- **Revocation**: Manual invalidation of bypass tokens
- **Audit Trail**: Who created, when used, by whom

### 3.5 User Management
- **User Lookup**: Search by email, ID, or name
- **Manual Access Granting**: Give lifetime access directly
- **Subscription Status**: View Stripe subscription details
- **Usage Statistics**: Projects created, videos generated
- **Account Actions**: Suspend, restore, refund (future)

### 3.6 Audit Logs
- **All Admin Actions**: Timestamped with admin identity
- **Filters**: By action type, date range, admin user
- **Export**: CSV download for compliance
- **Retention**: 90 days minimum

### 3.7 Stripe Integration
- **Coupon Creation**: Auto-sync with promo codes
- **Subscription Overview**: Active, canceled, past due
- **Revenue Dashboard**: MRR, churn rate, LTV
- **Webhook Logs**: Recent events and failures
- **Manual Refunds**: Process refunds with reason tracking

---

## 4. Technical Requirements

### 4.1 Security
- ✅ Role-based access control (separate `user_roles` table)
- ✅ Server-side JWT verification
- ✅ RLS policies on all admin tables
- ✅ Security definer functions for role checks
- ✅ All secrets stored in Supabase vault
- ✅ Admin actions logged to audit table
- ✅ Rate limiting on admin endpoints

### 4.2 Backend
- ✅ Supabase Edge Functions for all admin operations
- ✅ PostgreSQL tables for promo codes, audit logs, health status
- ✅ Scheduled cron jobs for health checks (every 5 min)
- ✅ Stripe SDK integration for billing operations
- ✅ OmniHuman API integration for diagnostics

### 4.3 Frontend
- ✅ Protected `/admin` route with auth guard
- ✅ Responsive design (desktop-first)
- ✅ Real-time updates for health status
- ✅ Form validation for all inputs
- ✅ Loading states and error handling
- ✅ Consistent with main app design system

---

## 5. User Flows

### 5.1 Admin Login Flow
1. Admin navigates to `/admin`
2. System checks auth status and role
3. If not admin: 403 Forbidden
4. If admin: Load dashboard overview

### 5.2 Create Promo Code Flow
1. Admin clicks "Create Promo"
2. Modal opens with form fields
3. Admin enters code, discount, limits, expiration
4. System validates inputs
5. Edge function creates promo + Stripe coupon
6. Success confirmation + audit log entry
7. Promo appears in list

### 5.3 Health Check Flow
1. Admin clicks "Run Health Check" on Health tab
2. System calls OmniHuman diagnostic endpoint
3. Results displayed: status, latency, error details
4. Result stored in `api_health` table
5. Alert indicator updates (OK/WARN/DOWN)

### 5.4 Generate Bypass Link Flow
1. Admin clicks "Generate Bypass Link"
2. Modal asks for expiration time (1h, 24h, 7d)
3. System creates secure token
4. Displays copyable link
5. Logs action to audit table
6. Link can be sent to user for testing

---

## 6. Data Schema Overview

### 6.1 New Tables
- `user_roles` — Role assignments (admin, moderator, user)
- `admin_profiles` — Extended admin metadata
- `promo_codes` — Promotional codes and settings
- `promo_links` — One-click promo redemption URLs
- `admin_audit_logs` — Complete action audit trail
- `api_health` — Health check results history

### 6.2 Existing Tables (Read-Only)
- `profiles` — User data
- `projects` — User projects
- `generations` — Video generations
- `omnihuman_generations` — OmniHuman tasks

---

## 7. Non-Functional Requirements

### 7.1 Performance
- Dashboard loads in <2s
- Health checks complete in <5s
- Real-time updates via polling (10s interval)

### 7.2 Reliability
- 99.9% uptime for admin functions
- Graceful degradation if Stripe/OmniHuman unavailable
- Retry logic for failed API calls

### 7.3 Security
- Zero trust: verify admin role on every request
- SQL injection prevention via parameterized queries
- XSS prevention via input sanitization
- CSRF tokens for state-changing operations

### 7.4 Usability
- Intuitive navigation
- Clear error messages
- Keyboard shortcuts for common actions
- Mobile-responsive (view-only)

---

## 8. Future Enhancements (Out of Scope)

- Multi-admin role hierarchy (super admin, moderator)
- Email notifications for critical alerts
- Advanced analytics dashboard (charts, graphs)
- Bulk user operations
- Scheduled promo campaigns
- A/B testing for pricing
- Custom webhook management

---

## 9. Launch Checklist

- [ ] All tables created with RLS policies
- [ ] Edge functions deployed and tested
- [ ] Admin role assigned to primary user
- [ ] Health checks running via cron
- [ ] Stripe integration tested (sandbox mode)
- [ ] Audit logging verified
- [ ] UI matches design system
- [ ] User-facing features unaffected
- [ ] Documentation complete
- [ ] Security review passed

---

## 10. Rollback Plan

If issues arise:
1. Disable admin routes via feature flag
2. Edge functions can be individually disabled
3. New tables can be dropped without affecting users
4. No migration required for existing data

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-04  
**Status:** Ready for Implementation
