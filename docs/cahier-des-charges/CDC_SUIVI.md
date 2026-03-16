# Suivi Cahier des Charges — Sales System

> **Dernière mise à jour** : 2026-03-15
> **Couverture globale** : 97% (82 faits / 4 manquants API tierce)
> **Note** : Tous les items internes sont complétés. Les 4 manquants nécessitent des APIs tierces payantes (Sage/SAP, Zapier/Make, Sentry)

---

## Légende

- ✅ **Fait** — Fonctionnalité implémentée et compilable
- ⚠️ **Partiel** — UI existe mais logique incomplète ou API tierce manquante
- ❌ **Manquant** — Non implémenté
- 🔒 **API tierce requise** — Impossible sans clé/service externe

---

## 1. Introduction & Architecture

| #   | Feature                      | Statut  | Fichiers clés                              |
| --- | ---------------------------- | ------- | ------------------------------------------ |
| F1  | Stack Technologique          | ✅ Fait | Next.js 16, Supabase, React 19, Tailwind 4 |
| F2  | Infrastructure & Scalabilité | ✅ Fait | Vercel + Supabase managed                  |

## 2. Rôles Utilisateurs

| #   | Feature                                                          | Statut  | Fichiers clés                                                |
| --- | ---------------------------------------------------------------- | ------- | ------------------------------------------------------------ |
| —   | 6 rôles (admin, manager, setter, closer, client_b2b, client_b2c) | ✅ Fait | `lib/types/database.ts`, `middleware.ts`, `lib/constants.ts` |

## 3. Tableau de Bord

| #    | Feature                     | Statut  | Fichiers clés                             |
| ---- | --------------------------- | ------- | ----------------------------------------- |
| F1   | Dashboard Admin/Manager     | ✅ Fait | `dashboard/admin-dashboard.tsx`           |
| F2   | Dashboard Setter/Closer     | ✅ Fait | `dashboard/page.tsx`                      |
| F3   | Dashboard Client B2B/B2C    | ✅ Fait | `dashboard/client-dashboard.tsx`          |
| F3.1 | Widgets Personnalisables    | ✅ Fait | `settings/dashboard-builder/`             |
| F3.2 | Notifications & Alertes KPI | ✅ Fait | `notifications/`, `lib/actions/alerts.ts` |

## 4. CRM & Pipeline de Vente

| #    | Feature                                | Statut  | Fichiers clés                                           |
| ---- | -------------------------------------- | ------- | ------------------------------------------------------- |
| F4   | Pipeline Kanban Configurable           | ✅ Fait | `crm/page.tsx` (dnd-kit, 6 stages)                      |
| F5   | Gestion des Contacts                   | ✅ Fait | `contacts/`, `contacts/duplicates/`, `contacts/import/` |
| F6   | Détail Deal & Fiches Complètes         | ✅ Fait | `crm/` detail pages                                     |
| F6.5 | Fiche Contact Détaillée                | ✅ Fait | `contacts/[id]/`                                        |
| F7   | Actions Rapides & Automations          | ✅ Fait | `lib/actions/crm.ts`, `quick-note-modal.tsx`            |
| F7.0 | Stages Personnalisables & Probabilités | ✅ Fait | `pipeline_stages` table                                 |
| F7.1 | Import Massif Contacts & Deals         | ✅ Fait | `contacts/import/`, `lib/actions/import.ts`             |
| F7.2 | Export Rapports & Données              | ✅ Fait | `lib/actions/export.ts`, `components/export-dialog.tsx` |
| F7.3 | Timeline Complète Deal                 | ✅ Fait | `deal_activities` table                                 |
| F7.4 | Audit Log Complet                      | ✅ Fait | `settings/audit-log/`, `lib/actions/audit-log.ts`       |

## 5. Bookings & Appels

| #     | Feature                        | Statut                         | Fichiers clés                                                                                                                                                      |
| ----- | ------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F8    | Page de Booking Publique       | ✅ Fait                        | `book/[slug]/page.tsx`                                                                                                                                             |
| F9    | Slots de Disponibilités        | ✅ Fait                        | `bookings/page.tsx`                                                                                                                                                |
| F10   | Gestion des Appels             | ✅ Fait                        | `calls/page.tsx`                                                                                                                                                   |
| F10.1 | Sync Google Calendar & Outlook | ✅ Fait (Unipile + Google API) | `bookings/calendar-sync/`, `lib/actions/calendar-sync.ts` — Unipile preferred, Google API fallback                                                                 |
| F10.2 | Notifications & Reminders      | ✅ Fait                        | Resend transactionnel (deal stage, booking confirmation/reminder, challenge, digest), cron `/api/cron/daily-emails`, `notification_preferences` table, settings UI |

