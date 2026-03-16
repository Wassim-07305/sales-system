"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Gift,
  CreditCard,
  Calendar,
  GraduationCap,
  Banknote,
  ArrowLeft,
  Star,
  Loader2,
  History,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { redeemReward } from "@/lib/actions/gamification";
import type { Reward } from "@/lib/reward-definitions";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  CreditCard,
  Calendar,
  Gift,
  GraduationCap,
  Banknote,
};

interface RedemptionEntry {
  id: string;
  createdAt: string;
  rewardName: string;
  pointsSpent: number;
}

interface Props {
  rewards: Reward[];
  currentPoints: number;
  history: RedemptionEntry[];
}

export function RewardsView({ rewards, currentPoints, history }: Props) {
  const [points, setPoints] = useState(currentPoints);
  const [redemptions, setRedemptions] = useState(history);
  const [confirmReward, setConfirmReward] = useState<Reward | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRedeem() {
    if (!confirmReward) return;
    const reward = confirmReward;

    startTransition(async () => {
      const result = await redeemReward(reward.id);
      if (result.success) {
        setPoints(result.remainingPoints!);
        setRedemptions((prev) => [
          {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            rewardName: reward.name,
            pointsSpent: reward.pointsCost,
          },
          ...prev,
        ]);
        toast.success(`${reward.name} obtenue !`, {
          description: `${reward.pointsCost} points d\u00e9duits. Il vous reste ${result.remainingPoints} points.`,
        });
      } else {
        toast.error("Erreur", { description: result.error });
      }
      setConfirmReward(null);
    });
  }

  return (
    <div>
      <PageHeader
        title="R\u00e9compenses"
        description="\u00c9changez vos points contre des primes et r\u00e9compenses r\u00e9elles"
      >
        <Link href="/challenges">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux d\u00e9fis
          </Button>
        </Link>
      </PageHeader>

      {/* Points balance */}
      <Card className="mb-6 rounded-2xl bg-gradient-to-r from-brand-dark to-brand-dark/80 text-white border-0 shadow-xl shadow-brand-dark/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-brand/20 border-2 border-brand flex items-center justify-center">
              <Star className="h-7 w-7 text-brand" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Votre solde actuel</p>
              <p className="text-3xl font-bold">
                {points.toLocaleString("fr-FR")} points
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rewards grid */}
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <Gift className="h-5 w-5 text-brand" />
        Catalogue des r\u00e9compenses
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {rewards.map((reward) => {
          const IconComponent = ICON_MAP[reward.icon] || Gift;
          const canAfford = points >= reward.pointsCost;
          return (
            <Card
              key={reward.id}
              className={`rounded-2xl border-border/40 transition-all duration-300 ${!canAfford ? "opacity-50 grayscale" : "hover:shadow-lg hover:shadow-brand/5 hover:-translate-y-0.5"}`}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                      canAfford
                        ? "bg-brand/10 text-brand"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm mb-0.5">
                      {reward.name}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {reward.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={canAfford ? "text-brand border-brand/30" : ""}
                  >
                    {reward.pointsCost.toLocaleString("fr-FR")} pts
                  </Badge>
                  <Button
                    size="sm"
                    disabled={!canAfford}
                    onClick={() => setConfirmReward(reward)}
                  >
                    \u00c9changer
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Redemption history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-brand" />
            Historique des \u00e9changes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {redemptions.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              Aucun \u00e9change pour le moment. \u00c9changez vos points contre
              des r\u00e9compenses !
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>R\u00e9compense</TableHead>
                  <TableHead className="text-right">
                    Points d\u00e9pens\u00e9s
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {redemptions.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm">
                      {format(new Date(entry.createdAt), "d MMM yyyy", {
                        locale: fr,
                      })}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {entry.rewardName}
                    </TableCell>
                    <TableCell className="text-sm text-right text-muted-foreground">
                      -{entry.pointsSpent.toLocaleString("fr-FR")} pts
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <Dialog
        open={!!confirmReward}
        onOpenChange={(open) => !open && setConfirmReward(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer l&apos;\u00e9change</DialogTitle>
            <DialogDescription>
              Vous \u00eates sur le point d&apos;\u00e9changer{" "}
              <strong>
                {confirmReward?.pointsCost.toLocaleString("fr-FR")} points
              </strong>{" "}
              contre :
            </DialogDescription>
          </DialogHeader>
          {confirmReward && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              {(() => {
                const IC = ICON_MAP[confirmReward.icon] || Gift;
                return <IC className="h-6 w-6 text-brand shrink-0" />;
              })()}
              <div>
                <p className="font-semibold">{confirmReward.name}</p>
                <p className="text-sm text-muted-foreground">
                  {confirmReward.description}
                </p>
              </div>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Apr\u00e8s l&apos;\u00e9change, il vous restera{" "}
            <strong>
              {(points - (confirmReward?.pointsCost ?? 0)).toLocaleString(
                "fr-FR",
              )}{" "}
              points
            </strong>
            .
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmReward(null)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button onClick={handleRedeem} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  \u00c9change en cours...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirmer l&apos;\u00e9change
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
