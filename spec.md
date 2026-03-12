# Hardware System Manager

## Current State
Standby Systems page shows: Serial No, Unit Type, Model, Condition, Status, Assigned Section, Notes, Actions. No search or sort controls.

## Requested Changes (Diff)

### Add
- Search bar to filter by serial number, model, or section
- Sort by Serial Number (toggle asc/desc)
- Sl No column (row index)
- Date Moved to Standby column (from createdAt)
- Rename columns to: Sl No, Device Type, Serial Number, Make/Model, Previous Section, Date Moved to Standby, Remarks
- Status indicator badge still shown

### Modify
- Column headers renamed as above
- "Assigned Section" → "Previous Section" (same field `assignedSectionId`)
- "Notes" → "Remarks"
- Table order: Sl No, Device Type, Serial Number, Make/Model, Previous Section, Date Moved to Standby, Remarks, Actions

### Remove
- Condition column (merge into tooltip or remove)
- Status column removed (keep as color badge on Device Type or small indicator)

## Implementation Plan
1. Add search state and filter logic
2. Add sort-by-serial-number toggle
3. Update table columns per new layout
4. Show `createdAt` as "Date Moved to Standby"
5. Show `assignedSectionId` as "Previous Section"
