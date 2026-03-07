import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Edit2, Monitor, Plus, Trash2 } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Computer, Section } from "../backend";
import { useAdmin } from "../contexts/AdminContext";
import {
  useCreateSection,
  useDeleteSection,
  useGetAllComputers,
  useGetAllSections,
  useUpdateSection,
} from "../hooks/useQueries";

const emptySection = (): Omit<Section, "id" | "createdAt"> => ({
  name: "",
  description: "",
  location: "", // kept in data model, just hidden from UI
});

function SeatCard({ computer }: { computer: Computer }) {
  return (
    <div className="seat-card">
      <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center mb-1">
        <Monitor className="w-4 h-4 text-primary" />
      </div>
      <span className="text-sm font-display font-semibold text-foreground leading-tight">
        Seat {computer.seatNumber}
      </span>
      <sub className="text-xs text-muted-foreground mt-0.5 leading-tight block not-italic">
        {computer.currentUser || "Unassigned"}
      </sub>
    </div>
  );
}

export default function Sections() {
  const { isLoggedIn } = useAdmin();
  const { data: sections = [], isLoading: sectionsLoading } =
    useGetAllSections();
  const { data: computers = [] } = useGetAllComputers();
  const createMutation = useCreateSection();
  const updateMutation = useUpdateSection();
  const deleteMutation = useDeleteSection();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptySection());

  const sectionComputers = (sectionId: string) =>
    computers.filter((c) => c.sectionId === sectionId);

  const openAdd = () => {
    setEditingSection(null);
    setForm(emptySection());
    setDialogOpen(true);
  };

  const openEdit = (section: Section) => {
    setEditingSection(section);
    setForm({
      name: section.name,
      description: section.description,
      location: section.location,
    });
    setDialogOpen(true);
  };

  const openDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Section name is required");
      return;
    }
    try {
      if (editingSection) {
        await updateMutation.mutateAsync({
          ...editingSection,
          ...form,
        });
        toast.success("Section updated");
      } else {
        await createMutation.mutateAsync({
          id: crypto.randomUUID(),
          ...form,
          createdAt: BigInt(Date.now()),
        });
        toast.success("Section created");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save section");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteMutation.mutateAsync(deletingId);
      toast.success("Section deleted");
      setDeleteDialogOpen(false);
    } catch {
      toast.error("Failed to delete section");
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 animate-fade-in" data-ocid="sections.section">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">
            Sections
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage department sections and their computer seats
          </p>
        </div>
        {isLoggedIn && (
          <Button
            onClick={openAdd}
            size="sm"
            className="gap-2"
            data-ocid="sections.primary_button"
          >
            <Plus className="w-4 h-4" />
            Add Section
          </Button>
        )}
      </div>

      {sectionsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {["sk1", "sk2", "sk3", "sk4"].map((sk) => (
            <Skeleton
              key={sk}
              className="h-48 rounded-xl"
              data-ocid="sections.loading_state"
            />
          ))}
        </div>
      ) : sections.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-xl border-2 border-dashed border-border text-muted-foreground gap-3"
          data-ocid="sections.empty_state"
        >
          <Building2 className="w-12 h-12 opacity-30" />
          <p className="font-display font-semibold text-lg">No sections yet</p>
          <p className="text-sm text-center max-w-xs">
            {isLoggedIn
              ? 'Click "Add Section" to create your first section'
              : "No sections have been created yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {sections.map((section, idx) => {
            const seats = sectionComputers(section.id);
            return (
              <div
                key={section.id}
                className="section-card shadow-section"
                data-ocid={`sections.item.${idx + 1}`}
              >
                {/* Section heading */}
                <div className="section-card-header">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display font-bold text-foreground text-base leading-tight truncate">
                        {section.name}
                      </h3>
                    </div>
                  </div>
                  {isLoggedIn && (
                    <div className="flex gap-1 flex-shrink-0 ml-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 hover:bg-primary/10 hover:text-primary"
                        onClick={() => openEdit(section)}
                        data-ocid={`sections.edit_button.${idx + 1}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => openDelete(section.id)}
                        data-ocid={`sections.delete_button.${idx + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Section body */}
                <div className="p-4 space-y-3">
                  {section.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {section.description}
                    </p>
                  )}

                  {/* Seats */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Seats ({seats.length})
                    </p>
                    {seats.length === 0 ? (
                      <div
                        className="flex items-center justify-center h-16 rounded-lg border border-dashed border-border text-muted-foreground text-xs"
                        data-ocid={"sections.empty_state"}
                      >
                        No computers registered
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {seats.map((computer) => (
                          <SeatCard key={computer.id} computer={computer} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-ocid="sections.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingSection ? "Edit Section" : "Add New Section"}
            </DialogTitle>
            <DialogDescription>
              {editingSection
                ? "Update section information below."
                : "Fill in the section details to create a new section."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="sec-name">Section Name *</Label>
              <Input
                id="sec-name"
                placeholder="e.g. Accounts Department"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                data-ocid="sections.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sec-desc">Description</Label>
              <Textarea
                id="sec-desc"
                placeholder="Optional description..."
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                data-ocid="sections.textarea"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              data-ocid="sections.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              data-ocid="sections.submit_button"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingSection ? "Update" : "Create"} Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-ocid="sections.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Delete Section?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All computer assignments to this
              section will be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="sections.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="sections.confirm_button"
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
