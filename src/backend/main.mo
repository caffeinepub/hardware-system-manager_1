import Map "mo:core/Map";
import Array "mo:core/Array";
import Int "mo:core/Int";
import Order "mo:core/Order";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import Migration "migration";

(with migration = Migration.run)
actor {
  // Initialize the access control system
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

  module Section {
    public func compare(section1 : Section, section2 : Section) : Order.Order {
      section1.id.compare(section2.id);
    };
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

  module Computer {
    public func compare(computer1 : Computer, computer2 : Computer) : Order.Order {
      computer1.id.compare(computer2.id);
    };
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

  module StandbySystem {
    public func compare(standbySystem1 : StandbySystem, standbySystem2 : StandbySystem) : Order.Order {
      standbySystem1.id.compare(standbySystem2.id);
    };
  };

  type Complaint = {
    id : Text;
    computerId : ?Text;
    sectionId : ?Text;
    reportedBy : Text;
    description : Text;
    status : { #open; #inProgress; #resolved };
    priority : { #low; #medium; #high };
    createdAt : Int;
    resolvedAt : ?Int;
  };

  module Complaint {
    public func compare(complaint1 : Complaint, complaint2 : Complaint) : Order.Order {
      complaint1.id.compare(complaint2.id);
    };
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

  module AMCPart {
    public func compare(part1 : AMCPart, part2 : AMCPart) : Order.Order {
      part1.id.compare(part2.id);
    };
  };

  public type UserProfile = {
    name : Text;
  };

  // State
  let sections = Map.empty<Text, Section>();
  let computers = Map.empty<Text, Computer>();
  let standbySystems = Map.empty<Text, StandbySystem>();
  let complaints = Map.empty<Text, Complaint>();
  let amcParts = Map.empty<Text, AMCPart>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  // Role Management
  public type UserRole = { #admin; #user; #guest };

  // User Profile Management
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return null;
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      return null;
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return;
    };
    userProfiles.add(caller, profile);
  };

  // Section CRUD
  public shared ({ caller }) func createSection(section : Section) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return;
    };
    sections.add(section.id, section);
  };

  public query ({ caller }) func getSection(id : Text) : async ?Section {
    sections.get(id);
  };

  public query ({ caller }) func getAllSections() : async [Section] {
    sections.values().toArray().sort();
  };

  public shared ({ caller }) func updateSection(section : Section) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return;
    };
    switch (sections.get(section.id)) {
      case (null) {};
      case (?_) { sections.add(section.id, section) };
    };
  };

  public shared ({ caller }) func deleteSection(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      return;
    };
    switch (sections.get(id)) {
      case (null) {};
      case (?_) { sections.remove(id) };
    };
  };

  // Computer CRUD
  public shared ({ caller }) func createComputer(computer : Computer) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return;
    };
    computers.add(computer.id, computer);
  };

  public query ({ caller }) func getComputer(id : Text) : async ?Computer {
    computers.get(id);
  };

  public query ({ caller }) func getAllComputers() : async [Computer] {
    computers.values().toArray().sort();
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
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return;
    };
    switch (computers.get(computer.id)) {
      case (null) {};
      case (?_) { computers.add(computer.id, computer) };
    };
  };

  public shared ({ caller }) func deleteComputer(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      return;
    };
    switch (computers.get(id)) {
      case (null) {};
      case (?_) { computers.remove(id) };
    };
  };

  // StandbySystem CRUD
  public shared ({ caller }) func createStandbySystem(standbySystem : StandbySystem) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return;
    };
    standbySystems.add(standbySystem.id, standbySystem);
  };

  public query ({ caller }) func getStandbySystem(id : Text) : async ?StandbySystem {
    standbySystems.get(id);
  };

  public query ({ caller }) func getAllStandbySystems() : async [StandbySystem] {
    standbySystems.values().toArray().sort();
  };

  public shared ({ caller }) func updateStandbySystem(standbySystem : StandbySystem) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return;
    };
    switch (standbySystems.get(standbySystem.id)) {
      case (null) {};
      case (?_) { standbySystems.add(standbySystem.id, standbySystem) };
    };
  };

  public shared ({ caller }) func deleteStandbySystem(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      return;
    };
    switch (standbySystems.get(id)) {
      case (null) {};
      case (?_) { standbySystems.remove(id) };
    };
  };

  // Complaint CRUD
  public shared ({ caller }) func createComplaint(complaint : Complaint) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return;
    };
    complaints.add(complaint.id, complaint);
  };

  public query ({ caller }) func getComplaint(id : Text) : async ?Complaint {
    complaints.get(id);
  };

  public query ({ caller }) func getAllComplaints() : async [Complaint] {
    complaints.values().toArray().sort();
  };

  public query ({ caller }) func getComplaintsByStatus(status : { #open; #inProgress; #resolved }) : async [Complaint] {
    complaints.values().toArray().filter(func(c) { c.status == status });
  };

  public query ({ caller }) func getComplaintsBySection(sectionId : Text) : async [Complaint] {
    complaints.values().toArray().filter(func(c) {
      switch (c.sectionId) {
        case (null) { false };
        case (?id) { id == sectionId };
      }
    });
  };

  public query ({ caller }) func getComplaintsByComputer(computerId : Text) : async [Complaint] {
    complaints.values().toArray().filter(func(c) {
      switch (c.computerId) {
        case (null) { false };
        case (?id) { id == computerId };
      }
    });
  };

  public shared ({ caller }) func updateComplaint(complaint : Complaint) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return;
    };
    switch (complaints.get(complaint.id)) {
      case (null) {};
      case (?_) { complaints.add(complaint.id, complaint) };
    };
  };

  public shared ({ caller }) func deleteComplaint(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      return;
    };
    switch (complaints.get(id)) {
      case (null) {};
      case (?_) { complaints.remove(id) };
    };
  };

  // AMCPart CRUD
  public shared ({ caller }) func createAMCPart(part : AMCPart) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return;
    };
    amcParts.add(part.id, part);
  };

  public query ({ caller }) func getAMCPart(id : Text) : async ?AMCPart {
    amcParts.get(id);
  };

  public query ({ caller }) func getAllAMCParts() : async [AMCPart] {
    amcParts.values().toArray().sort();
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
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return;
    };
    switch (amcParts.get(part.id)) {
      case (null) {};
      case (?_) { amcParts.add(part.id, part) };
    };
  };

  public shared ({ caller }) func deleteAMCPart(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      return;
    };
    switch (amcParts.get(id)) {
      case (null) {};
      case (?_) { amcParts.remove(id) };
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
