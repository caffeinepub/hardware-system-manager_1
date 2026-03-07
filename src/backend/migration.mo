import Map "mo:core/Map";
import Int "mo:core/Int";
import Principal "mo:core/Principal";
import Storage "blob-storage/Storage";

module {
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

  type UserProfile = {
    name : Text;
  };

  // Define types for old and new actors
  type OldComputer = {
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
  };

  type OldActor = {
    sections : Map.Map<Text, Section>;
    computers : Map.Map<Text, OldComputer>;
    standbySystems : Map.Map<Text, StandbySystem>;
    complaints : Map.Map<Text, Complaint>;
    amcParts : Map.Map<Text, AMCPart>;
    userProfiles : Map.Map<Principal, UserProfile>;
  };

  type NewActor = {
    sections : Map.Map<Text, Section>;
    computers : Map.Map<Text, Computer>;
    standbySystems : Map.Map<Text, StandbySystem>;
    complaints : Map.Map<Text, Complaint>;
    amcParts : Map.Map<Text, AMCPart>;
    userProfiles : Map.Map<Principal, UserProfile>;
  };

  public func run(old : OldActor) : NewActor {
    let newComputers = old.computers.map<Text, OldComputer, Computer>(
      func(_id, oldComputer) {
        {
          oldComputer with
          monitorSerial = "";
          monitorModel = "";
          ip1 = "";
          ip2 = "";
          remarks = "";
        };
      }
    );
    {
      old with
      computers = newComputers;
    };
  };
};
