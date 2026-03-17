# Exploration du Sales System

> Date d'exploration : 17 mars 2026
> URL : https://sales-system-six.vercel.app
> Methode : Exploration manuelle via Playwright MCP

---

## Vue d'ensemble

Sales System est une plateforme CRM et de gestion commerciale destinee aux coachs et consultants (client : Damien Reynaud). L'interface est entierement en francais. Stack technique : Next.js 16 + Supabase + Tailwind CSS 4.

Le systeme propose 88 routes, 6 roles utilisateurs et couvre : pipeline de deals (Kanban), gestion de contacts, prise de rendez-vous, cycle de vie des contrats, gestion d'equipe, analytics commerciaux, academy de formation, outils de prospection, gamification, forum communautaire, entrainement roleplay, integration WhatsApp et marketplace.

---

## Pages explorees

### Page d'accueil (/)

- **Hero** : "La plateforme tout-en-un pour les equipes de vente"
- **Navigation** : Fonctionnalites, Comment ca marche, Tarifs, Temoignages
- **Boutons CTA** : "Connexion" vers `/login`, "Commencer" vers `/register`
- **Section statistiques** : "0+ Setters formes", "0+ Entreprises", "0% De satisfaction" (toutes les valeurs sont a zero)
- **Fonctionnalites mises en avant** :
  - CRM Intelligent
  - Academy
  - Prospection IA
  - Scripts de Vente
  - Chat & Communaute
  - Analytics
- **Comment ca marche** : 3 etapes
- **Tarifs** :
  - Starter : Gratuit
  - Pro : 49 EUR/mois
  - Enterprise : Sur mesure
- **Temoignages** : 3 temoignages fictifs (Lucas M., Sarah K., Thomas D.)
- **Footer** : liens Blog, Contact, CGV, Mentions legales, Confidentialite

### Page de connexion (/login)

- Mise en page splitee : panneau gauche avec branding, panneau droit avec formulaire
- **Champs** : Email (placeholder : damien@example.com), Mot de passe
- Bouton d'affichage/masquage du mot de passe
- Bouton "Se connecter"
- Lien "Mot de passe oublie ?" vers `/forgot-password`
- Lien "Creer un compte" vers `/register`
- Erreur affichee via toast Sonner : "Email ou mot de passe incorrect"

### Page d'inscription (/register)

- Existe mais n'a pas ete exploree en detail

### Dashboard (connecte en tant que Thomas Martin - setter)

- **Sidebar** avec sections : Ventes, Prospection, Formation, Gestion, Aide
- **Barre superieure** : breadcrumb, recherche (raccourci Cmd+K), theme toggle (Mode clair), cloche notifications, avatar profil
- **Bas de sidebar** : info utilisateur (nom + role), lien Profil, bouton Deconnexion
- Bouton "Reduire" pour replier la sidebar
- Banniere "Vous etes hors-ligne" (apparait meme quand on est en ligne - BUG)
- Bouton flottant "Assistant IA" en bas a droite

### CRM (/crm)

- **Titre** : "Pipeline CRM" - "Gerez vos deals et suivez votre pipeline"
- Bouton d'export
- Filtres : bouton "Filtres avances" + menu deroulant de tri (Date recent vers ancien)
- **Cartes KPI** :
  - Deals actifs : 0
  - Valeur pipeline : 0 EUR
  - Valeur ponderee : 0 EUR
  - Probabilite moy. : 0%
- Barre de recherche : "Rechercher un deal ou contact..."
- Filtre par source (Toutes)
- Boutons : "Selection", "Nouveau deal"
- Etat vide : "Votre pipeline est vide" avec illustration
- **Colonnes Kanban** (6 etapes) :
  1. Prospect
  2. Contacte
  3. Appel Decouverte
  4. Proposition
  5. Closing
  6. Client Signe
- Chaque colonne affiche le nombre de deals et la valeur totale

### Dialog "Nouveau Deal"

- **Champs** :
  - Titre du deal (texte, placeholder "Ex: Formation Closing - Jean D.")
  - Valeur en EUR (nombre)
  - Stage (combobox, defaut : Prospect)
  - Temperature (combobox, defaut : Warm)
  - Source (combobox)
- Bouton "Creer le deal"
- Bouton de fermeture (X)

### Academy (/academy)

- **Titre** : "Academy" - "Formez-vous et developpez vos competences"
- Lien "Micro-learning" vers `/academy/micro`
- **Onglets** : Toutes, En cours, Terminees, Non commencees
- Recherche : "Rechercher une formation..."
- **3 formations listees** :
  1. "Maitriser la prospection digitale" - 0 modules, 0 lecons, 0%
  2. "L'art du closing en B2B" - 0 modules, 0 lecons, 0%
  3. "Mindset commercial gagnant" - 0 modules, 0 lecons, 0%
- Chaque formation affiche : miniature, titre, description, nombre de modules, barre de progression

---

## Navigation par role

### Setter (Thomas Martin)

Dashboard, Messages, CRM, Bookings, Ma performance, Journal EOD, Prospection, Decouverte Leads, Role-Play, Scripts, Academy, Defis, Marketplace, Centre d'aide, Profil

### Admin / Manager

Toutes les routes setter + Contacts, Agenda, Contrats, Equipe, Affectations, Analytics, Content, Clients, Communaute, Automation, Parametres (10 sous-pages : General, Onboarding, Modes IA, White Label, Notifications, Confidentialite, Securite, Champs personnalises, API REST, Integrations, Sync Calendrier)

