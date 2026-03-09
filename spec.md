# Hardware System Manager

## Current State
- Dashboard shows `totalComputers` from backend stat (raw count of Computer records)
- StandbySystem type has: id, serialNumber, model, brand, condition, status, assignedSectionId, notes, createdAt
- Standby Systems page shows: Serial No, Model/Brand, Condition, Status, Assigned Section, Notes
- Auto-added standby entries from stock import don't carry unit type info
- Dashboard "Total Computers" label is ambiguous -- user expects it to reflect CPU+Monitor pairs

## Requested Changes (Diff)

### Add
- `unitType` field to StandbySystem (values: "CPU", "Monitor", "Other") shown as a column in the Standby Systems table and as a select field in the Add/Edit dialog
- Unit Type column in Standby Systems table between Serial No and Model/Brand

### Modify
- Dashboard "Total Computers" stat card: rename to "Total Systems (Pairs)" and show the count of Computer records (each record = 1 CPU+Monitor pair), making it clear each entry represents a paired system
- StandbySystem add/edit form: add Unit Type select (CPU / Monitor / Other), defaulting to "CPU"
- processStockEntries in backend: when auto-creating standby from unmatched stock CPU, set unitType = "CPU"
- Standby Systems page table: show Unit Type as a badge column

### Remove
- Nothing removed

## Implementation Plan
1. Regenerate backend with updated StandbySystem type including `unitType: Text` field
2. Update StandbySystems.tsx:
   - Add unitType to form state (default "CPU")
   - Add Unit Type select in dialog (CPU / Monitor / Other)
   - Add Unit Type column in table with badge styling
3. Update Dashboard.tsx:
   - Change "Total Computers" stat card title to "Total Systems (Pairs)"
   - Keep same value (each Computer record = 1 CPU+Monitor pair)
