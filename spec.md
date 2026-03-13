# Hardware System Manager

## Current State
The app has an `AdminContext` with `isLoggedIn` (true when role is 'admin' or 'user'). All routes render freely regardless of auth state -- unauthenticated visitors can see Dashboard, Computers, Standby, Complaints, Other Devices, and Stock Data pages.

Public routes: `/admin` (AdminLogin), `/login` (UserLogin).

## Requested Changes (Diff)

### Add
- `ProtectedRoute` wrapper component that reads `isLoggedIn` from `AdminContext`. If false, immediately redirects to `/login`.

### Modify
- `App.tsx`: wrap all data pages (index `/`, `/computers`, `/standby`, `/complaints`, `/stock`, `/other-devices`) with `ProtectedRoute`. Leave `/admin` and `/login` unprotected.

### Remove
- Nothing removed.

## Implementation Plan
1. Create `src/frontend/src/components/ProtectedRoute.tsx` -- reads `isLoggedIn`, if false renders `<Navigate to="/login" />`, otherwise renders `<Outlet />`.
2. In `App.tsx`, add a protected layout route as a parent of all data routes using `ProtectedRoute` as its component.
3. `/admin` and `/login` remain as direct children of rootRoute (unprotected).
