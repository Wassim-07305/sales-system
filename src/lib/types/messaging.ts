export interface MessageSender {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export type EnrichedMessage = {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  content_type: string;
  message_type: string;
  file_url: string | null;
  file_name: string | null;
  is_edited: boolean;
  is_pinned: boolean;
  is_urgent: boolean;
  reply_to: string | null;
  reply_count: number;
  scheduled_at: string | null;
  metadata: Record<string, unknown>;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  is_ai_generated: boolean;
  sender: MessageSender | null;
  reactions: MessageReaction[];
  attachments: MessageAttachment[];
  reply_message?: {
    id: string;
    content: string;
    content_type: string;
    sender: { full_name: string } | null;
  } | null;
};

export interface MessageGroup {
  senderId: string;
  sender: MessageSender | null;
  messages: EnrichedMessage[];
  date: string;
}

export interface ChannelWithMeta {
  id: string;
  name: string;
  type: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  is_archived: boolean;
  last_message_at: string | null;
  unreadCount: number;
  urgentUnreadCount: number;
  isMuted: boolean;
  isPinned: boolean;
  myLastRead: string | null;
  dmPartner?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
  } | null;
}
