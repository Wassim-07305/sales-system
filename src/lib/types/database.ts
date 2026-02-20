export type UserRole = "admin" | "manager" | "setter" | "closer" | "client_b2b" | "client_b2c";

export type DealTemperature = "hot" | "warm" | "cold";

export type DealActivityType = "call" | "message" | "email" | "note" | "meeting" | "status_change";

export type BookingStatus = "confirmed" | "completed" | "no_show" | "cancelled" | "rescheduled";

export type ContractStatus = "draft" | "sent" | "signed" | "expired";

export type ProspectStatus = "new" | "contacted" | "replied" | "booked" | "not_interested";

export type ContentPostStatus = "draft" | "scheduled" | "published";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  phone: string | null;
  company: string | null;
  niche: string | null;
  current_revenue: string | null;
  goals: string | null;
  onboarding_completed: boolean;
  onboarding_step: number;
  health_score: number;
  created_at: string;
  updated_at: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  position: number;
  color: string;
  created_at: string;
}

export interface Deal {
  id: string;
  contact_id: string | null;
  stage_id: string | null;
  title: string;
  value: number;
  probability: number;
  source: string | null;
  assigned_to: string | null;
  tags: string[];
  temperature: DealTemperature;
  notes: string | null;
  last_contact_at: string | null;
  next_action: string | null;
  next_action_date: string | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  contact?: Profile;
  stage?: PipelineStage;
  assigned_user?: Profile;
}

export interface DealActivity {
  id: string;
  deal_id: string;
  user_id: string | null;
  type: DealActivityType;
  content: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  user?: Profile;
}

export interface BookingSlot {
  id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  slot_type: string;
  is_active: boolean;
}

export interface Booking {
  id: string;
  prospect_name: string;
  prospect_email: string;
  prospect_phone: string | null;
  assigned_to: string | null;
  slot_type: string;
  scheduled_at: string;
  duration_minutes: number;
  status: BookingStatus;
  meeting_link: string | null;
  qualification_data: Record<string, unknown>;
  reliability_score: number;
  reminder_sent: boolean;
  notes: string | null;
  created_at: string;
  assigned_user?: Profile;
}

export interface ContractTemplate {
  id: string;
  name: string;
  content: string;
  created_by: string | null;
  created_at: string;
}

export interface Contract {
  id: string;
  client_id: string | null;
  deal_id: string | null;
  template_id: string | null;
  content: string;
  amount: number | null;
  payment_schedule: string | null;
  status: ContractStatus;
  signed_at: string | null;
  signature_data: string | null;
  pdf_url: string | null;
  created_at: string;
  client?: Profile;
}

export interface Course {
  id: string;
  title: string;
  description: string | null;
  position: number;
  thumbnail_url: string | null;
  is_published: boolean;
  target_roles: string[];
  created_at: string;
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  position: number;
  video_url: string | null;
  transcript: string | null;
  duration_minutes: number | null;
  attachments: Array<{ name: string; url: string; type: string }>;
  created_at: string;
}

export interface Quiz {
  id: string;
  lesson_id: string;
  questions: Array<{
    question: string;
    options: string[];
    correct_index: number;
  }>;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  quiz_score: number | null;
  completed_at: string | null;
}

export interface Script {
  id: string;
  title: string;
  category: string | null;
  niche: string | null;
  content: string;
  tags: string[];
  created_at: string;
}

export interface Objection {
  id: string;
  objection: string;
  best_responses: Array<{ response: string; effectiveness_score: number }>;
  category: string | null;
  created_at: string;
}

export interface Channel {
  id: string;
  name: string;
  type: "group" | "direct" | "announcement";
  description: string | null;
  created_by: string | null;
  members: string[];
  created_at: string;
}

