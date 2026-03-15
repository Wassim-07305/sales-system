# CONTEXT.md — Sales System

## Identité du projet

- **Client :** Damien Reynaud
- **Deadline :** 18 mars 2026
- **Acompte :** 2 000 €
- **Statut :** 90% CDC réalisé
- **GitHub :** https://github.com/Wassim-07305/sales-system
- **Vercel (prod) :** https://sales-system-ahmanewassim6-2668s-projects.vercel.app

## Description du projet (CDC)

**Sales System** est un CRM & système de gestion commerciale complet pour coachs et consultants (client : Damien Reynaud).

**Envergure :** 88 routes, 32+ server actions, 75+ tables Supabase, 6 rôles utilisateurs.

**Communication multicanal :** WhatsApp, Instagram, LinkedIn, Email.

**Modules :** CRM Pipeline (kanban), Bookings, Contrats, Prospection, Scripts de vente, Academy LMS, Chat/Vidéo, Communauté, Gamification, WhatsApp two-way, Gestion d'équipe, Roleplay IA, Marketplace, Paramètres.

## Stack technique

- Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4
- Supabase (PostgreSQL + Auth + RLS)
- shadcn/ui + Lucide React + Sonner
- Déployé sur Vercel

## Supabase

- **Project ref :** tzyqmcuzmvxgexjtsbfe
- **Password :** jemfaz-bezmeD-4nundu
- **Connection string :**
  ```
  postgresql://postgres.tzyqmcuzmvxgexjtsbfe:jemfaz-bezmeD-4nundu@aws-0-eu-west-3.pooler.supabase.com:6543/postgres
  ```

## Comptes de test

| Rôle       | Email                    | Mot de passe |
|------------|--------------------------|--------------|
| Admin      | admin@sales-system.test  | Admin2026!   |
| Client B2B | b2b@sales-system.test    | B2B2026!     |
| Client B2C | test@salessystem.fr      | Test1234x    |

## Business de Damien — Logique métier

### Modèle économique

**B2C (formation de setters) :**
- Damien forme des gens à devenir setters (prospection commerciale)
- C'est un accompagnement : modules vidéos, quiz, progression (style School/Skool)
- Après ~1 mois de formation, Damien leur trouve leurs premières missions de setting
- Les setters (B2C) prospectent POUR les clients B2B

**B2B (placement de setters) :**
- Damien prospecte des businesses (B2B) et leur propose des setters
- Les B2B paient pour avoir des setters qui prospectent à leur place
- Damien prend une commission sur la somme

**Setting IA :**
- Sur Instagram et LinkedIn pour le B2B
- Les B2C (setters) ont aussi accès au setting IA pour l'utiliser
- Scripts IA générés à partir des infos du business B2B → donnés aux setters humains ET à l'IA

### Relations entre rôles

- **Admin** = Damien. Full CRUD sur tout. Peut relier des setters (B2C) à des businesses (B2B)
- **B2B** = Business client. Voit les prospects trouvés par ses setters. A son propre CRM. Configure LinkedIn/Instagram dans Settings IA
- **B2C** = Setter en formation. Prospecte pour un B2B. A son propre CRM lié au B2B. Accède à la formation (Academy)
- Le CRM B2C et B2B sont **liés** : quand le B2C touche à son CRM, le B2B voit ce qui se passe

### Sidebar par rôle

**Admin/Manager :** tout (CRM, Contacts, Bookings, Contrats, Analytics, Inbox, Chat, WhatsApp, Prospection, Role-Play, Scripts, Automation, Communauté, Academy, Challenges, Team, Marketplace, Paramètres)

**B2B :** Dashboard, CRM (simplifié), Bookings, Inbox, Chat, Portail, Calls, Ressources, KPIs, Prospects, Scripts IA, Settings IA, Parrainage, Paramètres
- PAS de : Academy, Communauté, Support, Roadmap

**B2C :** Dashboard, CRM (simplifié), Bookings, Inbox, Chat, Portail, Calls, Ressources, KPIs, Academy, Communauté, Prospects, Scripts IA (lecture seule), Parrainage, Paramètres
- PAS de : Support, Roadmap

