import Map "mo:core/Map";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Principal "mo:core/Principal";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import AccessControl "authorization/access-control";

actor {
  let accessControlState = AccessControl.initState();

  include MixinStorage();

  // Types
  type Section = {
    id : Text;
    name : Text;
    description : Text;
    location : Text;
    createdAt : Int;
  };

  type Computer = {
    id : Text;
    sectionId : Text;
    seatNumber : Text;
    currentUser : Text;
    serialNumber : Text;
    model : Text;
    brand : Text;
    purchaseDate : Int;
    amcStartDate : Int;
    amcEndDate : Int;
    status : { #active; #standby; #retired };
    datasheetBlob : ?Storage.ExternalBlob;
    notes : Text;
    createdAt : Int;
    monitorSerial : Text;
    monitorModel : Text;
    ip1 : Text;
    ip2 : Text;
    remarks : Text;
    companyName : Text;
    amcCompany : Text;
  };

  type StandbySystem = {
    id : Text;
    serialNumber : Text;
    model : Text;
    brand : Text;
    condition : { #good; #fair; #poor };
    status : { #available; #inUse; #retired };
    assignedSectionId : ?Text;
    notes : Text;
    createdAt : Int;
  };

  type ComplaintStatus = { #open; #inProgress; #resolved };
  type Priority = { #low; #medium; #high };

  type Complaint = {
    id : Text;
    computerId : ?Text;
    sectionId : ?Text;
    reportedBy : Text;
    description : Text;
    status : ComplaintStatus;
    priority : Priority;
    createdAt : Int;
    resolvedAt : ?Int;
    unitSlNo : Text;
    unit : Text;
    caseAttendedDate : ?Int;
    sparesTaken : Text;
    spareTakenDate : ?Int;
    caseClearedDate : ?Int;
    amcTeam : Text;
    extraCol1 : Text;
    extraCol2 : Text;
  };

  type AMCPart = {
    id : Text;
    partName : Text;
    partNumber : Text;
    quantity : Nat;
    associatedComputerId : ?Text;
    associatedSectionId : ?Text;
    supplier : Text;
    purchaseDate : Int;
    warrantyExpiry : ?Int;
    notes : Text;
    createdAt : Int;
  };

  public type UserProfile = {
    name : Text;
  };

  type StockEntry = {
    id : Text;
    slNo : Nat;
    companyAndModel : Text;
    cpuSlNo : Text;
    monitorSlNo : Text;
    amcStartDate : Int;
    amcExpiryDate : Int;
    amcTeam : Text;
    createdAt : Int;
  };

  type OtherDevice = {
    id : Text;
    slNo : Nat;
    unitArticle : Text;
    makeAndModel : Text;
    serialNumber : Text;
    section : Text;
    ipAddress : Text;
    workingStatus : Text;
    remarks : Text;
    createdAt : Int;
  };

  type ProcessStockEntriesResult = {
    updated : Nat;
    addedToStandby : Nat;
  };

  // ── Stable storage arrays (survive upgrades) ──────────────────────────────
  stable var sectionsStable       : [(Text, Section)]       = [];
  stable var computersStable      : [(Text, Computer)]      = [];
  stable var standbyStable        : [(Text, StandbySystem)] = [];
  stable var complaintsStable     : [(Text, Complaint)]     = [];
  stable var amcPartsStable       : [(Text, AMCPart)]       = [];
  stable var stockEntriesStable   : [(Text, StockEntry)]    = [];
  stable var userProfilesStable   : [(Principal, UserProfile)] = [];
  stable var otherDevicesStable   : [(Text, OtherDevice)]   = [];

  // ── In-memory maps ────────────────────────────────────────────────────────
  let sections      = Map.fromIter<Text, Section>(sectionsStable.vals());
  let computers     = Map.fromIter<Text, Computer>(computersStable.vals());
  let standbySystems = Map.fromIter<Text, StandbySystem>(standbyStable.vals());
  let complaints    = Map.fromIter<Text, Complaint>(complaintsStable.vals());
  let amcParts      = Map.fromIter<Text, AMCPart>(amcPartsStable.vals());
  let stockEntries  = Map.fromIter<Text, StockEntry>(stockEntriesStable.vals());
  let userProfiles  = Map.fromIter<Principal, UserProfile>(userProfilesStable.vals());
  let otherDevices  = Map.fromIter<Text, OtherDevice>(otherDevicesStable.vals());

  // ── Upgrade hooks ─────────────────────────────────────────────────────────
  system func preupgrade() {
    sectionsStable     := sections.entries().toArray();
    computersStable    := computers.entries().toArray();
    standbyStable      := standbySystems.entries().toArray();
    complaintsStable   := complaints.entries().toArray();
    amcPartsStable     := amcParts.entries().toArray();
    stockEntriesStable := stockEntries.entries().toArray();
    userProfilesStable := userProfiles.entries().toArray();
    otherDevicesStable := otherDevices.entries().toArray();
  };

  system func postupgrade() {
    sectionsStable     := [];
    computersStable    := [];
    standbyStable      := [];
    complaintsStable   := [];
    amcPartsStable     := [];
    stockEntriesStable := [];
    userProfilesStable := [];
    otherDevicesStable := [];
  };

  // Section CRUD
  public shared func createSection(section : Section) : async () {
    sections.add(section.id, section);
  };

  public query func getSection(id : Text) : async ?Section {
    sections.get(id);
  };

  public query func getAllSections() : async [Section] {
    sections.values().toArray();
  };

  public shared func updateSection(section : Section) : async () {
    switch (sections.get(section.id)) {
      case (null) {};
      case (?_) { sections.add(section.id, section) };
    };
  };

  public shared func deleteSection(id : Text) : async () {
    switch (sections.get(id)) {
      case (null) {};
      case (?_) { sections.remove(id) };
    };
  };

  // Computer CRUD
  public shared func createComputer(computer : Computer) : async () {
    computers.add(computer.id, computer);
  };

  public query func getComputer(id : Text) : async ?Computer {
    computers.get(id);
  };

  public query func getAllComputers() : async [Computer] {
    computers.values().toArray();
  };

  public query func getComputersBySection(sectionId : Text) : async [Computer] {
    computers.values().toArray().filter(func(c) { c.sectionId == sectionId });
  };

  public query func getComputersWithExpiringAMC(days : Int) : async [Computer] {
    let now = Time.now();
    let expiryThreshold = now + (days * 24 * 3600 * 1000000000);
    computers.values().toArray().filter(func(c) {
      c.amcEndDate <= expiryThreshold
    });
  };

  public shared func updateComputer(computer : Computer) : async () {
    switch (computers.get(computer.id)) {
      case (null) {};
      case (?old) {
        // CPU serial changed: auto-move old serial to standby if no longer in use
        if (old.serialNumber != "" and old.serialNumber != computer.serialNumber) {
          let cpuInUse = computers.values().toArray().find(func(c) {
            c.id != computer.id and c.serialNumber == old.serialNumber
          });
          switch (cpuInUse) {
            case (null) {
              let alreadyInStandby = standbySystems.values().toArray().find(func(s) {
                s.serialNumber == old.serialNumber
              });
              switch (alreadyInStandby) {
                case (null) {
                  let newStandby : StandbySystem = {
                    id = old.serialNumber # "_cpu_standby";
                    serialNumber = old.serialNumber;
                    model = old.model;
                    brand = old.brand;
                    condition = #good;
                    status = #available;
                    assignedSectionId = null;
                    notes = "Auto-moved from section " # old.sectionId;
                    createdAt = Time.now();
                  };
                  standbySystems.add(newStandby.id, newStandby);
                };
                case (?_) {};
              };
            };
            case (?_) {};
          };
        };
        // Remove new CPU serial from standby if present
        if (computer.serialNumber != "") {
          switch (standbySystems.values().toArray().find(func(s) { s.serialNumber == computer.serialNumber })) {
            case (null) {};
            case (?s) { standbySystems.remove(s.id) };
          };
        };
        // Monitor serial changed: auto-move old monitor serial to standby if no longer in use
        if (old.monitorSerial != "" and old.monitorSerial != computer.monitorSerial) {
          let monInUse = computers.values().toArray().find(func(c) {
            c.id != computer.id and c.monitorSerial == old.monitorSerial
          });
          switch (monInUse) {
            case (null) {
              let alreadyInStandby = standbySystems.values().toArray().find(func(s) {
                s.serialNumber == old.monitorSerial
              });
              switch (alreadyInStandby) {
                case (null) {
                  let newMonStandby : StandbySystem = {
                    id = old.monitorSerial # "_mon_standby";
                    serialNumber = old.monitorSerial;
                    model = old.monitorModel;
                    brand = old.brand;
                    condition = #good;
                    status = #available;
                    assignedSectionId = null;
                    notes = "Auto-moved monitor from section " # old.sectionId;
                    createdAt = Time.now();
                  };
                  standbySystems.add(newMonStandby.id, newMonStandby);
                };
                case (?_) {};
              };
            };
            case (?_) {};
          };
        };
        // Remove new monitor serial from standby if present
        if (computer.monitorSerial != "") {
          switch (standbySystems.values().toArray().find(func(s) { s.serialNumber == computer.monitorSerial })) {
            case (null) {};
            case (?s) { standbySystems.remove(s.id) };
          };
        };
        computers.add(computer.id, computer);
      };
    };
  };

  public shared func deleteComputer(id : Text) : async () {
    switch (computers.get(id)) {
      case (null) {};
      case (?_) { computers.remove(id) };
    };
  };

  // StandbySystem CRUD
  public shared func createStandbySystem(standbySystem : StandbySystem) : async () {
    standbySystems.add(standbySystem.id, standbySystem);
  };

  public query func getStandbySystem(id : Text) : async ?StandbySystem {
    standbySystems.get(id);
  };

  public query func getAllStandbySystems() : async [StandbySystem] {
    standbySystems.values().toArray();
  };

  public shared func updateStandbySystem(standbySystem : StandbySystem) : async () {
    switch (standbySystems.get(standbySystem.id)) {
      case (null) {};
      case (?_) { standbySystems.add(standbySystem.id, standbySystem) };
    };
  };

  public shared func deleteStandbySystem(id : Text) : async () {
    switch (standbySystems.get(id)) {
      case (null) {};
      case (?_) { standbySystems.remove(id) };
    };
  };

  // Complaint CRUD
  public shared func createComplaint(complaint : Complaint) : async () {
    complaints.add(complaint.id, complaint);
  };

  public query func getComplaint(id : Text) : async ?Complaint {
    complaints.get(id);
  };

  public query func getAllComplaints() : async [Complaint] {
    complaints.values().toArray();
  };

  public query func getComplaintsByStatus(status : ComplaintStatus) : async [Complaint] {
    complaints.values().toArray().filter(func(c) { c.status == status });
  };

  public query func getComplaintsBySection(sectionId : Text) : async [Complaint] {
    complaints.values().toArray().filter(func(c) {
      switch (c.sectionId) {
        case (null) { false };
        case (?id) { id == sectionId };
      }
    });
  };

  public query func getComplaintsByComputer(computerId : Text) : async [Complaint] {
    complaints.values().toArray().filter(func(c) {
      switch (c.computerId) {
        case (null) { false };
        case (?id) { id == computerId };
      }
    });
  };

  public shared func updateComplaint(complaint : Complaint) : async () {
    switch (complaints.get(complaint.id)) {
      case (null) {};
      case (?_) { complaints.add(complaint.id, complaint) };
    };
  };

  public shared func deleteComplaint(id : Text) : async () {
    switch (complaints.get(id)) {
      case (null) {};
      case (?_) { complaints.remove(id) };
    };
  };

  // AMCPart CRUD
  public shared func createAMCPart(part : AMCPart) : async () {
    amcParts.add(part.id, part);
  };

  public query func getAMCPart(id : Text) : async ?AMCPart {
    amcParts.get(id);
  };

  public query func getAllAMCParts() : async [AMCPart] {
    amcParts.values().toArray();
  };

  public query func getExpiringAMCParts(days : Int) : async [AMCPart] {
    let now = Time.now();
    let expiryThreshold = now + (days * 24 * 3600 * 1000000000);
    amcParts.values().toArray().filter(func(p) {
      switch (p.warrantyExpiry) {
        case (null) { false };
        case (?expiry) { expiry <= expiryThreshold };
      }
    });
  };

  public shared func updateAMCPart(part : AMCPart) : async () {
    switch (amcParts.get(part.id)) {
      case (null) {};
      case (?_) { amcParts.add(part.id, part) };
    };
  };

  public shared func deleteAMCPart(id : Text) : async () {
    switch (amcParts.get(id)) {
      case (null) {};
      case (?_) { amcParts.remove(id) };
    };
  };

  // User Profile Management
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    userProfiles.get(caller);
  };

  public query func getUserProfile(user : Principal) : async ?UserProfile {
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    userProfiles.add(caller, profile);
  };

  // StockEntry CRUD
  public shared func createStockEntry(entry : StockEntry) : async () {
    stockEntries.add(entry.id, entry);
  };

  public query func getAllStockEntries() : async [StockEntry] {
    stockEntries.values().toArray().sort(
      func(a, b) {
        if (a.slNo < b.slNo) { #less } else if (a.slNo > b.slNo) {
          #greater;
        } else { #equal };
      }
    );
  };

  public shared func updateStockEntry(entry : StockEntry) : async () {
    switch (stockEntries.get(entry.id)) {
      case (null) {};
      case (?_) { stockEntries.add(entry.id, entry) };
    };
  };

  public shared func deleteStockEntry(id : Text) : async () {
    switch (stockEntries.get(id)) {
      case (null) {};
      case (?_) { stockEntries.remove(id) };
    };
  };

  public shared func processStockEntries() : async ProcessStockEntriesResult {
    var updatedComputers = 0;
    var addedToStandby = 0;

    let entries = stockEntries.values().toArray();
    for (entry in entries.values()) {
      let cpuSlNo = entry.cpuSlNo;

      let computerMatch = computers.values().toArray().find(
        func(comp) {
          comp.serialNumber.toLower().contains(#text(cpuSlNo.toLower()));
        }
      );

      switch (computerMatch) {
        case (null) {
          let standbyExists = standbySystems.values().toArray().find(
            func(stby) {
              stby.serialNumber == cpuSlNo;
            }
          );

          switch (standbyExists) {
            case (null) {
              let newStandby : StandbySystem = {
                id = cpuSlNo # entry.createdAt.toText();
                serialNumber = cpuSlNo;
                model = entry.companyAndModel;
                brand = "";
                condition = #good;
                status = #available;
                assignedSectionId = null;
                notes = "Auto-added from stock import";
                createdAt = Time.now();
              };
              standbySystems.add(newStandby.id, newStandby);
              addedToStandby += 1;
            };
            case (?_) {};
          };
        };
        case (?comp) {
          let updatedComp : Computer = {
            comp with
            companyName = entry.companyAndModel;
            amcCompany = entry.amcTeam;
            amcStartDate = entry.amcStartDate;
            amcEndDate = entry.amcExpiryDate;
          };
          computers.add(comp.id, updatedComp);
          updatedComputers += 1;
        };
      };
    };

    {
      updated = updatedComputers;
      addedToStandby;
    };
  };

  // OtherDevice CRUD
  public shared func createOtherDevice(device : OtherDevice) : async () {
    otherDevices.add(device.id, device);
  };

  public query func getAllOtherDevices() : async [OtherDevice] {
    otherDevices.values().toArray().sort(
      func(a, b) {
        if (a.slNo < b.slNo) { #less } else if (a.slNo > b.slNo) { #greater } else { #equal };
      }
    );
  };

  public shared func updateOtherDevice(device : OtherDevice) : async () {
    switch (otherDevices.get(device.id)) {
      case (null) {};
      case (?_) { otherDevices.add(device.id, device) };
    };
  };

  public shared func deleteOtherDevice(id : Text) : async () {
    switch (otherDevices.get(id)) {
      case (null) {};
      case (?_) { otherDevices.remove(id) };
    };
  };

  // Dashboard Stats
  public query func getDashboardStats() : async {
    totalComputers : Nat;
    totalStandbySystems : Nat;
    openComplaints : Nat;
    computersWithExpiringAMC : Nat;
    totalSections : Nat;
    pendingComplaints : Nat;
    clearedComplaints : Nat;
    inProgressComplaints : Nat;
  } {
    let now = Time.now();
    let thirtyDaysInNanos = 30 * 24 * 3600 * 1000000000;
    let expiryThreshold = now + thirtyDaysInNanos;

    let expiringCount = computers.values().toArray().filter(func(c) {
      c.amcEndDate <= expiryThreshold
    }).size();

    let openCount = complaints.values().toArray().filter(func(c) {
      c.status == #open
    }).size();

    let inProgressCount = complaints.values().toArray().filter(func(c) {
      c.status == #inProgress
    }).size();

    let resolvedCount = complaints.values().toArray().filter(func(c) {
      c.status == #resolved
    }).size();

    {
      totalComputers = computers.size();
      totalStandbySystems = standbySystems.size();
      openComplaints = openCount;
      computersWithExpiringAMC = expiringCount;
      totalSections = sections.size();
      pendingComplaints = openCount + inProgressCount;
      clearedComplaints = resolvedCount;
      inProgressComplaints = inProgressCount;
    };
  };

  // Stubs for backward compatibility with frontend bindings
  public shared func _initializeAccessControlWithSecret(_ : Text) : async () {};
  public query func isCallerAdmin() : async Bool { false };
  public query func getCallerUserRole() : async { #admin; #user; #guest } { #guest };
  public shared func assignCallerUserRole(_ : Principal, _ : { #admin; #user; #guest }) : async () {};
};
