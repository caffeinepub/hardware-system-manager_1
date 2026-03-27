# Hardware System Manager

## Current State
- Stock import creates one Seat per imported device (CPU and Monitor each get their own Seat record)
- Computers page builds `systemRows` by mapping 1:1 over Seat records — no deduplication or merging step
- When seat number is added via Stock edit, `autoCreateSeat` may create a second Seat if the match logic misses, resulting in a new row instead of updating the existing one
- A CPU row and a Monitor row with the same section+seatNumber are never merged — they display as two separate rows

## Requested Changes (Diff)

### Add
- Deduplication step in Computers page `systemRows` build: after mapping seats → rows, merge any two rows that share the same `sectionId` + `seatNumber` (non-empty) into one combined CPU+Monitor row
- Serial-level dedup guard: track seen serials; skip any row whose CPU or Monitor serial was already rendered

### Modify
- **StockData.tsx `handleImport`**: when creating a seat for a CPU or Monitor that has a `seatNumber`, first check if a seat already exists in the same section with that seatNumber — if yes, merge the device into that seat (updateSeat) instead of creating a new one
- **StockData.tsx `handleImport`**: when creating a seat with no seat number, also check if there is an existing seat in the same section with an empty slot (no cpu/monitor) — merge instead of creating new
- **StockData.tsx `handleSaveEntry` seatNumber block**: when the user assigns a seat number to a device that already has a Seat record (blank seatNumber), find that existing Seat and update it — never create a second Seat for a device that already has one
- **Computers.tsx `systemRows` build**: apply merging + dedup post-processing step before grouping/sorting
- Micro Computer seats: ensure the Seat is never duplicated; the Micro Computer device (identified by its CPU serial number) should always map to exactly one row

### Remove
- Nothing removed

## Implementation Plan
1. Fix `handleImport` in StockData.tsx: before calling `createSeat` for a device, check existing seats for same section+seatNumber to merge; also check for a seat with a matching empty slot in the same section
2. Fix `handleSaveEntry` seatNumber block: when `matchSeat` is not found by serial, also search by `sectionId + seatNumber` before falling back to `createSeat`
3. Fix `Computers.tsx` `systemRows` post-processing: add `mergeAndDedup(rows)` function that merges rows sharing the same section+seatNumber and deduplicates by serial
4. Ensure Micro Computer rows are always treated as a single unit with no duplicate seat creation
