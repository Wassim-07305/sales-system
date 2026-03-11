import { z } from "zod";

// ============================================================
// Shared validators
// ============================================================

const uuidSchema = z.string().uuid("ID invalide");

const amountSchema = z
  .number({ message: "Le montant doit être un nombre" })
  .positive("Le montant doit être positif")
  .max(99_999_999.99, "Montant trop élevé");

const emailSchema = z.string().email("Email invalide").max(320);

const phoneSchema = z
  .string()
  .regex(/^\+?[0-9\s\-().]{6,20}$/, "Numéro de téléphone invalide")
  .optional()
  .or(z.literal(""));

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================================
// CRM — Deals
// ============================================================

export const createDealSchema = z.object({
  title: z
    .string()
    .min(1, "Le titre est requis")
    .max(200, "Le titre est trop long"),
  contact_id: uuidSchema.optional(),
  stage_id: uuidSchema.optional(),
  value: amountSchema.default(0),
  probability: z.number().int().min(0).max(100).default(50),
  source: z.string().max(100).optional(),
  assigned_to: uuidSchema.optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
  temperature: z.enum(["hot", "warm", "cold"]).default("warm"),
  notes: z.string().max(5000).optional(),
  next_action: z.string().max(500).optional(),
  next_action_date: z.string().datetime().optional(),
});

export const updateDealSchema = createDealSchema.partial().extend({
  id: uuidSchema,
});

export const dealFiltersSchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  amountMin: z.coerce.number().min(0).optional(),
  amountMax: z.coerce.number().min(0).optional(),
  assignedTo: uuidSchema.optional(),
  source: z.string().max(100).optional(),
  sortBy: z
    .enum([
      "value_asc",
      "value_desc",
      "created_at_asc",
      "created_at_desc",
      "title_asc",
      "title_desc",
    ])
    .optional(),
});

export const createDealActivitySchema = z.object({
  deal_id: uuidSchema,
  type: z.enum(["call", "message", "email", "note", "meeting", "status_change"]),
  content: z.string().max(5000).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

// ============================================================
// CRM — Contacts
// ============================================================

export const createContactSchema = z.object({
  email: emailSchema,
  full_name: z.string().min(1, "Le nom est requis").max(200),
  phone: phoneSchema,
  company: z.string().max(200).optional(),
  niche: z.string().max(200).optional(),
  current_revenue: z.string().max(100).optional(),
  goals: z.string().max(2000).optional(),
});

export const updateContactSchema = createContactSchema.partial().extend({
  id: uuidSchema,
});

// ============================================================
// Contracts
// ============================================================

export const createContractSchema = z.object({
  templateId: uuidSchema,
  clientId: uuidSchema,
  dealId: uuidSchema.optional(),
  content: z
    .string()
    .min(1, "Le contenu du contrat est requis")
    .max(100_000, "Contenu trop long"),
  amount: amountSchema,
  paymentSchedule: z.string().max(500),
});

export const sendContractSchema = z.object({
  contractId: uuidSchema,
});

export const signContractSchema = z.object({
  contractId: uuidSchema,
  signatureData: z
    .string()
    .min(1, "La signature est requise")
    .max(500_000, "Données de signature trop volumineuses"),
});

export const saveSignatureSchema = z.object({
  contractId: uuidSchema,
  signatureData: z
    .string()
    .min(1, "La signature est requise")
    .max(500_000),
  signerName: z
    .string()
    .min(1, "Le nom du signataire est requis")
    .max(200),
});

export const savePdfUrlSchema = z.object({
  contractId: uuidSchema,
  pdfUrl: z.string().url("URL du PDF invalide").max(2000),
});

// ============================================================
// Payments
// ============================================================

export const createInstallmentPlanSchema = z.object({
  contractId: uuidSchema,
  totalAmount: amountSchema,
  installmentCount: z
    .number()
    .int("Le nombre d'échéances doit être entier")
    .min(1, "Au moins 1 échéance")
    .max(60, "Maximum 60 échéances"),
});

export const recordPaymentSchema = z.object({
  installmentId: uuidSchema,
});

export const generateInvoiceSchema = z.object({
  contractId: uuidSchema,
  amount: amountSchema,
});

// ============================================================
// Bookings
// ============================================================

export const createBookingSchema = z.object({
  prospect_name: z
    .string()
    .min(1, "Le nom est requis")
    .max(200),
  prospect_email: emailSchema,
  prospect_phone: phoneSchema,
  assigned_to: uuidSchema.optional(),
  slot_type: z.string().max(50).default("discovery"),
  scheduled_at: z.string().datetime("Date de rendez-vous invalide"),
  duration_minutes: z.number().int().min(5).max(480).default(30),
  meeting_link: z.string().url().max(2000).optional().or(z.literal("")),
  qualification_data: z.record(z.string(), z.unknown()).default({}),
  notes: z.string().max(5000).optional(),
});

export const updateBookingSchema = createBookingSchema.partial().extend({
  id: uuidSchema,
  status: z
    .enum(["confirmed", "completed", "no_show", "cancelled", "rescheduled"])
    .optional(),
});

// ============================================================
// Prospecting
// ============================================================

export const createProspectSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(200),
  list_id: uuidSchema.optional(),
  profile_url: z.string().url().max(2000).optional().or(z.literal("")),
  platform: z.string().max(50).optional(),
  notes: z.string().max(5000).optional(),
  assigned_setter_id: uuidSchema.optional(),
});

