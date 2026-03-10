"use client";

interface TypingIndicatorProps {
  users: { userName: string }[];
}

export function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const names =
    users.length === 1
      ? users[0].userName
      : users.length === 2
        ? `${users[0].userName} et ${users[1].userName}`
        : `${users[0].userName} et ${users.length - 1} autres`;

  return (
    <div className="flex items-center gap-2 px-4 py-1 text-xs text-muted-foreground">
      <span className="flex gap-0.5">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
      </span>
      <span>{names} est en train d&apos;écrire...</span>
    </div>
  );
}
