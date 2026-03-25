import Map "mo:core/Map";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";

actor {
  include MixinStorage();
  let accessControlState = AccessControl.initState();

  // ── Old types (migration stubs – must match previous stable types exactly) ───
  type OldComputer = {
    id : Text; sectionId : Text; seatNumber : Text; currentUser : Text;
    serialNumber : Text; model : Text; brand : Text; purchaseDate : Int;
    amcStartDate : Int; amcEndDate : Int;
    status : { #active; #standby; #retired };
    datasheetBlob : ?Storage.ExternalBlob;
    notes : Text; createdAt : Int; monitorSerial : Text; monitorModel : Text;
    ip1 : Text; ip2 : Text; remarks : Text; companyName : Text; amcCompany : Text;
  };
  type OldStandbySystem = {
    id : Text; serialNumber : Text; model : Text; brand : Text;
    condition : { #good; #fair; #poor };
    status : { #available; #inUse; #retired };
    assignedSectionId : ?Text; notes : Text; createdAt : Int;
  };
  type OldAMCPart = {
    id : Text; partName : Text; partNumber : Text; quantity : Nat;
    associatedComputerId : ?Text; associatedSectionId : ?Text;
    supplier : Text; purchaseDate : Int; warrantyExpiry : ?Int;
    notes : Text; createdAt : Int;
  };
  type OldStockEntry = {
    id : Text; slNo : Nat; companyAndModel : Text; cpuSlNo : Text;
    monitorSlNo : Text; amcStartDate : Int; amcExpiryDate : Int;
    amcTeam : Text; createdAt : Int;
  };
  type OldOtherDevice = {
    id : Text; slNo : Nat; unitArticle : Text; makeAndModel : Text;
    serialNumber : Text; section : Text; ipAddress : Text;
    workingStatus : Text; remarks : Text; createdAt : Int;
  };
  // MUST keep OldComplaint identical to the `complaints` Map type in previous version
  type OldComplaint = {
    id : Text; computerId : ?Text; sectionId : ?Text;
    reportedBy : Text; description : Text;
    status : { #open; #inProgress; #resolved };
    priority : { #low; #medium; #high };
    createdAt : Int; resolvedAt : ?Int;
    unitSlNo : Text; unit : Text;
    caseAttendedDate : ?Int; sparesTaken : Text;
    spareTakenDate : ?Int; caseClearedDate : ?Int;
    amcTeam : Text; extraCol1 : Text; extraCol2 : Text;
  };
  // MUST keep OldDevice identical to the `devices` Map type in previous version
  type OldDevice = {
    id : Text; serialNumber : Text; deviceType : Text; makeAndModel : Text;
    companyName : Text; amcTeam : Text; amcStartDate : Int; amcExpiryDate : Int;
    assignedSeatId : Text; sectionId : Text; workingStatus : Text;
    ipAddress : Text; remarks : Text; previousSection : Text;
    dateMovedToStandby : Int; createdAt : Int;
  };

  // ── Active types ──────────────────────────────────────────────────────
  type Section = {
    id : Text; name : Text; description : Text;
    location : Text; createdAt : Int;
  };
  type Complaint = {
    id : Text; unitSlNo : Text; unit : Text; serialNumber : Text;
    reportedBy : Text; amcTeam : Text; caseLoggedDate : Int;
    caseAttendedDate : ?Int; sparesTaken : Text; spareTakenDate : ?Int;
    caseClearedDate : ?Int; status : Text; remarks1 : Text; remarks2 : Text;
    createdAt : Int;
  };
  // New Device type – adds cpuSerialNumber + monitorSerialNumber
  type Device = {
    id : Text; serialNumber : Text; deviceType : Text; makeAndModel : Text;
    companyName : Text; amcTeam : Text; amcStartDate : Int; amcExpiryDate : Int;
    assignedSeatId : Text; sectionId : Text; workingStatus : Text;
    ipAddress : Text; remarks : Text; previousSection : Text;
    dateMovedToStandby : Int; createdAt : Int;
    cpuSerialNumber : Text;
    monitorSerialNumber : Text;
  };
  type Seat = {
    id : Text; sectionId : Text; seatNumber : Text; currentUser : Text;
    cpuSerial : Text; monitorSerial : Text; ip1 : Text; ip2 : Text;
    remarks : Text; createdAt : Int;
  };
  type MovementLog = {
    id : Text; dateTime : Int; deviceType : Text; serialNumber : Text;
    action : Text; previousSection : Text; newSection : Text;
    triggeredFrom : Text; user : Text; remarks : Text;
  };
  public type UserProfile = { name : Text };

  // ── Stable arrays (for array-based persistence, NOT for Map internal state) ──
  stable var computersStable     : [(Text, OldComputer)]      = [];
  stable var standbyStable       : [(Text, OldStandbySystem)] = [];
  stable var amcPartsStable      : [(Text, OldAMCPart)]       = [];
  stable var stockEntriesStable  : [(Text, OldStockEntry)]    = [];
  stable var otherDevicesStable  : [(Text, OldOtherDevice)]   = [];
  stable var complaintsStable    : [(Text, OldComplaint)]     = [];
  stable var devicesStable       : [(Text, OldDevice)]        = [];
  stable var sectionsStable      : [(Text, Section)]          = [];
  stable var newComplaintsStable : [(Text, Complaint)]        = [];
  stable var devicesV2Stable     : [(Text, Device)]           = [];
  stable var seatsStable         : [(Text, Seat)]             = [];
  stable var movementLogsStable  : [(Text, MovementLog)]      = [];
  stable var userProfilesStable  : [(Principal, UserProfile)] = [];

  // ── Maps – CRITICAL: keep exact variable names from previous deployment ──────
  // These names match the previous deployed version; renaming would cause
  // M0169/M0170 stable-compatibility errors.
  let computers      = Map.fromIter<Text, OldComputer>(computersStable.vals());
  let standbySystems = Map.fromIter<Text, OldStandbySystem>(standbyStable.vals());
  let amcParts       = Map.fromIter<Text, OldAMCPart>(amcPartsStable.vals());
  let stockEntries   = Map.fromIter<Text, OldStockEntry>(stockEntriesStable.vals());
  let otherDevices   = Map.fromIter<Text, OldOtherDevice>(otherDevicesStable.vals());
  let complaints     = Map.fromIter<Text, OldComplaint>(complaintsStable.vals());  // KEEP name
  let devices        = Map.fromIter<Text, OldDevice>(devicesStable.vals());         // KEEP name + old type

  // ── Active Maps ──────────────────────────────────────────────────────────
  let sections       = Map.fromIter<Text, Section>(sectionsStable.vals());
  let complaintStore = Map.fromIter<Text, Complaint>(newComplaintsStable.vals());
  let devicesV2      = Map.fromIter<Text, Device>(devicesV2Stable.vals()); // new Device type
  let seats          = Map.fromIter<Text, Seat>(seatsStable.vals());
  let movementLogs   = Map.fromIter<Text, MovementLog>(movementLogsStable.vals());
  let userProfiles   = Map.fromIter<Principal, UserProfile>(userProfilesStable.vals());

  // ── One-time migration: copy old `devices` data into `devicesV2` ───────────
  for ((k, d) in devices.entries().toArray().vals()) {
    if (devicesV2.get(k) == null) {
      devicesV2.add(k, {
        id = d.id; serialNumber = d.serialNumber; deviceType = d.deviceType;
        makeAndModel = d.makeAndModel; companyName = d.companyName;
        amcTeam = d.amcTeam; amcStartDate = d.amcStartDate;
        amcExpiryDate = d.amcExpiryDate; assignedSeatId = d.assignedSeatId;
        sectionId = d.sectionId; workingStatus = d.workingStatus;
        ipAddress = d.ipAddress; remarks = d.remarks;
        previousSection = d.previousSection;
        dateMovedToStandby = d.dateMovedToStandby; createdAt = d.createdAt;
        cpuSerialNumber = ""; monitorSerialNumber = "";
      });
    };
  };

  // ── Upgrade hooks ─────────────────────────────────────────────────────────
  system func preupgrade() {
    // Clear old migration stubs
    computersStable    := [];
    standbyStable      := [];
    amcPartsStable     := [];
    stockEntriesStable := [];
    otherDevicesStable := [];
    complaintsStable   := [];
    devicesStable      := [];  // old devices no longer needed after first migration
    // Persist active data
    sectionsStable      := sections.entries().toArray();
    newComplaintsStable := complaintStore.entries().toArray();
    devicesV2Stable     := devicesV2.entries().toArray();
    seatsStable         := seats.entries().toArray();
    movementLogsStable  := movementLogs.entries().toArray();
    userProfilesStable  := userProfiles.entries().toArray();
  };

  system func postupgrade() {
    computersStable    := [];
    standbyStable      := [];
    amcPartsStable     := [];
    stockEntriesStable := [];
    otherDevicesStable := [];
    complaintsStable   := [];
    devicesStable      := [];
    sectionsStable      := [];
    newComplaintsStable := [];
    devicesV2Stable     := [];
    seatsStable         := [];
    movementLogsStable  := [];
    userProfilesStable  := [];
  };

  // ── Internal helpers ──────────────────────────────────────────────────────
  func logMovement(
    deviceType : Text, serialNumber : Text, action : Text,
    previousSection : Text, newSection : Text,
    triggeredFrom : Text, user : Text, remarks : Text,
  ) {
    let now = Time.now();
    let id = serialNumber # "_" # action # "_" # now.toText();
    movementLogs.add(id, {
      id; dateTime = now; deviceType; serialNumber; action;
      previousSection; newSection; triggeredFrom; user; remarks;
    });
  };

  func getDeviceBySerial(serial : Text) : ?Device {
    if (serial == "") return null;
    devicesV2.get(serial);
  };

  // ── Section CRUD ──────────────────────────────────────────────────────────
  public shared func createSection(section : Section) : async () {
    sections.add(section.id, section);
  };
  public query func getAllSections() : async [Section] {
    sections.values().toArray();
  };
  public shared func updateSection(section : Section) : async () {
    sections.add(section.id, section);
  };
  public shared func deleteSection(id : Text) : async () {
    ignore sections.remove(id);
  };

  // ── Device CRUD (all use devicesV2) ───────────────────────────────────────
  public shared func createDevice(device : Device) : async () {
    devicesV2.add(device.id, device);
  };
  public query func getDevice(id : Text) : async ?Device {
    devicesV2.get(id);
  };
  public query func getAllDevices() : async [Device] {
    devicesV2.values().toArray();
  };

  public shared func updateDevice(device : Device) : async () {
    switch (devicesV2.get(device.id)) {
      case (null) {
        devicesV2.add(device.id, device);
      };
      case (?old) {
        if (device.deviceType == "Micro Computer") {
          let now = Time.now();
          // CPU replaced
          if (old.cpuSerialNumber != "" and old.cpuSerialNumber != device.cpuSerialNumber) {
            devicesV2.add(old.cpuSerialNumber, {
              id = old.cpuSerialNumber; serialNumber = old.cpuSerialNumber;
              deviceType = "CPU"; makeAndModel = old.makeAndModel;
              companyName = old.companyName; amcTeam = old.amcTeam;
              amcStartDate = old.amcStartDate; amcExpiryDate = old.amcExpiryDate;
              assignedSeatId = ""; sectionId = "";
              workingStatus = "Available"; ipAddress = "";
              remarks = "Replaced from Micro Computer " # old.serialNumber;
              previousSection = old.sectionId; dateMovedToStandby = now;
              createdAt = now; cpuSerialNumber = ""; monitorSerialNumber = "";
            });
            logMovement("CPU", old.cpuSerialNumber, "movedToStandby",
              old.sectionId, "Standby", "Stock Page", "",
              "CPU replaced in Micro Computer " # old.serialNumber);
          };
          // Monitor replaced
          if (old.monitorSerialNumber != "" and old.monitorSerialNumber != device.monitorSerialNumber) {
            let now2 = Time.now();
            devicesV2.add(old.monitorSerialNumber, {
              id = old.monitorSerialNumber; serialNumber = old.monitorSerialNumber;
              deviceType = "Monitor"; makeAndModel = old.makeAndModel;
              companyName = old.companyName; amcTeam = old.amcTeam;
              amcStartDate = old.amcStartDate; amcExpiryDate = old.amcExpiryDate;
              assignedSeatId = ""; sectionId = "";
              workingStatus = "Available"; ipAddress = "";
              remarks = "Replaced from Micro Computer " # old.serialNumber;
              previousSection = old.sectionId; dateMovedToStandby = now2;
              createdAt = now2; cpuSerialNumber = ""; monitorSerialNumber = "";
            });
            logMovement("Monitor", old.monitorSerialNumber, "movedToStandby",
              old.sectionId, "Standby", "Stock Page", "",
              "Monitor replaced in Micro Computer " # old.serialNumber);
          };
        };
        devicesV2.add(device.id, device);
      };
    };
  };

  public shared func deleteDevice(id : Text) : async () {
    ignore devicesV2.remove(id);
  };

  // ── Seat CRUD ─────────────────────────────────────────────────────────────
  public shared func createSeat(seat : Seat) : async () {
    if (seat.cpuSerial != "") {
      switch (getDeviceBySerial(seat.cpuSerial)) {
        case (?dev) {
          devicesV2.add(dev.id, { dev with
            assignedSeatId = seat.id; sectionId = seat.sectionId;
            workingStatus = "Working"; dateMovedToStandby = 0;
          });
          logMovement("CPU", seat.cpuSerial, "assigned", "", seat.sectionId,
            "Computers Page", "", "Assigned to seat " # seat.seatNumber);
        };
        case (null) {};
      };
    };
    if (seat.monitorSerial != "") {
      switch (getDeviceBySerial(seat.monitorSerial)) {
        case (?dev) {
          devicesV2.add(dev.id, { dev with
            assignedSeatId = seat.id; sectionId = seat.sectionId;
            workingStatus = "Working"; dateMovedToStandby = 0;
          });
          logMovement("Monitor", seat.monitorSerial, "assigned", "", seat.sectionId,
            "Computers Page", "", "Assigned to seat " # seat.seatNumber);
        };
        case (null) {};
      };
    };
    seats.add(seat.id, seat);
  };
  public query func getSeat(id : Text) : async ?Seat {
    seats.get(id);
  };
  public query func getAllSeats() : async [Seat] {
    seats.values().toArray();
  };
  public shared func updateSeat(seat : Seat) : async () {
    switch (seats.get(seat.id)) {
      case (null) { seats.add(seat.id, seat) };
      case (?old) {
        if (old.cpuSerial != seat.cpuSerial) {
          if (old.cpuSerial != "") {
            switch (getDeviceBySerial(old.cpuSerial)) {
              case (?dev) {
                devicesV2.add(dev.id, { dev with
                  assignedSeatId = ""; previousSection = old.sectionId;
                  dateMovedToStandby = Time.now(); workingStatus = "Available";
                });
                logMovement("CPU", old.cpuSerial, "movedToStandby",
                  old.sectionId, "Standby", "Computers Page", "", "CPU replaced");
              };
              case (null) {};
            };
          };
          if (seat.cpuSerial != "") {
            switch (getDeviceBySerial(seat.cpuSerial)) {
              case (?dev) {
                let wasStandby = dev.assignedSeatId == "";
                devicesV2.add(dev.id, { dev with
                  assignedSeatId = seat.id; sectionId = seat.sectionId;
                  workingStatus = "Working"; dateMovedToStandby = 0;
                });
                let action = if (wasStandby) "assignedFromStandby" else "assigned";
                logMovement("CPU", seat.cpuSerial, action, dev.sectionId,
                  seat.sectionId, "Computers Page", "",
                  "Assigned to seat " # seat.seatNumber);
              };
              case (null) {};
            };
          };
        } else if (old.cpuSerial != "" and old.sectionId != seat.sectionId) {
          switch (getDeviceBySerial(old.cpuSerial)) {
            case (?dev) {
              devicesV2.add(dev.id, { dev with sectionId = seat.sectionId });
              logMovement("CPU", old.cpuSerial, "sectionTransfer",
                old.sectionId, seat.sectionId, "Computers Page", "", "");
            };
            case (null) {};
          };
        };
        if (old.monitorSerial != seat.monitorSerial) {
          if (old.monitorSerial != "") {
            switch (getDeviceBySerial(old.monitorSerial)) {
              case (?dev) {
                devicesV2.add(dev.id, { dev with
                  assignedSeatId = ""; previousSection = old.sectionId;
                  dateMovedToStandby = Time.now(); workingStatus = "Available";
                });
                logMovement("Monitor", old.monitorSerial, "movedToStandby",
                  old.sectionId, "Standby", "Computers Page", "", "Monitor replaced");
              };
              case (null) {};
            };
          };
          if (seat.monitorSerial != "") {
            switch (getDeviceBySerial(seat.monitorSerial)) {
              case (?dev) {
                let wasStandby = dev.assignedSeatId == "";
                devicesV2.add(dev.id, { dev with
                  assignedSeatId = seat.id; sectionId = seat.sectionId;
                  workingStatus = "Working"; dateMovedToStandby = 0;
                });
                let action = if (wasStandby) "assignedFromStandby" else "assigned";
                logMovement("Monitor", seat.monitorSerial, action, dev.sectionId,
                  seat.sectionId, "Computers Page", "",
                  "Assigned to seat " # seat.seatNumber);
              };
              case (null) {};
            };
          };
        } else if (old.monitorSerial != "" and old.sectionId != seat.sectionId) {
          switch (getDeviceBySerial(old.monitorSerial)) {
            case (?dev) {
              devicesV2.add(dev.id, { dev with sectionId = seat.sectionId });
              logMovement("Monitor", old.monitorSerial, "sectionTransfer",
                old.sectionId, seat.sectionId, "Computers Page", "", "");
            };
            case (null) {};
          };
        };
        seats.add(seat.id, seat);
      };
    };
  };
  public shared func deleteSeat(id : Text) : async () {
    switch (seats.get(id)) {
      case (null) {};
      case (?seat) {
        if (seat.cpuSerial != "") {
          switch (getDeviceBySerial(seat.cpuSerial)) {
            case (?dev) {
              devicesV2.add(dev.id, { dev with
                assignedSeatId = ""; previousSection = seat.sectionId;
                dateMovedToStandby = Time.now(); workingStatus = "Available";
              });
              logMovement("CPU", seat.cpuSerial, "movedToStandby",
                seat.sectionId, "Standby", "Computers Page", "", "Seat deleted");
            };
            case (null) {};
          };
        };
        if (seat.monitorSerial != "") {
          switch (getDeviceBySerial(seat.monitorSerial)) {
            case (?dev) {
              devicesV2.add(dev.id, { dev with
                assignedSeatId = ""; previousSection = seat.sectionId;
                dateMovedToStandby = Time.now(); workingStatus = "Available";
              });
              logMovement("Monitor", seat.monitorSerial, "movedToStandby",
                seat.sectionId, "Standby", "Computers Page", "", "Seat deleted");
            };
            case (null) {};
          };
        };
        ignore seats.remove(id);
      };
    };
  };

  // ── Complaint CRUD ────────────────────────────────────────────────────────
  public shared func createComplaint(complaint : Complaint) : async () {
    complaintStore.add(complaint.id, complaint);
  };
  public query func getAllComplaints() : async [Complaint] {
    complaintStore.values().toArray();
  };
  public shared func updateComplaint(complaint : Complaint) : async () {
    complaintStore.add(complaint.id, complaint);
  };
  public shared func deleteComplaint(id : Text) : async () {
    ignore complaintStore.remove(id);
  };

  // ── MovementLog ───────────────────────────────────────────────────────────
  public shared func createMovementLog(log : MovementLog) : async () {
    movementLogs.add(log.id, log);
  };
  public query func getAllMovementLogs() : async [MovementLog] {
    movementLogs.values().toArray().sort(
      func(a, b) {
        if (a.dateTime > b.dateTime) #less
        else if (a.dateTime < b.dateTime) #greater
        else #equal
      }
    );
  };

  // ── Dashboard Stats ───────────────────────────────────────────────────────
  public query func getDashboardStats() : async {
    totalSeats : Nat;
    totalStandbyDevices : Nat;
    pendingComplaints : Nat;
    clearedComplaints : Nat;
    totalOtherDevices : Nat;
    totalDevices : Nat;
  } {
    let allDevices = devicesV2.values().toArray();
    let standbyCount = allDevices.filter(func(d) {
      (d.deviceType == "CPU" or d.deviceType == "Monitor" or
       d.deviceType == "Micro Computer" or d.deviceType == "All-in-One PC")
      and d.assignedSeatId == ""
    }).size();
    let otherCount = allDevices.filter(func(d) {
      d.deviceType != "CPU" and d.deviceType != "Monitor" and
      d.deviceType != "Micro Computer" and d.deviceType != "All-in-One PC"
    }).size();
    let allComplaints = complaintStore.values().toArray();
    let pending = allComplaints.filter(func(c) {
      c.status == "Pending" or c.status == "LongPending"
    }).size();
    let cleared = allComplaints.filter(func(c) { c.status == "Cleared" }).size();
    {
      totalSeats = seats.size();
      totalStandbyDevices = standbyCount;
      pendingComplaints = pending;
      clearedComplaints = cleared;
      totalOtherDevices = otherCount;
      totalDevices = allDevices.size();
    };
  };

  // ── Clear all data ────────────────────────────────────────────────────────
  public shared func clearAllData() : async () {
    for ((k, _) in devicesV2.entries().toArray().vals()) { ignore devicesV2.remove(k) };
    for ((k, _) in seats.entries().toArray().vals()) { ignore seats.remove(k) };
    for ((k, _) in sections.entries().toArray().vals()) { ignore sections.remove(k) };
    for ((k, _) in complaintStore.entries().toArray().vals()) { ignore complaintStore.remove(k) };
    for ((k, _) in movementLogs.entries().toArray().vals()) { ignore movementLogs.remove(k) };
  };

  // ── UserProfile ───────────────────────────────────────────────────────────
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    userProfiles.get(caller);
  };
  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    userProfiles.add(caller, profile);
  };

  // ── Stubs ─────────────────────────────────────────────────────────────────
  public query func isCallerAdmin() : async Bool { false };
  public query func getCallerUserRole() : async { #admin; #user; #guest } { #guest };
};
