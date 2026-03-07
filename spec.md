# Hardware System Manager

## Current State
The app has a full backend (main.mo) with Section, Computer, StandbySystem, and Complaint CRUD operations. However, all write operations have AccessControl.hasPermission guards that silently reject anonymous callers (passkey users). The frontend uses passkey login which sends all backend calls as anonymous ICP principals. As a result, all creates, updates, and deletes succeed on the frontend but are silently discarded by the backend.

## Requested Changes (Diff)

### Add
- Nothing new to add

### Modify
- Backend main.mo: Remove all AccessControl.hasPermission and AccessControl.isAdmin guards from all write operations (createSection, updateSection, deleteSection, createComputer, updateComputer, deleteComputer, createStandbySystem, updateStandbySystem, deleteStandbySystem, createComplaint, updateComplaint, deleteComplaint). All write operations must accept calls from any caller including anonymous.
- Keep MixinAuthorization included (required by framework) but do not use its permission checks in data operations.

### Remove
- All `if (not (AccessControl.hasPermission(...))) { return; }` guards from write operations

## Implementation Plan
1. Regenerate backend via generate_motoko_code with all write operations open to any caller (no permission checks)
2. Validate frontend builds successfully
3. Deploy
