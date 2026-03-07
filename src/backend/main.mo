import Map "mo:core/Map";
import Int "mo:core/Int";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Migration "migration";

(with migration = Migration.run)
actor {
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

  // Initialize AccessControl
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User Profile Management
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Section CRUD
  public shared ({ caller }) func createSection(section : Section) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create sections");
    };
    sections.add(section.id, section);
  };

  public query func getSection(id : Text) : async ?Section {
    sections.get(id);
  };

  public query func getAllSections() : async [Section] {
    sections.values().toArray().sort();
  };

  public shared ({ caller }) func updateSection(section : Section) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update sections");
    };
    if (not sections.containsKey(section.id)) {
      return;
    };
    sections.add(section.id, section);
  };

  public shared ({ caller }) func deleteSection(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete sections");
    };
    if (not sections.containsKey(id)) {
      return;
    };
    sections.remove(id);
  };

  // Computer CRUD
  public shared ({ caller }) func createComputer(computer : Computer) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create computers");
    };
    computers.add(computer.id, computer);
  };

  public query func getComputer(id : Text) : async ?Computer {
    computers.get(id);
  };

  public query func getAllComputers() : async [Computer] {
    computers.values().toArray().sort();
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

  public shared ({ caller }) func updateComputer(computer : Computer) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update computers");
    };
    if (not computers.containsKey(computer.id)) {
      return;
    };
    computers.add(computer.id, computer);
  };

  public shared ({ caller }) func deleteComputer(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete computers");
    };
    if (not computers.containsKey(id)) {
      return;
    };
    computers.remove(id);
  };

  // StandbySystem CRUD
  public shared ({ caller }) func createStandbySystem(standbySystem : StandbySystem) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create standby systems");
    };
    standbySystems.add(standbySystem.id, standbySystem);
  };

  public query func getStandbySystem(id : Text) : async ?StandbySystem {
    standbySystems.get(id);
  };

  public query func getAllStandbySystems() : async [StandbySystem] {
    standbySystems.values().toArray().sort();
  };

  public shared ({ caller }) func updateStandbySystem(standbySystem : StandbySystem) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update standby systems");
    };
    if (not standbySystems.containsKey(standbySystem.id)) {
      return;
    };
    standbySystems.add(standbySystem.id, standbySystem);
  };

  public shared ({ caller }) func deleteStandbySystem(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete standby systems");
    };
    if (not standbySystems.containsKey(id)) {
      return;
    };
    standbySystems.remove(id);
  };

  // Complaint CRUD
  public shared ({ caller }) func createComplaint(complaint : Complaint) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create complaints");
    };
    complaints.add(complaint.id, complaint);
  };

  public query func getComplaint(id : Text) : async ?Complaint {
    complaints.get(id);
  };

  public query func getAllComplaints() : async [Complaint] {
    complaints.values().toArray().sort();
  };

  public query func getComplaintsByStatus(status : { #open; #inProgress; #resolved }) : async [Complaint] {
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

  public shared ({ caller }) func updateComplaint(complaint : Complaint) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update complaints");
    };
    if (not complaints.containsKey(complaint.id)) {
      return;
    };
    complaints.add(complaint.id, complaint);
  };

  public shared ({ caller }) func deleteComplaint(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete complaints");
    };
    if (not complaints.containsKey(id)) {
      return;
    };
    complaints.remove(id);
  };

  // AMCPart CRUD
  public shared ({ caller }) func createAMCPart(part : AMCPart) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create AMC parts");
    };
    amcParts.add(part.id, part);
  };

  public query func getAMCPart(id : Text) : async ?AMCPart {
    amcParts.get(id);
  };

  public query func getAllAMCParts() : async [AMCPart] {
    amcParts.values().toArray().sort();
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

  public shared ({ caller }) func updateAMCPart(part : AMCPart) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update AMC parts");
    };
    if (not amcParts.containsKey(part.id)) {
      return;
    };
    amcParts.add(part.id, part);
  };

  public shared ({ caller }) func deleteAMCPart(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete AMC parts");
    };
    if (not amcParts.containsKey(id)) {
      return;
    };
    amcParts.remove(id);
  };

  // Dashboard Stats
  public query func getDashboardStats() : async {
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
