export type UserRole = "admin" | "manager" | "setter" | "closer" | "client_b2b" | "client_b2c";

export type DealTemperature = "hot" | "warm" | "cold";

export type DealActivityType = "call" | "message" | "email" | "note" | "meeting" | "status_change";

export type BookingStatus = "confirmed" | "completed" | "no_show" | "cancelled" | "rescheduled";

export type ContractStatus = "draft" | "sent" | "signed" | "expired";

export type ProspectStatus = "new" | "contacted" | "replied" | "booked" | "not_interested";

export type ContentPostStatus = "draft" | "scheduled" | "published";

export type AiMode = "full_ai" | "critical_validation" | "full_human" | "half_time";

export type WhatsAppStatus = "connected" | "disconnected" | "pending";

export type VideoRoomStatus = "scheduled" | "live" | "ended";

export type PaymentStatus = "pending" | "paid" | "overdue" | "failed";

export type InvoiceStatus = "draft" | "sent" | "paid";

export type AutomationType = "nurturing" | "upsell" | "placement";

export type RoleplayStatus = "active" | "completed" | "abandoned";

export type MarketplaceAppStatus = "pending" | "accepted" | "rejected";

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
  is_ready_to_place: boolean;
  matched_entrepreneur_id: string | null;
  setter_maturity_score: number;
  subscription_tier: string;
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
  installment_count: number;
  auto_generated: boolean;
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
  has_prerequisites: boolean;
  created_at: string;
  lessons?: Lesson[];
  modules?: CourseModule[];
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  position: number;
  created_at: string;
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  course_id: string;
  module_id: string | null;
  title: string;
  description: string | null;
  position: number;
  video_url: string | null;
  subtitle_url: string | null;
  transcript: string | null;
  duration_minutes: number | null;
  attachments: Array<{ name: string; url: string; type: string }>;
  content_html: string | null;
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
  max_attempts_per_day: number;
  passing_score: number;
  randomize: boolean;
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
  target_audience: string;
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

export interface ChannelRead {
  id: string;
  channel_id: string;
  user_id: string;
  last_read_at: string;
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
  category: string | null;
  is_team: boolean;
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
  engagement_score: number;
  assigned_setter_id: string | null;
  auto_follow_up: boolean;
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
  module_id: string | null;
  is_pinned: boolean;
  channel: string | null;
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
  messages: Array<{
    sender: string;
    content: string;
    type: string;
    timestamp: string;
    pending_send?: boolean;
    sent_at?: string;
    linkedin_message_id?: string;
  }>;
  last_message_at: string | null;
  linkedin_conversation_id: string | null;
  created_at: string;
  prospect?: Prospect;
}

