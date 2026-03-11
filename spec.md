# Hardware System Manager

## Current State
OtherDevices import consistently fails. Backend IDL has a mismatch: `idlService` export in `backend.did.js` is missing all OtherDevice CRUD methods (they only exist inside `idlFactory`). Additionally, `getDashboardStats` in both `idlService` and `idlFactory` is missing `pendingComplaints`, `clearedComplaints`, and `inProgressComplaints` fields, so the Candid decoder drops them. The `useActor` hook has no retry logic, so a single failed actor creation leaves the actor permanently null -- causing all pages to show empty data.

## Requested Changes (Diff)

### Add
- Retry logic (3 attempts, 1s delay) to `useActor` hook
- OtherDevice record type definition at the top level of `backend.did.js` `idlService`
- OtherDevice CRUD methods (`createOtherDevice`, `getAllOtherDevices`, `updateOtherDevice`, `deleteOtherDevice`) to top-level `idlService` in `backend.did.js`
- `pendingComplaints`, `clearedComplaints`, `inProgressComplaints` fields to `getDashboardStats` return type in both `idlService` and `idlFactory` in `backend.did.js`
- Same new fields to `getDashboardStats` in `_SERVICE` interface in `backend.did.d.ts`
- Retry button on OtherDevices page when loading fails

### Modify
- `backend.did.js`: sync `idlService` to include OtherDevice and updated getDashboardStats
- `backend.did.d.ts`: update `_SERVICE.getDashboardStats` return type
- `useActor.ts`: add `retry: 3, retryDelay: 1000`
- `OtherDevices.tsx`: add retry button on load failure; better error messages on import

### Remove
- Nothing

## Implementation Plan
1. Update `src/frontend/src/declarations/backend.did.js` -- add OtherDevice to `idlService`, add OtherDevice CRUD to `idlService`, update getDashboardStats fields in both `idlService` and `idlFactory`
2. Update `src/frontend/src/declarations/backend.did.d.ts` -- update `_SERVICE.getDashboardStats` to include new fields
3. Update `src/frontend/src/hooks/useActor.ts` -- add retry logic
4. Update `src/frontend/src/pages/OtherDevices.tsx` -- add retry button, improve error display
