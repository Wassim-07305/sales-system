"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { createContract, sendContract } from "@/lib/actions/contracts";
import { toast } from "sonner";
import { ArrowLeft, Eye, Send, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  templates: Array<{ id: string; name: string; content: string }>;
  clients: Array<{
    id: string;
    full_name: string | null;
    email: string;
    company: string | null;
  }>;
  deals: Array<{
    id: string;
    title: string;
    value: number;
    contact: { id: string; full_name: string | null; email: string } | null;
  }>;
  initialDealId?: string;
  initialClientId?: string;
  initialAmount?: string;
}

export function NewContractForm({
  templates,
  clients,
  deals,
  initialDealId,
  initialClientId,
  initialAmount,
}: Props) {
  const router = useRouter();
  // Auto-resolve client from deal if not passed directly
  const initialDeal = initialDealId
    ? deals.find((d) => d.id === initialDealId)
    : null;
  const resolvedClientId =
    initialClientId || initialDeal?.contact?.id || "";
  const resolvedOfferName = initialDeal?.title || "";

  const [templateId, setTemplateId] = useState("");
  const [clientId, setClientId] = useState(resolvedClientId);
  const [dealId, setDealId] = useState(initialDealId || "");
  const [amount, setAmount] = useState(
    initialAmount || String(initialDeal?.value || ""),
  );
  const [paymentSchedule, setPaymentSchedule] = useState("");
  const [offerName, setOfferName] = useState(resolvedOfferName);
  const [loading, setLoading] = useState(false);

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const selectedClient = clients.find((c) => c.id === clientId);
  // Auto-fill from deal
  function handleDealChange(id: string) {
    setDealId(id);
    const deal = deals.find((d) => d.id === id);
    if (deal) {
      setAmount(String(deal.value || ""));
      if (deal.contact) {
        setClientId(deal.contact.id);
      }
      setOfferName(deal.title);
    }
  }

  // Replace variables in template
  function getPreviewContent() {
    if (!selectedTemplate) return "";
    let content = selectedTemplate.content;
    content = content.replace(
      /\{\{client_name\}\}/g,
      selectedClient?.full_name || "___",
    );
    content = content.replace(
      /\{\{client_email\}\}/g,
      selectedClient?.email || "___",
    );
    content = content.replace(/\{\{offer_name\}\}/g, offerName || "___");
    content = content.replace(/\{\{amount\}\}/g, amount || "___");
    content = content.replace(
      /\{\{payment_schedule\}\}/g,
      paymentSchedule || "___",
    );
    content = content.replace(
      /\{\{start_date\}\}/g,
      format(new Date(), "d MMMM yyyy", { locale: fr }),
    );
    return content;
  }

  async function handleSave(send: boolean) {
    if (!templateId || !clientId || !amount) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setLoading(true);
    try {
      const installmentCount =
        paymentSchedule === "2x" ? 2 : paymentSchedule === "3x" ? 3 : 1;
      const result = await createContract({
        templateId,
        clientId,
        dealId: dealId || undefined,
        content: getPreviewContent(),
        amount: Number(amount),
        paymentSchedule,
        installmentCount,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (send && result.data) {
        const sendResult = await sendContract(result.data.id);
        if (sendResult.error) {
          toast.error(sendResult.error);
          return;
        }
        toast.success("Contrat envoyé au client");
      } else {
        toast.success("Contrat sauvegardé en brouillon");
      }

      router.push("/contracts");
    } catch {
      toast.error("Erreur lors de la création du contrat");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Nouveau contrat"
        description="Créez et envoyez un contrat à votre client"
      >
        <Link href="/contracts">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-6">
          <Card className="border-border/50 rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">
                Informations du contrat
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Template
                </Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Choisir un template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Deal associé (optionnel)
                </Label>
                <Select value={dealId} onValueChange={handleDealChange}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Associer à un deal" />
                  </SelectTrigger>
                  <SelectContent>
                    {deals.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.title} — {d.value?.toLocaleString("fr-FR")} €
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Client
                </Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Sélectionner le client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name || c.email}{" "}
                        {c.company ? `(${c.company})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Nom de l&apos;offre
                </Label>
                <Input
                  value={offerName}
                  onChange={(e) => setOfferName(e.target.value)}
                  placeholder="ex: Accompagnement Premium 6 mois"
                  className="h-11 rounded-xl"
                />
              </div>

              <div>
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Montant (€ TTC)
                </Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="ex: 3000"
                  className="h-11 rounded-xl"
                />
              </div>

              <div>
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Modalité de paiement
                </Label>
                <Select
                  value={paymentSchedule}
                  onValueChange={setPaymentSchedule}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Choisir une modalité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1x">
                      Paiement en 1x —{" "}
                      {amount
                        ? `${Number(amount).toLocaleString("fr-FR")} €`
                        : "montant total"}
                    </SelectItem>
                    <SelectItem value="2x">
                      Paiement en 2x —{" "}
                      {amount
                        ? `2 × ${(Number(amount) / 2).toLocaleString("fr-FR")} €`
                        : "2 échéances"}
                    </SelectItem>
                    <SelectItem value="3x">
                      Paiement en 3x —{" "}
                      {amount
                        ? `3 × ${(Number(amount) / 3).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`
                        : "3 échéances"}
                    </SelectItem>
                    <SelectItem value="securio">
                      Paiement via Securio (lien externe)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-xl"
              onClick={() => handleSave(false)}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {loading ? "Sauvegarde..." : "Sauvegarder brouillon"}
            </Button>
            <Button
              className="flex-1 h-11 rounded-xl bg-brand text-brand-dark hover:bg-brand/90"
              onClick={() => handleSave(true)}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {loading ? "Envoi en cours..." : "Envoyer au client"}
            </Button>
          </div>
        </div>

        {/* Preview */}
        <Card className="h-fit border-border/50 rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Prévisualisation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedTemplate ? (
              <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap text-sm leading-relaxed">
                {getPreviewContent()
                  .split("\n")
                  .map((line, i) => {
                    if (line.startsWith("# "))
                      return (
                        <h1 key={i} className="text-lg font-bold mb-2">
                          {line.slice(2)}
                        </h1>
                      );
                    if (line.startsWith("## "))
                      return (
                        <h2
                          key={i}
                          className="text-base font-semibold mt-4 mb-1"
                        >
                          {line.slice(3)}
                        </h2>
                      );
                    if (line.startsWith("**") && line.endsWith("**"))
                      return (
                        <p key={i} className="font-semibold">
                          {line.slice(2, -2)}
                        </p>
                      );
                    if (line.startsWith("- "))
                      return (
                        <li key={i} className="ml-4 text-muted-foreground">
                          {line.slice(2)}
                        </li>
                      );
                    if (line === "---") return <hr key={i} className="my-3" />;
                    if (line.trim() === "") return <br key={i} />;
                    return (
                      <p key={i} className="text-muted-foreground">
                        {line}
                      </p>
                    );
                  })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-12">
                Sélectionnez un template pour voir la prévisualisation
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
