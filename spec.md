# Hardware System Manager

## Current State
- Data Import is a standalone sidebar page (/import route, navItems entry)
- Standby Systems page has add functionality but no edit or delete buttons per row
- Layout.tsx navItems includes { path: '/import', label: 'Data Import', icon: Upload }

## Requested Changes (Diff)

### Add
- Computer Asset Data Import / Export section at the bottom of the Computers page
- Edit button per row in Standby Systems table
- Delete button per row in Standby Systems table (with confirmation)

### Modify
- Layout.tsx: remove Data Import from navItems
- App.tsx: remove importRoute
- Computers.tsx: append import/export section at the bottom
- StandbySystems.tsx: add Edit and Delete per row

### Remove
- Data Import sidebar nav link

## Implementation Plan
1. Update Layout.tsx: remove Data Import from navItems
2. Update App.tsx: remove importRoute and DataImport import
3. Update Computers.tsx: add Computer Asset Data Import / Export section at bottom
4. Update StandbySystems.tsx: add edit/delete per row with dialog and confirmation