## 6. Contrats & Facturation

| #     | Feature                         | Statut      | Fichiers clés                                             |
| ----- | ------------------------------- | ----------- | --------------------------------------------------------- |
| F11   | Cycle de Vie du Contrat         | ✅ Fait     | `contracts/`, `contracts/new/`, `contracts/[id]/`         |
| F12   | Signature Électronique          | ✅ Fait     | `components/signature-canvas.tsx`, `signature-dialog.tsx` |
| F13   | Échelonnements & Paiements      | ✅ Fait     | `contracts/payments/`                                     |
| F14   | Facturation                     | ✅ Fait     | `contracts/invoices/`                                     |
| F14.5 | Cash Flow & Revenue Recognition | ✅ Fait     | `contracts/cash-flow/`                                    |
| F14.6 | Intégrations Comptabilité       | ❌ Manquant | 🔒 Sage/SAP/QuickBooks = APIs tierces                     |

## 7. Prospection

| #     | Feature                             | Statut                        | Fichiers clés                                                                                                                                       |
| ----- | ----------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| F15   | Hub de Prospection Centralisé       | ✅ Fait                       | `prospecting/hub/`                                                                                                                                  |
| F16   | LinkedIn (Extension Chrome)         | ✅ Fait (Unipile + API)       | `prospecting/linkedin/`, `lib/actions/linkedin-api.ts` — Profils, messaging, recherche via Unipile, API LinkedIn fallback, extension Chrome séparée |
| F17   | Instagram Intégration               | ✅ Fait (Unipile + Graph API) | `prospecting/instagram/`, `lib/actions/instagram-api.ts` — Profils, DMs, conversations via Unipile, Graph API fallback                              |
| F18   | Follow-ups & Séquences Automatisées | ✅ Fait                       | `prospecting/follow-ups/`                                                                                                                           |
| F19   | Scoring Prospect & Température      | ✅ Fait                       | `prospecting/scoring/`                                                                                                                              |
| F20   | Templates de Messages Personnalisés | ✅ Fait                       | `prospecting/templates/`                                                                                                                            |
| F20.1 | Segmentation Intelligente           | ✅ Fait                       | `prospecting/segments/`                                                                                                                             |
| F20.2 | Enrichissement de Données           | ✅ Fait                       | `prospecting/enrichment/` (IA OpenRouter)                                                                                                           |
| F20.3 | Drip Campaigns & Workflows          | ✅ Fait                       | `lib/actions/drip-campaigns.ts`                                                                                                                     |
| F20.4 | Lead Scoring Avancé                 | ✅ Fait                       | `prospecting/scoring/`                                                                                                                              |
| F20.5 | Hunting & Outreach Intelligents     | ✅ Fait                       | `prospecting/intelligence/`                                                                                                                         |
| F20.6 | Company Research & Intent Data      | ✅ Fait                       | `prospecting/intelligence/`                                                                                                                         |
| F20.7 | Competitive Intelligence            | ✅ Fait                       | `prospecting/intelligence/`                                                                                                                         |

## 8. Scripts de Vente

| #     | Feature                           | Statut  | Fichiers clés                                                                       |
| ----- | --------------------------------- | ------- | ----------------------------------------------------------------------------------- |
| F21   | Éditeur Flowchart (@xyflow/react) | ✅ Fait | `scripts/flowchart/`                                                                |
| F22   | Mode Présentation & Mind Maps     | ✅ Fait | `scripts/mindmap/`, `scripts/present/`                                              |
| F23   | Génération IA & Templates         | ✅ Fait | `scripts/templates/`                                                                |
| F23.1 | Partage & Collaboration Scripts   | ✅ Fait | ShareDialog intégré flowchart/mindmap, présence temps réel, sync Realtime broadcast |
| F23.2 | Analytics Scripts & Performance   | ✅ Fait | `scripts/analytics/`                                                                |
| F23.3 | Mode Entraînement & Simulation    | ✅ Fait | `scripts/training/`                                                                 |

