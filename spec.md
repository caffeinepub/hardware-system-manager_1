# Hardware System Manager

## Current State
- Computers page builds `systemRows` from seats + devices; detects system type by checking `deviceBySerial.get(seat.cpuSerial).deviceType`. For Micro Computers, the seat stores `cpuSerial = cpuSerialNumber` (the component serial), not the Micro Computer device's own serial, so `cpuDev` is null/CPU and systemType defaults to "Desktop".
- Stock page form has no `seatNumber` field; the auto-created seat always has an empty seat number.
- Computers page add/edit dialog has plain text inputs for CPU Serial and Monitor Serial — no dropdown of available standby devices.

## Requested Changes (Diff)

### Add
- `seatNumber` field in Stock page form (visible for computer-type devices: CPU, Monitor, Micro Computer, All-in-One PC). When saving, if seatNumber is provided and device is a computer type, also upsert the seat record with that seat number.
- In Computers page add/edit dialog: replace CPU Serial and Monitor Serial plain text inputs with `<Select>` dropdowns showing standby devices (unassigned CPUs and Monitors — devices where `sectionId === ""` and `deviceType === "CPU"` or `"Monitor"`). Each option shows `SerialNumber — Make/Model`. Also include a free-type option or fallback input for manual entry.

### Modify
- `systemRows` in Computers.tsx: after getting `cpuDev = deviceBySerial.get(seat.cpuSerial)`, also look for a Micro Computer device in `devices` array where `d.cpuSerialNumber === seat.cpuSerial`. If found, use that as the definitive Micro Computer device (set `systemType = "Micro Computer"`, use its `monitorSerialNumber` for monitor serial, its `makeAndModel` for model).
- The standby check for dropdown: a device is "available/standby" if its `sectionId` is empty string or falsy AND `deviceType` is CPU or Monitor. The currently-assigned serials (being edited) should also appear in the dropdown so the user can keep them.

### Remove
- Nothing removed.

## Implementation Plan
1. **Computers.tsx — fix Micro Computer detection in `systemRows`**: In the map over seats, after `cpuDev = deviceBySerial.get(seat.cpuSerial)`, add a lookup: `const microDev = cpuDev?.deviceType === 'Micro Computer' ? cpuDev : devices.find(d => d.deviceType === 'Micro Computer' && d.cpuSerialNumber === seat.cpuSerial)`. If `microDev` exists, set systemType to Micro Computer and pull serials/model from it.
2. **Computers.tsx — standby dropdown in Add/Edit dialog**: Compute a list of standby CPUs and standby Monitors from `devices` (those with empty `sectionId`). In the dialog, replace the CPU Serial `<Input>` with a `<Select>` whose items are standby CPUs plus the current seat's cpuSerial if assigned. Same for Monitor Serial. Add a `"Manual entry"` option that shows a text input fallback (or just a combobox pattern with a typed-in value option).
3. **StockData.tsx — add seatNumber field**: Add `seatNumber: string` to `FormState` and `EMPTY_FORM`. Show a `Seat Number` `<Input>` in the dialog when `formState.deviceType` is a computer type. In `handleSaveEntry`, after creating/updating the device, if `formState.seatNumber.trim()` is set and device is computer type, look for an existing seat that contains this serial; if found update its seatNumber, else create/update via the same logic as `autoCreateSeat` but passing `seatNumber`.
