# Hardware System Manager

## Current State
The app has Computers, Standby Systems, Other Devices, Complaint Log, and Stock Data pages. The backend tracks all hardware but does not log movement events. The frontend has no Hardware Movement History page.

## Requested Changes (Diff)

### Add
- `MovementLog` type in backend with fields: id, dateTime, deviceType (CPU/Monitor), serialNumber, action (assigned/removed/movedToStandby/assignedFromStandby/replaced/sectionTransfer), previousSection, newSection, triggeredFrom, user, remarks
- `movementLogsStable` stable var + map in backend
- `createMovementLog` and `getAllMovementLogs` backend methods
- Auto-logging inside `updateComputer`: when CPU serial changes, log Removed+Moved to Standby for old serial and Assigned to Seat for new; same for monitor serial
- `MovementHistory.tsx` frontend page: read-only log table, color-coded action badges, filters (device type, serial, section, action, date range), global search, CSV export
- Route `/movement` in App.tsx
- Nav item "Movement History" in Layout.tsx

### Modify
- `updateComputer` Motoko method: emit movement logs alongside existing standby auto-detection logic
- `preupgrade`/`postupgrade` hooks: include movementLogsStable
- Layout.tsx navItems: add Movement History entry
- App.tsx: add movementRoute and register in router

### Remove
- Nothing removed

## Implementation Plan
1. Update backend main.mo: add MovementLog type, stable storage, CRUD methods, auto-log in updateComputer
2. Create frontend MovementHistory.tsx page with table, filters, search, CSV export
3. Update App.tsx to register /movement route
4. Update Layout.tsx to add nav item
