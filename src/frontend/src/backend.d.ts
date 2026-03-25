import type { Principal } from "@icp-sdk/core/principal";

export interface Device {
  id: string;
  serialNumber: string;
  deviceType: string;
  makeAndModel: string;
  companyName: string;
  amcTeam: string;
  amcStartDate: bigint;
  amcExpiryDate: bigint;
  assignedSeatId: string;
  sectionId: string;
  workingStatus: string;
  ipAddress: string;
  remarks: string;
  previousSection: string;
  dateMovedToStandby: bigint;
  createdAt: bigint;
  cpuSerialNumber: string;     // For Micro Computer
  monitorSerialNumber: string; // For Micro Computer
}

export interface Seat {
  id: string;
  sectionId: string;
  seatNumber: string;
  currentUser: string;
  cpuSerial: string;
  monitorSerial: string;
  ip1: string;
  ip2: string;
  remarks: string;
  createdAt: bigint;
}

export interface Section {
  id: string;
  name: string;
  description: string;
  location: string;
  createdAt: bigint;
}

export interface Complaint {
  id: string;
  unitSlNo: string;
  unit: string;
  serialNumber: string;
  reportedBy: string;
  amcTeam: string;
  caseLoggedDate: bigint;
  caseAttendedDate: bigint | null;
  sparesTaken: string;
  spareTakenDate: bigint | null;
  caseClearedDate: bigint | null;
  status: string;
  remarks1: string;
  remarks2: string;
  createdAt: bigint;
}

export interface MovementLog {
  id: string;
  dateTime: bigint;
  deviceType: string;
  serialNumber: string;
  action: string;
  previousSection: string;
  newSection: string;
  triggeredFrom: string;
  user: string;
  remarks: string;
}

export interface UserProfile {
  name: string;
}

export interface DashboardStats {
  totalSeats: bigint;
  totalStandbyDevices: bigint;
  pendingComplaints: bigint;
  clearedComplaints: bigint;
  totalOtherDevices: bigint;
  totalDevices: bigint;
}

export enum UserRole {
  admin = "admin",
  user = "user",
  guest = "guest"
}

export type Variant_active_standby_retired = "active" | "standby" | "retired";
export type ExternalBlob = Uint8Array;

export interface Computer {
  id: string;
  sectionId: string;
  seatNumber: string;
  currentUser: string;
  serialNumber: string;
  monitorSerial: string;
  model: string;
  brand: string;
  companyName: string;
  amcCompany: string;
  monitorModel: string;
  ip1: string;
  ip2: string;
  remarks: string;
  notes: string;
  purchaseDate: bigint;
  amcStartDate: bigint;
  amcEndDate: bigint;
  status: Variant_active_standby_retired;
  datasheetBlob?: Uint8Array | null;
  createdAt: bigint;
}

export interface StandbySystem {
  id: string;
  serialNumber: string;
  model: string;
  brand: string;
  condition: "good" | "fair" | "poor";
  status: string;
  notes: string;
  assignedSectionId?: string;
  createdAt: bigint;
}

export interface backendInterface {
  createSection(section: Section): Promise<void>;
  getAllSections(): Promise<Array<Section>>;
  updateSection(section: Section): Promise<void>;
  deleteSection(id: string): Promise<void>;

  createDevice(device: Device): Promise<void>;
  getDevice(id: string): Promise<Device | null>;
  getAllDevices(): Promise<Array<Device>>;
  updateDevice(device: Device): Promise<void>;
  deleteDevice(id: string): Promise<void>;

  createSeat(seat: Seat): Promise<void>;
  getSeat(id: string): Promise<Seat | null>;
  getAllSeats(): Promise<Array<Seat>>;
  updateSeat(seat: Seat): Promise<void>;
  deleteSeat(id: string): Promise<void>;

  createComplaint(complaint: Complaint): Promise<void>;
  getAllComplaints(): Promise<Array<Complaint>>;
  updateComplaint(complaint: Complaint): Promise<void>;
  deleteComplaint(id: string): Promise<void>;

  createMovementLog(log: MovementLog): Promise<void>;
  getAllMovementLogs(): Promise<Array<MovementLog>>;

  getDashboardStats(): Promise<DashboardStats>;

  clearAllData(): Promise<void>;

  getCallerUserProfile(): Promise<UserProfile | null>;
  saveCallerUserProfile(profile: UserProfile): Promise<void>;

  isCallerAdmin(): Promise<boolean>;
  getCallerUserRole(): Promise<UserRole>;
}
