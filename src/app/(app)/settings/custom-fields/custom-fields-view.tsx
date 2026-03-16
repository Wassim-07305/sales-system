"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Settings,
  Plus,
  Pencil,
  Trash2,
  Type,
  Hash,
  Calendar,
  List,
  CheckSquare,
  Eye,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createCustomField,
  updateCustomField,
  deleteCustomField,
  type CustomField,
  type CustomFieldType,
} from "@/lib/actions/custom-fields";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENTITY_TABS: { value: CustomField["entity"]; label: string }[] = [
  { value: "deals", label: "Deals" },
  { value: "contacts", label: "Contacts" },
  { value: "contracts", label: "Contrats" },
];

const FIELD_TYPES: {
  value: CustomFieldType;
  label: string;
  icon: typeof Type;
}[] = [
  { value: "text", label: "Texte", icon: Type },
  { value: "number", label: "Nombre", icon: Hash },
  { value: "date", label: "Date", icon: Calendar },
  { value: "select", label: "Liste d\u00e9roulante", icon: List },
  { value: "checkbox", label: "Case \u00e0 cocher", icon: CheckSquare },
];

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function getTypeIcon(type: CustomFieldType) {
  const t = FIELD_TYPES.find((ft) => ft.value === type);
  if (!t) return Type;
  return t.icon;
}

