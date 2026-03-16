# Sales System — Plan de Finalisation 100%

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Combler tous les gaps identifies dans l'audit CDC pour rendre le projet livrable a 100%.

**Architecture:** Ajout de pages manquantes (Next.js App Router), server actions, cron jobs, et ameliorations UI. Chaque tache est independante et parallelisable.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase, shadcn/ui, Recharts, Sonner

---

## Batch 1 — Nouvelles Pages (parallelisable)

### Task 1: Vue Agenda Global (/calendar)

**Files:**

- Create: `src/app/(app)/calendar/page.tsx`
- Create: `src/app/(app)/calendar/calendar-view.tsx`
- Create: `src/lib/actions/calendar.ts`
- Modify: `src/lib/constants.ts` (ajouter nav item "Agenda")

Page calendrier centralisee montrant bookings, appels de groupe programmes, relances prevues, events communaute. Vue mensuelle/hebdo/jour. Accessible admin/manager/setter/closer.

### Task 2: Page Profil Setter Publique

**Files:**

- Create: `src/app/(app)/profile/[userId]/page.tsx`
- Create: `src/app/(app)/profile/[userId]/public-profile-view.tsx`

Mini-page profil (photo, niveau gamification, badges, stats performances, bio). Visible par autres membres. Opt-in.

### Task 3: Resultats Test Detailles UI

**Files:**

- Create: `src/app/(app)/academy/quiz-results/page.tsx`
- Create: `src/app/(app)/academy/quiz-results/quiz-results-view.tsx`
- Modify: `src/lib/actions/academy.ts` (ajouter `getDetailedQuizResults()`)

Page affichant questions ratees + explication bonne reponse + lien vers module concerne.

### Task 4: Matrice Matching Setter/Entrepreneur UI

**Files:**

- Create: `src/app/(app)/team/matching/page.tsx`
- Create: `src/app/(app)/team/matching/matching-matrix-view.tsx`

Vue croisee performances de chaque duo setter/entrepreneur (conversations, appels, taux conversion, CA).

---

## Batch 2 — Server Actions + Features IA (parallelisable)

### Task 5: Exercices Pratiques avec Correction IA

**Files:**

- Create: `src/app/(app)/academy/exercises/page.tsx`
- Create: `src/app/(app)/academy/exercises/exercises-view.tsx`
- Modify: `src/lib/actions/academy.ts` (ajouter `submitExercise()`, `getExercises()`)

Setter soumet un script/message, l'IA l'analyse par rapport aux criteres du module et retourne feedback structure.

### Task 6: Mode Duo IA + Humain (escalation)

**Files:**

- Create: `src/lib/actions/ai-escalation.ts`
- Modify: `src/app/(app)/prospecting/hub/hub-view.tsx` (ajouter toggle mode duo)

IA gere conversation, detecte moments cles (objection, demande appel, hors-scope) et notifie setter humain pour validation.

### Task 7: Rapport Mensuel Automatise B2B

**Files:**

- Create: `src/app/api/cron/monthly-report-b2b/route.ts`
- Create: `src/lib/actions/reports-auto.ts`
- Modify: `vercel.json` (ajouter cron mensuel)

Cron 1er du mois: genere rapport PDF performance setter (conversations, taux reponse, CA) et envoie par email au B2B.

### Task 8: Rapport Valeur Percue Automatique

**Files:**

- Modify: `src/app/api/cron/monthly-report-b2b/route.ts` (reuse)
- Modify: `src/lib/actions/reports-auto.ts`

Email mensuel au B2C recapitulant accomplissements (modules completes, competences, CA genere, projection 30j).

---

## Batch 3 — Ameliorations et Corrections (parallelisable)

### Task 9: Messagerie B2C/B2B Separee

**Files:**

- Modify: `src/app/(app)/chat/page.tsx` ou `chat-layout.tsx`

Ajouter tabs "Tous / B2C / B2B" dans le sidebar chat pour admin. Filtrage channels par type de membre.

### Task 10: Notifications MAJ Contenu

**Files:**

- Modify: `src/lib/actions/academy-admin.ts`

Quand admin ajoute/modifie un cours ou une lecon, notifier automatiquement les users concernes.

### Task 11: Alertes Churn Ameliorees

**Files:**

- Modify: `src/lib/actions/alerts.ts`

Ajouter: detection client pas connecte 5j, setter sans conversation 48h, 3 tests echoues consecutifs.

### Task 12: Broadcast a Segment (action serveur)

**Files:**

- Modify: `src/lib/actions/segmentation.ts`
- Modify: `src/app/(app)/chat/broadcast/broadcast-view.tsx`

Ajouter `sendMessageToSegment()` — envoie message a tous les prospects d'un segment.

### Task 13: Cron Relances Automatiques

**Files:**

- Create: `src/app/api/cron/auto-followups/route.ts`
- Modify: `vercel.json`

Cron toutes les 4h: verifie prospects sans reponse depuis 2j et 5j, declenche relance auto.

### Task 14: Page Retention/Churn Dediee

**Files:**

- Create: `src/app/(app)/analytics/retention/page.tsx`
- Create: `src/app/(app)/analytics/retention/retention-view.tsx`

Dashboard retention: clients actifs vs inactifs, taux churn, courbe retention, alertes at-risk.

### Task 15: Analyse LinkedIn + Message Auto

**Files:**

- Modify: `src/lib/actions/linkedin-api.ts`
- Modify: `src/app/(app)/prospecting/linkedin/linkedin-view.tsx`

Enrichir: scrape profil → genere premier message en 30s via IA. Bouton "Analyser + Generer message".

### Task 16: Analyse Story Instagram + Message Auto

**Files:**

- Modify: `src/lib/actions/instagram-api.ts`
- Modify: `src/app/(app)/prospecting/instagram/instagram-view.tsx`

Soumettre story → IA genere meilleur message de reponse.