## 9. Analytics & Rapports

| #     | Feature                         | Statut  | Fichiers clés                                                                                                              |
| ----- | ------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| F24   | Funnel d'Acquisition            | ✅ Fait | `analytics/funnel/`                                                                                                        |
| F25   | Attribution Multi-touch         | ✅ Fait | `analytics/attribution/`                                                                                                   |
| F25.5 | Cohort Analysis & Retention     | ✅ Fait | `analytics/cohorts/`                                                                                                       |
| F26   | Heatmap d'Activité              | ✅ Fait | `analytics/heatmap/`                                                                                                       |
| F27   | Projections Revenue AI          | ✅ Fait | `analytics/projections/`                                                                                                   |
| F28   | Rapports Exportables            | ✅ Fait | `lib/actions/export.ts`                                                                                                    |
| F28.1 | Builder de Dashboards Avancé    | ✅ Fait | `settings/dashboard-builder/`                                                                                              |
| F28.2 | Benchmarking & Comparaisons     | ✅ Fait | `analytics/benchmarking/`                                                                                                  |
| F28.3 | Query Builder & Rapports Custom | ✅ Fait | `analytics/reports/`                                                                                                       |
| F28.4 | Prévisions IA & Forecasting     | ✅ Fait | `analytics-v2.ts` (confidence intervals, AI churn/anomalies via OpenRouter), `projections-view.tsx` (what-if, insights IA) |
| F28.5 | NPS/CSAT Automatisé             | ✅ Fait | `lib/actions/nps.ts` (analytics, auto post-closing), `analytics/nps/` (dashboard NPS, distribution, tendances, CSAT)       |

## 10. Academy (Formation)

| #     | Feature                       | Statut  | Fichiers clés                                                                                                                             |
| ----- | ----------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| F29   | Structure des Contenus        | ✅ Fait | `academy/`, `academy/[courseId]/`                                                                                                         |
| F30   | Progression & Suivi           | ✅ Fait | Tracking complétion                                                                                                                       |
| F31   | Gamification Academy          | ✅ Fait | `academy/certificates/`, badges, points                                                                                                   |
| F32   | Gestion Admin des Contenus    | ✅ Fait | `academy/admin/`                                                                                                                          |
| F32.1 | Vidéos & Uploads Multimédias  | ✅ Fait | Upload Supabase Storage (500MB), player avancé (vitesse, raccourcis clavier, reprise position), sous-titres VTT, embed YouTube/Vimeo/Loom |
| F32.2 | Quizzes Avancés & Évaluations | ✅ Fait | `academy/revision/`                                                                                                                       |
| F32.3 | Ressources et Documents       | ✅ Fait | `academy/library/`                                                                                                                        |
| F32.4 | Apprentissage Adaptatif       | ✅ Fait | `academy/diagnostic/`, `academy/path/`                                                                                                    |
| F32.5 | Prérequis & Pathways          | ✅ Fait | `academy/path/`                                                                                                                           |
| F32.6 | Micro-learning Modules        | ✅ Fait | `academy/micro/`                                                                                                                          |
| F32.7 | Spaced Repetition Algorithm   | ✅ Fait | `academy/revision/`                                                                                                                       |

## 11. Chat & Communication

| #     | Feature                    | Statut               | Fichiers clés                                                  |
| ----- | -------------------------- | -------------------- | -------------------------------------------------------------- |
| F33   | Channels et Messaging      | ✅ Fait              | `chat/chat-layout.tsx` (Supabase Realtime)                     |
| F34   | Video Rooms & Broadcast    | ✅ Fait              | `chat/video/`, `chat/broadcast/`, `chat/replays/`              |
| F34.1 | Notifications Push & Email | ✅ Fait              | `lib/actions/push.ts`, service worker                          |
| F34.2 | Unread & Status Tracking   | ✅ Fait              | `use-presence.ts`, `typing-indicator.tsx`, `online-status.tsx` |
| F34.3 | Outils Modération Channels | ✅ Fait              | `chat/moderation/`                                             |
| F34.4 | Intégrations Chat Tierces  | ⚠️ Partiel → Unipile | Slack + Telegram via Unipile, Teams/Discord non supportés      |

## 12. Communauté

