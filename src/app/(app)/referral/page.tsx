"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Gift, Copy, Users, DollarSign, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const mockReferrals = [
  { email: "jean@example.com", status: "converted", commission: "350 €" },
  { email: "sarah@example.com", status: "pending", commission: "—" },
  { email: "marc@example.com", status: "converted", commission: "350 €" },
];

export default function ReferralPage() {
  const referralCode = "SALES-XK7M9";
  const referralLink = `https://salessystem.fr/r/${referralCode}`;

  function copyLink() {
    navigator.clipboard.writeText(referralLink);
    toast.success("Lien copié !");
  }

  return (
    <div>
      <PageHeader
        title="Programme de parrainage"
        description="Parrainez et gagnez des commissions"
      />

      {/* Referral link */}
      <Card className="mb-6 bg-brand-dark text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-brand/20 flex items-center justify-center">
              <Gift className="h-6 w-6 text-brand" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Votre lien de parrainage</h3>
              <p className="text-white/70 text-sm">
                Partagez ce lien et gagnez 10% de commission sur chaque vente.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              value={referralLink}
              readOnly
              className="bg-white/10 border-white/20 text-white"
            />
            <Button
              onClick={copyLink}
              className="bg-brand text-brand-dark hover:bg-brand/90 shrink-0"
            >
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
            <p className="text-2xl font-bold">3</p>
            <p className="text-xs text-muted-foreground">Parrainages</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-5 w-5 text-brand mx-auto mb-2" />
            <p className="text-2xl font-bold">2</p>
            <p className="text-xs text-muted-foreground">Convertis</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 text-brand mx-auto mb-2" />
            <p className="text-2xl font-bold">700 €</p>
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
            {mockReferrals.map((ref, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <p className="text-sm font-medium">{ref.email}</p>
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={
                      ref.status === "converted"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }
                  >
                    {ref.status === "converted" ? "Converti" : "En attente"}
                  </Badge>
                  <span className="text-sm font-medium">{ref.commission}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
