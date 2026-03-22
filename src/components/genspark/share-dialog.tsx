"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Share2, Users, Trash2, Loader2, UserPlus } from "lucide-react";
import {
  sharePresentation,
  getPresentationShares,
  removePresentationShare,
} from "@/lib/actions/genspark";

interface ShareDialogProps {
  presentationId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ShareEntry {
  id: string;
  permission: string;
  userName: string;
  userEmail: string;
}

export function ShareDialog({
  presentationId,
  isOpen,
  onClose,
}: ShareDialogProps) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"view" | "edit">("view");
  const [shares, setShares] = useState<ShareEntry[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isOpen && presentationId) {
      setIsLoading(true);
      getPresentationShares(presentationId)
        .then((data) => setShares(data))
        .catch(() => toast.error("Erreur lors du chargement des partages"))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, presentationId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleShare() {
    if (!email.trim()) {
      toast.error("Veuillez saisir un email");
      return;
    }
    startTransition(async () => {
      try {
        await sharePresentation({
          presentationId,
          sharedWithEmail: email.trim(),
          permission,
        });
        toast.success("Présentation partagée");
        setEmail("");
        const updated = await getPresentationShares(presentationId);
        setShares(updated);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Erreur lors du partage",
        );
      }
    });
  }

  function handleRemove(shareId: string) {
    startTransition(async () => {
      try {
        await removePresentationShare(shareId);
        setShares((prev) => prev.filter((s) => s.id !== shareId));
        toast.success("Partage supprimé");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Erreur lors de la suppression",
        );
      }
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg ring-1 ring-emerald-500/20 bg-emerald-500/10 flex items-center justify-center">
              <Share2 className="h-4 w-4 text-emerald-500" />
            </div>
            Partager la présentation
          </DialogTitle>
          <DialogDescription>
            Invitez des membres de votre équipe à consulter ou modifier cette
            présentation.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            placeholder="Email du collaborateur"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 h-9 text-xs"
            onKeyDown={(e) => e.key === "Enter" && handleShare()}
          />
          <Select
            value={permission}
            onValueChange={(v) => setPermission(v as "view" | "edit")}
          >
            <SelectTrigger className="w-[120px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="view">Lecture</SelectItem>
              <SelectItem value="edit">Édition</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleShare} disabled={isPending} size="sm">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Partager"
            )}
          </Button>
        </div>

        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Partagé avec ({shares.length})
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : shares.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6">
              <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                <UserPlus className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Cette présentation n&apos;est partagée avec personne.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 hover:shadow-md transition-all"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {share.userName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {share.userEmail}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        share.permission === "edit"
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : "bg-muted/60 text-muted-foreground border-border/50"
                      }
                    >
                      {share.permission === "edit" ? "Édition" : "Lecture"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(share.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
