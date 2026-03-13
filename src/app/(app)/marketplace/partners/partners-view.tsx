"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Handshake,
  Building,
  DollarSign,
  CheckCircle,
  XCircle,
  Plus,
  ChevronDown,
  ChevronUp,
  Star,
  Pencil,
  Ban,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  createPartner,
  approvePartner,
  updatePartner,
  type Partner,
  type PartnerRevenue,
  type PartnerPayout,
} from "@/lib/actions/partners";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface PartnersViewProps {
  partners: Partner[];
  revenueData: {
    monthly: PartnerRevenue[];
    payouts: PartnerPayout[];
  };
}

const TYPE_LABELS: Record<string, string> = {
  technology: "Technologie",
  consulting: "Consulting",
  referral: "Parrainage",
};

const TYPE_COLORS: Record<string, string> = {
  technology: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  consulting: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  referral: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: "Actif", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  pending: { label: "En attente", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  inactive: { label: "Inactif", className: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
};

const PAYOUT_STATUS: Record<string, { label: string; className: string }> = {
  paid: { label: "Payé", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  pending: { label: "En attente", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  processing: { label: "En cours", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

export function PartnersView({ partners, revenueData }: PartnersViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState("active");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formType, setFormType] = useState<"technology" | "consulting" | "referral">("technology");
  const [formCommission, setFormCommission] = useState("15");

  const activePartners = partners.filter((p) => p.status === "active");
  const pendingPartners = partners.filter((p) => p.status === "pending");

  const totalRevenue = activePartners.reduce((sum, p) => sum + p.revenue_generated, 0);
  const totalInstallations = activePartners.reduce((sum, p) => sum + p.installations, 0);
  const avgRating = activePartners.length > 0
    ? activePartners.reduce((sum, p) => sum + p.rating, 0) / activePartners.length
    : 0;

  const stats = [
    {
      label: "Total partenaires",
      value: activePartners.length.toString(),
      icon: Handshake,
      description: `${pendingPartners.length} candidature${pendingPartners.length > 1 ? "s" : ""} en attente`,
    },
    {
      label: "Revenu partagé ce mois",
      value: `${(revenueData.monthly[revenueData.monthly.length - 1]?.commission || 0).toLocaleString("fr-FR")} \u20ac`,
      icon: DollarSign,
      description: "Commissions versées",
    },
    {
      label: "Installations actives",
      value: totalInstallations.toString(),
      icon: Building,
      description: `${totalRevenue.toLocaleString("fr-FR")} \u20ac de revenu total`,
    },
    {
      label: "Taux satisfaction",
      value: `${avgRating.toFixed(1)}/5`,
      icon: Star,
      description: "Note moyenne des partenaires",
    },
  ];

  function resetForm() {
    setFormName("");
    setFormEmail("");
    setFormCompany("");
    setFormType("technology");
    setFormCommission("15");
  }

  function handleCreate() {
    if (!formName || !formEmail || !formCompany) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    startTransition(async () => {
      try {
        await createPartner({
          name: formName,
          email: formEmail,
          company: formCompany,
          type: formType,
          commissionRate: parseFloat(formCommission) || 15,
        });
        toast.success("Partenaire créé avec succès");
        setShowCreateDialog(false);
        resetForm();
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur lors de la création");
      }
    });
  }

  function handleApprove(id: string) {
    startTransition(async () => {
      try {
        await approvePartner(id);
        toast.success("Partenaire approuvé");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur lors de l'approbation");
      }
    });
  }

  function handleReject(id: string) {
    startTransition(async () => {
      try {
        await updatePartner(id, { status: "inactive" } as Partial<Partner>);
        toast.success("Candidature rejetée");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur lors du rejet");
      }
    });
  }

  function handleDeactivate(id: string) {
    startTransition(async () => {
      try {
        await updatePartner(id, { status: "inactive" } as Partial<Partner>);
        toast.success("Partenaire désactivé");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur lors de la désactivation");
      }
    });
  }

  function openEdit(partner: Partner) {
    setEditingPartner(partner);
    setFormName(partner.name);
    setFormEmail(partner.email);
    setFormCompany(partner.company);
    setFormType(partner.type);
    setFormCommission(partner.commission_rate.toString());
    setShowEditDialog(true);
  }

  function handleEdit() {
    if (!editingPartner) return;
    startTransition(async () => {
      try {
        await updatePartner(editingPartner.id, {
          name: formName,
          email: formEmail,
          company: formCompany,
          type: formType,
          commission_rate: parseFloat(formCommission) || 15,
        } as Partial<Partner>);
        toast.success("Partenaire mis à jour");
        setShowEditDialog(false);
        setEditingPartner(null);
        resetForm();
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
      }
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des partenaires"
        description="Gérez vos partenaires, candidatures et revenus partagés"
      >
        <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau partenaire
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-[#7af17a]/10 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-[#7af17a]" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">
            Partenaires actifs
            <Badge variant="secondary" className="ml-2 text-xs">{activePartners.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="applications">
            Candidatures
            {pendingPartners.length > 0 && (
              <Badge className="ml-2 text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                {pendingPartners.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="revenue">Revenus</TabsTrigger>
        </TabsList>

        {/* Active partners tab */}
        <TabsContent value="active" className="mt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Installations</TableHead>
                    <TableHead className="text-right">Revenu généré</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activePartners.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Aucun partenaire actif
                      </TableCell>
                    </TableRow>
                  )}
                  {activePartners.map((partner) => (
                    <>
                      <TableRow
                        key={partner.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedId(expandedId === partner.id ? null : partner.id)}
                      >
                        <TableCell>
                          {expandedId === partner.id ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{partner.name}</TableCell>
                        <TableCell>{partner.company}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={TYPE_COLORS[partner.type]}>
                            {TYPE_LABELS[partner.type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{partner.commission_rate}%</TableCell>
                        <TableCell className="text-right">{partner.installations}</TableCell>
                        <TableCell className="text-right">
                          {partner.revenue_generated.toLocaleString("fr-FR")} &euro;
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_CONFIG[partner.status]?.className}>
                            {STATUS_CONFIG[partner.status]?.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(partner)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-400 hover:text-red-300"
                              onClick={() => handleDeactivate(partner.id)}
                              disabled={isPending}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedId === partner.id && (
                        <TableRow key={`${partner.id}-details`}>
                          <TableCell colSpan={9} className="bg-muted/30 px-8 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">Email</p>
                                <p className="text-sm font-medium">{partner.email}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">Note</p>
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                                  <span className="text-sm font-medium">{partner.rating.toFixed(1)}/5</span>
                                </div>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">Membre depuis</p>
                                <p className="text-sm font-medium">
                                  {new Date(partner.created_at).toLocaleDateString("fr-FR", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                  })}
                                </p>
                              </div>
                              {partner.approved_at && (
                                <div>
                                  <p className="text-sm text-muted-foreground mb-1">Approuvé le</p>
                                  <p className="text-sm font-medium">
                                    {new Date(partner.approved_at).toLocaleDateString("fr-FR", {
                                      day: "numeric",
                                      month: "long",
                                      year: "numeric",
                                    })}
                                  </p>
                                </div>
                              )}
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">Commission effective</p>
                                <p className="text-sm font-medium">
                                  {(partner.revenue_generated * partner.commission_rate / 100).toLocaleString("fr-FR")} &euro;
                                </p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Applications tab */}
        <TabsContent value="applications" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Candidatures en attente</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Commission demandée</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPartners.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Aucune candidature en attente
                      </TableCell>
                    </TableRow>
                  )}
                  {pendingPartners.map((partner) => (
                    <TableRow key={partner.id}>
                      <TableCell className="font-medium">{partner.name}</TableCell>
                      <TableCell>{partner.company}</TableCell>
                      <TableCell className="text-muted-foreground">{partner.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={TYPE_COLORS[partner.type]}>
                          {TYPE_LABELS[partner.type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{partner.commission_rate}%</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(partner.created_at).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(partner.id)}
                            disabled={isPending}
                            className="bg-[#7af17a] text-black hover:bg-[#6ae06a]"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approuver
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(partner.id)}
                            disabled={isPending}
                            className="text-red-400 border-red-400/30 hover:bg-red-500/10"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Rejeter
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue tab */}
        <TabsContent value="revenue" className="mt-4 space-y-6">
          {/* Revenue chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Revenus partagés par mois</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData.monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    />
                    <YAxis
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#14080e",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "white",
                      }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={((value: any) => [`${Number(value || 0).toLocaleString("fr-FR")} \u20ac`, undefined]) as any}
                      labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                    />
                    <Legend />
                    <Bar
                      dataKey="revenue"
                      name="Revenu total"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="commission"
                      name="Commissions"
                      fill="#7af17a"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent payouts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Derniers versements</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Partenaire</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date de paiement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenueData.payouts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Aucun versement
                      </TableCell>
                    </TableRow>
                  )}
                  {revenueData.payouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell className="font-medium">{payout.partner_name}</TableCell>
                      <TableCell className="text-muted-foreground">{payout.period}</TableCell>
                      <TableCell className="text-right font-medium">
                        {payout.amount.toLocaleString("fr-FR")} &euro;
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={PAYOUT_STATUS[payout.status]?.className}>
                          {PAYOUT_STATUS[payout.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {payout.paid_at
                          ? new Date(payout.paid_at).toLocaleDateString("fr-FR")
                          : "\u2014"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau partenaire</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nom complet *</Label>
              <Input
                id="name"
                placeholder="Jean Dupont"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="jean@example.fr"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Entreprise *</Label>
              <Input
                id="company"
                placeholder="Nom de l'entreprise"
                value={formCompany}
                onChange={(e) => setFormCompany(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Type de partenariat</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as typeof formType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technology">Technologie</SelectItem>
                  <SelectItem value="consulting">Consulting</SelectItem>
                  <SelectItem value="referral">Parrainage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="commission">Taux de commission (%)</Label>
              <Input
                id="commission"
                type="number"
                min="1"
                max="50"
                value={formCommission}
                onChange={(e) => setFormCommission(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreate} disabled={isPending}>
                {isPending ? "Création..." : "Créer le partenaire"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le partenaire</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nom complet</Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-company">Entreprise</Label>
              <Input
                id="edit-company"
                value={formCompany}
                onChange={(e) => setFormCompany(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Type de partenariat</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as typeof formType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technology">Technologie</SelectItem>
                  <SelectItem value="consulting">Consulting</SelectItem>
                  <SelectItem value="referral">Parrainage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-commission">Taux de commission (%)</Label>
              <Input
                id="edit-commission"
                type="number"
                min="1"
                max="50"
                value={formCommission}
                onChange={(e) => setFormCommission(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleEdit} disabled={isPending}>
                {isPending ? "Mise à jour..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
