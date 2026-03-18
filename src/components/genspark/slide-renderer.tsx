"use client";

import { useCallback, useRef } from "react";
import type {
  SlideLayout,
  SlideContent,
  PresentationTheme,
} from "@/lib/types/database";
import { cn } from "@/lib/utils";

// ─── Props ───────────────────────────────────────────────────────────────────

interface SlideRendererProps {
  slide: {
    layout: SlideLayout;
    content: SlideContent;
  };
  theme: PresentationTheme;
  className?: string;
  isEditable?: boolean;
  onContentChange?: (field: string, value: string | string[]) => void;
}

// ─── Theme helpers ───────────────────────────────────────────────────────────

const themeClasses: Record<PresentationTheme, string> = {
  dark: "bg-[#14080e] text-white",
  light: "bg-white text-gray-900",
  brand: "bg-gradient-to-br from-[#14080e] to-[#1a0f14] text-white",
};

const accentColor = "#7af17a";

function useThemeText(theme: PresentationTheme) {
  return {
    subtitle: theme === "light" ? "text-gray-500" : "text-white/70",
    body: theme === "light" ? "text-gray-700" : "text-white/80",
    muted: theme === "light" ? "text-gray-400" : "text-white/50",
    border: theme === "light" ? "border-gray-200" : "border-white/10",
    chartBg: theme === "light" ? "bg-gray-50" : "bg-white/5",
  };
}

// ─── Editable text element ───────────────────────────────────────────────────

interface EditableProps {
  value: string;
  field: string;
  isEditable?: boolean;
  onContentChange?: (field: string, value: string | string[]) => void;
  className?: string;
  as?: "h1" | "h2" | "p" | "span" | "blockquote";
}

function EditableText({
  value,
  field,
  isEditable,
  onContentChange,
  className,
  as: Tag = "p",
}: EditableProps) {
  const ref = useRef<HTMLElement>(null);

  const handleBlur = useCallback(() => {
    if (!ref.current || !onContentChange) return;
    const text = ref.current.innerText;
    if (text !== value) {
      onContentChange(field, text);
    }
  }, [field, value, onContentChange]);

  return (
    <Tag
      ref={ref as never}
      className={cn(
        className,
        isEditable &&
          "outline-none cursor-text hover:border hover:border-dashed hover:border-white/30 hover:rounded-md focus:border focus:border-dashed focus:border-[#7af17a]/50 focus:rounded-md transition-colors px-1 -mx-1",
      )}
      contentEditable={isEditable}
      suppressContentEditableWarning
      onBlur={isEditable ? handleBlur : undefined}
    >
      {value}
    </Tag>
  );
}

// ─── Layout renderers ────────────────────────────────────────────────────────

function TitleSlide({
  content,
  theme,
  isEditable,
  onContentChange,
}: LayoutProps) {
  const t = useThemeText(theme);

  return (
    <div className="flex flex-col items-center justify-center h-full px-12 text-center">
      {content.title && (
        <EditableText
          value={content.title}
          field="title"
          as="h1"
          isEditable={isEditable}
          onContentChange={onContentChange}
          className="text-3xl md:text-4xl font-bold leading-tight"
        />
      )}
      {content.subtitle && (
        <EditableText
          value={content.subtitle}
          field="subtitle"
          as="h2"
          isEditable={isEditable}
          onContentChange={onContentChange}
          className={cn("text-lg md:text-xl mt-4", t.subtitle)}
        />
      )}
    </div>
  );
}

function TitleContentSlide({
  content,
  theme,
  isEditable,
  onContentChange,
}: LayoutProps) {
  const t = useThemeText(theme);

  return (
    <div className="flex flex-col h-full px-12 py-10">
      {content.title && (
        <EditableText
          value={content.title}
          field="title"
          as="h1"
          isEditable={isEditable}
          onContentChange={onContentChange}
          className="text-3xl md:text-4xl font-bold"
        />
      )}
      {content.body && (
        <EditableText
          value={content.body}
          field="body"
          isEditable={isEditable}
          onContentChange={onContentChange}
          className={cn("text-base leading-relaxed mt-8", t.body)}
        />
      )}
    </div>
  );
}

