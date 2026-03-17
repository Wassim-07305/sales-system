# Plan de Tests E2E — Sales System

> **Plateforme** : CRM/Sales multi-roles (Next.js 16 + Supabase)
> **UI** : Francais (`lang="fr"`)
> **Roles** : `admin`, `manager`, `setter`, `closer`, `client_b2b`, `client_b2c`
> **Routes** : 88 routes protegees + routes publiques (`/login`, `/register`, `/book/[slug]`)
> **Estimation** : 200+ tests | 15+ workers paralleles

---

## 1. Authentification (`tests/auth/`)

### 1.1 Login (`login.spec.ts`)

| #   | Scenario                                    | Resultat attendu                                                       |
| --- | ------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | Happy path : login avec credentials valides | Redirect vers `/dashboard`                                             |
| 2   | Erreur : mauvais password                   | Toast "Email ou mot de passe incorrect"                                |
| 3   | Erreur : email inexistant                   | Toast erreur generique (pas de leak d'info)                            |
| 4   | Erreur : champs vides                       | Validation cote client, bouton disabled ou message inline              |
| 5   | Erreur : email format invalide              | Message de validation inline                                           |
| 6   | Toggle visibilite mot de passe              | Le champ bascule entre `type="password"` et `type="text"`              |
| 7   | Lien "Mot de passe oublie"                  | Navigation vers `/forgot-password`                                     |
| 8   | Lien "Creer un compte"                      | Navigation vers `/register`                                            |
| 9   | Session persistante apres refresh           | L'utilisateur reste connecte apres `page.reload()`                     |
| 10  | Redirect si deja connecte                   | Un utilisateur authentifie sur `/login` est redirige vers `/dashboard` |

### 1.2 Register (`register.spec.ts`)

| #   | Scenario                                        | Resultat attendu                         |
| --- | ----------------------------------------------- | ---------------------------------------- |
| 1   | Happy path : inscription email + password + nom | Compte cree, redirect vers `/onboarding` |
| 2   | Erreur : email deja utilise                     | Toast ou message "Email deja utilise"    |
| 3   | Erreur : password trop court (<6 car.)          | Validation inline                        |
| 4   | Erreur : email format invalide                  | Validation inline                        |
| 5   | Erreur : champs obligatoires vides              | Validation cote client                   |
| 6   | Redirect vers onboarding apres inscription      | L'utilisateur atterrit sur `/onboarding` |

### 1.3 Forgot Password (`forgot-password.spec.ts`)

| #   | Scenario                  | Resultat attendu                                         |
| --- | ------------------------- | -------------------------------------------------------- |
| 1   | Happy path : email envoye | Toast de confirmation "Email envoye"                     |
| 2   | Erreur : email inexistant | Message generique (securite)                             |
| 3   | Rate limiting             | Apres plusieurs tentatives, message "Trop de tentatives" |
| 4   | Lien retour vers login    | Navigation vers `/login`                                 |

### 1.4 Logout (`logout.spec.ts`)

| #   | Scenario                                | Resultat attendu                               |
| --- | --------------------------------------- | ---------------------------------------------- |
| 1   | Deconnexion depuis la sidebar           | Redirect vers `/login`                         |
| 2   | Session invalidee apres deconnexion     | Le cookie/session Supabase est supprime        |
| 3   | Acces aux routes protegees apres logout | Redirect vers `/login`                         |
| 4   | Bouton retour apres logout              | Ne permet pas de revenir sur une page protegee |

### 1.5 Securite des routes (`route-security.spec.ts`)

| #   | Scenario                                            | Resultat attendu                      |
| --- | --------------------------------------------------- | ------------------------------------- |
| 1   | Route protegee sans auth → `/dashboard`             | Redirect vers `/login`                |
| 2   | Route admin `/settings` en tant que setter          | Redirect ou page 403                  |
| 3   | Route admin `/contacts` en tant que closer          | Redirect ou page 403                  |
| 4   | Route admin `/analytics` en tant que client_b2b     | Redirect ou page 403                  |
| 5   | Route setter `/marketplace` en tant que client_b2c  | Redirect ou page 403                  |
| 6   | Route B2B `/portal` en tant que client_b2c          | Redirect ou page 403                  |
| 7   | Route B2B `/settings-ia` en tant que setter         | Redirect ou page 403                  |
| 8   | Route `/prospects` en tant que admin                | Redirect ou page 403                  |
| 9   | Route `/challenges` en tant que admin               | Redirect ou page 403                  |
| 10  | Chaque role ne voit que les items sidebar autorises | Verification des `NAV_ITEMS` par role |

---

## 2. Navigation (`tests/navigation/`)

### 2.1 Sidebar (`sidebar.spec.ts`)

| #   | Scenario                                | Resultat attendu                                                                                                               |
| --- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Tous les liens sidebar sont cliquables  | Chaque lien navigue vers la bonne URL                                                                                          |
| 2   | Sections filtrees par role — admin      | Ventes, Prospection, Formation, Gestion, Aide, Parametres visibles                                                             |
| 3   | Sections filtrees par role — setter     | Ventes (CRM, Bookings, Performance, Journal), Prospection, Formation (Academy, Defis), Gestion (Marketplace), Messages, Profil |
| 4   | Sections filtrees par role — client_b2b | Dashboard, CRM, Bookings, Messages, Espace Client (Portail, Calls, Ressources, KPIs, Parrainage, Prospects), Outils IA         |
| 5   | Sections filtrees par role — client_b2c | Dashboard, Bookings, Messages, Academy, Communaute, Espace Client (Calls, Ressources, KPIs, Parrainage, Prospects), Scripts IA |
| 6   | Collapse sidebar                        | La sidebar passe de 240px a 68px, les labels disparaissent, les icones restent                                                 |
| 7   | Expand sidebar                          | La sidebar revient a 240px avec labels                                                                                         |
| 8   | Nom et role de l'utilisateur affiches   | Le bas de la sidebar montre le nom complet et le role                                                                          |
| 9   | Lien actif surligne                     | La page courante est visuellement distincte dans la sidebar                                                                    |
| 10  | Sous-menu Parametres (admin)            | Cliquer sur Parametres ouvre les sous-items (General, Onboarding, Modes IA, etc.)                                              |

### 2.2 Topbar (`topbar.spec.ts`)

| #   | Scenario                             | Resultat attendu                                                             |
| --- | ------------------------------------ | ---------------------------------------------------------------------------- |
| 1   | Breadcrumb affiche le bon chemin     | Ex: `Dashboard` sur `/dashboard`, `Prospection > Hub` sur `/prospecting/hub` |
| 2   | Breadcrumb cliquable                 | Les segments parents sont des liens navigables                               |
| 3   | Raccourci recherche (Cmd+K / Ctrl+K) | Ouvre la modale de recherche globale                                         |
| 4   | Icone notifications (cloche)         | Ouvre le panneau de notifications                                            |
| 5   | Avatar menu profil                   | Clic sur l'avatar ouvre un dropdown (Profil, Deconnexion)                    |

### 2.3 Responsive / Mobile (`mobile.spec.ts`)

| #   | Scenario                                 | Resultat attendu                                  |
| --- | ---------------------------------------- | ------------------------------------------------- |
| 1   | Sidebar masquee sur mobile (< 768px)     | La sidebar n'est pas visible                      |
| 2   | Bottom navigation visible sur mobile     | La barre de navigation bas apparait               |
| 3   | Bottom nav contient les liens principaux | Dashboard, CRM, Messages, Profil (adapte au role) |
| 4   | Pages s'adaptent aux petits ecrans       | Pas de scrollbar horizontal, contenu lisible      |
| 5   | Menu hamburger sur mobile                | Ouvre un drawer avec la navigation complete       |
| 6   | Fermeture du drawer apres navigation     | Le drawer se ferme quand on clique un lien        |

---

## 3. Fonctionnalites metier (`tests/features/`)

### 3.1 Dashboard (`dashboard.spec.ts`)

| #   | Scenario                         | Resultat attendu                                             |
| --- | -------------------------------- | ------------------------------------------------------------ |
| 1   | Admin : affiche les KPIs globaux | CA total, Deals en cours, Taux de conversion, Nouveaux leads |
| 2   | Admin : graphiques visibles      | Au moins un chart Recharts est rendu                         |
| 3   | Manager : memes KPIs que l'admin | Memes donnees que l'admin (scope organisation)               |
| 4   | Setter : KPIs personnels         | Ses deals, ses calls, son taux                               |
| 5   | Closer : KPIs personnels         | Ses deals signes, son CA                                     |
| 6   | Client B2B : portail simplifie   | Voit son espace client, pas les KPIs internes                |
| 7   | Client B2C : espace personnel    | Voit ses formations, sa communaute                           |
| 8   | Activite recente affichee        | Liste des derniers evenements                                |

### 3.2 CRM Pipeline (`crm.spec.ts`)

| #   | Scenario                               | Resultat attendu                                                          |
| --- | -------------------------------------- | ------------------------------------------------------------------------- |
| 1   | Kanban affiche avec les 6 colonnes     | Nouveau lead, Contacte, Relance, Call booke, Ferme (gagne), Ferme (perdu) |
| 2   | Creation d'un deal via dialog          | Formulaire avec titre, valeur, stage, temperature, source → deal cree     |
| 3   | Deal apparait dans la bonne colonne    | Apres creation, le deal est dans la colonne du stage choisi               |
| 4   | Modification d'un deal (panel lateral) | Clic sur un deal ouvre un panel, modification sauvegardee                 |
| 5   | Suppression d'un deal                  | Confirmation dialog → deal supprime → disparait du Kanban                 |
| 6   | Drag & drop entre colonnes             | Deplacer un deal change son stage (dnd-kit)                               |
| 7   | KPIs en haut se mettent a jour         | Apres ajout/modification, les compteurs refletent le changement           |
| 8   | Recherche de deals                     | Saisir un terme filtre les deals affiches                                 |
| 9   | Filtrage par source                    | Selectionner une source filtre les deals                                  |
| 10  | Filtrage par temperature               | Froid / Tiede / Chaud filtre les deals                                    |
| 11  | Tri par date                           | Les deals se reordonnent par date de creation                             |
| 12  | Export des deals                       | Bouton export genere un fichier (CSV/Excel)                               |
| 13  | Client B2B : CRM en lecture seule      | Le client B2B voit le Kanban mais ne peut pas creer/modifier              |

### 3.3 Academy (`academy.spec.ts`)

| #   | Scenario                         | Resultat attendu                                               |
| --- | -------------------------------- | -------------------------------------------------------------- |
| 1   | Liste des formations avec tabs   | Tabs : Toutes, En cours, Terminees, Non commencees             |
| 2   | Filtrage par tab                 | Cliquer sur un tab filtre les formations                       |
| 3   | Acces au detail d'un cours       | Clic sur un cours → page `/academy/[courseId]`                 |
| 4   | Progression visible              | Barre de progression, nombre de lecons completees, pourcentage |
| 5   | Marquer une lecon comme terminee | Le bouton "Terminer" met a jour la progression                 |
| 6   | Quiz disponible                  | Si le cours a un quiz, il est accessible et fonctionnel        |
| 7   | Micro-learning                   | Les capsules courtes s'affichent correctement                  |
| 8   | Recherche de formations          | Le champ de recherche filtre par titre/description             |
| 9   | Roles autorises                  | admin, manager, setter, closer, client_b2c ont acces           |
| 10  | Client B2B n'a pas acces         | Redirect ou 403                                                |

### 3.4 Bookings (`bookings.spec.ts`)

| #   | Scenario                      | Resultat attendu                                    |
| --- | ----------------------------- | --------------------------------------------------- |
| 1   | Calendrier des RDV affiche    | Vue calendrier avec les creneaux                    |
| 2   | Creation d'un booking         | Dialog avec date, heure, participant → booking cree |
| 3   | Modification d'un booking     | Changer la date/heure → sauvegarde OK               |
| 4   | Annulation d'un booking       | Confirmation → booking annule                       |
| 5   | Page publique `/book/[slug]`  | Accessible sans auth, formulaire de reservation     |
| 6   | Reservation via page publique | Un visiteur peut reserver un creneau                |
| 7   | Tous les roles ont acces      | Les 6 roles voient `/bookings`                      |

### 3.5 Contacts (`contacts.spec.ts`)

| #   | Scenario                  | Resultat attendu                                            |
| --- | ------------------------- | ----------------------------------------------------------- |
| 1   | Liste des contacts        | Tableau avec nom, email, telephone, entreprise              |
| 2   | Fiche contact detaillee   | Clic sur un contact → `/contacts/[id]` avec infos completes |
| 3   | Creation d'un contact     | Formulaire → contact cree et apparait dans la liste         |
| 4   | Modification d'un contact | Editer les champs → sauvegarde OK                           |
| 5   | Suppression d'un contact  | Confirmation → contact supprime                             |
| 6   | Recherche de contacts     | Filtrage par nom/email/entreprise                           |
| 7   | Acces restreint           | Seuls admin et manager voient `/contacts`                   |

### 3.6 Contrats (`contracts.spec.ts`)

| #   | Scenario              | Resultat attendu                                      |
| --- | --------------------- | ----------------------------------------------------- |
| 1   | Liste des contrats    | Tableau avec reference, client, statut, montant       |
| 2   | Detail contrat        | Page `/contracts/[id]` avec toutes les infos          |
| 3   | Creation d'un contrat | Formulaire → contrat cree                             |
| 4   | Factures liees        | Onglet factures dans le detail contrat                |
| 5   | Paiements lies        | Onglet paiements avec historique                      |
| 6   | Statut du contrat     | Brouillon, Envoye, Signe, Expire — transition visible |
| 7   | Acces restreint       | Seuls admin et manager voient `/contracts`            |

### 3.7 Chat / Messages (`chat.spec.ts`)

| #   | Scenario                  | Resultat attendu                                            |
| --- | ------------------------- | ----------------------------------------------------------- |
| 1   | Affichage des canaux      | Liste des conversations/canaux visibles                     |
| 2   | Selection d'un canal      | Clic sur un canal affiche les messages                      |
| 3   | Envoi d'un message texte  | Saisir + Entree → message apparait dans le fil              |
| 4   | Temps reel                | Un message envoye apparait sans refresh (Supabase Realtime) |
| 5   | Upload image              | Bouton clip → selectionner une image → envoi OK             |
| 6   | Enregistrement vocal      | Si disponible, bouton micro → enregistrement → envoi        |
| 7   | Tous les roles ont acces  | Les 6 roles voient `/chat`                                  |
| 8   | Broadcast (admin/manager) | Envoi d'un message a tous les membres                       |

### 3.8 Communaute (`community.spec.ts`)

| #   | Scenario                      | Resultat attendu                               |
| --- | ----------------------------- | ---------------------------------------------- |
| 1   | Liste des canaux              | General, Questions, Wins, Team (ou equivalent) |
| 2   | Creation d'un post            | Formulaire avec titre, contenu → post cree     |
| 3   | Post apparait dans le fil     | Apres creation, le post est visible en haut    |
| 4   | Reponse a un post             | Commenter sous un post → reponse visible       |
| 5   | Upload image dans post        | Ajouter une image au post → affichee           |
| 6   | Roles autorises               | admin, manager, client_b2c                     |
| 7   | Setter/closer n'ont pas acces | Redirect ou 403                                |

### 3.9 Prospection (`prospecting.spec.ts`)

| #   | Scenario                | Resultat attendu                            |
| --- | ----------------------- | ------------------------------------------- |
| 1   | Hub de prospection      | Page principale avec les outils             |
| 2   | LinkedIn sync           | Interface de synchronisation LinkedIn       |
| 3   | Instagram               | Interface de prospection Instagram          |
| 4   | Relances / follow-ups   | Liste des relances programmees              |
| 5   | Creer une relance       | Formulaire → relance planifiee              |
| 6   | Scoring des leads       | Score visible sur chaque prospect           |
| 7   | Templates de messages   | Liste des templates, creation, utilisation  |
| 8   | Decouverte Leads        | Page `/prospecting/discovery` fonctionnelle |
| 9   | Roles autorises         | admin, manager, setter, closer              |
| 10  | Clients n'ont pas acces | Redirect ou 403 pour client_b2b/client_b2c  |

### 3.10 Scripts (`scripts.spec.ts`)

| #   | Scenario              | Resultat attendu                                  |
| --- | --------------------- | ------------------------------------------------- |
| 1   | Liste des scripts     | Tableau/grille des scripts disponibles            |
| 2   | Editeur flowchart     | Interface @xyflow/react avec noeuds et connexions |
| 3   | Ajouter un noeud      | Clic sur "Ajouter" → nouveau noeud dans le canvas |
| 4   | Connecter deux noeuds | Drag entre noeuds → connexion creee               |
| 5   | Mode mindmap          | Basculer en mode mindmap → affichage different    |
| 6   | Mode presentation     | Basculer en mode presentation → vue plein ecran   |
| 7   | Templates             | Liste des templates pre-faits                     |
| 8   | Sauvegarder un script | Bouton sauvegarder → persistance en DB            |
| 9   | Roles autorises       | admin, manager, setter, closer                    |

### 3.11 Role-Play (`roleplay.spec.ts`)

| #   | Scenario             | Resultat attendu                                          |
| --- | -------------------- | --------------------------------------------------------- |
| 1   | Lancer une session   | Bouton "Nouvelle session" → page `/roleplay/session/[id]` |
| 2   | Session en cours     | Interface de role-play avec scenario                      |
| 3   | Debrief              | Page `/roleplay/debrief/[id]` avec feedback               |
| 4   | Mode spectateur      | Page `/roleplay/spectate` pour observer                   |
| 5   | Profils de prospects | Page `/roleplay/profiles` avec les personas               |
| 6   | Roles autorises      | admin, manager, setter, closer                            |

### 3.12 Challenges / Gamification (`challenges.spec.ts`)

| #   | Scenario                      | Resultat attendu                                            |
| --- | ----------------------------- | ----------------------------------------------------------- |
| 1   | Liste des defis               | Page avec defis individuels et d'equipe                     |
| 2   | Defis individuels             | Carte defi avec objectif, progression, recompense           |
| 3   | Defis d'equipe                | Defis partages entre membres                                |
| 4   | Points et niveaux             | Affichage du niveau actuel (Debutant → Legende, 0-7000 pts) |
| 5   | Recompenses                   | Liste des recompenses debloquees                            |
| 6   | Roles autorises               | setter, closer uniquement                                   |
| 7   | Admin/manager n'ont pas acces | Redirect ou 403                                             |

### 3.13 Journal EOD (`journal.spec.ts`)

| #   | Scenario                       | Resultat attendu                                 |
| --- | ------------------------------ | ------------------------------------------------ |
| 1   | Formulaire de saisie quotidien | Champs pour les metriques du jour                |
| 2   | Soumettre le journal           | Bouton sauvegarder → toast de confirmation       |
| 3   | Historique des journaux        | Liste des entrees passees                        |
| 4   | Un seul journal par jour       | Impossible de creer un doublon pour la meme date |
| 5   | Roles autorises                | setter, closer uniquement                        |

### 3.14 Equipe (`team.spec.ts`)

| #   | Scenario                  | Resultat attendu                                       |
| --- | ------------------------- | ------------------------------------------------------ |
| 1   | Liste des membres         | Tableau avec nom, role, email, statut                  |
| 2   | Detail d'un membre        | Fiche avec KPIs individuels                            |
| 3   | Affectations setter ↔ B2B | Page `/team/assignments`, drag ou select pour affecter |
| 4   | Leaderboard               | Classement des membres par performance                 |
| 5   | Roles autorises           | admin, manager uniquement                              |

### 3.15 Analytics (`analytics.spec.ts`)

| #   | Scenario                                 | Resultat attendu                                      |
| --- | ---------------------------------------- | ----------------------------------------------------- |
| 1   | Dashboard analytics admin                | Graphiques globaux (CA, conversion, pipeline)         |
| 2   | Funnel de vente                          | Visualisation du funnel avec taux de passage          |
| 3   | Projections                              | Page `/analytics/projections` avec previsions         |
| 4   | Sources                                  | Page `/analytics/sources` avec repartition            |
| 5   | NPS                                      | Page `/analytics/nps` avec score de satisfaction      |
| 6   | Performance individuelle (setter/closer) | Page `/analytics/performance` avec KPIs perso         |
| 7   | Acces admin/manager                      | `/analytics` accessible uniquement pour admin/manager |
| 8   | Acces setter/closer                      | `/analytics/performance` uniquement                   |

### 3.16 Profil (`profile.spec.ts`)

| #   | Scenario                    | Resultat attendu                           |
| --- | --------------------------- | ------------------------------------------ |
| 1   | Affichage infos utilisateur | Nom, email, role, avatar visibles          |
| 2   | Modification nom            | Changer le nom → sauvegarde OK             |
| 3   | Modification bio            | Changer la bio → sauvegarde OK             |
| 4   | Upload avatar               | Selectionner une image → avatar mis a jour |
| 5   | Roles autorises             | setter, closer, client_b2b, client_b2c     |

### 3.17 Parametres (`settings.spec.ts`)

| #   | Scenario                            | Resultat attendu                                 |
| --- | ----------------------------------- | ------------------------------------------------ |
| 1   | Sous-page General                   | Parametres generaux de l'organisation            |
| 2   | Sous-page Onboarding                | Configuration du flow d'onboarding               |
| 3   | Sous-page Modes IA                  | Configuration des modes d'IA                     |
| 4   | Sous-page White Label               | Personnalisation de la marque                    |
| 5   | Sous-page Notifications             | Preferences de notifications                     |
| 6   | Sous-page Confidentialite & RGPD    | Parametres de confidentialite                    |
| 7   | Sous-page Securite & 2FA            | Activation/configuration 2FA                     |
| 8   | Sous-page Champs personnalises      | Ajout/modification de champs custom              |
| 9   | Sous-page API REST                  | Cles API, documentation                          |
| 10  | Sous-page Integrations (admin seul) | Liste des integrations tierces                   |
| 11  | Sous-page Sync Calendrier           | Connexion Google/Outlook calendar                |
| 12  | Acces admin/manager                 | Toutes les sous-pages accessibles                |
| 13  | Integrations = admin uniquement     | Manager n'a pas acces a `/settings/integrations` |

### 3.18 Espace Client B2B (`client-b2b.spec.ts`)

| #   | Scenario                     | Resultat attendu                                     |
| --- | ---------------------------- | ---------------------------------------------------- |
| 1   | Portail (`/portal`)          | Page d'accueil client B2B                            |
| 2   | KPIs (`/kpis`)               | Metriques du client                                  |
| 3   | Mes Prospects (`/prospects`) | CRM simplifie du client                              |
| 4   | Settings IA (`/settings-ia`) | Configuration IA du client                           |
| 5   | Scripts IA (`/ai-scripts`)   | Scripts generes par IA                               |
| 6   | Parrainage (`/referral`)     | Programme de parrainage                              |
| 7   | Calls (`/calls`)             | Historique des appels                                |
| 8   | Ressources (`/resources`)    | Documents et fichiers partages                       |
| 9   | CRM lecture seule            | Le client voit le pipeline mais ne peut pas modifier |

### 3.19 Espace Client B2C (`client-b2c.spec.ts`)

| #   | Scenario                     | Resultat attendu                  |
| --- | ---------------------------- | --------------------------------- |
| 1   | Academy                      | Acces aux formations              |
| 2   | Communaute                   | Acces au forum communautaire      |
| 3   | Mes Prospects (`/prospects`) | CRM simplifie                     |
| 4   | Scripts IA (`/ai-scripts`)   | Scripts IA en lecture             |
| 5   | Calls (`/calls`)             | Historique des appels             |
| 6   | Ressources (`/resources`)    | Documents partages                |
| 7   | KPIs (`/kpis`)               | Metriques personnelles            |
| 8   | Parrainage (`/referral`)     | Programme de parrainage           |
| 9   | Pas d'acces au CRM           | `/crm` renvoie 403 ou redirect    |
| 10  | Pas d'acces au Portail       | `/portal` renvoie 403 ou redirect |

### 3.20 Autres pages

| #   | Route                 | Scenario                   | Roles                          |
| --- | --------------------- | -------------------------- | ------------------------------ |
| 1   | `/inbox`              | Boite de reception unifiee | admin, manager, setter, closer |
| 2   | `/notifications`      | Page de notifications      | tous                           |
| 3   | `/onboarding`         | Flow d'onboarding          | tous (apres inscription)       |
| 4   | `/whatsapp`           | Integration WhatsApp       | admin, manager                 |
| 5   | `/whatsapp/settings`  | Parametres WhatsApp        | admin, manager                 |
| 6   | `/whatsapp/sequences` | Sequences WhatsApp         | admin, manager                 |
| 7   | `/content`            | Gestion de contenu         | admin, manager                 |
| 8   | `/customers`          | Gestion des clients        | admin, manager                 |
| 9   | `/automation`         | Automatisations            | admin, manager                 |
| 10  | `/marketplace`        | Extensions partenaires     | setter, closer                 |
| 11  | `/help`               | Centre d'aide              | tous                           |
| 12  | `/calendar`           | Agenda                     | admin, manager, setter, closer |
| 13  | `/support`            | Support                    | tous                           |
| 14  | `/roadmap`            | Roadmap produit            | admin, manager                 |

---

## 4. Formulaires (`tests/forms/`)

### 4.1 Formulaire Deal (`form-deal.spec.ts`)

| #   | Scenario                                                            | Resultat attendu                        |
| --- | ------------------------------------------------------------------- | --------------------------------------- |
| 1   | Remplir tous les champs (titre, valeur, stage, temperature, source) | Deal cree avec succes                   |
| 2   | Champs obligatoires vides                                           | Validation inline, bouton disabled      |
| 3   | Valeur negative                                                     | Validation erreur                       |
| 4   | Valeur = 0                                                          | Accepte ou rejete selon la regle metier |
| 5   | Titre tres long (500+ car.)                                         | Tronque ou erreur de validation         |
| 6   | Caracteres speciaux dans le titre                                   | Accepte (accents, emojis, guillemets)   |

### 4.2 Formulaire Booking (`form-booking.spec.ts`)

| #   | Scenario                         | Resultat attendu          |
| --- | -------------------------------- | ------------------------- |
| 1   | Remplir date, heure, participant | Booking cree              |
| 2   | Date dans le passe               | Validation erreur         |
| 3   | Creneau deja pris                | Message d'indisponibilite |
| 4   | Participant vide                 | Validation erreur         |

### 4.3 Formulaire Post Communaute (`form-post.spec.ts`)

| #   | Scenario                 | Resultat attendu                            |
| --- | ------------------------ | ------------------------------------------- |
| 1   | Titre + contenu          | Post cree                                   |
| 2   | Titre vide               | Validation erreur                           |
| 3   | Contenu vide             | Validation erreur ou accepte (selon regles) |
| 4   | Image ajoutee            | Upload OK, preview visible                  |
| 5   | Image trop lourde (>5MB) | Erreur de taille                            |

### 4.4 Formulaire Profil (`form-profile.spec.ts`)

| #   | Scenario        | Resultat attendu                     |
| --- | --------------- | ------------------------------------ |
| 1   | Modifier le nom | Sauvegarde OK, toast de confirmation |
| 2   | Modifier la bio | Sauvegarde OK                        |
| 3   | Upload avatar   | Image uploadee, avatar mis a jour    |
| 4   | Nom vide        | Validation erreur                    |
| 5   | Bio tres longue | Accepte ou tronquee                  |

### 4.5 Formulaire Contact (`form-contact.spec.ts`)

| #   | Scenario                                  | Resultat attendu        |
| --- | ----------------------------------------- | ----------------------- |
| 1   | Remplir nom, email, telephone, entreprise | Contact cree            |
| 2   | Email invalide                            | Validation erreur       |
| 3   | Telephone format invalide                 | Validation erreur       |
| 4   | Nom vide                                  | Validation erreur       |
| 5   | Doublon d'email                           | Avertissement ou erreur |

### 4.6 Formulaire Contrat (`form-contract.spec.ts`)

| #   | Scenario                        | Resultat attendu  |
| --- | ------------------------------- | ----------------- |
| 1   | Remplir les details du contrat  | Contrat cree      |
| 2   | Montant invalide                | Validation erreur |
| 3   | Client non selectionne          | Validation erreur |
| 4   | Date de fin avant date de debut | Validation erreur |

### 4.7 Formulaire Journal EOD (`form-journal.spec.ts`)

| #   | Scenario                           | Resultat attendu                             |
| --- | ---------------------------------- | -------------------------------------------- |
| 1   | Remplir les metriques quotidiennes | Journal sauvegarde                           |
| 2   | Metriques negatives                | Validation erreur                            |
| 3   | Doublon de date                    | Erreur "Journal deja soumis pour cette date" |

---

## 5. Edge Cases (`tests/edge-cases/`)

### 5.1 Double soumission (`double-submit.spec.ts`)

| #   | Scenario                               | Resultat attendu                                   |
| --- | -------------------------------------- | -------------------------------------------------- |
| 1   | Double-clic rapide sur "Creer un deal" | Un seul deal cree (bouton disabled apres 1er clic) |
| 2   | Double-clic sur "Envoyer message"      | Un seul message envoye                             |
| 3   | Double-clic sur "Sauvegarder profil"   | Une seule mise a jour                              |

### 5.2 Navigation et etat (`navigation-state.spec.ts`)

| #   | Scenario                                          | Resultat attendu                        |
| --- | ------------------------------------------------- | --------------------------------------- |
| 1   | Refresh pendant une action                        | Etat coherent apres rechargement        |
| 2   | Navigation arriere apres soumission de formulaire | Pas de resoumission                     |
| 3   | Refresh sur une page avec filtre                  | Les filtres sont preserves (URL params) |

### 5.3 Inputs limites (`input-limits.spec.ts`)

| #   | Scenario                               | Resultat attendu                  |
| --- | -------------------------------------- | --------------------------------- |
| 1   | Input tres long (10 000 car.)          | Tronque ou erreur, pas de crash   |
| 2   | Caracteres speciaux (accents francais) | e, e, a, u, c acceptes            |
| 3   | Emojis dans les champs texte           | Acceptes et affiches correctement |
| 4   | HTML/script injection                  | Echappe, pas de XSS               |
| 5   | Champs numeriques avec lettres         | Validation erreur                 |

### 5.4 Timeout reseau (`network-timeout.spec.ts`)

| #   | Scenario                            | Resultat attendu                           |
| --- | ----------------------------------- | ------------------------------------------ |
| 1   | Timeout simule sur creation de deal | Toast d'erreur reseau                      |
| 2   | Timeout simule sur login            | Message d'erreur, possibilite de reessayer |
| 3   | Mode hors-ligne                     | Message clair "Connexion perdue"           |

---

## 6. Multi-utilisateurs (`tests/multi-user/`)

### 6.1 Acces concurrent (`concurrent-access.spec.ts`)

| #   | Scenario                                          | Resultat attendu                                                   |
| --- | ------------------------------------------------- | ------------------------------------------------------------------ |
| 1   | 2 setters accedent au CRM en meme temps           | Pas d'interference, chacun voit ses deals                          |
| 2   | Admin cree un deal → le setter le voit            | Le deal apparait dans le CRM du setter (apres refresh ou realtime) |
| 3   | Setter modifie un deal → admin voit le changement | Coherence des donnees                                              |

### 6.2 Isolation des donnees (`data-isolation.spec.ts`)

| #   | Scenario                      | Resultat attendu                                                              |
| --- | ----------------------------- | ----------------------------------------------------------------------------- |
| 1   | Isolation entre organisations | Un user d'une org ne voit pas les donnees d'une autre                         |
| 2   | RLS setter                    | Un setter ne voit pas les deals assignes a un autre setter (sauf meme equipe) |
| 3   | RLS client                    | Un client ne voit que ses propres donnees                                     |
| 4   | RLS admin                     | L'admin voit toutes les donnees de son organisation                           |

---

## 7. Securite & Permissions (`tests/security/`)

### 7.1 Routes protegees par role (`role-access.spec.ts`)

Matrice d'acces complete : tester chaque role sur chaque route.

| Route                    | admin | manager | setter | closer | client_b2b | client_b2c |
| ------------------------ | ----- | ------- | ------ | ------ | ---------- | ---------- |
| `/dashboard`             | OK    | OK      | OK     | OK     | OK         | OK         |
| `/crm`                   | OK    | OK      | OK     | OK     | Lecture    | 403        |
| `/contacts`              | OK    | OK      | 403    | 403    | 403        | 403        |
| `/bookings`              | OK    | OK      | OK     | OK     | OK         | OK         |
| `/calendar`              | OK    | OK      | OK     | OK     | 403        | 403        |
| `/contracts`             | OK    | OK      | 403    | 403    | 403        | 403        |
| `/academy`               | OK    | OK      | OK     | OK     | 403        | OK         |
| `/team`                  | OK    | OK      | 403    | 403    | 403        | 403        |
| `/team/assignments`      | OK    | OK      | 403    | 403    | 403        | 403        |
| `/analytics`             | OK    | OK      | 403    | 403    | 403        | 403        |
| `/analytics/performance` | 403   | 403     | OK     | OK     | 403        | 403        |
| `/journal`               | 403   | 403     | OK     | OK     | 403        | 403        |
| `/prospecting`           | OK    | OK      | OK     | OK     | 403        | 403        |
| `/prospecting/discovery` | OK    | OK      | OK     | OK     | 403        | 403        |
| `/roleplay`              | OK    | OK      | OK     | OK     | 403        | 403        |
| `/scripts`               | OK    | OK      | OK     | OK     | 403        | 403        |
| `/automation`            | OK    | OK      | 403    | 403    | 403        | 403        |
| `/marketplace`           | 403   | 403     | OK     | OK     | 403        | 403        |
| `/challenges`            | 403   | 403     | OK     | OK     | 403        | 403        |
| `/community`             | OK    | OK      | 403    | 403    | 403        | OK         |
| `/chat`                  | OK    | OK      | OK     | OK     | OK         | OK         |
| `/content`               | OK    | OK      | 403    | 403    | 403        | 403        |
| `/customers`             | OK    | OK      | 403    | 403    | 403        | 403        |
| `/portal`                | 403   | 403     | 403    | 403    | OK         | 403        |
| `/calls`                 | 403   | 403     | 403    | 403    | OK         | OK         |
| `/resources`             | 403   | 403     | 403    | 403    | OK         | OK         |
| `/kpis`                  | 403   | 403     | 403    | 403    | OK         | OK         |
| `/referral`              | 403   | 403     | 403    | 403    | OK         | OK         |
| `/prospects`             | 403   | 403     | 403    | 403    | OK         | OK         |
| `/settings-ia`           | 403   | 403     | 403    | 403    | OK         | 403        |
| `/ai-scripts`            | 403   | 403     | 403    | 403    | OK         | OK         |
| `/profile`               | 403   | 403     | OK     | OK     | OK         | OK         |
| `/settings`              | OK    | OK      | 403    | 403    | 403        | 403        |
| `/settings/integrations` | OK    | 403     | 403    | 403    | 403        | 403        |
| `/help`                  | OK    | OK      | OK     | OK     | OK         | OK         |

### 7.2 API Routes (`api-security.spec.ts`)

| #   | Scenario                           | Resultat attendu                              |
| --- | ---------------------------------- | --------------------------------------------- |
| 1   | `POST /api/push` sans auth         | Response JSON 401 `{ error: "Non autorise" }` |
| 2   | `GET /api/auth/callback` sans code | Response appropriee (redirect ou erreur)      |
| 3   | API routes avec token invalide     | Response JSON 401                             |

### 7.3 RLS Supabase (`rls-verification.spec.ts`)

| #   | Scenario                                   | Resultat attendu                           |
| --- | ------------------------------------------ | ------------------------------------------ |
| 1   | Setter A ne voit pas les deals du setter B | Requete DB filtre par user_id/org_id       |
| 2   | Client ne peut pas modifier les deals      | INSERT/UPDATE refuses par RLS              |
| 3   | Admin voit tout dans son org               | SELECT retourne toutes les lignes de l'org |
| 4   | Pas d'acces cross-organisation             | Requete echoue silencieusement (0 rows)    |

### 7.4 XSS et CSRF (`xss-csrf.spec.ts`)

| #   | Scenario                                            | Resultat attendu              |
| --- | --------------------------------------------------- | ----------------------------- |
| 1   | `<script>alert('xss')</script>` dans un champ texte | Echappe, pas d'execution      |
| 2   | Injection dans le titre d'un deal                   | Contenu affiche en texte brut |
| 3   | Injection dans un message chat                      | Contenu affiche en texte brut |
| 4   | CSRF token present sur les formulaires              | Protection CSRF active        |

---

## 8. Performance (bonus)

| #   | Scenario                                 | Resultat attendu               |
| --- | ---------------------------------------- | ------------------------------ |
| 1   | Chargement du dashboard < 3s             | LCP < 3000ms                   |
| 2   | Chargement du CRM avec 100+ deals        | Pas de freeze, scroll fluide   |
| 3   | Navigation entre pages < 500ms           | Transition rapide (App Router) |
| 4   | Recherche en temps reel < 300ms debounce | Resultats affiches rapidement  |

---

## Metriques cibles

| Metrique                    | Objectif                                                          |
| --------------------------- | ----------------------------------------------------------------- |
| **Tests totaux**            | 200+                                                              |
| **Couverture des roles**    | 6/6 (admin, manager, setter, closer, client_b2b, client_b2c)      |
| **Routes testees**          | 88 (acces minimum + happy path sur les principales)               |
| **Formulaires testes**      | 7 formulaires en happy path + erreurs                             |
| **Workers paralleles**      | 15+                                                               |
| **Matrice roles x routes**  | 35 routes x 6 roles = 210 combinaisons dans `role-access.spec.ts` |
| **Temps d'execution cible** | < 10 min avec 15 workers                                          |

---

## Structure des fichiers

```
e2e-tests/
  fixtures/          # Donnees de test (users, deals, contacts, etc.)
  helpers/           # Utilitaires (login, navigation, assertions)
  seeds/             # Scripts de seeding Supabase pour les tests
  tests/
    auth/
      login.spec.ts
      register.spec.ts
      forgot-password.spec.ts
      logout.spec.ts
      route-security.spec.ts
    navigation/
      sidebar.spec.ts
      topbar.spec.ts
      mobile.spec.ts
    features/
      dashboard.spec.ts
      crm.spec.ts
      academy.spec.ts
      bookings.spec.ts
      contacts.spec.ts
      contracts.spec.ts
      chat.spec.ts
      community.spec.ts
      prospecting.spec.ts
      scripts.spec.ts
      roleplay.spec.ts
      challenges.spec.ts
      journal.spec.ts
      team.spec.ts
      analytics.spec.ts
      profile.spec.ts
      settings.spec.ts
      client-b2b.spec.ts
      client-b2c.spec.ts
    forms/
      form-deal.spec.ts
      form-booking.spec.ts
      form-post.spec.ts
      form-profile.spec.ts
      form-contact.spec.ts
      form-contract.spec.ts
      form-journal.spec.ts
    edge-cases/
      double-submit.spec.ts
      navigation-state.spec.ts
      input-limits.spec.ts
      network-timeout.spec.ts
    multi-user/
      concurrent-access.spec.ts
      data-isolation.spec.ts
    security/
      role-access.spec.ts
      api-security.spec.ts
      rls-verification.spec.ts
      xss-csrf.spec.ts
  TEST-PLAN.md       # Ce fichier
```

---

## Comptes de test requis

| Role       | Email                          | Usage                                   |
| ---------- | ------------------------------ | --------------------------------------- |
| admin      | `admin@test.sales-system.fr`   | Tests admin, settings, analytics        |
| manager    | `manager@test.sales-system.fr` | Tests manager, equipe, contrats         |
| setter     | `setter@test.sales-system.fr`  | Tests setter, CRM, prospection, journal |
| closer     | `closer@test.sales-system.fr`  | Tests closer, CRM, pipeline             |
| client_b2b | `b2b@test.sales-system.fr`     | Tests portail B2B, KPIs, prospects      |
| client_b2c | `b2c@test.sales-system.fr`     | Tests academy, communaute B2C           |

> Les comptes doivent etre crees dans le seed Supabase (`seeds/`) avec des donnees de test associees (deals, contacts, bookings, etc.).
