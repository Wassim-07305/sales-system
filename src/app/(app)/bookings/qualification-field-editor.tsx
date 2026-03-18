"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { QUALIFICATION_FIELD_TYPES } from "@/lib/constants";

interface QualificationField {
  id: string;
  label: string;
  type: "text" | "select" | "textarea" | "number";
  required: boolean;
  options?: string[];
}

interface QualificationFieldEditorProps {
  fields: QualificationField[];
  onChange: (fields: QualificationField[]) => void;
}

export function QualificationFieldEditor({
  fields,
  onChange,
}: QualificationFieldEditorProps) {
  function addField() {
    onChange([
      ...fields,
      {
        id: crypto.randomUUID(),
        label: "",
        type: "text",
        required: false,
      },
    ]);
  }

  function removeField(id: string) {
    onChange(fields.filter((f) => f.id !== id));
  }

  function updateField(id: string, updates: Partial<QualificationField>) {
    onChange(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }

  function updateOptions(id: string, optionsStr: string) {
    const options = optionsStr
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    updateField(id, { options });
  }

  return (
    <div className="space-y-3">
      {fields.map((field) => (
        <div
          key={field.id}
          className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-3"
        >
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
            <Input
              value={field.label}
              onChange={(e) => updateField(field.id, { label: e.target.value })}
              placeholder="Libellé du champ"
              className="flex-1"
            />
            <Select
              value={field.type}
              onValueChange={(v) =>
                updateField(field.id, {
                  type: v as QualificationField["type"],
                })
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUALIFICATION_FIELD_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5">
              <Switch
                checked={field.required}
                onCheckedChange={(v) => updateField(field.id, { required: v })}
              />
              <Label className="text-xs text-muted-foreground">Requis</Label>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-500"
              onClick={() => removeField(field.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {field.type === "select" && (
            <div className="pl-6">
              <Input
                value={field.options?.join(", ") || ""}
                onChange={(e) => updateOptions(field.id, e.target.value)}
                placeholder="Options séparées par des virgules"
                className="text-sm"
              />
            </div>
          )}
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addField}
        className="text-xs"
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Ajouter un champ
      </Button>
    </div>
  );
}