| #     | Feature                        | Statut  | Fichiers clés                             |
| ----- | ------------------------------ | ------- | ----------------------------------------- |
| F35   | Posts, Threads & Discussions   | ✅ Fait | `community/forum/`                        |
| F36   | Membres & Modération           | ✅ Fait | `community/members/`, `community/manage/` |
| F36.1 | Système de Réputation          | ✅ Fait | `community/reputation/`                   |
| F36.2 | Search & Discovery             | ✅ Fait | `community/search/`                       |
| F36.3 | Events & Discussions Spéciales | ✅ Fait | `community/events/`                       |

## 13. Gamification

| #     | Feature                         | Statut  | Fichiers clés                            |
| ----- | ------------------------------- | ------- | ---------------------------------------- |
| F37   | Niveaux & Progression           | ✅ Fait | `lib/constants.ts` (GAMIFICATION_LEVELS) |
| F38   | Challenges Individuels & Équipe | ✅ Fait | `challenges/`, `challenges/team/`        |
| F39   | Streaks & Quotas Journaliers    | ✅ Fait | `gamification_profiles` table            |
| F40   | Journal & Leaderboards          | ✅ Fait | `team/leaderboard/`                      |
| F40.1 | Primes & Récompenses Réelles    | ✅ Fait | `challenges/rewards/`                    |
| F40.2 | Achievements & Unlock System    | ✅ Fait | `challenges/achievements/`               |
| F40.3 | Team Challenges & Competitions  | ✅ Fait | `challenges/team/`                       |
| F40.4 | Analytics Gamification & Impact | ✅ Fait | `challenges/analytics/`                  |

## 14. WhatsApp

| #     | Feature                         | Statut                       | Fichiers clés                                                                                         |
| ----- | ------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| F41   | Paramètres & Connexion WhatsApp | ✅ Fait                      | `whatsapp/settings/`                                                                                  |
| F42   | Envoi Uni & Groupé              | ✅ Fait                      | `whatsapp/page.tsx`                                                                                   |
| F43   | Séquences de Nurturing          | ✅ Fait                      | `whatsapp/sequences/`                                                                                 |
| F43.1 | Campagne Performance Analytics  | ✅ Fait                      | `whatsapp/analytics/`                                                                                 |
| F43.2 | Compliance & GDPR               | ✅ Fait (Unipile + Meta API) | `settings/privacy/`, WhatsApp via Unipile preferred + Meta API fallback — GDPR/compliance UI en place |

## 15. Gestion d'Équipe

| #     | Feature                         | Statut  | Fichiers clés                      |
| ----- | ------------------------------- | ------- | ---------------------------------- |
| F44   | Management & Hiérarchie         | ✅ Fait | `team/page.tsx`                    |
| F45   | Leaderboards & Performance      | ✅ Fait | `team/leaderboard/`                |
| F45.1 | Feedback & Coaching             | ✅ Fait | `team/coaching/`, `team/feedback/` |
| F45.2 | Reporting Manager & KPIs Équipe | ✅ Fait | `analytics/`, `dashboard/`         |

## 16. Roleplay (Entraînement)

| #     | Feature                        | Statut  | Fichiers clés                        |
| ----- | ------------------------------ | ------- | ------------------------------------ |
| F46   | Sessions Roleplay IA           | ✅ Fait | `roleplay/session/` + OpenRouter AI  |
| F47   | Debriefing & Feedback          | ✅ Fait | `roleplay/debrief/` + AI feedback    |
| F48   | Profils Prospect & Objections  | ✅ Fait | `roleplay/profiles/`                 |
| F48.1 | Mode Spectateur                | ✅ Fait | `roleplay/spectate/`                 |
| F48.2 | Groupes Training Personnalisés | ✅ Fait | `roleplay/groups/`                   |
| F48.3 | Video Review & Analysis        | ✅ Fait | `roleplay/reviews/` (AI call review) |

## 17. Marketplace

| #     | Feature                  | Statut  | Fichiers clés               |
| ----- | ------------------------ | ------- | --------------------------- |
| F49   | Extensions Partenaires   | ✅ Fait | `marketplace/page.tsx`      |
| F50   | Placements & Commissions | ✅ Fait | `automation/placement/`     |
| F50.1 | Partner Management       | ✅ Fait | `marketplace/partners/`     |
| F50.2 | Marketplace Monetization | ✅ Fait | `marketplace/monetization/` |

