"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { QualificationField } from "@/lib/types/database";

interface QualificationFormProps {
  fields: QualificationField[];
  answers: Record<string, string>;
  onChange: (answers: Record<string, string>) => void;
}

export function QualificationForm({
  fields,
  answers,
  onChange,
}: QualificationFormProps) {
  function updateAnswer(fieldId: string, value: string) {
    onChange({ ...answers, [fieldId]: value });
  }

  return (
    <div className="space-y-3">
      {fields.map((field) => (
        <div key={field.id} className="space-y-1.5">
          <Label className="text-sm">
            {field.label}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </Label>

          {field.type === "text" && (
            <Input
              value={answers[field.id] || ""}
              onChange={(e) => updateAnswer(field.id, e.target.value)}
              required={field.required}
            />
          )}

          {field.type === "number" && (
            <Input
              type="number"
              value={answers[field.id] || ""}
              onChange={(e) => updateAnswer(field.id, e.target.value)}
              required={field.required}
            />
          )}

          {field.type === "textarea" && (
            <Textarea
              value={answers[field.id] || ""}
              onChange={(e) => updateAnswer(field.id, e.target.value)}
              rows={3}
              required={field.required}
            />
          )}

          {field.type === "select" && field.options && (
            <Select
              value={answers[field.id] || ""}
              onValueChange={(v) => updateAnswer(field.id, v)}
              required={field.required}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {field.options.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      ))}
    </div>
  );
}
