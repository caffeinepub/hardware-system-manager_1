import Map "mo:core/Map";
import Array "mo:core/Array";
import Int "mo:core/Int";
import Order "mo:core/Order";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Principal "mo:core/Principal";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

actor {
  // user system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

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

  // New type for result of processStockEntries
  type ProcessStockEntriesResult = {
    updated : Nat;
    addedToStandby : Nat;
  };

  // Stores
  let sections = Map.empty<Text, Section>();
  let computers = Map.empty<Text, Computer>();
  let standbySystems = Map.empty<Text, StandbySystem>();
  let complaints = Map.empty<Text, Complaint>();
  let amcParts = Map.empty<Text, AMCPart>();
  let stockEntries = Map.empty<Text, StockEntry>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  // Section CRUD
  public shared ({ caller }) func createSection(section : Section) : async () {
    sections.add(section.id, section);
  };

  public query ({ caller }) func getSection(id : Text) : async ?Section {
    sections.get(id);
  };

  public query ({ caller }) func getAllSections() : async [Section] {
    sections.values().toArray();
  };

  public shared ({ caller }) func updateSection(section : Section) : async () {
    switch (sections.get(section.id)) {
      case (null) {};
      case (?_) { sections.add(section.id, section) };
    };
  };

  public shared ({ caller }) func deleteSection(id : Text) : async () {
    switch (sections.get(id)) {
      case (null) {};
      case (?_) { sections.remove(id) };
    };
  };

  // Computer CRUD
  public shared ({ caller }) func createComputer(computer : Computer) : async () {
    computers.add(computer.id, computer);
  };

  public query ({ caller }) func getComputer(id : Text) : async ?Computer {
    computers.get(id);
  };

  public query ({ caller }) func getAllComputers() : async [Computer] {
    computers.values().toArray();
  };

  public query ({ caller }) func getComputersBySection(sectionId : Text) : async [Computer] {
    computers.values().toArray().filter(func(c) { c.sectionId == sectionId });
  };

  public query ({ caller }) func getComputersWithExpiringAMC(days : Int) : async [Computer] {
    let now = Time.now();
    let expiryThreshold = now + (days * 24 * 3600 * 1000000000);
    computers.values().toArray().filter(func(c) {
      c.amcEndDate <= expiryThreshold
    });
  };

  public shared ({ caller }) func updateComputer(computer : Computer) : async () {
    switch (computers.get(computer.id)) {
      case (null) {};
      case (?_) { computers.add(computer.id, computer) };
    };
  };

  public shared ({ caller }) func deleteComputer(id : Text) : async () {
    switch (computers.get(id)) {
      case (null) {};
      case (?_) { computers.remove(id) };
    };
  };

  // StandbySystem CRUD
  public shared ({ caller }) func createStandbySystem(standbySystem : StandbySystem) : async () {
    standbySystems.add(standbySystem.id, standbySystem);
  };

  public query ({ caller }) func getStandbySystem(id : Text) : async ?StandbySystem {
    standbySystems.get(id);
  };

  public query ({ caller }) func getAllStandbySystems() : async [StandbySystem] {
    standbySystems.values().toArray();
  };

  public shared ({ caller }) func updateStandbySystem(standbySystem : StandbySystem) : async () {
    switch (standbySystems.get(standbySystem.id)) {
      case (null) {};
      case (?_) { standbySystems.add(standbySystem.id, standbySystem) };
    };
  };

  public shared ({ caller }) func deleteStandbySystem(id : Text) : async () {
    switch (standbySystems.get(id)) {
      case (null) {};
      case (?_) { standbySystems.remove(id) };
    };
  };

  // Complaint CRUD
  public shared ({ caller }) func createComplaint(complaint : Complaint) : async () {
    complaints.add(complaint.id, complaint);
  };

  public query ({ caller }) func getComplaint(id : Text) : async ?Complaint {
    complaints.get(id);
  };

  public query ({ caller }) func getAllComplaints() : async [Complaint] {
    complaints.values().toArray();
  };

  public query ({ caller }) func getComplaintsByStatus(
    status : ComplaintStatus
  ) : async [Complaint] {
    complaints.values().toArray().filter(func(c) { c.status == status });
  };

  public query ({ caller }) func getComplaintsBySection(
    sectionId : Text
  ) : async [Complaint] {
    complaints.values().toArray().filter(func(c) {
      switch (c.sectionId) {
        case (null) { false };
        case (?id) { id == sectionId };
      }
    });
  };

  public query ({ caller }) func getComplaintsByComputer(
    computerId : Text
  ) : async [Complaint] {
    complaints.values().toArray().filter(func(c) {
      switch (c.computerId) {
        case (null) { false };
        case (?id) { id == computerId };
      }
    });
  };

  public shared ({ caller }) func updateComplaint(complaint : Complaint) : async () {
    switch (complaints.get(complaint.id)) {
      case (null) {};
      case (?_) { complaints.add(complaint.id, complaint) };
    };
  };

  public shared ({ caller }) func deleteComplaint(id : Text) : async () {
    switch (complaints.get(id)) {
      case (null) {};
      case (?_) { complaints.remove(id) };
    };
  };

  // AMCPart CRUD
  public shared ({ caller }) func createAMCPart(part : AMCPart) : async () {
    amcParts.add(part.id, part);
  };

  public query ({ caller }) func getAMCPart(id : Text) : async ?AMCPart {
    amcParts.get(id);
  };

  public query ({ caller }) func getAllAMCParts() : async [AMCPart] {
    amcParts.values().toArray();
  };

  public query ({ caller }) func getExpiringAMCParts(days : Int) : async [AMCPart] {
    let now = Time.now();
    let expiryThreshold = now + (days * 24 * 3600 * 1000000000);
    amcParts.values().toArray().filter(func(p) {
      switch (p.warrantyExpiry) {
        case (null) { false };
        case (?expiry) { expiry <= expiryThreshold };
      }
    });
  };

  public shared ({ caller }) func updateAMCPart(part : AMCPart) : async () {
    switch (amcParts.get(part.id)) {
      case (null) {};
      case (?_) { amcParts.add(part.id, part) };
    };
  };

  public shared ({ caller }) func deleteAMCPart(id : Text) : async () {
    switch (amcParts.get(id)) {
      case (null) {};
      case (?_) { amcParts.remove(id) };
    };
  };

  // User Profile Management
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    userProfiles.add(caller, profile);
  };

  // New StockEntry CRUD operations (no permission checks)
  public shared ({ caller }) func createStockEntry(entry : StockEntry) : async () {
    stockEntries.add(entry.id, entry);
  };

  public query ({ caller }) func getAllStockEntries() : async [StockEntry] {
    stockEntries.values().toArray().sort(
      func(a, b) {
        if (a.slNo < b.slNo) { #less } else if (a.slNo > b.slNo) {
          #greater;
        } else { #equal };
      }
    );
  };

  public shared ({ caller }) func updateStockEntry(entry : StockEntry) : async () {
    switch (stockEntries.get(entry.id)) {
      case (null) {};
      case (?_) { stockEntries.add(entry.id, entry) };
    };
  };

  public shared ({ caller }) func deleteStockEntry(id : Text) : async () {
    switch (stockEntries.get(id)) {
      case (null) {};
      case (?_) { stockEntries.remove(id) };
    };
  };

  // New processStockEntries function (no permission check)
  public shared ({ caller }) func processStockEntries() : async ProcessStockEntriesResult {
    var updatedComputers = 0;
    var addedToStandby = 0;

    let entries = stockEntries.values().toArray();
    for (entry in entries.values()) {
      let cpuSlNo = entry.cpuSlNo;

      // Try to find computer by serial number
      let computerMatch = computers.values().toArray().find(
        func(comp) {
          comp.serialNumber.toLower().contains(#text(cpuSlNo.toLower()));
        }
      );

      switch (computerMatch) {
        case (null) {
          // No computer found, check for standby system
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
          // Computer found, update its fields
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

  // Dashboard Stats - accessible to all including guests
  public query ({ caller }) func getDashboardStats() : async {
    totalComputers : Nat;
    totalStandbySystems : Nat;
    openComplaints : Nat;
    computersWithExpiringAMC : Nat;
    totalSections : Nat;
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

    {
      totalComputers = computers.size();
      totalStandbySystems = standbySystems.size();
      openComplaints = openCount;
      computersWithExpiringAMC = expiringCount;
      totalSections = sections.size();
    };
  };
};
