import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Complaint,
  Computer,
  Device,
  MovementLog,
  Seat,
  Section,
  StandbySystem,
} from "../backend";
import { useActor } from "./useActor";

// ─── Sections ────────────────────────────────────────────────────────────────

export function useGetAllSections() {
  const { actor, isFetching } = useActor();
  return useQuery<Section[]>({
    queryKey: ["sections"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllSections();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateSection() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (section: Section) => {
      if (!actor) throw new Error("No actor");
      return actor.createSection(section);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sections"] }),
  });
}

export function useUpdateSection() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (section: Section) => {
      if (!actor) throw new Error("No actor");
      return actor.updateSection(section);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sections"] }),
  });
}

export function useDeleteSection() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteSection(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sections"] }),
  });
}

// ─── Devices (unified stock) ──────────────────────────────────────────────────

export function useGetAllDevices() {
  const { actor, isFetching } = useActor();
  return useQuery<Device[]>({
    queryKey: ["devices"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllDevices();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateDevice() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (device: Device) => {
      if (!actor) throw new Error("No actor");
      return actor.createDevice(device);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devices"] }),
  });
}

export function useUpdateDevice() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (device: Device) => {
      if (!actor) throw new Error("No actor");
      return actor.updateDevice(device);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devices"] }),
  });
}

export function useDeleteDevice() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteDevice(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devices"] }),
  });
}

// ─── Seats ────────────────────────────────────────────────────────────────────

export function useGetAllSeats() {
  const { actor, isFetching } = useActor();
  return useQuery<Seat[]>({
    queryKey: ["seats"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllSeats();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateSeat() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (seat: Seat) => {
      if (!actor) throw new Error("No actor");
      return actor.createSeat(seat);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seats"] });
      qc.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

export function useUpdateSeat() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (seat: Seat) => {
      if (!actor) throw new Error("No actor");
      return actor.updateSeat(seat);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seats"] });
      qc.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

export function useDeleteSeat() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteSeat(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seats"] });
      qc.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

// ─── OtherDevices (filtered view of unified Device store) ────────────────────
// Non-computer device types stored in the same Device pool.

const COMPUTER_TYPES = new Set([
  "CPU",
  "Monitor",
  "Micro Computer",
  "All-in-One PC",
]);

export interface OtherDevice {
  id: string;
  slNo: bigint;
  unitArticle: string;
  makeAndModel: string;
  serialNumber: string;
  section: string;
  ipAddress: string;
  workingStatus: string;
  remarks: string;
  createdAt: bigint;
}

function deviceToOtherDevice(d: Device, idx: number): OtherDevice {
  return {
    id: d.id,
    slNo: BigInt(idx + 1),
    unitArticle: d.deviceType,
    makeAndModel: d.makeAndModel,
    serialNumber: d.serialNumber,
    section: d.sectionId,
    ipAddress: d.ipAddress,
    workingStatus: d.workingStatus,
    remarks: d.remarks,
    createdAt: d.createdAt,
  };
}

function otherDeviceToDevice(od: OtherDevice): Device {
  return {
    id: od.serialNumber || od.id,
    serialNumber: od.serialNumber,
    deviceType: od.unitArticle,
    makeAndModel: od.makeAndModel,
    companyName: "",
    amcTeam: "",
    amcStartDate: 0n,
    amcExpiryDate: 0n,
    assignedSeatId: "",
    sectionId: od.section,
    workingStatus: od.workingStatus,
    ipAddress: od.ipAddress,
    remarks: od.remarks,
    previousSection: "",
    dateMovedToStandby: 0n,
    createdAt: od.createdAt || BigInt(Date.now()) * 1_000_000n,
  };
}

export function useGetAllOtherDevices() {
  const { actor, isFetching } = useActor();
  return useQuery<OtherDevice[]>({
    queryKey: ["other-devices"],
    queryFn: async () => {
      if (!actor) return [];
      const all = await actor.getAllDevices();
      return all
        .filter((d) => !COMPUTER_TYPES.has(d.deviceType))
        .map((d, i) => deviceToOtherDevice(d, i));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateOtherDevice() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (device: OtherDevice) => {
      if (!actor) throw new Error("No actor");
      return actor.createDevice(otherDeviceToDevice(device));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["other-devices"] }),
  });
}

export function useUpdateOtherDevice() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (device: OtherDevice) => {
      if (!actor) throw new Error("No actor");
      return actor.updateDevice(otherDeviceToDevice(device));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["other-devices"] }),
  });
}

export function useDeleteOtherDevice() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteDevice(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["other-devices"] }),
  });
}

// ─── Complaints ───────────────────────────────────────────────────────────────

export function useGetAllComplaints() {
  const { actor, isFetching } = useActor();
  return useQuery<Complaint[]>({
    queryKey: ["complaints"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllComplaints();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateComplaint() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (complaint: Complaint) => {
      if (!actor) throw new Error("No actor");
      return actor.createComplaint(complaint);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["complaints"] }),
  });
}

export function useUpdateComplaint() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (complaint: Complaint) => {
      if (!actor) throw new Error("No actor");
      return actor.updateComplaint(complaint);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["complaints"] }),
  });
}

export function useDeleteComplaint() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteComplaint(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["complaints"] }),
  });
}

// ─── Movement Logs ───────────────────────────────────────────────────────────