### Onboarding (flow multi-étapes, plein écran, déclenché au premier login)

**B2C (3 étapes) :** photo profil → nom/prénom/téléphone → bio/compétences

**B2B (5 étapes) :** photo+entreprise → description business → questions de qualification → canaux de prospection → config LinkedIn/Instagram

### Chat admin

- L'admin a le full CRUD : créer des canaux, choisir les membres (B2B, B2C), supprimer des canaux
- Les messages doivent s'afficher en temps réel (pas de délai)
- Support images, vocaux à terme

### Extension LinkedIn

- Chrome Extension MV3 dans `/chrome-extension/`
- Sync auto toutes les 2 min (conversations LinkedIn → Supabase `dm_conversations`)
- Envoi de messages depuis l'app (poll toutes les 1 min pour `pending_messages`)
- Nécessite un onglet LinkedIn ouvert pour capturer le CSRF token
- Rate limit : 20 appels/heure, délais 3-8s entre appels

## Audit — Bugs et modifications à vérifier

### Fait (commits existants) ✅
- [x] Onboarding retiré de la sidebar B2B/B2C
- [x] Support + Roadmap retirés de la sidebar B2B/B2C
- [x] Dropdown profil header (click → profil, paramètres, déconnexion)
- [x] Page Profil centrée + upload photo
- [x] Page Paramètres B2C (notifications, mdp, abonnement)
- [x] Communauté — upload image dans posts + meilleure gestion erreurs
- [x] Chat — stabilisation client Supabase + upload images
- [x] Sidebar B2B : Academy/Communauté retirés, Bookings/Settings IA/Prospects/Scripts IA ajoutés
- [x] Onboarding multi-étapes B2C (3 étapes) + B2B (5 étapes)
- [x] Page Settings IA (/settings-ia) pour B2B
- [x] Page Scripts IA (/ai-scripts) avec génération Claude API
- [x] Page Prospects (/prospects) CRM simplifié B2B/B2C
- [x] Gardes de rôle serveur sur les pages sensibles
- [x] Extension LinkedIn améliorée (sync auto, envoi messages, popup status)

### Vérifié ✅ (existe et fonctionne)
- [x] Chat temps réel (Supabase realtime subscription sur INSERT)
- [x] Scripts IA : flowchart existe déjà dans /scripts/flowchart/ avec @xyflow/react
- [x] Paramètres B2B (b2b-settings-view.tsx — notifications, sécurité, abonnement)
- [x] Setting IA Instagram (champ username Instagram dans settings-ia)

### À coder ❌ / En cours ⚠️
- [x] Admin : full CRUD chat (créer/supprimer canaux, choisir membres B2B/B2C) — ✅ `lib/actions/chat-admin.ts` + `chat/chat-layout.tsx`
- [x] CRM B2C ↔ B2B liés — ✅ Deals cross-rôle via `matched_entrepreneur_id`, B2B voit deals setters en read-only, filtre par setter
- [x] Admin : page pour relier setters (B2C) à businesses (B2B) — ✅ `team/assignments/page.tsx` + `lib/actions/team-assignments.ts`
- [x] Vocaux dans le chat — ✅ MediaRecorder + upload Supabase Storage + VoicePlayer dans `chat/chat-layout.tsx`

## Commandes utiles

```bash
npm run dev     # Démarrer le serveur Next.js
npm run build   # Build de production
npm run lint    # ESLint
```

## Équipe

- **Wassim** — dev principal
- **Gilles Hayibor** (GitHub: ghayibor) — dev délégué, travaille sur branches dev

## Instructions Claude Code

- Modèle : `claude-opus-4-5`
- Toujours utiliser : `--permission-mode bypassPermissions`
- Lire ce CONTEXT.md en premier, puis `git log`, puis `npm run build`
- Corriger TOUTES les erreurs TypeScript/ESLint
- Pusher sur GitHub après chaque lot de changements
- Utiliser les vraies données Supabase (pas de mocks)
- Appliquer les migrations si des tables manquent
- Ne jamais casser les fonctionnalités existantes