### Client B2B

Dashboard, Messages, CRM, Bookings, Portail, Calls, Ressources, Mes KPIs, Parrainage, Mes Prospects, Settings IA, Scripts IA, Centre d'aide, Profil

### Client B2C

Dashboard, Messages, Bookings, Calls, Ressources, Mes KPIs, Parrainage, Mes Prospects, Scripts IA, Academy, Communaute, Centre d'aide, Profil

---

## Comptes de demo disponibles

Mot de passe commun : `demo1234`

| Email                  | Role       |
| ---------------------- | ---------- |
| thomas.martin@demo.com | setter     |
| sophie.durand@demo.com | setter     |
| lucas.bernard@demo.com | closer     |
| marie.leroy@demo.com   | manager    |
| jean.dupont@demo.com   | client_b2b |
| emma.petit@demo.com    | client_b2b |
| pierre.moreau@demo.com | client_b2c |
| julie.robert@demo.com  | client_b2c |

---

## Bugs et problemes identifies

### 1. Erreurs de chargement des polices

"Failed to decode downloaded font" sur chaque page. Erreur OTS parsing avec sfntVersion invalide. Affecte Plus Jakarta Sans et Playfair Display.

### 2. Erreurs WebSocket

"WebSocket connection to wss://tzyqmcuzmvxgexjtsbfe..." echoue. La connexion Supabase Realtime est cassee. Provoque l'affichage de la banniere "Vous etes hors-ligne".

### 3. Banniere "hors-ligne" affichee alors qu'on est en ligne

La banniere "Vous etes hors-ligne" apparait meme si l'application charge les donnees correctement. Probablement cause par l'echec de la connexion WebSocket.

### 4. Echec d'enregistrement du Service Worker

"[SW] Enregistrement echoue: InvalidState". Le service worker PWA est dans un etat invalide.

### 5. Statistiques de la landing page a zero

Les compteurs affichent "0+ Setters formes", "0+ Entreprises", "0% De satisfaction" au lieu de valeurs reelles ou marketing.

### 6. Attribut aria-description manquant

Warning sur le combobox du dialog de creation de deal.

### 7. Pas de compte admin dans les donnees de demo

Les 8 utilisateurs de demo ne comportent aucun role admin. Impossible de tester les fonctionnalites d'administration.

### 8. Formations de l'Academy vides

Les 3 formations affichent 0 modules, 0 lecons. Aucun contenu pedagogique n'a ete seed dans la base.

### 9. Erreurs console sur chaque page

Entre 1 et 4 erreurs console a chaque navigation de page.

---

## Liste complete des routes (88)

### Authentification

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`

### Pages publiques

- `/book/[slug]` - Page de reservation publique

### Dashboard

- `/dashboard`

### CRM & Ventes

- `/crm`
- `/crm/[id]`
- `/contacts`
- `/contacts/[id]`
- `/bookings`
- `/bookings/calendar-sync`
- `/calendar`

### Contrats & Facturation

- `/contracts`
- `/contracts/[id]`
- `/contracts/invoices`
- `/contracts/payments`

### Analytics

- `/analytics`
- `/analytics/performance`
- `/analytics/projections`
- `/analytics/sources`
- `/analytics/nps`

### Academy & Formation

- `/academy`
- `/academy/[courseId]`
- `/academy/micro`
- `/academy/library`
- `/academy/revision`
- `/academy/leaderboard`
- `/academy/admin/[courseId]`
- `/academy/admin/progress`

### Communication

- `/chat`
- `/chat/broadcast`
- `/chat/video`
- `/chat/replays`
- `/inbox`
- `/notifications`

### Communaute

- `/community`
- `/community/[threadId]`
- `/community/members`
- `/community/manage`

### Prospection

- `/prospecting`
- `/prospecting/hub`
- `/prospecting/linkedin`
- `/prospecting/instagram`
- `/prospecting/follow-ups`
- `/prospecting/scoring`
- `/prospecting/templates`
- `/prospecting/discovery`
- `/prospects`

### Scripts de vente

- `/scripts`
- `/scripts/flowchart`
- `/scripts/mindmap`
- `/scripts/present`
- `/scripts/templates`
- `/ai-scripts`

### Roleplay & Entrainement

- `/roleplay`
- `/roleplay/session/[id]`
- `/roleplay/debrief/[id]`
- `/roleplay/spectate`
- `/roleplay/profiles`

### Gamification

- `/challenges`
- `/challenges/rewards`

### WhatsApp

- `/whatsapp`
- `/whatsapp/settings`
- `/whatsapp/sequences`

### Equipe

- `/team`
- `/team/assignments`
- `/team/leaderboard`
- `/team/journal`
- `/journal`

### Marketplace

- `/marketplace`
- `/marketplace/partners`

### Parametres

- `/settings`
- `/settings/ai-modes`
- `/settings/branding`
- `/settings/onboarding`
- `/settings/subscription`
- `/settings/voice`
- `/settings/white-label`
- `/settings/notifications`
- `/settings/privacy`
- `/settings/security`
- `/settings/custom-fields`
- `/settings/api`
- `/settings/integrations`

### Autres

- `/onboarding`
- `/portal`
- `/profile`
- `/referral`
- `/resources`
- `/kpis`
- `/help`
- `/content`
- `/customers`
- `/settings-ia`

### API

- `/api/push` - Gestion des abonnements push
- `/api/auth/callback` - Echange de code OAuth
