import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AMCPart,
  Complaint,
  Computer,
  Section,
  StandbySystem,
} from "../backend";
import type { ComplaintStatus } from "../backend";
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

// ─── Computers ────────────────────────────────────────────────────────────────

export function useGetAllComputers() {
  const { actor, isFetching } = useActor();
  return useQuery<Computer[]>({
    queryKey: ["computers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllComputers();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetComputersBySection(sectionId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Computer[]>({
    queryKey: ["computers", "section", sectionId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getComputersBySection(sectionId);
    },
    enabled: !!actor && !isFetching && !!sectionId,
  });
}

export function useGetComputersWithExpiringAMC(days: number) {
  const { actor, isFetching } = useActor();
  return useQuery<Computer[]>({
    queryKey: ["computers", "expiring-amc", days],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getComputersWithExpiringAMC(BigInt(days));
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
      return actor.createComputer(computer);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["computers"] }),
  });
}

export function useUpdateComputer() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (computer: Computer) => {
      if (!actor) throw new Error("No actor");
      return actor.updateComputer(computer);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["computers"] }),
  });
}

export function useDeleteComputer() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteComputer(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["computers"] }),
  });
}

// ─── Standby Systems ──────────────────────────────────────────────────────────

export function useGetAllStandbySystems() {
  const { actor, isFetching } = useActor();
  return useQuery<StandbySystem[]>({
    queryKey: ["standby"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllStandbySystems();
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
      return actor.createStandbySystem(ss);
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
      return actor.updateStandbySystem(ss);
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
      return actor.deleteStandbySystem(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["standby"] }),
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

export function useGetComplaintsByStatus(status: ComplaintStatus) {
  const { actor, isFetching } = useActor();
  return useQuery<Complaint[]>({
    queryKey: ["complaints", "status", status],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getComplaintsByStatus(status);
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

// ─── AMC Parts ────────────────────────────────────────────────────────────────

export function useGetAllAMCParts() {
  const { actor, isFetching } = useActor();
  return useQuery<AMCPart[]>({
    queryKey: ["amc-parts"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllAMCParts();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetExpiringAMCParts(days: number) {
  const { actor, isFetching } = useActor();
  return useQuery<AMCPart[]>({
    queryKey: ["amc-parts", "expiring", days],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getExpiringAMCParts(BigInt(days));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateAMCPart() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (part: AMCPart) => {
      if (!actor) throw new Error("No actor");
      return actor.createAMCPart(part);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["amc-parts"] }),
  });
}

export function useUpdateAMCPart() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (part: AMCPart) => {
      if (!actor) throw new Error("No actor");
      return actor.updateAMCPart(part);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["amc-parts"] }),
  });
}

export function useDeleteAMCPart() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteAMCPart(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["amc-parts"] }),
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