export interface Message {
  id: string;
  channel_id: string;
  sender_id: string | null;
  content: string | null;
  message_type: "text" | "voice" | "file" | "image";
  file_url: string | null;
  file_name: string | null;
  is_edited: boolean;
  reply_to: string | null;
  created_at: string;
  sender?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface GamificationProfile {
  id: string;
  user_id: string;
  level: number;
  level_name: string;
  total_points: number;
  current_streak: number;
  badges: Array<{ badge_id: string; name: string; earned_at: string }>;
  updated_at: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string | null;
  target_value: number;
  metric: string;
  points_reward: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
}

export interface ChallengeProgress {
  id: string;
  user_id: string;
  challenge_id: string;
  current_value: number;
  completed: boolean;
  completed_at: string | null;
}

export interface GroupCall {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  meeting_link: string | null;
  replay_url: string | null;
  replay_timestamps: Array<{ time: string; label: string }>;
  tags: string[];
  created_at: string;
}

export interface ClientKpi {
  id: string;
  client_id: string;
  date: string;
  bookings_count: number;
  show_up_rate: number;
  closing_rate: number;
  revenue_signed: number;
  created_at: string;
}

export interface ProspectList {
  id: string;
  name: string;
  source: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Prospect {
  id: string;
  list_id: string | null;
  name: string;
  profile_url: string | null;
  platform: string | null;
  status: ProspectStatus;
  last_message_at: string | null;
  notes: string | null;
  conversation_history: Array<Record<string, unknown>>;
  created_at: string;
}

export interface DmTemplate {
  id: string;
  name: string;
  platform: string | null;
  step: string | null;
  niche: string | null;
  content: string;
  variant: string;
  created_at: string;
}

export interface DailyQuota {
  id: string;
  user_id: string;
  date: string;
  dms_sent: number;
  dms_target: number;
  replies_received: number;
  bookings_from_dms: number;
}

export interface ContentPost {
  id: string;
  title: string | null;
  content: string | null;
  platform: string | null;
  framework: string | null;
  status: ContentPostStatus;
  scheduled_at: string | null;
  published_at: string | null;
  metrics: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export interface CommunityPost {
  id: string;
  author_id: string | null;
  type: "discussion" | "win" | "question";
  title: string | null;
  content: string;
  image_url: string | null;
  likes_count: number;
  hidden: boolean;
  created_at: string;
  author?: Profile;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  author_id: string | null;
  content: string;
  created_at: string;
  author?: Profile;
}

export interface Affiliate {
  id: string;
  user_id: string;
  referral_code: string;
  total_referrals: number;
  total_converted: number;
  total_commission: number;
  created_at: string;
}

export interface Referral {
  id: string;
  affiliate_id: string;
  referred_email: string | null;
  referred_name: string | null;
  status: "pending" | "converted" | "expired";
  deal_id: string | null;
  commission: number;
  created_at: string;
}

export interface DmConversation {
  id: string;
  prospect_id: string | null;
  platform: string;
  messages: Array<{ sender: string; content: string; type: string; timestamp: string }>;
  last_message_at: string | null;
  created_at: string;
  prospect?: Prospect;
}

export interface VoiceProfile {
  id: string;
  user_id: string;
  voice_id: string | null;
  sample_url: string | null;
  status: "pending" | "processing" | "ready";
  created_at: string;
}

export interface VoiceMessage {
  id: string;
  voice_profile_id: string | null;
  input_text: string | null;
  input_audio_url: string | null;
  output_audio_url: string | null;
  status: "pending" | "processing" | "ready" | "failed";
  scheduled_send_at: string | null;
  sent: boolean;
  target_prospect_id: string | null;
  created_at: string;
  prospect?: Prospect;
}

// Supabase Database type (simplified for now - will be generated from Supabase CLI later)
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string; email: string }; Update: Partial<Profile> };
      pipeline_stages: { Row: PipelineStage; Insert: Partial<PipelineStage>; Update: Partial<PipelineStage> };
      deals: { Row: Deal; Insert: Partial<Deal> & { title: string }; Update: Partial<Deal> };
      deal_activities: { Row: DealActivity; Insert: Partial<DealActivity> & { deal_id: string; type: string }; Update: Partial<DealActivity> };
      booking_slots: { Row: BookingSlot; Insert: Partial<BookingSlot> & { user_id: string; start_time: string; end_time: string }; Update: Partial<BookingSlot> };
      bookings: { Row: Booking; Insert: Partial<Booking> & { prospect_name: string; prospect_email: string; scheduled_at: string }; Update: Partial<Booking> };
      contract_templates: { Row: ContractTemplate; Insert: Partial<ContractTemplate> & { name: string; content: string }; Update: Partial<ContractTemplate> };
      contracts: { Row: Contract; Insert: Partial<Contract> & { content: string }; Update: Partial<Contract> };
      courses: { Row: Course; Insert: Partial<Course> & { title: string; position: number }; Update: Partial<Course> };
      lessons: { Row: Lesson; Insert: Partial<Lesson> & { course_id: string; title: string; position: number }; Update: Partial<Lesson> };
      quizzes: { Row: Quiz; Insert: Partial<Quiz> & { lesson_id: string; questions: Quiz["questions"] }; Update: Partial<Quiz> };
      lesson_progress: { Row: LessonProgress; Insert: Partial<LessonProgress> & { user_id: string; lesson_id: string }; Update: Partial<LessonProgress> };
      scripts: { Row: Script; Insert: Partial<Script> & { title: string; content: string }; Update: Partial<Script> };
      objections: { Row: Objection; Insert: Partial<Objection> & { objection: string; best_responses: Objection["best_responses"] }; Update: Partial<Objection> };
      channels: { Row: Channel; Insert: Partial<Channel> & { name: string }; Update: Partial<Channel> };
      messages: { Row: Message; Insert: Partial<Message> & { channel_id: string }; Update: Partial<Message> };
      notifications: { Row: Notification; Insert: Partial<Notification> & { user_id: string; title: string }; Update: Partial<Notification> };
      gamification_profiles: { Row: GamificationProfile; Insert: Partial<GamificationProfile> & { user_id: string }; Update: Partial<GamificationProfile> };
      challenges: { Row: Challenge; Insert: Partial<Challenge> & { title: string; target_value: number; metric: string }; Update: Partial<Challenge> };
      challenge_progress: { Row: ChallengeProgress; Insert: Partial<ChallengeProgress> & { user_id: string; challenge_id: string }; Update: Partial<ChallengeProgress> };
      group_calls: { Row: GroupCall; Insert: Partial<GroupCall> & { title: string; scheduled_at: string }; Update: Partial<GroupCall> };
      client_kpis: { Row: ClientKpi; Insert: Partial<ClientKpi> & { client_id: string; date: string }; Update: Partial<ClientKpi> };
      prospect_lists: { Row: ProspectList; Insert: Partial<ProspectList> & { name: string }; Update: Partial<ProspectList> };
      prospects: { Row: Prospect; Insert: Partial<Prospect> & { name: string }; Update: Partial<Prospect> };
      dm_templates: { Row: DmTemplate; Insert: Partial<DmTemplate> & { name: string; content: string }; Update: Partial<DmTemplate> };
      daily_quotas: { Row: DailyQuota; Insert: Partial<DailyQuota> & { user_id: string; date: string }; Update: Partial<DailyQuota> };
      content_posts: { Row: ContentPost; Insert: Partial<ContentPost>; Update: Partial<ContentPost> };
      community_posts: { Row: CommunityPost; Insert: Partial<CommunityPost> & { content: string }; Update: Partial<CommunityPost> };
      community_comments: { Row: CommunityComment; Insert: Partial<CommunityComment> & { post_id: string; content: string }; Update: Partial<CommunityComment> };
      affiliates: { Row: Affiliate; Insert: Partial<Affiliate> & { user_id: string; referral_code: string }; Update: Partial<Affiliate> };
      referrals: { Row: Referral; Insert: Partial<Referral> & { affiliate_id: string }; Update: Partial<Referral> };
      dm_conversations: { Row: DmConversation; Insert: Partial<DmConversation> & { platform: string }; Update: Partial<DmConversation> };
      voice_profiles: { Row: VoiceProfile; Insert: Partial<VoiceProfile> & { user_id: string }; Update: Partial<VoiceProfile> };
      voice_messages: { Row: VoiceMessage; Insert: Partial<VoiceMessage>; Update: Partial<VoiceMessage> };
    };
  };
}
