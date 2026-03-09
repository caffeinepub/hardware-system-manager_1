import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface StockEntry {
    id: string;
    createdAt: bigint;
    slNo: bigint;
    monitorSlNo: string;
    cpuSlNo: string;
    amcExpiryDate: bigint;
    amcTeam: string;
    companyAndModel: string;
    amcStartDate: bigint;
}
export interface Computer {
    id: string;
    ip1: string;
    ip2: string;
    status: Variant_active_standby_retired;
    model: string;
    amcCompany: string;
    datasheetBlob?: ExternalBlob;
    monitorModel: string;
    purchaseDate: bigint;
    createdAt: bigint;
    currentUser: string;
    sectionId: string;
    serialNumber: string;
    notes: string;
    companyName: string;
    brand: string;
    amcEndDate: bigint;
    amcStartDate: bigint;
    remarks: string;
    seatNumber: string;
    monitorSerial: string;
}
export interface ProcessStockEntriesResult {
    updated: bigint;
    addedToStandby: bigint;
}
export interface Complaint {
    id: string;
    status: ComplaintStatus;
    caseClearedDate?: bigint;
    computerId?: string;
    createdAt: bigint;
    spareTakenDate?: bigint;
    unit: string;
    description: string;
    sparesTaken: string;
    extraCol1: string;
    extraCol2: string;
    sectionId?: string;
    reportedBy: string;
    amcTeam: string;
    priority: Priority;
    caseAttendedDate?: bigint;
    resolvedAt?: bigint;
    unitSlNo: string;
}
export interface StandbySystem {
    id: string;
    status: Variant_available_inUse_retired;
    model: string;
    createdAt: bigint;
    assignedSectionId?: string;
    serialNumber: string;
    notes: string;
    brand: string;
    condition: Variant_fair_good_poor;
}
export interface AMCPart {
    id: string;
    associatedComputerId?: string;
    purchaseDate: bigint;
    associatedSectionId?: string;
    partNumber: string;
    supplier: string;
    createdAt: bigint;
    partName: string;
    notes: string;
    warrantyExpiry?: bigint;
    quantity: bigint;
}
export interface Section {
    id: string;
    name: string;
    createdAt: bigint;
    description: string;
    location: string;
}
export interface UserProfile {
    name: string;
}
export enum ComplaintStatus {
    resolved = "resolved",
    open = "open",
    inProgress = "inProgress"
}
export enum Priority {
    low = "low",
    high = "high",
    medium = "medium"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum Variant_active_standby_retired {
    active = "active",
    standby = "standby",
    retired = "retired"
}
export enum Variant_available_inUse_retired {
    available = "available",
    inUse = "inUse",
    retired = "retired"
}
export enum Variant_fair_good_poor {
    fair = "fair",
    good = "good",
    poor = "poor"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createAMCPart(part: AMCPart): Promise<void>;
    createComplaint(complaint: Complaint): Promise<void>;
    createComputer(computer: Computer): Promise<void>;
    createSection(section: Section): Promise<void>;
    createStandbySystem(standbySystem: StandbySystem): Promise<void>;
    createStockEntry(entry: StockEntry): Promise<void>;
    deleteAMCPart(id: string): Promise<void>;
    deleteComplaint(id: string): Promise<void>;
    deleteComputer(id: string): Promise<void>;
    deleteSection(id: string): Promise<void>;
    deleteStandbySystem(id: string): Promise<void>;
    deleteStockEntry(id: string): Promise<void>;
    getAMCPart(id: string): Promise<AMCPart | null>;
    getAllAMCParts(): Promise<Array<AMCPart>>;
    getAllComplaints(): Promise<Array<Complaint>>;
    getAllComputers(): Promise<Array<Computer>>;
    getAllSections(): Promise<Array<Section>>;
    getAllStandbySystems(): Promise<Array<StandbySystem>>;
    getAllStockEntries(): Promise<Array<StockEntry>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getComplaint(id: string): Promise<Complaint | null>;
    getComplaintsByComputer(computerId: string): Promise<Array<Complaint>>;
    getComplaintsBySection(sectionId: string): Promise<Array<Complaint>>;
    getComplaintsByStatus(status: ComplaintStatus): Promise<Array<Complaint>>;
    getComputer(id: string): Promise<Computer | null>;
    getComputersBySection(sectionId: string): Promise<Array<Computer>>;
    getComputersWithExpiringAMC(days: bigint): Promise<Array<Computer>>;
    getDashboardStats(): Promise<{
        totalStandbySystems: bigint;
        totalComputers: bigint;
        computersWithExpiringAMC: bigint;
        openComplaints: bigint;
        totalSections: bigint;
    }>;
    getExpiringAMCParts(days: bigint): Promise<Array<AMCPart>>;
    getSection(id: string): Promise<Section | null>;
    getStandbySystem(id: string): Promise<StandbySystem | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    processStockEntries(): Promise<ProcessStockEntriesResult>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateAMCPart(part: AMCPart): Promise<void>;
    updateComplaint(complaint: Complaint): Promise<void>;
    updateComputer(computer: Computer): Promise<void>;
    updateSection(section: Section): Promise<void>;
    updateStandbySystem(standbySystem: StandbySystem): Promise<void>;
    updateStockEntry(entry: StockEntry): Promise<void>;
}
