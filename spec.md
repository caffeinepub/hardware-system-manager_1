# Hardware System Manager

## Current State
- Sections page exists as a standalone page with add/edit/delete functionality and seat cards.
- Computers page groups devices by section in card-style tables. Section heading shows section name and device count only.
- Sidebar nav includes "Sections" as a separate link.
- Sections are ordered by whatever order they come from the backend (no fixed ordering).
- Seats within each section are ordered by insertion order.

## Requested Changes (Diff)

### Add
- Section description displayed alongside section name in the Computers page section heading (below the section name, as a subtitle), without changing the overall card/table layout.
- Fixed section ordering in the Computers page: Officers, D1, D2, D5, D3, D4, DSS, Utilities. Unrecognized sections appear after.
- Fixed seat/row ordering within each section in the Computers page: "SO" seats first, then numeric seats (1, 2, 3...), then "Computer Assistant" seats, then all other seats.

### Modify
- Remove "Sections" nav item from sidebar.
- Remove Sections route from App.tsx router.
- Computers page: update section heading to show description as a small subtitle line below the section name (only when description is non-empty), keeping existing icon, name, and device count layout intact.
- Computers page: `orderedSectionKeys` logic updated to use the fixed section name ordering above.
- Computers page: `sectionComputers` list sorted per the seat ordering rules above.

### Remove
- Sections page nav link from Layout.tsx.
- Sections route from App.tsx.

## Implementation Plan
1. Layout.tsx: Remove the Sections nav item from `navItems` array.
2. App.tsx: Remove sectionsRoute import, route definition, and route from routeTree.
3. Computers.tsx:
   a. Add a `SECTION_ORDER` constant for the fixed section name ordering.
   b. Update `orderedSectionKeys` to sort by `SECTION_ORDER` (case-insensitive match), with unrecognized sections at the end.
   c. Add a `sortSeats` helper: SO seats first, then numeric seats ascending, then Computer Assistant seats, then others.
   d. Apply `sortSeats` when rendering `sectionComputers` per section.
   e. In the section heading block, add a description subtitle line below the section name (only when description is non-empty).
