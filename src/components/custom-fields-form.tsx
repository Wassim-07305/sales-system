"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCustomFields,
  getCustomFieldValues,
  saveCustomFieldValues,
  type CustomField,
} from "@/lib/actions/custom-fields";

interface CustomFieldsFormProps {
  entity: "deals" | "contacts" | "contracts";
  entityId: string;
  /** When true, show a save button instead of auto-saving on blur */
  showSaveButton?: boolean;
  /** Callback after values are saved */
  onSaved?: () => void;
}

export function CustomFieldsForm({
  entity,
  entityId,
  showSaveButton = false,
  onSaved,
}: CustomFieldsFormProps) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Load field definitions and current values
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [fieldDefs, fieldValues] = await Promise.all([
          getCustomFields(entity),
          getCustomFieldValues(entityId, entity),
        ]);
        if (!cancelled) {
          setFields(fieldDefs);
          setValues(fieldValues);
        }
      } catch {
        // Silently handle – fields may not exist yet
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [entity, entityId]);

  const updateValue = useCallback((name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setDirty(true);
  }, []);

  const doSave = useCallback(async () => {
    setSaving(true);
    try {
      const result = await saveCustomFieldValues(entityId, entity, values);
      if (result.success) {
        setDirty(false);
        toast.success("Champs personnalis\u00e9s enregistr\u00e9s");
        onSaved?.();
      } else {
        toast.error(result.error ?? "Erreur lors de l\u2019enregistrement");
      }
    } catch {
      toast.error("Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  }, [entityId, entity, values, onSaved]);

  const handleBlur = useCallback(() => {
    if (!showSaveButton && dirty) {
      doSave();
    }
  }, [showSaveButton, dirty, doSave]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (fields.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Champs personnalis\u00e9s
      </h3>

      {fields.map((field) => {
        const val = values[field.name];
        return (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={`cf-${field.name}`}>
              {field.label}
              {field.required && (
                <span className="text-destructive ml-1">*</span>
              )}
            </Label>

            {field.type === "text" && (
              <Input
                id={`cf-${field.name}`}
                value={(val as string) ?? ""}
                onChange={(e) => updateValue(field.name, e.target.value)}
                onBlur={handleBlur}
                placeholder={field.label}
              />
            )}

            {field.type === "number" && (
              <Input
                id={`cf-${field.name}`}
                type="number"
                value={(val as string | number) ?? ""}
                onChange={(e) =>
                  updateValue(
                    field.name,
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
                onBlur={handleBlur}
                placeholder="0"
              />
            )}

            {field.type === "date" && (
              <Input
                id={`cf-${field.name}`}
                type="date"
                value={(val as string) ?? ""}
                onChange={(e) => updateValue(field.name, e.target.value)}
                onBlur={handleBlur}
              />
            )}

            {field.type === "select" && (
              <Select
                value={(val as string) ?? ""}
                onValueChange={(v) => {
                  updateValue(field.name, v);
                  if (!showSaveButton) {
                    // Save after select change (no blur event)
                    setTimeout(() => doSave(), 0);
                  }
                }}
              >
                <SelectTrigger id={`cf-${field.name}`} className="w-full">
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
                  id={`cf-${field.name}`}
                  type="checkbox"
                  checked={!!val}
                  onChange={(e) => {
                    updateValue(field.name, e.target.checked);
                    if (!showSaveButton) {
                      setTimeout(() => doSave(), 0);
                    }
                  }}
                  className="size-4 rounded border accent-[#7af17a]"
                />
                <label
                  htmlFor={`cf-${field.name}`}
                  className="text-sm cursor-pointer"
                >
                  {field.label}
                </label>
              </div>
            )}
          </div>
        );
      })}

      {showSaveButton && (
        <Button
          size="sm"
          className="gap-2 bg-[#7af17a] text-black hover:bg-[#5cd85c]"
          onClick={doSave}
          disabled={saving || !dirty}
        >
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            "Enregistrer les champs"
          )}
        </Button>
      )}
    </div>
  );
}
