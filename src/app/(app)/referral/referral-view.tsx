"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Gift, Copy, Users, DollarSign, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

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

export function ReferralView({ affiliate, referrals }: { affiliate: Affiliate | null; referrals: Referral[] }) {
  const referralCode = affiliate?.referral_code || "—";
  const referralLink = `${typeof window !== "undefined" ? window.location.origin : ""}/book/damien?ref=${referralCode}`;

  function copyLink() {
    navigator.clipboard.writeText(referralLink);
    toast.success("Lien copié !");
  }

  function maskEmail(email: string | null) {
    if (!email) return "—";
    const [local, domain] = email.split("@");
    if (!domain) return email;
    return `${local.slice(0, 2)}***@${domain}`;
  }

  return (
    <div>
      <PageHeader title="Programme de parrainage" description="Parrainez et gagnez des commissions" />

      {/* Referral link */}
      <Card className="mb-6 bg-brand-dark text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-brand/20 flex items-center justify-center">
              <Gift className="h-6 w-6 text-brand" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Votre lien de parrainage</h3>
              <p className="text-white/70 text-sm">Partagez ce lien et gagnez 10% de commission sur chaque vente.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Input value={referralLink} readOnly className="bg-white/10 border-white/20 text-white" />
            <Button onClick={copyLink} className="bg-brand text-brand-dark hover:bg-brand/90 shrink-0">
              <Copy className="h-4 w-4 mr-1" />
              Copier
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-brand mx-auto mb-2" />
            <p className="text-2xl font-bold">{affiliate?.total_referrals || 0}</p>
            <p className="text-xs text-muted-foreground">Parrainages</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-5 w-5 text-brand mx-auto mb-2" />
            <p className="text-2xl font-bold">{affiliate?.total_converted || 0}</p>
            <p className="text-xs text-muted-foreground">Convertis</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 text-brand mx-auto mb-2" />
            <p className="text-2xl font-bold">{(affiliate?.total_commission || 0).toLocaleString("fr-FR")} €</p>
            <p className="text-xs text-muted-foreground">Commissions</p>
          </CardContent>
        </Card>
      </div>

      {/* Referral history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historique</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {referrals.map((ref) => (
              <div key={ref.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">{ref.referred_name || maskEmail(ref.referred_email)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(ref.created_at), { addSuffix: true, locale: fr })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={ref.status === "converted" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                    {ref.status === "converted" ? "Converti" : ref.status === "pending" ? "En attente" : "Expiré"}
                  </Badge>
                  <span className="text-sm font-medium">
                    {ref.commission > 0 ? `${ref.commission.toLocaleString("fr-FR")} €` : "—"}
                  </span>
                </div>
              </div>
            ))}
            {referrals.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Gift className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="font-medium">Aucun parrainage</p>
                <p className="text-sm">Partagez votre lien pour commencer à gagner.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