function getTypeLabel(type: CustomFieldType) {
  return FIELD_TYPES.find((ft) => ft.value === type)?.label ?? type;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CustomFieldsViewProps {
  initialFields: CustomField[];
}

export function CustomFieldsView({ initialFields }: CustomFieldsViewProps) {
  const [fields, setFields] = useState<CustomField[]>(initialFields);
  const [activeTab, setActiveTab] = useState<CustomField["entity"]>("deals");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [deletingField, setDeletingField] = useState<CustomField | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formLabel, setFormLabel] = useState("");
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<CustomFieldType>("text");
  const [formRequired, setFormRequired] = useState(false);
  const [formOptions, setFormOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");

  const filteredFields = fields.filter((f) => f.entity === activeTab);

  const resetForm = useCallback(() => {
    setFormLabel("");
    setFormName("");
    setFormType("text");
    setFormRequired(false);
    setFormOptions([]);
    setNewOption("");
    setEditingField(null);
  }, []);

  const openCreateDialog = useCallback(() => {
    resetForm();
    setDialogOpen(true);
  }, [resetForm]);

  const openEditDialog = useCallback((field: CustomField) => {
    setEditingField(field);
    setFormLabel(field.label);
    setFormName(field.name);
    setFormType(field.type);
    setFormRequired(field.required);
    setFormOptions(field.options ?? []);
    setNewOption("");
    setDialogOpen(true);
  }, []);

  const openDeleteDialog = useCallback((field: CustomField) => {
    setDeletingField(field);
    setDeleteDialogOpen(true);
  }, []);

  const handleLabelChange = useCallback(
    (value: string) => {
      setFormLabel(value);
      if (!editingField) {
        setFormName(slugify(value));
      }
    },
    [editingField],
  );

  const addOption = useCallback(() => {
    const trimmed = newOption.trim();
    if (trimmed && !formOptions.includes(trimmed)) {
      setFormOptions((prev) => [...prev, trimmed]);
      setNewOption("");
    }
  }, [newOption, formOptions]);

  const removeOption = useCallback((opt: string) => {
    setFormOptions((prev) => prev.filter((o) => o !== opt));
  }, []);

  const handleSave = useCallback(async () => {
    if (!formLabel.trim() || !formName.trim()) {
      toast.error("Le label et le nom sont requis");
      return;
    }
    if (formType === "select" && formOptions.length === 0) {
      toast.error("Ajoutez au moins une option pour une liste d\u00e9roulante");
      return;
    }

    setSaving(true);
    try {
      if (editingField) {
        const result = await updateCustomField(editingField.id, {
          label: formLabel.trim(),
          name: formName.trim(),
          type: formType,
          required: formRequired,
          options: formType === "select" ? formOptions : undefined,
        });
        if (!result.success) {
          toast.error(result.error ?? "Erreur lors de la mise \u00e0 jour");
          return;
        }
        setFields((prev) =>
          prev.map((f) =>
            f.id === editingField.id
              ? {
                  ...f,
                  label: formLabel.trim(),
                  name: formName.trim(),
                  type: formType,
                  required: formRequired,
                  options: formType === "select" ? formOptions : undefined,
                }
              : f,
          ),
        );
        toast.success("Champ personnalis\u00e9 mis \u00e0 jour");
      } else {
        const result = await createCustomField({
          entity: activeTab,
          label: formLabel.trim(),
          name: formName.trim(),
          type: formType,
          required: formRequired,
          options: formType === "select" ? formOptions : undefined,
        });
        if (!result.success) {
          toast.error(result.error ?? "Erreur lors de la cr\u00e9ation");
          return;
        }
        // Optimistic: add to local state with a temp id (will refresh on next load)
        const tempField: CustomField = {
          id: crypto.randomUUID(),
          entity: activeTab,
          label: formLabel.trim(),
          name: formName.trim(),
          type: formType,
          required: formRequired,
          options: formType === "select" ? formOptions : undefined,
          position: filteredFields.length,
          created_at: new Date().toISOString(),
        };
        setFields((prev) => [...prev, tempField]);
        toast.success("Champ personnalis\u00e9 cr\u00e9\u00e9");
      }
      setDialogOpen(false);
      resetForm();
    } catch {
      toast.error("Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  }, [
    formLabel,
    formName,
    formType,
    formRequired,
    formOptions,
    editingField,
    activeTab,
    filteredFields.length,
    resetForm,
  ]);

  const handleDelete = useCallback(async () => {
    if (!deletingField) return;
    setSaving(true);
    try {
      const result = await deleteCustomField(deletingField.id);
      if (!result.success) {
        toast.error(result.error ?? "Erreur lors de la suppression");
        return;
      }
      setFields((prev) => prev.filter((f) => f.id !== deletingField.id));
      toast.success("Champ supprim\u00e9");
      setDeleteDialogOpen(false);
      setDeletingField(null);
    } catch {
      toast.error("Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  }, [deletingField]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Champs personnalis\u00e9s"
        description="G\u00e9rez les champs suppl\u00e9mentaires pour vos deals, contacts et contrats."
      >
        <Button
          size="sm"
          className="gap-2 bg-[#7af17a] text-black hover:bg-[#5cd85c]"
          onClick={openCreateDialog}
        >
          <Plus className="size-4" />
          Ajouter un champ
        </Button>
      </PageHeader>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as CustomField["entity"])}
      >
        <TabsList>
          {ENTITY_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {ENTITY_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {filteredFields.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-16 text-center">
                <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Settings className="size-7 text-muted-foreground opacity-50" />
                </div>
                <p className="text-muted-foreground text-sm">
                  Aucun champ personnalis\u00e9 pour {tab.label}.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 gap-2"
                  onClick={openCreateDialog}
                >
                  <Plus className="size-4" />
                  Cr\u00e9er un champ
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border/30 bg-muted/20 hover:bg-muted/20">
                      <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Nom
                      </TableHead>
                      <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Label
                      </TableHead>
                      <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Type
                      </TableHead>
                      <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Obligatoire
                      </TableHead>
                      <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFields.map((field) => {
                      const Icon = getTypeIcon(field.type);
                      return (
                        <TableRow key={field.id}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {field.name}
                          </TableCell>
                          <TableCell className="font-medium">
                            {field.label}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="gap-1">
                              <Icon className="size-3" />
                              {getTypeLabel(field.type)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {field.required ? (
                              <Badge className="bg-[#7af17a]/15 text-[#7af17a] border-[#7af17a]/30">
                                Oui
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                Non
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="size-8 p-0"
                                onClick={() => openEditDialog(field)}
                              >
                                <Pencil className="size-4" />
                                <span className="sr-only">Modifier</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="size-8 p-0 text-destructive hover:text-destructive"
                                onClick={() => openDeleteDialog(field)}
                              >
                                <Trash2 className="size-4" />
                                <span className="sr-only">Supprimer</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Preview button */}
      {filteredFields.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setPreviewOpen(true)}
        >
          <Eye className="size-4" />
          Aper\u00e7u du formulaire
        </Button>
      )}

      {/* ---- Create / Edit Dialog ---- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingField
                ? "Modifier le champ"
                : "Nouveau champ personnalis\u00e9"}
            </DialogTitle>
            <DialogDescription>
              {editingField
                ? "Modifiez les propri\u00e9t\u00e9s de ce champ."
                : `Ajoutez un champ personnalis\u00e9 pour ${ENTITY_TABS.find((t) => t.value === activeTab)?.label ?? activeTab}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Label */}
            <div className="space-y-2">
              <Label htmlFor="field-label">Label</Label>
              <Input
                id="field-label"
                placeholder="ex: Secteur d'activit\u00e9"
                value={formLabel}
                onChange={(e) => handleLabelChange(e.target.value)}
              />
            </div>

            {/* Name (slug) */}
            <div className="space-y-2">
              <Label htmlFor="field-name">Nom du champ (slug)</Label>
              <Input
                id="field-name"
                placeholder="ex: secteur_activite"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Identifiant technique utilis\u00e9 en base de donn\u00e9es.
              </p>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formType}
                onValueChange={(v) => setFormType(v as CustomFieldType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((ft) => {
                    const Icon = ft.icon;
                    return (
                      <SelectItem key={ft.value} value={ft.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="size-4 text-muted-foreground" />
                          {ft.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Options (select type only) */}
            {formType === "select" && (
              <div className="space-y-2">
                <Label>Options</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ajouter une option..."
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addOption();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addOption}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
                {formOptions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {formOptions.map((opt) => (
                      <Badge
                        key={opt}
                        variant="secondary"
                        className="gap-1 cursor-pointer hover:bg-destructive/20"
                        onClick={() => removeOption(opt)}
                      >
                        {opt}
                        <span className="text-xs">\u00d7</span>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Required */}
            <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
              <div>
                <Label htmlFor="field-required" className="cursor-pointer">
                  Obligatoire
                </Label>
                <p className="text-xs text-muted-foreground">
                  Le champ devra \u00eatre renseign\u00e9.
                </p>
              </div>
              <Switch
                id="field-required"
                checked={formRequired}
                onCheckedChange={setFormRequired}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}
            >
              Annuler
            </Button>
            <Button
              className="bg-[#7af17a] text-black hover:bg-[#5cd85c]"
              onClick={handleSave}
              disabled={saving}
            >
              {saving
                ? "Enregistrement..."
                : editingField
                  ? "Mettre \u00e0 jour"
                  : "Cr\u00e9er"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Delete Confirmation ---- */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer le champ</DialogTitle>
            <DialogDescription>
              \u00cates-vous s\u00fbr de vouloir supprimer le champ{" "}
              <strong>{deletingField?.label}</strong> ? Cette action est
              irr\u00e9versible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeletingField(null);
              }}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Preview Dialog ---- */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Aper\u00e7u du formulaire</DialogTitle>
            <DialogDescription>
              Voici comment les champs personnalis\u00e9s apparaissent dans un
              formulaire.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {filteredFields.map((field) => (
              <div key={field.id} className="space-y-1.5">
                <Label>
                  {field.label}
                  {field.required && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </Label>
                {field.type === "text" && (
                  <Input placeholder={field.label} disabled />
                )}
                {field.type === "number" && (
                  <Input type="number" placeholder="0" disabled />
                )}
                {field.type === "date" && <Input type="date" disabled />}
                {field.type === "select" && (
                  <Select disabled>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="S\u00e9lectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options ?? []).map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {field.type === "checkbox" && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      disabled
                      className="size-4 rounded border"
                    />
                    <span className="text-sm text-muted-foreground">
                      {field.label}
                    </span>
                  </div>
                )}
              </div>
            ))}
            {filteredFields.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun champ \u00e0 pr\u00e9visualiser.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
