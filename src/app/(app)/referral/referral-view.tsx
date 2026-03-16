"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Gift,
  Copy,
  Users,
  DollarSign,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  Send,
  Share2,
  UserPlus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { sendReferralInvite } from "@/lib/actions/referral";

interface Affiliate {
  id: string;
  referral_code: string;
  total_referrals: number;
  total_converted: number;
  total_commission: number;
}

interface Referral {
  id: string;
  referred_email: string | null;
  referred_name: string | null;
  status: string;
  commission: number;
  created_at: string;
}

interface ReferralStats {
  total: number;
  converted: number;
  pending: number;
  expired: number;
  totalRewards: number;
  conversionRate: number;
}

interface ReferralViewProps {
  affiliate: Affiliate | null;
  referrals: Referral[];
  stats: ReferralStats;
}

export function ReferralView({
  affiliate,
  referrals,
  stats,
}: ReferralViewProps) {
  const referralCode = affiliate?.referral_code || "---";
  const referralLink = `${typeof window !== "undefined" ? window.location.origin : ""}/register?ref=${referralCode}`;
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<
    "all" | "pending" | "converted" | "expired"
  >("all");

  function copyLink() {
    navigator.clipboard.writeText(referralLink);
    toast.success("Lien copié !");
  }

  function copyCode() {
    navigator.clipboard.writeText(referralCode);
    toast.success("Code copié !");
  }

  function shareLink() {
    if (navigator.share) {
      navigator
        .share({
          title: "Rejoignez-moi !",
          text: `Utilisez mon code parrain ${referralCode} pour vous inscrire.`,
          url: referralLink,
        })
        .catch(() => {});
    } else {
      copyLink();
    }
  }

  function handleInvite() {
    if (!inviteEmail.trim()) {
      toast.error("Veuillez saisir un email");
      return;
    }
    startTransition(async () => {
      const result = await sendReferralInvite(
        inviteEmail.trim(),
        inviteName.trim() || undefined,
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Invitation envoyée !");
        setInviteEmail("");
        setInviteName("");
      }
    });
  }

  function maskEmail(email: string | null) {
    if (!email) return "---";
    const [local, domain] = email.split("@");
    if (!domain) return email;
    return `${local.slice(0, 2)}***@${domain}`;
  }

  const filteredReferrals =
    filter === "all" ? referrals : referrals.filter((r) => r.status === filter);

  const statusConfig: Record<
    string,
    { label: string; className: string; icon: typeof Clock }
  > = {
    pending: {
      label: "En attente",
      className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      icon: Clock,
    },
    converted: {
      label: "Converti",
      className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      icon: CheckCircle2,
    },
    expired: {
      label: "Expire",
      className: "bg-muted text-muted-foreground border-border",
      icon: XCircle,
    },
  };

  return (
    <div>
      <PageHeader
        title="Programme de parrainage"
        description="Parrainez vos contacts et gagnez des commissions sur chaque conversion"
      />

      {/* Referral link card */}
      <Card className="mb-6 bg-gradient-to-br from-brand/20 to-brand/5 border-brand/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-lg bg-brand/20 flex items-center justify-center ring-1 ring-brand/20">
              <Gift className="h-6 w-6 text-brand" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Votre lien de parrainage</h3>
              <p className="text-muted-foreground text-sm">
                Partagez ce lien et gagnez 10% de commission sur chaque vente.
              </p>
            </div>
          </div>
          <div className="flex gap-2 mb-3">
            <Input
              value={referralLink}
              readOnly
              className="bg-muted border-border text-foreground"
            />
            <Button
              onClick={copyLink}
              className="bg-brand text-brand-dark hover:bg-brand/90 shrink-0"
            >
              <Copy className="h-4 w-4 mr-1" />
              Copier
            </Button>
            <Button
              onClick={shareLink}
              variant="outline"
              className="border-border text-foreground hover:bg-muted shrink-0"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Code :</span>
            <code className="bg-muted px-2 py-0.5 rounded font-mono text-foreground">
              {referralCode}
            </code>
            <button
              onClick={copyCode}
              className="hover:text-foreground transition-colors"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border-border/50 hover:shadow-md transition-all duration-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Invitations
              </span>
              <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center ring-1 ring-blue-500/20">
                <Send className="h-4 w-4 text-blue-500" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 hover:shadow-md transition-all duration-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                En attente
              </span>
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center ring-1 ring-amber-500/20">
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 hover:shadow-md transition-all duration-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Conversions
              </span>
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold tracking-tight">
                {stats.converted}
              </p>
              {stats.conversionRate > 0 && (
                <span className="text-xs text-emerald-500 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-0.5" />
                  {stats.conversionRate}%
                </span>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 hover:shadow-md transition-all duration-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Recompenses
              </span>
              <div className="h-9 w-9 rounded-xl bg-brand/10 flex items-center justify-center ring-1 ring-brand/20">
                <DollarSign className="h-4 w-4 text-brand" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">
              {stats.totalRewards.toLocaleString("fr-FR")} &euro;
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invite section */}
      <Card className="mb-6 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-brand/10 flex items-center justify-center ring-1 ring-brand/20">
              <UserPlus className="h-4 w-4 text-brand" />
            </div>
            Inviter un contact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Nom (optionnel)"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="sm:w-48"
            />
            <Input
              type="email"
              placeholder="Email du contact"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            />
            <Button
              onClick={handleInvite}
              disabled={isPending}
              className="shrink-0"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              Envoyer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Referral history */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center ring-1 ring-blue-500/20">
                <Users className="h-4 w-4 text-blue-500" />
              </div>
              Historique des parrainages
            </CardTitle>
            <div className="flex gap-1">
              {(["all", "pending", "converted", "expired"] as const).map(
                (f) => (
                  <Button
                    key={f}
                    variant={filter === f ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setFilter(f)}
                    className="text-xs"
                  >
                    {f === "all"
                      ? "Tous"
                      : f === "pending"
                        ? "En attente"
                        : f === "converted"
                          ? "Convertis"
                          : "Expires"}
                  </Button>
                ),
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredReferrals.length > 0 ? (
            <div className="space-y-2">
              {/* Table header */}
              <div className="hidden sm:grid grid-cols-4 gap-4 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <span>Contact</span>
                <span>Date</span>
                <span>Statut</span>
                <span className="text-right">Commission</span>
              </div>
              {filteredReferrals.map((ref) => {
                const sc = statusConfig[ref.status] || statusConfig.pending;
                const StatusIcon = sc.icon;
                return (
                  <div
                    key={ref.id}
                    className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 items-center p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {ref.referred_name || maskEmail(ref.referred_email)}
                      </p>
                      {ref.referred_name && ref.referred_email && (
                        <p className="text-xs text-muted-foreground">
                          {maskEmail(ref.referred_email)}
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(ref.created_at), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                    <div>
                      <Badge
                        variant="outline"
                        className={`${sc.className} gap-1`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {sc.label}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-right">
                      {ref.status === "converted" && ref.commission > 0
                        ? `${ref.commission.toLocaleString("fr-FR")} \u20AC`
                        : "---"}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Gift className="h-7 w-7 opacity-50" />
              </div>
              <p className="font-medium text-base mb-1">
                {filter === "all"
                  ? "Aucun parrainage pour le moment"
                  : `Aucun parrainage ${filter === "pending" ? "en attente" : filter === "converted" ? "converti" : "expire"}`}
              </p>
              <p className="text-sm max-w-sm mx-auto">
                Partagez votre lien de parrainage ou invitez directement vos
                contacts pour commencer a gagner des commissions.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
