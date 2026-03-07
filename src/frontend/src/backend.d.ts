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
export interface Complaint {
    id: string;
    status: Variant_resolved_open_inProgress;
    computerId?: string;
    createdAt: bigint;
    description: string;
    sectionId?: string;
    reportedBy: string;
    priority: Variant_low_high_medium;
    resolvedAt?: bigint;
}
export interface Section {
    id: string;
    name: string;
    createdAt: bigint;
    description: string;
    location: string;
}
export interface Computer {
    id: string;
    status: Variant_active_standby_retired;
    model: string;
    datasheetBlob?: ExternalBlob;
    purchaseDate: bigint;
    createdAt: bigint;
    currentUser: string;
    sectionId: string;
    serialNumber: string;
    notes: string;
    brand: string;
    amcEndDate: bigint;
    amcStartDate: bigint;
    seatNumber: string;
}
export interface UserProfile {
    name: string;
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
export enum Variant_low_high_medium {
    low = "low",
    high = "high",
    medium = "medium"
}
export enum Variant_resolved_open_inProgress {
    resolved = "resolved",
    open = "open",
    inProgress = "inProgress"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createAMCPart(part: AMCPart): Promise<void>;
    createComplaint(complaint: Complaint): Promise<void>;
    createComputer(computer: Computer): Promise<void>;
    createSection(section: Section): Promise<void>;
    createStandbySystem(standbySystem: StandbySystem): Promise<void>;
    deleteAMCPart(id: string): Promise<void>;
    deleteComplaint(id: string): Promise<void>;
    deleteComputer(id: string): Promise<void>;
    deleteSection(id: string): Promise<void>;
    deleteStandbySystem(id: string): Promise<void>;
    getAMCPart(id: string): Promise<AMCPart>;
    getAllAMCParts(): Promise<Array<AMCPart>>;
    getAllComplaints(): Promise<Array<Complaint>>;
    getAllComputers(): Promise<Array<Computer>>;
    getAllSections(): Promise<Array<Section>>;
    getAllStandbySystems(): Promise<Array<StandbySystem>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getComplaint(id: string): Promise<Complaint>;
    getComplaintsByComputer(computerId: string): Promise<Array<Complaint>>;
    getComplaintsBySection(sectionId: string): Promise<Array<Complaint>>;
    getComplaintsByStatus(status: Variant_resolved_open_inProgress): Promise<Array<Complaint>>;
    getComputer(id: string): Promise<Computer>;
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
    getSection(id: string): Promise<Section>;
    getStandbySystem(id: string): Promise<StandbySystem>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateAMCPart(part: AMCPart): Promise<void>;
    updateComplaint(complaint: Complaint): Promise<void>;
    updateComputer(computer: Computer): Promise<void>;
    updateSection(section: Section): Promise<void>;
    updateStandbySystem(standbySystem: StandbySystem): Promise<void>;
}
