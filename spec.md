# Hardware System Manager

## Current State
Other Devices page (OtherDevices.tsx) directly calls backend actor methods using `actor as any` without React Query hooks. All other pages (Computers, Standby, Complaints, Stock) use structured hooks in useQueries.ts. This mismatch causes:
- Data not appearing after import (no proper cache invalidation)
- Import failures due to no retry/error recovery
- No type safety on backend calls
No OtherDevice hooks exist in useQueries.ts.

## Requested Changes (Diff)

### Add
- `useGetAllOtherDevices`, `useCreateOtherDevice`, `useUpdateOtherDevice`, `useDeleteOtherDevice` hooks in useQueries.ts (same pattern as Standby/Computers hooks)

### Modify
- OtherDevices.tsx: replace direct `actor as any` calls with the new React Query hooks
- Import logic: use the query cache (invalidate after each createOtherDevice/updateOtherDevice) so data refreshes automatically
- Export logic: use the `data` from the React Query hook (already filtered to OtherDevices only)

### Remove
- Direct `useActor` calls and manual `loadDevices` state management in OtherDevices.tsx
- Manual `loading` / `backendError` state that bypassed React Query

## Implementation Plan
1. Add OtherDevice type import to useQueries.ts
2. Add four hooks: useGetAllOtherDevices, useCreateOtherDevice, useUpdateOtherDevice, useDeleteOtherDevice
3. Refactor OtherDevices.tsx to use these hooks (useGetAllOtherDevices for data, mutations for saves/deletes)
4. Fix import function to call mutations and invalidate query after each row
5. Validate and deploy
