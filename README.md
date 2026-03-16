# Sales System — CRM & Sales Management Platform

Plateforme CRM complete de gestion commerciale par **Damien Reynaud**. Interface en francais, multi-roles, couvrant l'ensemble du cycle de vente : prospection, pipeline, contrats, facturation, formation, gamification et bien plus.

## Stack Technique

- **Frontend** : Next.js 16 (App Router) + React 19 + TypeScript 5
- **Styling** : Tailwind CSS 4 + shadcn/ui (44 composants)
- **Backend** : Supabase (PostgreSQL + Auth + RLS + Storage)
- **State** : Zustand
- **Charts** : Recharts
- **Drag & Drop** : @dnd-kit
- **Flowcharts** : @xyflow/react
- **PDF** : @react-pdf/renderer
- **IA** : OpenRouter (Claude 3.5 Haiku / Sonnet)
- **PWA** : next-pwa
- **Paiements** : Stripe
- **Emails** : Resend

## Chiffres Cles

| Metrique          | Valeur      |
| ----------------- | ----------- |
| Routes (pages)    | 141         |
| Server Actions    | 64 fichiers |
| Composants UI     | 44          |
| Tables Supabase   | 75+         |
| Roles utilisateur | 6           |
| Couverture CDC    | ~100%       |

## Fonctionnalites

### CRM & Pipeline

- Pipeline Kanban 6 etapes (Nouveau lead > Contacte > Relance > Call booke > Ferme gagne/perdu)
- Gestion contacts avec deduplication et fusion
- Import massif CSV avec mapping colonnes et detection doublons
- Export multi-format (CSV, XLSX, PDF)
- Fiches deal et contact detaillees avec icones source (LinkedIn, Instagram, WhatsApp)
- Timeline complete par deal
- Champs personnalises (deals, contacts, contrats)
- Bouton "Booker un appel" sur chaque deal

### Prospection

- Hub multi-reseau (LinkedIn, Instagram)
- Lead scoring avance (7 facteurs, 4 tiers)
- Segmentation intelligente avec filtres sauvegardes
- Enrichissement IA des prospects (OpenRouter)
- Hunting intelligence & veille concurrentielle IA
- Drip campaigns & sequences automatisees
- Templates messages personnalises

### Contrats & Facturation

- Cycle de vie complet du contrat
- Signature electronique (canvas HTML5)
- Echelonnements & paiements (Stripe)
- Facturation et suivi
- Cash flow & revenue recognition

### Analytics & Rapports

- Funnel d'acquisition
- Attribution multi-touch
- Analyse de cohortes & retention
- Heatmap d'activite
- Projections revenue
- Benchmarking & comparaisons
- Query Builder pour rapports custom
- Dashboard builder personnalisable

### Academy (Formation)

- Structure cours / modules / lecons avec deblocage sequentiel (score quiz >= 90%)
- Quiz admin CRUD (creation, modification, suppression de quiz par lecon)
- Systeme de quiz : 4 choix, score min. configurable, 3 tentatives/jour, countdown avant reset
- Leaderboard Academy (top 7 setters par taux de reussite)
- Tableau de progression admin (setter, module, %, score, derniere activite)
- Page felicitations + notification admin a la completion d'un cours
- Apprentissage adaptatif (diagnostic quiz + parcours personnalise)
- Micro-learning & revision espacee (flashcards auto-generees)
- Certificats PDF telechargeables

### Scripts de Vente

- Editeur flowchart (@xyflow/react)
- Mode mind map & presentation
- Mode entrainement & simulation (flashcards)
- Templates & generation IA
- Analytics d'utilisation

### Communication

- Chat channels & messaging
- Video rooms & broadcast
- Moderation avancee (filtres, mute, ban)
- Notifications push & email
- Suivi non-lus & statuts

### Communaute

- 4 canaux : #general, #questions, #wins, #team-interne (prive)
- Forum (posts, threads, discussions) avec filtrage par role
- Bouton "Annoncer un appel de groupe" (admin) avec notifications push
- Systeme de reputation (5 rangs)
- Evenements & discussions speciales
- Recherche & decouverte
- Gestion membres & moderation (signalements, bans)

### Gamification

- 5 niveaux de progression
- Challenges individuels & equipe
- Systeme d'achievements (bronze/silver/gold/platinum)
- Recompenses & catalogue de primes
- Streaks & quotas journaliers
- Analytics gamification

### Rapports EOD (End of Day)

- Formulaire setter quotidien (DMs, reponses, calls, CA)
- Vue admin avec filtres par setter et periode (jour/semaine/mois/personnalise)
- 6 KPIs agreges (rapports, DMs, taux reponse, calls, deals, CA)
- Integration dashboard B2B (derniers rapports setters)

### Roleplay & Training

- Sessions roleplay IA
- Debriefing & feedback
- Groupes training personnalises
- Analyse d'appels IA (transcription, score, sentiment)
- Mode spectateur

### WhatsApp

- Parametres & connexion
- Envoi unitaire & groupe
- Sequences de nurturing
- Analytics campagnes
- Compliance GDPR