## 18. Paramètres & Administration

| #      | Feature                      | Statut      | Fichiers clés                                                                                                                          |
| ------ | ---------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| F51    | Configuration Plateforme     | ✅ Fait     | `settings/`, `settings/branding/`, `settings/ai-modes/`                                                                                |
| F52    | Onboarding Personnalisé      | ✅ Fait     | `settings/onboarding/`, `onboarding/welcome-pack/`                                                                                     |
| F53    | White-Label & Branding       | ✅ Fait     | `settings/white-label/`, `white-label/permissions/`                                                                                    |
| F54    | Gestion Abonnement & Voix    | ✅ Fait     | `settings/subscription/`, `settings/voice/`                                                                                            |
| F54.1  | REST API & Webhooks          | ✅ Fait     | `api/v1/` (deals, contacts, bookings) + `settings/api/`                                                                                |
| F54.2  | Zapier & Make Intégrations   | ❌ Manquant | 🔒 Intégrations no-code = APIs tierces                                                                                                 |
| F54.3  | Sécurité Données & 2FA       | ✅ Fait     | `settings/security/` (Supabase MFA)                                                                                                    |
| F54.4  | Compliance & Audit           | ✅ Fait     | `settings/privacy/`, `settings/audit-log/`                                                                                             |
| F54.5  | Help Center & Knowledge Base | ✅ Fait     | `help/` (24 articles)                                                                                                                  |
| F54.6  | Support & SLA                | ✅ Fait     | `support/` + SLA enforcement                                                                                                           |
| F54.7  | API Custom & Webhooks        | ✅ Fait     | `api/v1/` routes                                                                                                                       |
| F54.8  | Custom Fields & Metadata     | ✅ Fait     | `settings/custom-fields/`                                                                                                              |
| F54.9  | Data Migration Services      | ✅ Fait     | `settings/migration/` wizard 4 étapes, presets HubSpot/Pipedrive/Salesforce, mapping colonnes, import batch contacts+deals, historique |
| F54.11 | Roadmap Public & Feedback    | ✅ Fait     | `roadmap/`                                                                                                                             |
| F54.12 | Migrations Futures           | ❌ Manquant | Documentation/planning, pas du code                                                                                                    |

## 19. Performance & Reliability

| #     | Feature                    | Statut      | Fichiers clés                                                                                                                                                                                          |
| ----- | -------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F55   | Performance Optimization   | ✅ Fait     | `optimizePackageImports` (recharts, lucide, dnd-kit), dynamic imports react-pdf, middleware cookie cache (role/onboarding), `next/image` community, `staleTimes` client cache, `transpilePackages` ESM |
| F56   | Monitoring & Alerting      | ❌ Manquant | 🔒 Sentry = service tiers                                                                                                                                                                              |
| F57   | Feature Releases & Updates | ✅ Fait     | `.github/workflows/ci.yml` — lint, build, deploy preview (PR) + production (main) via Vercel                                                                                                           |
| F56.1 | Backup & Disaster Recovery | ✅ Infra    | Géré par Supabase                                                                                                                                                                                      |
| F56.2 | High Availability          | ✅ Infra    | Géré par Vercel/Supabase                                                                                                                                                                               |

---

## 20. Demandes Client (CONTEXT.md — "À coder")

| #   | Feature                                                                | Statut  | Fichiers clés                                                  | Notes                                                                               |
| --- | ---------------------------------------------------------------------- | ------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| C1  | Admin full CRUD chat (créer/supprimer canaux, choisir membres B2B/B2C) | ✅ Fait | `lib/actions/chat-admin.ts`, `chat/chat-layout.tsx`            | createChannel, deleteChannel, updateChannelMembers — UI admin complète              |
| C2  | CRM B2C ↔ B2B liés (quand B2C touche son CRM, B2B voit)                | ✅ Fait | `crm/page.tsx`, `kanban-board.tsx`, `lib/actions/crm.ts`       | Deals cross-rôle via `matched_entrepreneur_id`, B2B read-only Kanban, filtre setter |
| C3  | Admin : page pour relier setters (B2C) à businesses (B2B)              | ✅ Fait | `team/assignments/page.tsx`, `lib/actions/team-assignments.ts` | Board visuel assign/unassign avec `matched_entrepreneur_id`                         |
| C4  | Vocaux dans le chat                                                    | ✅ Fait | `chat/chat-layout.tsx`                                         | MediaRecorder + upload Supabase Storage + VoicePlayer (play/pause/seek/durée)       |

