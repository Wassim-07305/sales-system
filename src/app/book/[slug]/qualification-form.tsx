"use client";

import type { QualificationField } from "@/lib/types/database";

interface QualificationFormProps {
  fields: QualificationField[];
  answers: Record<string, string | string[]>;
  onChange: (answers: Record<string, string | string[]>) => void;
  errors?: Record<string, string>;
}

export function QualificationForm({
  fields,
  answers,
  onChange,
  errors,
}: QualificationFormProps) {
  const handleChange = (fieldId: string, value: string | string[]) => {
    onChange({ ...answers, [fieldId]: value });
  };

  if (fields.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        Quelques questions
      </h3>
      {fields.map((field) => (
        <div key={field.id}>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="ml-1 text-red-500">*</span>}
          </label>

          {(field.type === "text" ||
            field.type === "email" ||
            field.type === "phone") && (
            <input
              type={
                field.type === "email"
                  ? "email"
                  : field.type === "phone"
                    ? "tel"
                    : "text"
              }
              placeholder={field.placeholder}
              value={(answers[field.id] as string) || ""}
              onChange={(e) => handleChange(field.id, e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          )}

          {field.type === "number" && (
            <input
              type="number"
              placeholder={field.placeholder}
              value={(answers[field.id] as string) || ""}
              onChange={(e) => handleChange(field.id, e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          )}

          {field.type === "textarea" && (
            <textarea
              placeholder={field.placeholder}
              value={(answers[field.id] as string) || ""}
              onChange={(e) => handleChange(field.id, e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          )}

          {field.type === "select" && field.options && (
            <select
              value={(answers[field.id] as string) || ""}
              onChange={(e) => handleChange(field.id, e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Sélectionnez...</option>
              {field.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}

          {field.type === "multi_select" && field.options && (
            <div className="space-y-2">
              {field.options.map((opt) => {
                const selected = (
                  (answers[field.id] as string[]) || []
                ).includes(opt);
                return (
                  <label key={opt} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => {
                        const current = (answers[field.id] as string[]) || [];
                        const next = selected
                          ? current.filter((v) => v !== opt)
                          : [...current, opt];
                        handleChange(field.id, next);
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{opt}</span>
                  </label>
                );
              })}
            </div>
          )}

          {errors?.[field.id] && (
            <p className="mt-1 text-xs text-red-500">{errors[field.id]}</p>
          )}
        </div>
      ))}
    </div>
  );
}
