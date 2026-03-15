"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Plus, X, UserCircle, Users } from "lucide-react";
import { toast } from "sonner";
import {
  assignSetter,
  unassignSetter,
  type BusinessWithSetters,
  type SetterProfile,
} from "@/lib/actions/team-assignments";

interface AssignmentsBoardProps {
  initialAssignments: BusinessWithSetters[];
  initialUnassigned: SetterProfile[];
}

export function AssignmentsBoard({
  initialAssignments,
  initialUnassigned,
}: AssignmentsBoardProps) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [unassigned, setUnassigned] = useState(initialUnassigned);
  const [isPending, startTransition] = useTransition();

  function handleAssign(setterId: string, businessId: string) {
    const setter = unassigned.find((s) => s.id === setterId);
    if (!setter) return;

    // Optimistic update
    setUnassigned((prev) => prev.filter((s) => s.id !== setterId));
    setAssignments((prev) =>
      prev.map((biz) =>
        biz.id === businessId
          ? { ...biz, setters: [...biz.setters, setter] }
          : biz
      )
    );

    startTransition(async () => {
      try {
        await assignSetter(setterId, businessId);
        toast.success("Setter affecté avec succès");
      } catch (err) {
        // Rollback
        setUnassigned((prev) => [...prev, setter]);
        setAssignments((prev) =>
          prev.map((biz) =>
            biz.id === businessId
              ? { ...biz, setters: biz.setters.filter((s) => s.id !== setterId) }
              : biz
          )
        );
        toast.error(err instanceof Error ? err.message : "Erreur lors de l'affectation");
      }
    });
  }

  function handleUnassign(setterId: string, businessId: string) {
    const biz = assignments.find((b) => b.id === businessId);
    const setter = biz?.setters.find((s) => s.id === setterId);
    if (!setter) return;

    // Optimistic update
    setAssignments((prev) =>
      prev.map((b) =>
        b.id === businessId
          ? { ...b, setters: b.setters.filter((s) => s.id !== setterId) }
          : b
      )
    );
    setUnassigned((prev) => [...prev, setter]);

    startTransition(async () => {
      try {
        await unassignSetter(setterId);
        toast.success("Setter désaffecté");
      } catch (err) {
        // Rollback
        setAssignments((prev) =>
          prev.map((b) =>
            b.id === businessId
              ? { ...b, setters: [...b.setters, setter] }
              : b
          )
        );
        setUnassigned((prev) => prev.filter((s) => s.id !== setterId));
        toast.error(err instanceof Error ? err.message : "Erreur lors de la désaffectation");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Résumé */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Building2 className="h-4 w-4" />
          {assignments.length} entreprise{assignments.length > 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="h-4 w-4" />
          {unassigned.length} setter{unassigned.length > 1 ? "s" : ""} non affecté{unassigned.length > 1 ? "s" : ""}
        </span>
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Aucune entreprise B2B enregistrée</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {assignments.map((biz) => (
            <BusinessCard
              key={biz.id}
              business={biz}
              unassigned={unassigned}
              isPending={isPending}
              onAssign={handleAssign}
              onUnassign={handleUnassign}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BusinessCard({
  business,
  unassigned,
  isPending,
  onAssign,
  onUnassign,
}: {
  business: BusinessWithSetters;
  unassigned: SetterProfile[];
  isPending: boolean;
  onAssign: (setterId: string, businessId: string) => void;
  onUnassign: (setterId: string, businessId: string) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSetter, setSelectedSetter] = useState<string>("");

  return (
    <Card className="border-border/50 hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand font-bold text-sm shrink-0 ring-1 ring-brand/20">
            {business.full_name?.charAt(0) || business.email.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base truncate">
              {business.full_name || business.email}
            </CardTitle>
            {business.company && (
              <p className="text-xs text-muted-foreground truncate">
                {business.company}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Setters affectés */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Setters affectés ({business.setters.length})
          </p>

          {business.setters.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Aucun setter affecté
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {business.setters.map((setter) => (
                <Badge
                  key={setter.id}
                  variant="secondary"
                  className="flex items-center gap-1.5 pr-1"
                >
                  <UserCircle className="h-3.5 w-3.5" />
                  <span className="max-w-[120px] truncate">
                    {setter.full_name || setter.email}
                  </span>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => onUnassign(setter.id, business.id)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors disabled:opacity-50"
                    title="Retirer ce setter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Bouton d'ajout */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={unassigned.length === 0}
            >
              <Plus className="h-4 w-4" />
              Affecter un setter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Affecter un setter à {business.full_name || business.email}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Select
                value={selectedSetter}
                onValueChange={setSelectedSetter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un setter" />
                </SelectTrigger>
                <SelectContent>
                  {unassigned.map((setter) => (
                    <SelectItem key={setter.id} value={setter.id}>
                      {setter.full_name || setter.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="w-full"
                disabled={!selectedSetter || isPending}
                onClick={() => {
                  if (selectedSetter) {
                    onAssign(selectedSetter, business.id);
                    setSelectedSetter("");
                    setDialogOpen(false);
                  }
                }}
              >
                Confirmer l&apos;affectation
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