export const updateProspectSchema = createProspectSchema.partial().extend({
  id: uuidSchema,
  status: z
    .enum(["new", "contacted", "replied", "booked", "not_interested"])
    .optional(),
  engagement_score: z.number().int().min(0).max(100).optional(),
});

export const createProspectListSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(200),
  source: z.string().max(100).optional(),
});

// ============================================================
// Community
// ============================================================

export const createCommunityPostSchema = z.object({
  type: z.enum(["discussion", "win", "question"]).default("discussion"),
  title: z.string().max(300).optional(),
  content: z
    .string()
    .min(1, "Le contenu est requis")
    .max(10_000, "Le contenu est trop long"),
  image_url: z.string().url().max(2000).optional().or(z.literal("")),
});

export const createCommunityCommentSchema = z.object({
  post_id: uuidSchema,
  content: z
    .string()
    .min(1, "Le commentaire est requis")
    .max(5000, "Le commentaire est trop long"),
});

// ============================================================
// Messages / Chat
// ============================================================

export const sendMessageSchema = z.object({
  channel_id: uuidSchema,
  content: z.string().max(10_000).optional(),
  message_type: z.enum(["text", "voice", "file", "image"]).default("text"),
  file_url: z.string().url().max(2000).optional(),
  file_name: z.string().max(500).optional(),
  reply_to: uuidSchema.optional(),
});

// ============================================================
// Type exports (infer from schemas)
// ============================================================

export type CreateDealInput = z.infer<typeof createDealSchema>;
export type UpdateDealInput = z.infer<typeof updateDealSchema>;
export type DealFiltersInput = z.infer<typeof dealFiltersSchema>;
export type CreateDealActivityInput = z.infer<typeof createDealActivitySchema>;
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type CreateContractInput = z.infer<typeof createContractSchema>;
export type SignContractInput = z.infer<typeof signContractSchema>;
export type CreateInstallmentPlanInput = z.infer<typeof createInstallmentPlanSchema>;
export type GenerateInvoiceInput = z.infer<typeof generateInvoiceSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type CreateProspectInput = z.infer<typeof createProspectSchema>;
export type UpdateProspectInput = z.infer<typeof updateProspectSchema>;
export type CreateCommunityPostInput = z.infer<typeof createCommunityPostSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
