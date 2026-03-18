import type { EnrichedMessage, MessageGroup } from "@/lib/types/messaging";

export function groupMessages(messages: EnrichedMessage[]): MessageGroup[] {
  const groups: MessageGroup[] = [];

  for (const msg of messages) {
    const last = groups[groups.length - 1];
    const lastMsg = last?.messages[last.messages.length - 1];

    const sameUser = last && last.senderId === msg.sender_id;
    const within5Min =
      lastMsg &&
      new Date(msg.created_at).getTime() -
        new Date(lastMsg.created_at).getTime() <
        5 * 60 * 1000;
    const sameDay = lastMsg && isSameDay(lastMsg.created_at, msg.created_at);

    if (sameUser && within5Min && sameDay && msg.content_type !== "system") {
      last.messages.push(msg);
    } else {
      groups.push({
        senderId: msg.sender_id,
        sender: msg.sender,
        messages: [msg],
        date: msg.created_at,
      });
    }
  }

  return groups;
}

export function formatMessageTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const time = d
    .toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    .replace(":", " h ");

  if (isSameDay(dateStr, now.toISOString())) {
    return time;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(dateStr, yesterday.toISOString())) {
    return `Hier ${time}`;
  }

  const daysDiff = Math.floor(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysDiff < 7) {
    const dayName = d.toLocaleDateString("fr-FR", { weekday: "short" });
    return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${time}`;
  }

  const dateFormatted = d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
  return `${dateFormatted} ${time}`;
}

export function formatDateSeparator(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();

  if (isSameDay(dateStr, now.toISOString())) {
    return "Aujourd'hui";
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(dateStr, yesterday.toISOString())) {
    return "Hier";
  }

  return d
    .toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function getMessagePreview(
  content: string,
  contentType: string,
): string {
  if (contentType === "image") return "Image";
  if (contentType === "file") return "Fichier";
  if (contentType === "video") return "Video";
  if (contentType === "audio") return "Message vocal";
  if (contentType === "system") return content;
  if (content.length > 50) return content.slice(0, 50) + "...";
  return content;
}
