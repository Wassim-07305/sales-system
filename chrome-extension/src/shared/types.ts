export interface LinkedInProfile {
  publicIdentifier: string;
  firstName: string;
  lastName: string;
  headline: string;
  locationName: string;
  industryName: string;
  connectionCount: number;
  profilePictureUrl: string | null;
}

export interface LinkedInConversation {
  conversationId: string;
  participants: Array<{
    publicIdentifier: string;
    firstName: string;
    lastName: string;
  }>;
  lastActivityAt: number;
}

export interface LinkedInMessage {
  messageId: string;
  conversationId: string;
  sender: string;
  body: string;
  sentAt: number;
}

export interface SyncState {
  lastSyncAt: string | null;
  syncStatus: "idle" | "syncing" | "error";
  conversationsSynced: number;
  prospectsSynced: number;
  error: string | null;
}

export interface AuthState {
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  isAuthenticated: boolean;
}

export interface LinkedInAuth {
  csrfToken: string | null;
  isLoggedIn: boolean;
}

export type ExtensionMessage =
  | { action: "scrape_profile"; slug: string }
  | { action: "profile_scraped"; profile: LinkedInProfile | null; inCrm: boolean }
  | { action: "get_status" }
  | { action: "status_response"; auth: AuthState; linkedin: LinkedInAuth; sync: SyncState }
  | { action: "force_sync" }
  | { action: "sync_complete"; sync: SyncState }
  | { action: "login"; email: string; password: string }
  | { action: "login_result"; success: boolean; error?: string }
  | { action: "logout" }
  | { action: "send_message"; conversationId: string; prospectId: string; content: string }
  | { action: "message_sent"; success: boolean; error?: string };
