# Hardware System Manager

## Current State
Backend has Computer CRUD and StandbySystem CRUD as independent operations. Updating a computer's serial number does not automatically sync with Standby Systems.

## Requested Changes (Diff)

### Add
- Automatic standby detection logic inside `updateComputer`: when CPU or Monitor serial number changes, auto-move the old (unassigned) serial to Standby, and auto-remove the new serial from Standby if it was there.

### Modify
- `updateComputer` in `main.mo`: after detecting a serial change, check if the old serial is still assigned to any other computer; if not, add it to standbySystems as available. Also remove the new serial from standbySystems if present.

### Remove
- Nothing removed.

## Implementation Plan
1. Edit `src/backend/main.mo`: modify `updateComputer` to include CPU and Monitor serial change detection with standby sync.
2. No frontend changes needed for this step -- existing save flows will trigger the logic automatically.
