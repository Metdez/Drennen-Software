# components/semester/ — Semester Management UI

## Purpose

Semester context provider, nav-level picker, and modals for creating, editing, archiving, and bulk-assigning sessions to semesters.

## Component Catalog

| Component | Purpose | Used by pages | API routes called |
|-----------|---------|---------------|-------------------|
| `SemesterContext.tsx` | React Context + Provider for semester list, active semester, and `setSemester()` | `app/(app)/layout.tsx` (wraps all app routes) | `GET /api/semesters` |
| `SemesterSelector.tsx` | Dropdown semester picker in `NavHeader`; syncs selection to `?semester=` query param | `components/layout/NavHeader.tsx` | None (uses `SemesterContext`) |
| `SemesterManageModal.tsx` | Create / edit / archive semester form modal | `app/(app)/semesters/page.tsx`, `SemesterOnboardingBanner.tsx` | `POST /api/semesters`, `PATCH /api/semesters/[id]` |
| `SemesterOnboardingBanner.tsx` | First-use banner prompting professors to create their first semester | `app/(app)/dashboard/page.tsx`, `app/(app)/history/page.tsx` | None (delegates to `SemesterManageModal` + `AssignSessionsModal`) |
| `AssignSessionsModal.tsx` | Bulk-assign unassigned sessions to a chosen semester | `app/(app)/semesters/page.tsx`, `SemesterOnboardingBanner.tsx` | `GET /api/sessions`, `POST /api/semesters/assign` |

## Key Patterns

- `SemesterContext` derives `activeSemesterId` from the `?semester=` URL param first, then falls back to the active semester in the list.
- `setSemester()` uses `router.replace()` to update the URL query param so the selection is bookmarkable and survives page refresh.
- `SemesterOnboardingBanner` uses a `localStorage` key (`semester_onboarding_dismissed`) to suppress itself after dismissal.
- Creating a new semester automatically archives the current active one (the API handles this; the modal warns the professor).
- `AssignSessionsModal` filters the session list client-side to unassigned sessions (`semesterId == null`).

## Brand Colors

Import `BRAND` from `@/lib/constants`. Never hardcode hex values.
