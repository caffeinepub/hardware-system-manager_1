# Hardware System Manager

## Current State
The app has a Motoko backend with full CRUD for Sections, Computers, StandbySystems, Complaints, and AMCParts. All write operations require `AccessControl.hasPermission(#admin)` and all read operations require `hasPermission(#user)`. Since this app uses passkey login (not ICP Internet Identity), callers are always anonymous and all permission checks fail, making it impossible to add, edit, or delete any data. The frontend already has passkey-based admin/user login UI that handles access control.

## Requested Changes (Diff)

### Add
- Nothing new

### Modify
- Remove all `AccessControl` / `MixinAuthorization` usage from the backend
- Remove all `Runtime.trap("Unauthorized...")` guards from every function
- All CRUD endpoints (createSection, updateSection, deleteSection, createComputer, updateComputer, deleteComputer, createStandbySystem, updateStandbySystem, deleteStandbySystem, createComplaint, updateComplaint, deleteComplaint, createAMCPart, updateAMCPart, deleteAMCPart) should be open (no auth checks)
- All query endpoints (getAllSections, getAllComputers, etc.) should be open
- `isCallerAdmin()` should always return `true`
- `_initializeAccessControlWithSecret` stub should remain as a no-op so the frontend binding doesn't break

### Remove
- `import MixinAuthorization`
- `import AccessControl`
- All `AccessControl.hasPermission` / `AccessControl.isAdmin` checks
- `accessControlState` initialization

## Implementation Plan
1. Regenerate backend Motoko code without authorization guards
2. Keep all existing data types (Section, Computer, StandbySystem, Complaint, AMCPart, UserProfile) unchanged
3. Keep blob-storage Mixin and Storage imports
4. Keep `_initializeAccessControlWithSecret` as a no-op public shared func
5. Keep `isCallerAdmin` returning `true`
6. Validate and deploy