export interface LinkedInSync {
  id: string;
  user_id: string;
  linkedin_profile_id: string | null;
  last_sync_at: string | null;
  sync_status: string;
  conversations_synced: number;
  prospects_synced: number;
  created_at: string;
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

// ==========================================
// New interfaces for Sales System completion
// ==========================================

export interface OnboardingQuizResponse {
  id: string;
  user_id: string;
  quiz_data: Record<string, unknown>;
  score: number;
  color_code: string;
  recommended_type: string;
  created_at: string;
}

export interface WelcomePack {
  id: string;
  target_role: string;
  items: Array<{ title: string; type: string; url: string }>;
  is_active: boolean;
  created_at: string;
}

export interface DailyJournal {
  id: string;
  user_id: string;
  date: string;
  mood: number | null;
  wins: string | null;
  struggles: string | null;
  goals_tomorrow: string | null;
  conversations_count: number;
  dms_sent: number;
  replies_received: number;
  calls_booked: number;
  deals_closed: number;
  created_at: string;
}

export interface CoursePrerequisite {
  id: string;
  course_id: string;
  prerequisite_course_id: string;
  min_score: number;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  lesson_id: string;
  answers: Record<string, unknown>;
  score: number;
  passed: boolean;
  attempted_at: string;
}

export interface ResourceItem {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  url: string;
  category: string | null;
  tags: string[];
  target_roles: string[];
  download_count: number;
  created_by: string | null;
  created_at: string;
}

export interface RevisionCard {
  id: string;
  lesson_id: string;
  question: string;
  answer: string;
  category: string | null;
  created_at: string;
}

export interface RoleplayProspectProfile {
  id: string;
  name: string;
  persona: string;
  niche: string | null;
  difficulty: string;
  objection_types: string[];
  network: string;
  context: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export interface RoleplaySession {
  id: string;
  user_id: string;
  prospect_profile_id: string;
  conversation: Array<{ role: string; content: string; timestamp: string }>;
  ai_feedback: Record<string, unknown>;
  score: number | null;
  duration_seconds: number | null;
  status: RoleplayStatus;
  created_at: string;
  prospect_profile?: RoleplayProspectProfile;
}

export interface ProspectScore {
  id: string;
  prospect_id: string;
  engagement_score: number;
  responsiveness_score: number;
  qualification_score: number;
  total_score: number;
  temperature: string;
  computed_at: string;
}

export interface FollowUpSequence {
  id: string;
  name: string;
  description: string | null;
  steps: Array<{ delay_hours: number; message_template: string; channel: string }>;
  trigger_type: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface FollowUpTask {
  id: string;
  sequence_id: string;
  prospect_id: string;
  step_index: number;
  message_content: string | null;
  scheduled_at: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  prospect?: Prospect;
}

export interface AiModeConfig {
  id: string;
  user_id: string;
  global_mode: AiMode;
  network_overrides: Record<string, AiMode>;
  critical_actions: string[];
  auto_send_enabled: boolean;
  auto_send_platforms: string[];
  auto_send_template: string;
  auto_send_mode: AiMode;
  story_reaction_enabled: boolean;
  story_reaction_emoji: string;
  updated_at: string;
  created_at: string;
}

export type RelanceStatus = "pending" | "sent" | "responded" | "cancelled";

export interface RelanceWorkflow {
  id: string;
  prospect_id: string;
  platform: string;
  created_by: string;
  status: RelanceStatus;
  delay_j2_hours: number;
  delay_j3_hours: number;
  message_j2: string;
  message_j3: string;
  j2_sent_at: string | null;
  j3_sent_at: string | null;
  cancelled_at: string | null;
  responded_at: string | null;
  created_at: string;
  prospect?: Prospect;
}

export interface WhatsAppConnection {
  id: string;
  user_id: string;
  phone_number: string | null;
  status: WhatsAppStatus;
  api_config: Record<string, unknown>;
  connected_at: string | null;
  created_at: string;
}

export interface WhatsAppSequence {
  id: string;
  name: string;
  description: string | null;
  funnel_type: string | null;
  steps: Array<{ delay_minutes: number; message: string; media_url?: string }>;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface WhatsAppMessage {
  id: string;
  connection_id: string;
  prospect_id: string | null;
  direction: string;
  content: string | null;
  media_url: string | null;
  status: string;
  sequence_id: string | null;
  created_at: string;
  prospect?: Prospect;
}

export interface ScriptFlowchart {
  id: string;
  title: string;
  description: string | null;
  nodes: unknown[];
  edges: unknown[];
  category: string | null;
  is_template: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MindMap {
  id: string;
  title: string;
  description: string | null;
  nodes: unknown[];
  edges: unknown[];
  category: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScriptTemplate {
  id: string;
  title: string;
  category: string | null;
  niche: string | null;
  network: string | null;
  flowchart_data: Record<string, unknown>;
  content: string | null;
  is_public: boolean;
  created_at: string;
}

export interface VideoRoom {
  id: string;
  title: string;
  channel_id: string | null;
  host_id: string;
  status: VideoRoomStatus;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  recording_url: string | null;
  ai_summary: string | null;
  chapters: Array<{ timestamp: string; label: string }>;
  max_participants: number;
  created_at: string;
  host?: Profile;
}

export interface VideoRoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string | null;
  left_at: string | null;
  user?: Profile;
}

export interface Poll {
  id: string;
  channel_id: string | null;
  room_id: string | null;
  created_by: string;
  question: string;
  options: Array<{ text: string; vote_count: number }>;
  is_active: boolean;
  ends_at: string | null;
  created_at: string;
}

export interface PollVote {
  id: string;
  poll_id: string;
  user_id: string;
  option_index: number;
  created_at: string;
}

export interface BroadcastMessage {
  id: string;
  sender_id: string;
  target_roles: string[];
  target_audience: string;
  subject: string | null;
  content: string;
  sent_count: number;
  created_at: string;
  sender?: Profile;
}

export interface AttributionEvent {
  id: string;
  deal_id: string | null;
  prospect_id: string | null;
  touchpoint_type: string;
  channel: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SetterWeeklyReport {
  id: string;
  setter_id: string;
  week_start: string;
  metrics: Record<string, unknown>;
  summary: string | null;
  generated_at: string;
  setter?: Profile;
}

export interface WhiteLabelConfig {
  id: string;
  entrepreneur_id: string;
  brand_name: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  custom_domain: string | null;
  enabled_modules: string[];
  is_active: boolean;
  created_at: string;
}

export interface EntrepreneurReport {
  id: string;
  entrepreneur_id: string;
  report_month: string;
  metrics: Record<string, unknown>;
  pdf_url: string | null;
  generated_at: string;
}

export interface PaymentInstallment {
  id: string;
  contract_id: string;
  amount: number;
  due_date: string;
  status: PaymentStatus;
  stripe_payment_id: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  contract_id: string;
  client_id: string;
  amount: number;
  invoice_number: string;
  status: InvoiceStatus;
  pdf_url: string | null;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  type: AutomationType;
  trigger_conditions: Record<string, unknown>;
  actions: unknown[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface AutomationExecution {
  id: string;
  rule_id: string;
  target_user_id: string;
  status: string;
  executed_at: string | null;
  result: Record<string, unknown>;
  created_at: string;
}

export interface MarketplaceListing {
  id: string;
  entrepreneur_id: string;
  title: string;
  description: string | null;
  niche: string | null;
  commission_type: string | null;
  commission_value: number | null;
  requirements: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  entrepreneur?: Profile;
}

export interface MarketplaceApplication {
  id: string;
  listing_id: string;
  setter_id: string;
  status: MarketplaceAppStatus;
  message: string | null;
  created_at: string;
  setter?: Profile;
}

export interface SetterMaturityScore {
  id: string;
  setter_id: string;
  message_quality: number;
  objection_handling: number;
  consistency: number;
  volume: number;
  roleplay_performance: number;
  response_rate: number;
  overall_score: number;
  computed_at: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  keys: Record<string, unknown>;
  created_at: string;
}

export type CoachingObjectiveCategory = "calls" | "deals" | "revenue" | "skills" | "other";

export type CoachingObjectiveStatus = "in_progress" | "completed" | "overdue" | "at_risk";

export interface CoachingObjective {
  id: string;
  assignee_id: string;
  created_by: string | null;
  title: string;
  description: string | null;
  category: CoachingObjectiveCategory;
  target_value: number;
  current_value: number;
  target_date: string;
  status: CoachingObjectiveStatus;
  notes: unknown[];
  created_at: string;
  updated_at: string;
  assignee?: Profile;
  creator?: Profile;
}

export interface DevelopmentPlan {
  id: string;
  user_id: string;
  skills: Array<{ name: string; level: number; target: number }>;
  actions: Array<{ id: string; title: string; description: string; priority: "high" | "medium" | "low"; done: boolean }>;
  resources: Array<{ title: string; url: string; type: string }>;
  created_at: string;
  updated_at: string;
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
      onboarding_quiz_responses: { Row: OnboardingQuizResponse; Insert: Partial<OnboardingQuizResponse> & { user_id: string }; Update: Partial<OnboardingQuizResponse> };
      welcome_packs: { Row: WelcomePack; Insert: Partial<WelcomePack> & { target_role: string }; Update: Partial<WelcomePack> };
      daily_journals: { Row: DailyJournal; Insert: Partial<DailyJournal> & { user_id: string; date: string }; Update: Partial<DailyJournal> };
      course_prerequisites: { Row: CoursePrerequisite; Insert: Partial<CoursePrerequisite> & { course_id: string; prerequisite_course_id: string }; Update: Partial<CoursePrerequisite> };
      quiz_attempts: { Row: QuizAttempt; Insert: Partial<QuizAttempt> & { user_id: string; lesson_id: string }; Update: Partial<QuizAttempt> };
      resource_items: { Row: ResourceItem; Insert: Partial<ResourceItem> & { title: string; resource_type: string; url: string }; Update: Partial<ResourceItem> };
      revision_cards: { Row: RevisionCard; Insert: Partial<RevisionCard> & { lesson_id: string; question: string; answer: string }; Update: Partial<RevisionCard> };
      roleplay_prospect_profiles: { Row: RoleplayProspectProfile; Insert: Partial<RoleplayProspectProfile> & { name: string; persona: string }; Update: Partial<RoleplayProspectProfile> };
      roleplay_sessions: { Row: RoleplaySession; Insert: Partial<RoleplaySession> & { user_id: string; prospect_profile_id: string }; Update: Partial<RoleplaySession> };
      prospect_scores: { Row: ProspectScore; Insert: Partial<ProspectScore> & { prospect_id: string }; Update: Partial<ProspectScore> };
      follow_up_sequences: { Row: FollowUpSequence; Insert: Partial<FollowUpSequence> & { name: string }; Update: Partial<FollowUpSequence> };
      follow_up_tasks: { Row: FollowUpTask; Insert: Partial<FollowUpTask> & { sequence_id: string; prospect_id: string; scheduled_at: string }; Update: Partial<FollowUpTask> };
      ai_mode_configs: { Row: AiModeConfig; Insert: Partial<AiModeConfig> & { user_id: string }; Update: Partial<AiModeConfig> };
      whatsapp_connections: { Row: WhatsAppConnection; Insert: Partial<WhatsAppConnection> & { user_id: string }; Update: Partial<WhatsAppConnection> };
      whatsapp_sequences: { Row: WhatsAppSequence; Insert: Partial<WhatsAppSequence> & { name: string }; Update: Partial<WhatsAppSequence> };
      whatsapp_messages: { Row: WhatsAppMessage; Insert: Partial<WhatsAppMessage> & { connection_id: string }; Update: Partial<WhatsAppMessage> };
      script_flowcharts: { Row: ScriptFlowchart; Insert: Partial<ScriptFlowchart> & { title: string }; Update: Partial<ScriptFlowchart> };
      mind_maps: { Row: MindMap; Insert: Partial<MindMap> & { title: string }; Update: Partial<MindMap> };
      script_templates: { Row: ScriptTemplate; Insert: Partial<ScriptTemplate> & { title: string }; Update: Partial<ScriptTemplate> };
      video_rooms: { Row: VideoRoom; Insert: Partial<VideoRoom> & { title: string; host_id: string }; Update: Partial<VideoRoom> };
      video_room_participants: { Row: VideoRoomParticipant; Insert: Partial<VideoRoomParticipant> & { room_id: string; user_id: string }; Update: Partial<VideoRoomParticipant> };
      polls: { Row: Poll; Insert: Partial<Poll> & { created_by: string; question: string }; Update: Partial<Poll> };
      poll_votes: { Row: PollVote; Insert: Partial<PollVote> & { poll_id: string; user_id: string; option_index: number }; Update: Partial<PollVote> };
      broadcast_messages: { Row: BroadcastMessage; Insert: Partial<BroadcastMessage> & { sender_id: string; content: string }; Update: Partial<BroadcastMessage> };
      attribution_events: { Row: AttributionEvent; Insert: Partial<AttributionEvent> & { touchpoint_type: string }; Update: Partial<AttributionEvent> };
      setter_weekly_reports: { Row: SetterWeeklyReport; Insert: Partial<SetterWeeklyReport> & { setter_id: string; week_start: string }; Update: Partial<SetterWeeklyReport> };
      white_label_configs: { Row: WhiteLabelConfig; Insert: Partial<WhiteLabelConfig> & { entrepreneur_id: string }; Update: Partial<WhiteLabelConfig> };
      entrepreneur_reports: { Row: EntrepreneurReport; Insert: Partial<EntrepreneurReport> & { entrepreneur_id: string; report_month: string }; Update: Partial<EntrepreneurReport> };
      payment_installments: { Row: PaymentInstallment; Insert: Partial<PaymentInstallment> & { contract_id: string; amount: number; due_date: string }; Update: Partial<PaymentInstallment> };
      invoices: { Row: Invoice; Insert: Partial<Invoice> & { contract_id: string; client_id: string; amount: number; invoice_number: string }; Update: Partial<Invoice> };
      automation_rules: { Row: AutomationRule; Insert: Partial<AutomationRule> & { name: string; type: AutomationType }; Update: Partial<AutomationRule> };
      automation_executions: { Row: AutomationExecution; Insert: Partial<AutomationExecution> & { rule_id: string; target_user_id: string }; Update: Partial<AutomationExecution> };
      marketplace_listings: { Row: MarketplaceListing; Insert: Partial<MarketplaceListing> & { entrepreneur_id: string; title: string }; Update: Partial<MarketplaceListing> };
      marketplace_applications: { Row: MarketplaceApplication; Insert: Partial<MarketplaceApplication> & { listing_id: string; setter_id: string }; Update: Partial<MarketplaceApplication> };
      setter_maturity_scores: { Row: SetterMaturityScore; Insert: Partial<SetterMaturityScore> & { setter_id: string }; Update: Partial<SetterMaturityScore> };
      push_subscriptions: { Row: PushSubscription; Insert: Partial<PushSubscription> & { user_id: string; endpoint: string }; Update: Partial<PushSubscription> };
      channel_reads: { Row: ChannelRead; Insert: Partial<ChannelRead> & { channel_id: string; user_id: string }; Update: Partial<ChannelRead> };
      coaching_objectives: { Row: CoachingObjective; Insert: Partial<CoachingObjective> & { assignee_id: string; title: string; category: CoachingObjectiveCategory; target_value: number; target_date: string }; Update: Partial<CoachingObjective> };
      development_plans: { Row: DevelopmentPlan; Insert: Partial<DevelopmentPlan> & { user_id: string }; Update: Partial<DevelopmentPlan> };
      relance_workflows: { Row: RelanceWorkflow; Insert: Partial<RelanceWorkflow> & { prospect_id: string; platform: string; created_by: string }; Update: Partial<RelanceWorkflow> };
    };
  };
}