function BulletsSlide({
  content,
  theme,
  isEditable,
  onContentChange,
}: LayoutProps) {
  const t = useThemeText(theme);

  return (
    <div className="flex flex-col h-full px-12 py-10">
      {content.title && (
        <EditableText
          value={content.title}
          field="title"
          as="h1"
          isEditable={isEditable}
          onContentChange={onContentChange}
          className="text-3xl md:text-4xl font-bold"
        />
      )}
      {content.bullets && content.bullets.length > 0 && (
        <ul className="mt-8 space-y-4">
          {content.bullets.map((bullet, index) => (
            <li key={index} className="flex items-start gap-3">
              <span
                className="mt-2 h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: accentColor }}
              />
              <EditableText
                value={bullet}
                field={`bullets.${index}`}
                as="span"
                isEditable={isEditable}
                onContentChange={(field, val) => {
                  if (!onContentChange || !content.bullets) return;
                  const updated = [...content.bullets];
                  updated[index] = val as string;
                  onContentChange("bullets", updated);
                }}
                className={cn("text-base leading-relaxed", t.body)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TwoColumnsSlide({
  content,
  theme,
  isEditable,
  onContentChange,
}: LayoutProps) {
  const t = useThemeText(theme);

  return (
    <div className="flex flex-col h-full px-12 py-10">
      {content.title && (
        <EditableText
          value={content.title}
          field="title"
          as="h1"
          isEditable={isEditable}
          onContentChange={onContentChange}
          className="text-3xl md:text-4xl font-bold"
        />
      )}
      <div className="grid grid-cols-2 gap-8 mt-8 flex-1">
        <div>
          {content.column_left && (
            <EditableText
              value={content.column_left}
              field="column_left"
              isEditable={isEditable}
              onContentChange={onContentChange}
              className={cn("text-base leading-relaxed", t.body)}
            />
          )}
        </div>
        <div>
          {content.column_right && (
            <EditableText
              value={content.column_right}
              field="column_right"
              isEditable={isEditable}
              onContentChange={onContentChange}
              className={cn("text-base leading-relaxed", t.body)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ImageLeftSlide({
  content,
  theme,
  isEditable,
  onContentChange,
}: LayoutProps) {
  const t = useThemeText(theme);

  return (
    <div className="flex h-full">
      <div className="w-[40%] h-full shrink-0">
        {content.image_url ? (
          <img
            src={content.image_url}
            alt={content.image_alt || ""}
            className="w-full h-full object-cover rounded-r-2xl"
          />
        ) : (
          <div
            className={cn(
              "w-full h-full flex items-center justify-center rounded-r-2xl",
              t.chartBg,
            )}
          >
            <span className={cn("text-sm", t.muted)}>Image</span>
          </div>
        )}
      </div>
      <div className="w-[60%] flex flex-col justify-center px-10">
        {content.title && (
          <EditableText
            value={content.title}
            field="title"
            as="h1"
            isEditable={isEditable}
            onContentChange={onContentChange}
            className="text-3xl md:text-4xl font-bold"
          />
        )}
        {content.body && (
          <EditableText
            value={content.body}
            field="body"
            isEditable={isEditable}
            onContentChange={onContentChange}
            className={cn("text-base leading-relaxed mt-6", t.body)}
          />
        )}
      </div>
    </div>
  );
}

function ImageRightSlide({
  content,
  theme,
  isEditable,
  onContentChange,
}: LayoutProps) {
  const t = useThemeText(theme);

  return (
    <div className="flex h-full">
      <div className="w-[60%] flex flex-col justify-center px-10">
        {content.title && (
          <EditableText
            value={content.title}
            field="title"
            as="h1"
            isEditable={isEditable}
            onContentChange={onContentChange}
            className="text-3xl md:text-4xl font-bold"
          />
        )}
        {content.body && (
          <EditableText
            value={content.body}
            field="body"
            isEditable={isEditable}
            onContentChange={onContentChange}
            className={cn("text-base leading-relaxed mt-6", t.body)}
          />
        )}
      </div>
      <div className="w-[40%] h-full shrink-0">
        {content.image_url ? (
          <img
            src={content.image_url}
            alt={content.image_alt || ""}
            className="w-full h-full object-cover rounded-l-2xl"
          />
        ) : (
          <div
            className={cn(
              "w-full h-full flex items-center justify-center rounded-l-2xl",
              t.chartBg,
            )}
          >
            <span className={cn("text-sm", t.muted)}>Image</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ImageFullSlide({ content, isEditable, onContentChange }: LayoutProps) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      {content.image_url ? (
        <img
          src={content.image_url}
          alt={content.image_alt || ""}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gray-800" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-12 text-center text-white">
        {content.title && (
          <EditableText
            value={content.title}
            field="title"
            as="h1"
            isEditable={isEditable}
            onContentChange={onContentChange}
            className="text-3xl md:text-4xl font-bold drop-shadow-lg"
          />
        )}
      </div>
    </div>
  );
}

function QuoteSlide({
  content,
  theme,
  isEditable,
  onContentChange,
}: LayoutProps) {
  const t = useThemeText(theme);

  return (
    <div className="flex flex-col items-center justify-center h-full px-16 text-center">
      <span
        className="text-7xl font-serif leading-none select-none"
        style={{ color: accentColor }}
        aria-hidden
      >
        &ldquo;
      </span>
      {content.quote && (
        <EditableText
          value={content.quote}
          field="quote"
          as="blockquote"
          isEditable={isEditable}
          onContentChange={onContentChange}
          className="text-2xl italic leading-relaxed mt-2 max-w-3xl"
        />
      )}
      <span
        className="text-7xl font-serif leading-none select-none mt-2"
        style={{ color: accentColor }}
        aria-hidden
      >
        &rdquo;
      </span>
      {content.quote_author && (
        <EditableText
          value={content.quote_author}
          field="quote_author"
          isEditable={isEditable}
          onContentChange={onContentChange}
          className={cn("text-base mt-6 self-end mr-16", t.muted)}
        />
      )}
    </div>
  );
}

function ChartSlide({
  content,
  theme,
  isEditable,
  onContentChange,
}: LayoutProps) {
  const t = useThemeText(theme);

  return (
    <div className="flex flex-col h-full px-12 py-10">
      {content.title && (
        <EditableText
          value={content.title}
          field="title"
          as="h1"
          isEditable={isEditable}
          onContentChange={onContentChange}
          className="text-3xl md:text-4xl font-bold"
        />
      )}
      <div
        className={cn(
          "flex-1 mt-8 rounded-xl flex items-center justify-center",
          t.chartBg,
          t.border,
          "border border-dashed",
        )}
      >
        <span className={cn("text-lg", t.muted)}>
          Graphique : {content.chart_type || "bar"}
        </span>
      </div>
    </div>
  );
}

function SectionSlide({ content, isEditable, onContentChange }: LayoutProps) {
  return (
    <div className="flex items-center justify-center h-full px-12 text-center">
      {content.title && (
        <EditableText
          value={content.title}
          field="title"
          as="h1"
          isEditable={isEditable}
          onContentChange={onContentChange}
          className="text-3xl md:text-4xl font-bold"
        />
      )}
    </div>
  );
}

function BlankSlide() {
  return <div className="h-full w-full" />;
}

// ─── Shared layout props ─────────────────────────────────────────────────────

interface LayoutProps {
  content: SlideContent;
  theme: PresentationTheme;
  isEditable?: boolean;
  onContentChange?: (field: string, value: string | string[]) => void;
}

// ─── Main component ──────────────────────────────────────────────────────────

export function SlideRenderer({
  slide,
  theme,
  className,
  isEditable,
  onContentChange,
}: SlideRendererProps) {
  const layoutProps: LayoutProps = {
    content: slide.content,
    theme,
    isEditable,
    onContentChange,
  };

  function renderLayout() {
    switch (slide.layout) {
      case "title":
        return <TitleSlide {...layoutProps} />;
      case "title_content":
        return <TitleContentSlide {...layoutProps} />;
      case "bullets":
        return <BulletsSlide {...layoutProps} />;
      case "two_columns":
        return <TwoColumnsSlide {...layoutProps} />;
      case "image_left":
        return <ImageLeftSlide {...layoutProps} />;
      case "image_right":
        return <ImageRightSlide {...layoutProps} />;
      case "image_full":
        return <ImageFullSlide {...layoutProps} />;
      case "quote":
        return <QuoteSlide {...layoutProps} />;
      case "chart":
        return <ChartSlide {...layoutProps} />;
      case "section":
        return <SectionSlide {...layoutProps} />;
      case "blank":
        return <BlankSlide />;
      default:
        return <BlankSlide />;
    }
  }

  return (
    <div
      className={cn(
        "aspect-video w-full overflow-hidden rounded-lg select-none",
        themeClasses[theme],
        className,
      )}
    >
      {renderLayout()}
    </div>
  );
}