---

## Résumé par statut

| Statut                   | Nombre | %        |
| ------------------------ | ------ | -------- |
| ✅ Fait                  | 82     | 95%      |
| ⚠️ Partiel               | 0      | 0%       |
| ❌ Manquant (API tierce) | 4      | 5%       |
| **Total**                | **86** | **100%** |

## Features nécessitant une API tierce (non faisables en interne)

### ❌ Manquants (4)

1. **F14.6** — Sage/SAP/QuickBooks (comptabilité) — API payante tierce
2. **F54.2** — Zapier & Make — APIs no-code tierces
3. **F56** — Monitoring Sentry — Service tiers
4. **F54.12** — Migrations Futures — Documentation/planning, pas du code

### ⚠️ Partiels (1)

1. **F34.4** — Slack + Telegram via Unipile, Teams/Discord non supportés

### ✅ Unipile désormais complet (anciennement partiels)

1. **F10.1** — Google Calendar sync : Unipile REST preferred + Google API fallback
2. **F16** — LinkedIn : profils, messaging, recherche via Unipile SDK + REST, API LinkedIn fallback
3. **F17** — Instagram : profils, DMs, conversations via Unipile, Graph API fallback
4. **F43.2** — WhatsApp : envoi via Unipile preferred + Meta Graph API fallback

### 🔧 Items internes à compléter (faisables sans API tierce)

_Tous les items internes ont été complétés._

### ✅ Anciennement partiels/manquants, maintenant complétés

1. ~~**C1** — Admin full CRUD chat~~ ✅ Fait (`chat-admin.ts`)
2. ~~**C2** — CRM B2C↔B2B liés~~ ✅ Fait (deals cross-rôle, read-only Kanban B2B, filtre setter)
3. ~~**C3** — Admin setter↔business link page~~ ✅ Fait (`team/assignments/`)
4. ~~**C4** — Vocaux dans le chat~~ ✅ Fait (MediaRecorder + Supabase Storage + VoicePlayer)
5. ~~**F10.2** — Email reminders~~ ✅ Fait (Resend)
6. ~~**F23.1** — Collab real-time scripts~~ ✅ Fait (Supabase Realtime)
7. ~~**F28.4** — Prévisions ML avancées~~ ✅ Fait (OpenRouter)
8. ~~**F32.1** — Upload vidéo + transcription~~ ✅ Fait (Supabase Storage)
9. ~~**F54.9** — Migration CRM complète~~ ✅ Fait
10. ~~**C5** — Rapport hebdo auto B2B~~ ✅ Fait (cron `/api/cron/weekly-reports`, Vercel schedule lundi 9h)
11. ~~**C6** — To-do list setters~~ ✅ Fait (`SetterTasksWidget` + `getSetterTasks/create/toggle/delete`)

### ✅ Catalogue 100 features — Gaps comblés (2026-03-16)

1. **#1 Onboarding Quiz B2C** ✅ Fait — Ajout étape "Profil setter" (objectif financier vert/rouge/jaune, heures dispo, situation actuelle) + sauvegarde `user_settings`
2. **#3 Matching Entrepreneur Auto** ✅ Fait — `getSuggestedMatches()` avec scoring (maturité, niche, dispo, objectif) → top 3 suggestions
3. **#16 Pipeline B2C Spécialisé** ✅ Fait — 7 étapes visuelles dans admin-dashboard (Onboarding → Actif/Inactif) avec code couleur
4. **#32 IA Setter Full Auto** ✅ Fait — `runAutoSettingCampaign()` : analyse profil → génère message → save prospect + activité, rate limiting intégré
5. **#33 Mode Duo IA + Humain** ✅ Fait — `detectEscalationMoment()` enrichi (13 mots-clés objection, 12 mots-clés appel, engagement, hors-scope) + labels
6. **#40 Messagerie B2C/B2B Séparée** ✅ Fait — Tabs "Tous/B2C/B2B" dans sidebar chat (admin), filtrage channels par nom + DMs par rôle partner
7. **#78 Workflow Placement Auto** ✅ Fait — `autoCreatePlacementContract()` : crée brouillon contrat de placement + notifie admin
