# Hardware System Manager

## Current State
- User Login page uses email + passkey ("Mainuser123") as a frontend-only password check. The backend still sees an anonymous caller.
- Admin Login page uses passkey "Kpsckkdadmin" -- same frontend-only approach.
- `useInternetIdentity` hook and `InternetIdentityProvider` are present in the codebase but not wired into any login UI.
- `useActor` creates an authenticated actor when an ICP identity is present.
- `AdminContext` tracks `role`, `userEmail`, `isAuthorized`, `isAdmin`.

## Requested Changes (Diff)

### Add
- "Login with Internet Identity" button on the User Login page (below existing email+passkey form, separated by "or").
- When ICP Internet Identity login succeeds, treat the user as an "Authorized User" (non-anonymous, full edit access) -- same as the email+passkey path.
- `InternetIdentityProvider` wrapper in App.tsx so the `useInternetIdentity` hook is available app-wide.
- On successful II login, call `login("user", ...)` in AdminContext so the sidebar shows "Authorized User" badge.
- On logout, also call `clear()` from `useInternetIdentity` to clear the ICP session.

### Modify
- `App.tsx`: Wrap root with `InternetIdentityProvider`.
- `UserLogin.tsx`: Add ICP Internet Identity login button using `useInternetIdentity`. On success callback, call `login("user", "ii-identity", email_or_principal)` and navigate to dashboard.
- `AdminContext.tsx` / `Layout.tsx`: On logout, also clear the ICP identity (call `clear()`).
- Keep existing email+passkey login intact -- ICP II is an additional option.

### Remove
- Nothing removed.

## Implementation Plan
1. Wrap `App.tsx` root with `InternetIdentityProvider` (import from `./hooks/useInternetIdentity`).
2. In `UserLogin.tsx`, import and use `useInternetIdentity`. Add an "or" divider and "Login with Internet Identity" button. On II login success (watch `isLoginSuccess`), call `login("user", "ii-identity", principalString)` and navigate to "/".
3. In `Layout.tsx`, import `useInternetIdentity`, call `clear()` alongside `logout()` when the logout button is clicked.
4. Validate and build.
