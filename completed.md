# Multi-Tenant HRMS SaaS Platform Implementation Details

We have completed the full implementation of the Multi-Tenant HRMS SaaS platform. Below is a detailed summary of the architecture, stack, features, and completed files.

## 🚀 Technology Stack
*   **Backend:** Node.js, Express.js, Mongoose (MongoDB Atlas / Cloud Storage).
*   **Frontend:** React.js (plain JS, JSX), Vite, React Router, Axios, Tailwind CSS.
*   **Security:** JWT authentication, bcrypt, CORS, helmet, express-rate-limit.
*   **Storage:** Multi-tenant Cloudflare R2 / S3-compatible file storage with an automatic local filesystem storage fallback (`/uploads`) for zero-dependency local execution.
*   **Notifications:** Multi-channel support (SMTP for emails, Twilio for SMS, Firebase FCM for push notifications).

---

## 🏗️ Core Architecture & Features

### 1. Strict Multi-Tenancy Isolation
*   Enforced by including indexed `tenantId` in all models.
*   Scoped queries automatically in controllers using `req.tenantId` obtained from the authenticated user. No tenant can view another tenant's data.

### 2. Role-Based Access Control (RBAC)
*   Standard roles: `super_admin`, `hr_admin`, `manager`, `employee`, `leadership`.
*   Route protection via authorization and permission guards.

### 3. Immutable Audit Logs
*   Critical operations write to the `AuditLog` collection.
*   Mutation and deletion blocked directly at the database model layer.

---

## ⚙️ Approval & Notification Engines

### 🔄 Reusable Approval Engine
*   **Single-Level & Multi-Level Approvals:** Dynamically switches workflow length based on request type and scope.
*   **Conditional Routing:** Routing changes based on request parameters (e.g. Leave Requests > 5 days automatically append an HR Admin step after Manager approval).
*   **SLA Escalation:** Monitors approval deadlines; automatically escalates to HR Admin or flags as overdue on breach.
*   **Delegation:** Allows an active approver to delegate their decision responsibility to any active teammate.
*   **Action Logging:** Log actions (submission, approval, rejection, delegation, escalation) securely inside the audit trail.

### 🔔 Granular Notification Engine
*   **Channels:** Full support for In-app feeds, Email (Nodemailer SMTP), SMS (Twilio API), and mobile Push notifications (Firebase FCM).
*   **Supported Events:**
    *   Leave Applied
    *   Leave Approved
    *   Leave Rejected
    *   Missed Punch
    *   Attendance Regularization
    *   Approval Reminders
*   **Critical Alerts:** Critical events (e.g., missed punches and approval reminders) bypass user toggles and cannot be disabled.

---

## 💻 Self-Service Capabilities

### 🙋‍♂️ Employee Self-Service (ESS)
*   **View Profile:** Complete view of personal details, department, designation, and reporting manager.
*   **Update Profile:** Edit non-sensitive details directly. Sensitive details (PAN, Aadhaar, Bank Details) trigger a workflow requiring manager approval.
*   **Apply Leave:** Real-time leave requests with balance validation, overlap checks, and manager routing.
*   **View Attendance:** Punch logs, worked hours, overtime, late marks, and a regularization request form.
*   **Download Documents & Payslips:** Download personal files (contracts, salary slips) directly from the storage system.
*   **Holiday Calendar:** View national and regional holiday schedules.

### 👨‍💼 Manager Self-Service (MSS)
*   **Approve Requests:** Unified dashboard to review and action pending leaves, attendance regularizations, profile updates, and transfers.
*   **View Team Attendance:** Real-time log of team member status (present, late, absent, on-leave) for any selected date.
*   **View Team Leave:** Monitor upcoming and past team leave requests.
*   **View Team Reports:** Scoped analytics showing headcount, attendance metrics, and attrition reports for the manager's team.
*   **Initiate Transfers:** Request employee department, location, manager, or designation alignment with approval routing.

---

## 📁 File Structure

### Backend (`hrms-backend/`)
*   `server.js` — Core Server initialization, middleware pipeline, static uploads exposure.
*   `seed.js` — Database seeder file for demo company registration and users.
*   `.env` — Environment configuration for database, storage, SMTP, and Twilio.
*   `src/config/`
    *   `database.js` — MongoDB connection config.
    *   `logger.js` — Winston structured logger setup.
