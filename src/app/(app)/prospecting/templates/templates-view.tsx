"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, ArrowLeft, ArrowRight, Linkedin, Instagram, Pencil, Trash2 } from "lucide-react";
import { createTemplate, updateTemplate, deleteTemplate } from "@/lib/actions/prospecting";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

interface Template {
  id: string;
  name: string;
  platform: string | null;
  step: string | null;
  niche: string | null;
  content: string;
  variant: string;
}

const stepLabels: Record<string, string> = {
  accroche: "Accroche",
  follow_up: "Follow-up J+2",
  relance: "Relance J+5",
  break_up: "Break-up J+10",
};

const stepOrder = ["accroche", "follow_up", "relance", "break_up"];

export function TemplatesView({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterStep, setFilterStep] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [form, setForm] = useState({ name: "", platform: "linkedin", step: "accroche", niche: "", content: "", variant: "A" });

  const filtered = templates.filter((t) => {
    if (filterPlatform !== "all" && t.platform !== filterPlatform) return false;
    if (filterStep !== "all" && t.step !== filterStep) return false;
    return true;
  });

  const stepCounts = stepOrder.map((step) => ({
    step,
    label: stepLabels[step],
    count: templates.filter((t) => t.step === step).length,
  }));

  function openEdit(t: Template) {
    setEditingTemplate(t);
    setForm({ name: t.name, platform: t.platform || "linkedin", step: t.step || "accroche", niche: t.niche || "", content: t.content, variant: t.variant });
    setDialogOpen(true);
  }

  function openNew() {
    setEditingTemplate(null);
    setForm({ name: "", platform: "linkedin", step: "accroche", niche: "", content: "", variant: "A" });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.content.trim()) return;
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, form);
        toast.success("Template mis à jour");
      } else {
        await createTemplate(form);
        toast.success("Template créé");
      }
      setDialogOpen(false);
      router.refresh();
    } catch {
      toast.error("Erreur");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTemplate(id);
      toast.success("Template supprimé");
      router.refresh();
    } catch {
      toast.error("Erreur");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Templates de DM" description="Gérez vos templates de prospection">
        <div className="flex gap-2">
          <Link href="/prospecting">
            <Button variant="outline" size="sm" className="rounded-xl font-medium">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
          <Button onClick={openNew} className="bg-brand text-brand-dark hover:bg-brand/90 rounded-xl font-medium">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau template
          </Button>
        </div>
      </PageHeader>

      {/* Sequence flowchart */}
      <Card className="shadow-sm rounded-2xl">
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {stepCounts.map((s, i) => (
              <div key={s.step} className="flex items-center gap-2">
                <button
                  onClick={() => setFilterStep(filterStep === s.step ? "all" : s.step)}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                    filterStep === s.step ? "bg-brand text-brand-dark border-brand" : "hover:bg-muted"
                  }`}
                >
                  {s.label}
                  <span className="ml-2 text-xs opacity-70">({s.count})</span>
                </button>
                {i < stepCounts.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="w-[150px] h-11 rounded-xl"><SelectValue placeholder="Plateforme" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates */}
      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((t) => (
          <Card key={t.id} className="shadow-sm rounded-2xl hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-sm">{t.name}</h3>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      {t.platform === "linkedin" ? <Linkedin className="h-3 w-3" /> : <Instagram className="h-3 w-3" />}
                      {t.platform}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{stepLabels[t.step || ""] || t.step}</Badge>
                    <Badge variant="outline" className="text-[10px]">Variant {t.variant}</Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">{t.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card className="shadow-sm rounded-2xl">
          <CardContent className="p-12 text-center text-muted-foreground">
            <p className="font-medium">Aucun template</p>
            <p className="text-sm">Créez votre premier template de DM.</p>
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Modifier le template" : "Nouveau template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11 rounded-xl" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Plateforme</Label>
                <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Étape</Label>
                <Select value={form.step} onValueChange={(v) => setForm({ ...form, step: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {stepOrder.map((s) => (
                      <SelectItem key={s} value={s}>{stepLabels[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Variant</Label>
                <Select value={form.variant} onValueChange={(v) => setForm({ ...form, variant: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Contenu</Label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={6} placeholder="Variables: {{prenom}}, {{niche}}, {{pain_point}}..." />
            </div>
            <Button onClick={handleSave} className="w-full bg-brand text-brand-dark hover:bg-brand/90 rounded-xl font-medium">
              {editingTemplate ? "Mettre à jour" : "Créer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
