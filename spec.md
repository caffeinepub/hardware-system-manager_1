# Hardware System Manager

## Current State
The app has 7 pages: Dashboard, Sections, Computers, Standby Systems, Complaints, AMC Parts, Maintenance Charts. There are two login options (Admin: Kpsckkdadmin, User: Mainuser123) with full CRUD access. Computers track: section, seat, current user, serial number, model, brand, purchase/AMC dates, status, datasheet blob, notes.

The backend has no support for monitor serial/model, IP addresses, bulk import, or stock/default system pairings.

## Requested Changes (Diff)

### Add
- **CSV Upload page** ("Data Import" in sidebar): accepts a CSV file with columns: Section Name, Seat, Current User's Name, CPU Serial Number, CPU Model, Monitor Serial Number, Monitor Model, IP 1, IP 2, Remarks
  - Parse CSV client-side, preview rows before import
  - On confirm, auto-create sections if they don't exist, then create/update computer records with all fields
  - Show import progress and a results summary (rows imported, skipped, errors)
  - Provide a downloadable CSV template
- **Stock / Default Systems page** ("Stock Data" in sidebar): shows the actual paired CPU+Monitor inventory per seat
  - Displays each seat as a card: Section, Seat, CPU serial + model, Monitor serial + model, IPs, current user, remarks
  - Filter by section
  - Read-only view, data populated from the imported/existing computers

### Modify
- **Computer data model** -- extend to store: monitorSerial, monitorModel, ip1, ip2, remarks fields
- **Computers page** -- add the 5 new fields to the add/edit form and display columns
- **Sections page** -- seats shown in section cards should also reflect monitor pairing (CPU + Monitor as a pair label)
- **Dashboard** -- stat cards and charts already auto-populate from computers; no structural change needed

### Remove
- Nothing removed

## Implementation Plan
1. Update backend `main.mo`: add `monitorSerial`, `monitorModel`, `ip1`, `ip2`, `remarks` fields to `Computer` type
2. Regenerate `backend.d.ts` to expose new Computer fields
3. Create `src/frontend/src/pages/DataImport.tsx`: CSV upload UI with template download, preview table, bulk import logic using existing createSection/createComputer mutations
4. Create `src/frontend/src/pages/StockData.tsx`: read-only view of computer records displayed as CPU+Monitor pairs, filterable by section
5. Update `Computers.tsx`: add 5 new fields to add/edit form and table columns
6. Update `Sections.tsx`: SeatCard shows CPU+Monitor label
7. Update `App.tsx`: add routes `/import` and `/stock`
8. Update `Layout.tsx`: add sidebar links for "Data Import" and "Stock Data"