*   `src/models/` — 15 Mongoose models including `User`, `Tenant`, `Employee`, `AuditLog`, `NotificationPreference`, etc.
*   `src/middleware/` — Security, JWT verification, and audit interceptors.
*   `src/controllers/` — Controllers for Auth, Employees, Attendance, Leaves, Organization, and Reports.
*   `src/routes/` — Scoped endpoints and routes mappings.
*   `src/services/`
    *   `approvalEngine.js` — Multi-stage reusable approval routing, delegation, and escalation logic.
    *   `notification.service.js` — Multi-channel messaging dispatcher with preferences mapping.
    *   `storage.service.js` — Cloudflare R2 / S3 file upload & signed URLs with local uploads fallback.

### Frontend (`hrms-frontend/`)
*   `vite.config.js` — Vite setup, port `5173`, and proxy configurations.
*   `tailwind.config.js` / `postcss.config.js` — Tailwind CSS configurations.
*   `src/index.css` — Tailwind CSS directives.
*   `src/main.jsx` — React.js mount file.
*   `src/App.jsx` — Router paths, routing logic, and guard configurations.
*   `src/api/axios.js` — Scoped API interceptors attaching tokens to headers.
*   `src/context/AuthContext.jsx` — Corporate workspace session handlers.
*   `src/components/`
    *   `Layout.jsx` — Dynamic container with mobile menu trigger.
    *   `Sidebar.jsx` — Responsive navigation with role-based link filtering.
*   `src/pages/`
    *   `Login.jsx` — Corporate workspace sign-in.
    *   `Dashboard.jsx` — Metrics with pure CSS fast-loading status indicators.
    *   `Employees.jsx` — Search directory with transfer initiation modal.
    *   `Attendance.jsx` — Actionable punch card, history logs, regularization form, and team view tab.
    *   `Leave.jsx` — Requests list, balance cards, holiday calendar, and team requests tab.
    *   `Organization.jsx` — Settings for Departments, Designations, Locations.
    *   `Reports.jsx` — Scoped analytical charts and stats.
    *   `Approvals.jsx` — Unified decision console with delegation and escalation.

---

## 🎨 UI/UX Changelog (June 2026)

### 🚀 Landing Page — App Entry Point
*   Platform now **launches with `Landing.jsx`** at route `/` — visitors arrive at the marketing page, not the login form.
*   `App.jsx` routing: `/` → `Landing`, `/login` → `Login` (guarded with `PublicRoute`).
*   **Landing page includes:**
    *   Sticky navbar with logo, feature links, **Log In** and **Get Started** CTA buttons.
    *   Hero section with headline, sub-copy, and dual CTAs (Start Free Trial / Explore Features).
    *   Stats bar (99.9% uptime, 10x faster HR, 100% data isolation).
    *   6-feature grid (Employee Mgmt, Attendance, Leaves, Multi-Tenant, Reports, Approvals).
    *   Feature showcase — side-by-side sections for Attendance and Leave Management.
    *   "How It Works" — 4-step setup flow.
    *   "Why HRSphere" — problem/solution comparison cards.
    *   Gradient CTA banner and minimal footer.
    *   Scroll-triggered `FadeIn` animations using `IntersectionObserver`.

### 🔐 Login Page — Clean White Theme
*   Removed dark/neon (`slate-950`) split-screen layout.
*   New design: **centered glassmorphic card** on a soft white/indigo gradient background.
*   Subtle **pastel blob animations** (violet/indigo/rose, low opacity) replace neon glows.
*   All form elements use light-mode styling (`bg-white/70`, `border-slate-200`, `focus:border-violet-400`).
*   Role selector tab pill, SSO buttons, and footer links all match the clean white theme.

### 🔔 Toast Notification System
*   Added a **`Toast` component** (top-right fixed stack, max-width `sm`, `pointer-events-none` wrapper).
*   Three toast types: `success` (emerald), `error` (rose), `info` (blue) — each with a matching icon.
*   Toasts **auto-dismiss after 4.5 seconds** with a manual ✕ close button.
*   `showToast(message, type)` helper wired into **every auth action**:
    *   ✅ Successful login → "Welcome back! Redirecting..."
    *   ❌ Invalid credentials → server error message
    *   ❌ Wrong role tab → "Access Denied: ..."
    *   💡 MFA required → "MFA required — enter your authenticator code"
    *   ✅ MFA verified → "MFA verified! Welcome back."
    *   ✅/❌ Google / Azure / SAML SSO
    *   ✅ Company registration, employee signup request
    *   ✅ Forgot password link dispatched / OTP sent
    *   ✅ Password reset (OTP or email token)
    *   ❌ Password mismatch on any reset form

### 🧱 Leadership Role Support
*   `seed.js` updated to include a `leadership` demo user (`vijay@democorp.com`).
*   Login role tabs include `leadership` with auto-prefilled demo credentials.
*   `auth.middleware.js` already maps the `leadership` role to baseline permissions.