export function useGetAllMovementLogs() {
  const { actor, isFetching } = useActor();
  return useQuery<MovementLog[]>({
    queryKey: ["movement-logs"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllMovementLogs();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateMovementLog() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (log: MovementLog) => {
      if (!actor) throw new Error("No actor");
      return actor.createMovementLog(log);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["movement-logs"] }),
  });
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function useGetDashboardStats() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getDashboardStats();
    },
    enabled: !!actor && !isFetching,
  });
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["is-admin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

// ─── Legacy Computer hooks (Computers.tsx / DataImport.tsx compat) ────────────
// Maps old Computer interface to Seat + Device in the new backend.

function seatToComputer(seat: Seat, deviceMap: Map<string, Device>): Computer {
  const cpu = deviceMap.get(seat.cpuSerial);
  return {
    id: seat.id,
    sectionId: seat.sectionId,
    seatNumber: seat.seatNumber,
    currentUser: seat.currentUser,
    serialNumber: seat.cpuSerial,
    monitorSerial: seat.monitorSerial,
    model: cpu?.makeAndModel ?? "",
    brand: cpu?.companyName ?? "",
    companyName: cpu?.companyName ?? "",
    amcCompany: cpu?.amcTeam ?? "",
    monitorModel: "",
    ip1: seat.ip1,
    ip2: seat.ip2,
    remarks: seat.remarks,
    notes: "",
    purchaseDate: 0n,
    amcStartDate: cpu?.amcStartDate ?? 0n,
    amcEndDate: cpu?.amcExpiryDate ?? 0n,
    status: "active" as any,
    datasheetBlob: undefined,
    createdAt: seat.createdAt,
  };
}

function computerToSeat(c: Computer): Seat {
  return {
    id: c.id || crypto.randomUUID(),
    sectionId: c.sectionId,
    seatNumber: c.seatNumber,
    currentUser: c.currentUser,
    cpuSerial: c.serialNumber,
    monitorSerial: c.monitorSerial,
    ip1: c.ip1,
    ip2: c.ip2,
    remarks: c.remarks,
    createdAt: c.createdAt || BigInt(Date.now()) * 1_000_000n,
  };
}

export function useGetAllComputers() {
  const { actor, isFetching } = useActor();
  return useQuery<Computer[]>({
    queryKey: ["computers"],
    queryFn: async () => {
      if (!actor) return [];
      const [seats, devices] = await Promise.all([
        actor.getAllSeats(),
        actor.getAllDevices(),
      ]);
      const deviceMap = new Map(devices.map((d) => [d.serialNumber, d]));
      return seats.map((s) => seatToComputer(s, deviceMap));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateComputer() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (computer: Computer) => {
      if (!actor) throw new Error("No actor");
      return actor.createSeat(computerToSeat(computer));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["computers"] });
      qc.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

export function useUpdateComputer() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (computer: Computer) => {
      if (!actor) throw new Error("No actor");
      return actor.updateSeat(computerToSeat(computer));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["computers"] });
      qc.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

export function useDeleteComputer() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteSeat(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["computers"] });
      qc.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

// ─── Legacy StandbySystem hooks (StandbySystems.tsx compat) ──────────────────
// Maps old StandbySystem interface to Device (unassigned) in the new backend.

const STANDBY_COMPUTER_TYPES = new Set([
  "CPU",
  "Monitor",
  "Micro Computer",
  "All-in-One PC",
]);

function deviceToStandby(d: Device): StandbySystem {
  return {
    id: d.id,
    serialNumber: d.serialNumber,
    model: d.makeAndModel,
    brand: d.deviceType,
    condition: "good" as any,
    status: (d.workingStatus || "Available") as any,
    notes: d.remarks,
    assignedSectionId: d.previousSection || undefined,
    createdAt: d.dateMovedToStandby || d.createdAt,
  };
}

function standbyToDevice(ss: StandbySystem): Device {
  return {
    id: ss.id || ss.serialNumber,
    serialNumber: ss.serialNumber,
    deviceType: ss.brand || "CPU",
    makeAndModel: ss.model,
    companyName: "",
    amcTeam: "",
    amcStartDate: 0n,
    amcExpiryDate: 0n,
    assignedSeatId: "",
    sectionId: "",
    workingStatus: ss.status || "Available",
    ipAddress: "",
    remarks: ss.notes,
    previousSection: ss.assignedSectionId ?? "",
    dateMovedToStandby: ss.createdAt,
    createdAt: ss.createdAt,
  };
}

export function useGetAllStandbySystems() {
  const { actor, isFetching } = useActor();
  return useQuery<StandbySystem[]>({
    queryKey: ["standby"],
    queryFn: async () => {
      if (!actor) return [];
      const all = await actor.getAllDevices();
      return all
        .filter(
          (d) =>
            STANDBY_COMPUTER_TYPES.has(d.deviceType) && d.assignedSeatId === "",
        )
        .map(deviceToStandby);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateStandbySystem() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ss: StandbySystem) => {
      if (!actor) throw new Error("No actor");
      return actor.createDevice(standbyToDevice(ss));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["standby"] }),
  });
}

export function useUpdateStandbySystem() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ss: StandbySystem) => {
      if (!actor) throw new Error("No actor");
      return actor.updateDevice(standbyToDevice(ss));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["standby"] }),
  });
}

export function useDeleteStandbySystem() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteDevice(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["standby"] }),
  });
}

// ─── AMC Parts stubs (AMCParts.tsx / MaintenanceCharts.tsx compat) ────────────
import type { AMCPart } from "../backend";

export function useGetAllAMCParts() {
  return { data: [] as AMCPart[], isLoading: false };
}
export function useGetExpiringAMCParts(_days: number) {
  return { data: [] as AMCPart[], isLoading: false };
}
export function useCreateAMCPart() {
  return { mutateAsync: async (_: AMCPart) => {}, isPending: false };
}
export function useUpdateAMCPart() {
  return { mutateAsync: async (_: AMCPart) => {}, isPending: false };
}
export function useDeleteAMCPart() {
  return { mutateAsync: async (_: string) => {}, isPending: false };
}
