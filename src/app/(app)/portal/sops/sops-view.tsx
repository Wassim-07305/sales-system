"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Building2,
  UserCircle,
  BookOpen,
  Search,
  FileText,
  Plus,
  Trash2,
  Save,
  Loader2,
  MessageSquare,
  Send,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  updateClientSops,
  addSopComment,
  type SopData,
  type SopScript,
} from "@/lib/actions/sops";

type SectionKey =
  | "contexte_business"
  | "avatar_client"
  | "champ_lexical"
  | "sourcing"
  | "scripts";

const SECTIONS: { key: SectionKey; label: string; icon: typeof Building2 }[] = [
  { key: "contexte_business", label: "Contexte Business", icon: Building2 },
  { key: "avatar_client", label: "Avatar Client", icon: UserCircle },
  { key: "champ_lexical", label: "Champ Lexical", icon: BookOpen },
  { key: "sourcing", label: "Sourcing", icon: Search },
  { key: "scripts", label: "Scripts", icon: FileText },
];

interface SopsViewProps {
  sopData: SopData | null;
  clientId: string;
  readOnly?: boolean;
}

export function SopsView({ sopData, clientId, readOnly = false }: SopsViewProps) {
  const [activeSection, setActiveSection] = useState<SectionKey>("contexte_business");
  const [data, setData] = useState<SopData>(
    sopData || {
      contexte_business: {
        entreprise: "", secteur: "", offre: "", probleme_resolu: "",
        cible_client: "", ca_mensuel: "", plateforme_principale: "",
      },
      avatar_client: {
        age_situation: "", douleurs_principales: "", objections_frequentes: "",
        motivations: "", langage_utilise: "",
      },
      champ_lexical: { termes: [] },
      sourcing: { canaux: [] },
      scripts: [],
      comments: [],
    },
  );
  const [isPending, startTransition] = useTransition();
  const [commentText, setCommentText] = useState("");
  const [commentingSection, setCommentingSection] = useState<string | null>(null);

  function handleSave() {
    startTransition(async () => {
      const result = await updateClientSops(clientId, data);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("SOPs sauvegardées");
      }
    });
  }

  function handleAddComment(section: string) {
    if (!commentText.trim()) return;
    startTransition(async () => {
      const result = await addSopComment(clientId, section, commentText.trim());
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Commentaire ajouté");
        setCommentText("");
        setCommentingSection(null);
      }
    });
  }

  // ─── Script helpers ───────────────────────────────────────────────

  function addScript() {
    setData((prev) => ({
      ...prev,
      scripts: [
        ...prev.scripts,
        {
          id: crypto.randomUUID(),
          nom: "",
          plateforme: "instagram",
          type: "premier_contact",
          contenu: "",
        },
      ],
    }));
  }

  function updateScript(id: string, updates: Partial<SopScript>) {
    setData((prev) => ({
      ...prev,
      scripts: prev.scripts.map((s) =>
        s.id === id ? { ...s, ...updates } : s,
      ),
    }));
  }

  function removeScript(id: string) {
    if (!confirm("Supprimer ce script ?")) return;
    setData((prev) => ({
      ...prev,
      scripts: prev.scripts.filter((s) => s.id !== id),
    }));
  }

  // ─── Champ lexical helpers ────────────────────────────────────────

  function addTerme() {
    setData((prev) => ({
      ...prev,
      champ_lexical: {
        termes: [...prev.champ_lexical.termes, { mot: "", definition: "" }],
      },
    }));
  }

  function removeTerme(index: number) {
    setData((prev) => ({
      ...prev,
      champ_lexical: {
        termes: prev.champ_lexical.termes.filter((_, i) => i !== index),
      },
    }));
  }

  // ─── Section comments ─────────────────────────────────────────────

  const sectionComments = (data.comments || []).filter(
    (c) => c.section === activeSection,
  );

  // ─── Renderers ────────────────────────────────────────────────────

  function renderContexteBusiness() {
    const ctx = data.contexte_business;
    const fields = [
      { key: "entreprise" as const, label: "Nom de l'entreprise" },
      { key: "secteur" as const, label: "Secteur d'activité" },
      { key: "offre" as const, label: "Description de l'offre" },
      { key: "probleme_resolu" as const, label: "Problème résolu" },
      { key: "cible_client" as const, label: "Cible client" },
      { key: "ca_mensuel" as const, label: "CA mensuel actuel" },
      { key: "plateforme_principale" as const, label: "Plateforme principale de prospection" },
    ];

    return (
      <div className="space-y-4">
        {fields.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              {f.label}
            </label>
            {readOnly ? (
              <p className="text-sm p-3 rounded-xl bg-muted/30 border border-border/50 min-h-[40px]">
                {ctx[f.key] || <span className="text-muted-foreground/50 italic">Non renseigné</span>}
              </p>
            ) : (
              <Input
                value={ctx[f.key]}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    contexte_business: { ...prev.contexte_business, [f.key]: e.target.value },
                  }))
                }
                placeholder={f.label}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  function renderAvatarClient() {
    const av = data.avatar_client;
    const fields = [
      { key: "age_situation" as const, label: "Âge et situation" },
      { key: "douleurs_principales" as const, label: "Douleurs principales" },
      { key: "objections_frequentes" as const, label: "Objections fréquentes" },
      { key: "motivations" as const, label: "Motivations" },
      { key: "langage_utilise" as const, label: "Langage utilisé" },
    ];

    return (
      <div className="space-y-4">
        {fields.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              {f.label}
            </label>
            {readOnly ? (
              <p className="text-sm p-3 rounded-xl bg-muted/30 border border-border/50 min-h-[40px] whitespace-pre-wrap">
                {av[f.key] || <span className="text-muted-foreground/50 italic">Non renseigné</span>}
              </p>
            ) : (
              <Textarea
                value={av[f.key]}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    avatar_client: { ...prev.avatar_client, [f.key]: e.target.value },
                  }))
                }
                placeholder={f.label}
                rows={3}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  function renderChampLexical() {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {data.champ_lexical.termes.map((t, i) => (
            <div
              key={i}
              className="flex items-start gap-2 p-3 rounded-xl bg-muted/30 border border-border/50 w-full sm:w-auto sm:min-w-[300px]"
            >
              {readOnly ? (
                <div>
                  <Badge variant="outline" className="mb-1">
                    {t.mot || "—"}
                  </Badge>
                  <p className="text-xs text-muted-foreground">{t.definition}</p>
                </div>
              ) : (
                <div className="flex-1 space-y-1.5">
                  <Input
                    value={t.mot}
                    onChange={(e) => {
                      const termes = [...data.champ_lexical.termes];
                      termes[i] = { ...termes[i], mot: e.target.value };
                      setData((prev) => ({ ...prev, champ_lexical: { termes } }));
                    }}
                    placeholder="Mot / expression"
                    className="h-8 text-sm"
                  />
                  <Input
                    value={t.definition}
                    onChange={(e) => {
                      const termes = [...data.champ_lexical.termes];
                      termes[i] = { ...termes[i], definition: e.target.value };
                      setData((prev) => ({ ...prev, champ_lexical: { termes } }));
                    }}
                    placeholder="Définition"
                    className="h-8 text-sm"
                  />
                </div>
              )}
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTerme(i)}
                  className="text-destructive hover:text-destructive shrink-0 mt-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
        {!readOnly && (
          <Button variant="outline" size="sm" onClick={addTerme} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Ajouter un terme
          </Button>
        )}
      </div>
    );
  }

  function renderSourcing() {
    return (
      <div className="space-y-6">
        {data.sourcing.canaux.map((canal, i) => (
          <Card key={i} className="rounded-xl border-border/50">
            <CardContent className="p-4 space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-brand" />
                {canal.nom}
              </h4>
              {(
                [
                  { key: "strategie" as const, label: "Stratégie" },
                  { key: "criteres_ciblage" as const, label: "Critères de ciblage" },
                  { key: "volume_quotidien" as const, label: "Volume quotidien recommandé" },
                ] as const
              ).map((f) => (
                <div key={f.key} className="space-y-1">
                  <label className="text-xs text-muted-foreground">{f.label}</label>
                  {readOnly ? (
                    <p className="text-sm p-2 rounded-lg bg-muted/30 min-h-[32px]">
                      {canal[f.key] || <span className="text-muted-foreground/50 italic">Non renseigné</span>}
                    </p>
                  ) : (
                    <Textarea
                      value={canal[f.key]}
                      onChange={(e) => {
                        const canaux = [...data.sourcing.canaux];
                        canaux[i] = { ...canaux[i], [f.key]: e.target.value };
                        setData((prev) => ({ ...prev, sourcing: { canaux } }));
                      }}
                      placeholder={f.label}
                      rows={2}
                      className="text-sm"
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  function renderScripts() {
    return (
      <div className="space-y-4">
        {data.scripts.map((script) => (
          <Card key={script.id} className="rounded-xl border-border/50">
            <CardContent className="p-4 space-y-3">
              {readOnly ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-sm">
                      {script.nom || "Sans nom"}
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      {script.plateforme}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {script.type.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="text-sm whitespace-pre-wrap p-3 rounded-lg bg-muted/30">
                    {script.contenu || "Aucun contenu"}
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Input
                      value={script.nom}
                      onChange={(e) =>
                        updateScript(script.id, { nom: e.target.value })
                      }
                      placeholder="Nom du script"
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeScript(script.id)}
                      className="text-destructive hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={script.plateforme}
                      onValueChange={(v) =>
                        updateScript(script.id, {
                          plateforme: v as SopScript["plateforme"],
                        })
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={script.type}
                      onValueChange={(v) =>
                        updateScript(script.id, {
                          type: v as SopScript["type"],
                        })
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="premier_contact">Premier contact</SelectItem>
                        <SelectItem value="relance_j2">Relance J+2</SelectItem>
                        <SelectItem value="relance_j3">Relance J+3</SelectItem>
                        <SelectItem value="objection">Réponse objection</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    value={script.contenu}
                    onChange={(e) =>
                      updateScript(script.id, { contenu: e.target.value })
                    }
                    placeholder="Contenu du script..."
                    rows={5}
                  />
                </>
              )}
            </CardContent>
          </Card>
        ))}
        {!readOnly && (
          <Button variant="outline" onClick={addScript} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Ajouter un script
          </Button>
        )}
        {data.scripts.length === 0 && readOnly && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Aucun script défini pour le moment
          </p>
        )}
      </div>
    );
  }

  function renderSection() {
    switch (activeSection) {
      case "contexte_business":
        return renderContexteBusiness();
      case "avatar_client":
        return renderAvatarClient();
      case "champ_lexical":
        return renderChampLexical();
      case "sourcing":
        return renderSourcing();
      case "scripts":
        return renderScripts();
    }
  }

  return (
    <div>
      <PageHeader
        title="SOPs"
        description={
          readOnly
            ? "Vos Standard Operating Procedures — consultez les directives de votre workspace"
            : "Standard Operating Procedures — définissez les directives pour les setters"
        }
      >
        {!readOnly && (
          <Button
            onClick={handleSave}
            disabled={isPending}
            className="bg-brand text-brand-dark hover:bg-brand/90 gap-1.5"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Sauvegarder
          </Button>
        )}
      </PageHeader>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {SECTIONS.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.key;
          return (
            <button
              key={sec.key}
              onClick={() => setActiveSection(sec.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                isActive
                  ? "bg-brand/10 text-brand border border-brand/20"
                  : "text-muted-foreground hover:bg-muted/50",
              )}
            >
              <Icon className="h-4 w-4" />
              {sec.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <Card className="rounded-xl border-border/50 shadow-sm">
        <CardContent className="p-6">{renderSection()}</CardContent>
      </Card>

      {/* Comments section */}
      <div className="mt-6">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-3">
          <MessageSquare className="h-3.5 w-3.5" />
          Commentaires sur {SECTIONS.find((s) => s.key === activeSection)?.label}
        </h3>

        {sectionComments.length > 0 && (
          <div className="space-y-2 mb-3">
            {sectionComments.map((c, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-muted/30 border border-border/50"
              >
                <p className="text-sm">{c.content}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {c.author_name} —{" "}
                  {new Date(c.created_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ))}
          </div>
        )}

        {commentingSection === activeSection ? (
          <div className="flex gap-2">
            <Input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Votre commentaire..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAddComment(activeSection);
                }
              }}
            />
            <Button
              size="sm"
              onClick={() => handleAddComment(activeSection)}
              disabled={isPending || !commentText.trim()}
              className="bg-brand text-brand-dark hover:bg-brand/90 gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCommentingSection(activeSection)}
            className="text-muted-foreground gap-1.5"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Ajouter un commentaire
          </Button>
        )}
      </div>
    </div>
  );
}
