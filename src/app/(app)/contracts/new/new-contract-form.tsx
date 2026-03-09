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
import { ArrowLeft, Eye, Send, Save } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  templates: Array<{ id: string; name: string; content: string }>;
  clients: Array<{ id: string; full_name: string | null; email: string; company: string | null }>;
  deals: Array<{ id: string; title: string; value: number; contact: { id: string; full_name: string | null; email: string } | null }>;
}

export function NewContractForm({ templates, clients, deals }: Props) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState("");
  const [clientId, setClientId] = useState("");
  const [dealId, setDealId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentSchedule, setPaymentSchedule] = useState("");
  const [offerName, setOfferName] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const selectedClient = clients.find((c) => c.id === clientId);
  const selectedDeal = deals.find((d) => d.id === dealId);

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
    content = content.replace(/\{\{client_name\}\}/g, selectedClient?.full_name || "___");
    content = content.replace(/\{\{client_email\}\}/g, selectedClient?.email || "___");
    content = content.replace(/\{\{offer_name\}\}/g, offerName || "___");
    content = content.replace(/\{\{amount\}\}/g, amount || "___");
    content = content.replace(/\{\{payment_schedule\}\}/g, paymentSchedule || "___");
    content = content.replace(/\{\{start_date\}\}/g, format(new Date(), "d MMMM yyyy", { locale: fr }));
    return content;
  }

  async function handleSave(send: boolean) {
    if (!templateId || !clientId || !amount) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setLoading(true);
    try {
      const contract = await createContract({
        templateId,
        clientId,
        dealId: dealId || undefined,
        content: getPreviewContent(),
        amount: Number(amount),
        paymentSchedule,
      });

      if (send) {
        await sendContract(contract.id);
        toast.success("Contrat envoyé au client");
      } else {
        toast.success("Contrat sauvegardé en brouillon");
      }

      router.push("/contracts");
    } catch (err) {
      toast.error("Erreur lors de la création du contrat");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader title="Nouveau contrat" description="Créez et envoyez un contrat à votre client">
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations du contrat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Template</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Deal associé (optionnel)</Label>
                <Select value={dealId} onValueChange={handleDealChange}>
                  <SelectTrigger>
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
                <Label>Client</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner le client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name || c.email} {c.company ? `(${c.company})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Nom de l&apos;offre</Label>
                <Input
                  value={offerName}
                  onChange={(e) => setOfferName(e.target.value)}
                  placeholder="ex: Accompagnement Premium 6 mois"
                />
              </div>

              <div>
                <Label>Montant (€ TTC)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="ex: 3000"
                />
              </div>

              <div>
                <Label>Échéancier de paiement</Label>
                <Input
                  value={paymentSchedule}
                  onChange={(e) => setPaymentSchedule(e.target.value)}
                  placeholder="ex: 3 x 1000€ / mois"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleSave(false)}
              disabled={loading}
            >
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder brouillon
            </Button>
            <Button
              className="flex-1 bg-brand text-brand-dark hover:bg-brand/90"
              onClick={() => handleSave(true)}
              disabled={loading}
            >
              <Send className="h-4 w-4 mr-2" />
              Envoyer au client
            </Button>
          </div>
        </div>

        {/* Preview */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Prévisualisation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedTemplate ? (
              <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap text-sm leading-relaxed">
                {getPreviewContent().split("\n").map((line, i) => {
                  if (line.startsWith("# ")) return <h1 key={i} className="text-lg font-bold mb-2">{line.slice(2)}</h1>;
                  if (line.startsWith("## ")) return <h2 key={i} className="text-base font-semibold mt-4 mb-1">{line.slice(3)}</h2>;
                  if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-semibold">{line.slice(2, -2)}</p>;
                  if (line.startsWith("- ")) return <li key={i} className="ml-4 text-muted-foreground">{line.slice(2)}</li>;
                  if (line === "---") return <hr key={i} className="my-3" />;
                  if (line.trim() === "") return <br key={i} />;
                  return <p key={i} className="text-muted-foreground">{line}</p>;
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