### Equipe

- Management & hierarchie
- Leaderboards & performance
- Coaching avec objectifs SMART
- Feedback 360

### Marketplace

- Extensions partenaires
- Portail partenaires
- Monetisation (commissions, tiers, payouts)

### Parametres & Administration

- Branding & white-label
- Modes IA configurables
- Onboarding personnalise
- Abonnement & facturation (Stripe)
- 2FA / Securite avancee (Supabase MFA)
- Audit log complet
- RGPD & compliance
- Champs personnalises

### Support

- Centre d'aide (24 articles, FAQ)
- Systeme de tickets
- Roadmap publique & feature voting

## Roles Utilisateur

| Role         | Description                              |
| ------------ | ---------------------------------------- |
| `admin`      | Acces complet, configuration plateforme  |
| `manager`    | Gestion equipe, analytics, coaching      |
| `setter`     | Prospection, prise de RDV, qualification |
| `closer`     | Closing, contrats, facturation           |
| `client_b2b` | Portail client entreprise                |
| `client_b2c` | Portail client particulier               |

## Installation

### Prerequis

- Node.js 18+
- Compte Supabase
- (Optionnel) Cle OpenRouter pour les fonctionnalites IA

### Setup

```bash
# Cloner le repo
git clone https://github.com/Wassim-07305/sales-system.git
cd sales-system

# Installer les dependances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local
```

### Variables d'Environnement

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon
OPENROUTER_API_KEY=sk-or-v1-...          # Pour les fonctionnalites IA
STRIPE_SECRET_KEY=sk_...                  # Pour les paiements
RESEND_API_KEY=re_...                     # Pour les emails
```

Guides de configuration detailles dans `docs/GUIDE-APIS.md` et `docs/GUIDE-CONFIGURATION.md`.

### Lancer le projet

```bash
# Developpement (utiliser --webpack, Turbopack non supporte)
npm run dev

# Build production
npm run build

# Demarrer en production
npm run start

# Linting
npm run lint
```

## Structure du Projet

```
src/
  app/
    (auth)/                # Routes publiques (login, register)
    (app)/                 # Routes protegees (141 pages)
      dashboard/           # Tableaux de bord par role
      crm/                 # Pipeline Kanban (6 etapes)
      contacts/            # Contacts + dedup + import
      bookings/            # Rendez-vous
      contracts/           # Contrats + signature + facturation
      prospecting/         # Prospection + scoring + enrichissement
      analytics/           # Analytics + rapports + query builder
      academy/             # Formation + quiz + leaderboard + certificats
        admin/             # CRUD cours/modules/lecons/quiz
        admin/progress/    # Tableau progression setters
        leaderboard/       # Top 7 setters par reussite quiz
      scripts/             # Scripts de vente + flowchart + training
      chat/                # Messagerie + moderation
      community/           # Forum 4 canaux + reputation + appels groupe
      challenges/          # Gamification + achievements + rewards
      roleplay/            # Entrainement + groupes + analyse appels
      whatsapp/            # Integration WhatsApp
      team/                # Gestion equipe + coaching
        journal/           # Rapports EOD + filtres + KPIs
      marketplace/         # Extensions + partenaires + monetisation
      settings/            # Configuration + securite + custom fields
      support/             # Tickets support
      roadmap/             # Roadmap publique
      help/                # Centre d'aide
    api/                   # API routes (push, webhooks)
    book/[slug]/           # Page de booking publique
  components/
    ui/                    # 44 composants shadcn/ui
    layout/                # Sidebar, topbar, navigation
  lib/
    actions/               # 64 fichiers server actions
    ai/                    # Client OpenRouter
    supabase/              # Clients Supabase (browser + server)
    hooks/                 # Hooks React
    types/                 # Types TypeScript
docs/
  CONTEXT.md               # Contexte projet & client
  GUIDE-APIS.md            # Guide configuration APIs externes
  GUIDE-CONFIGURATION.md   # Informations a fournir par le client
  cahier-des-charges/      # CDC, PDF, notes d'appels, checklist
  plans/                   # Plans d'implementation
  screenshots/             # Captures d'ecran UI
supabase/
  schema.sql               # Schema DB principal
  schema-v2.sql            # Schema DB etendu
  migrations/              # 27 migrations SQL
  seeds/                   # 5 fichiers de donnees seed
scripts/                   # Utilitaires (generation VAPID keys, etc.)
```

## Comptes Demo

| Email                  | Mot de passe | Role       |
| ---------------------- | ------------ | ---------- |
| thomas.martin@demo.com | demo1234     | setter     |
| sophie.durand@demo.com | demo1234     | setter     |
| lucas.bernard@demo.com | demo1234     | closer     |
| marie.leroy@demo.com   | demo1234     | manager    |
| jean.dupont@demo.com   | demo1234     | client_b2b |
| emma.petit@demo.com    | demo1234     | client_b2b |
| pierre.moreau@demo.com | demo1234     | client_b2c |
| julie.robert@demo.com  | demo1234     | client_b2c |

## Licence

Projet prive — Tous droits reserves.
