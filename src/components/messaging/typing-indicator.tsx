"use client";

interface TypingIndicatorProps {
  typingUsers: { userId: string; fullName: string }[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const text =
    typingUsers.length === 1
      ? `${typingUsers[0].fullName} est en train d'ecrire`
      : typingUsers.length === 2
        ? `${typingUsers[0].fullName} et ${typingUsers[1].fullName} ecrivent`
        : `${typingUsers[0].fullName} et ${typingUsers.length - 1} autres ecrivent`;

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-muted-foreground animate-fade-in">
      <div className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-typing-dot" />
        <span
          className="h-1.5 w-1.5 rounded-full bg-primary animate-typing-dot"
          style={{ animationDelay: "0.2s" }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full bg-primary animate-typing-dot"
          style={{ animationDelay: "0.4s" }}
        />
      </div>
      <span>{text}...</span>
    </div>
  );
}
