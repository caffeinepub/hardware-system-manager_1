# Hardware System Manager

## Current State

Full-stack hardware asset management app with:
- Backend (Motoko): CRUD for Sections, Computers, StandbySystems, Complaints, AMCParts, and Dashboard stats. All write operations currently require `#admin` ICP permission via AccessControl.
- Frontend: Passkey-based login (no ICP identity). Users log in with "Mainuser123" or "Kpsckkdadmin" -- these are stored in localStorage/sessionStorage. The backend is called as an anonymous ICP caller since there is no ICP identity connected.
- Result: All save/create/update/delete calls fail with "Unauthorized" because the backend checks ICP identity which is always anonymous.

## Requested Changes (Diff)

### Add
- Nothing new

### Modify
- Backend: Remove all ICP permission checks from write operations (create, update, delete) for Sections, Computers, StandbySystems, Complaints, AMCParts, and UserProfile. Authentication is handled entirely by the frontend passkey system -- the backend should be open to all callers.
- Keep read-only query functions unchanged (they are already open).
- Keep the authorization/blob-storage components imported (used by MixinStorage and MixinAuthorization for other infrastructure needs).

### Remove
- All `AccessControl.hasPermission` and `AccessControl.isAdmin` guards from write functions

## Implementation Plan

1. Regenerate backend Motoko code with all CRUD write operations having no authorization guards.
2. Keep all existing data types, state maps, query functions, and dashboard stats unchanged.
3. Keep blob-storage and authorization imports for infrastructure (MixinStorage, MixinAuthorization).
4. Frontend requires no changes -- it already calls the right functions.
