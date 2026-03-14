# SalesSystem — Checklist complète des demandes client (Damien Reynaud)

> Extraites des appels du 18 et 19 février (Call 1 : 60 min, Call 2 : 4 min, Call 3 : 52 min avec Timothée Fortin)

---

## 1. FEATURES PRINCIPALES (Cœur de l'app)

### CRM Automatisé (PRIORITÉ #1 selon Damien)
- [ ] CRM de vente centralisé et automatisé
- [ ] CRM de setting duplicable pour chaque client B2B
- [ ] Tracking de toute la data (messages envoyés, connexions, taux de réponse, appels bookés)
- [ ] EOD (End of Day) automatisé — le setter remplit ses KPIs quotidiens, notification auto envoyée à l'entrepreneur
- [ ] Possibilité de dupliquer le CRM pour chaque nouveau client B2B en marque blanche
- [ ] Vue admin globale : voir l'avancement de tous les setters et clients d'un coup

### Système de Formation / Académie (remplacement de School + Discord)
- [ ] Modules de formation intégrés dans l'app (modules 1-2, 3-4-5, 6-7, 8, 9-10, + module IA futur)
- [ ] Vidéos de formation hébergées dans l'app (remplacement de School)
- [ ] Tests/questionnaires obligatoires après chaque groupe de modules
- [ ] Seuil de 90% de bonnes réponses pour débloquer le module suivant
- [ ] 3 tentatives par jour maximum pour passer un test
- [ ] Blocage de l'accès aux modules suivants tant que le test n'est pas validé
- [ ] Leaderboard des setters (meilleurs taux de réponse aux tests)
- [ ] Rediffusion des appels de groupe importée automatiquement dans la section "Replays"
- [ ] Section Ressources / Documents / Fichiers utiles par module

### Gestion des Rôles & Permissions
- [ ] Rôle Admin (Damien) — accès total + vue globale
- [ ] Rôle Setter — accès limité à ses modules, son CRM, ses conversations
- [ ] Rôle Entrepreneur/Client B2B — accès à son workspace, CRM, SOPs
- [ ] Rôle CSM (Customer Success Manager) — gestion satisfaction client, canaux, engagement
- [ ] Limiter les fonctionnalités en fonction du rôle

### Onboarding
- [ ] Onboarding B2C : Bienvenue → Compléter le profil → Regarder module introduction → Booker première call → Rejoindre communauté
- [ ] Onboarding B2B : Questionnaire sur le business/offre/contexte du client → Remplissage auto des SOPs par l'IA
- [ ] ESOP (document structuré) envoyé au client avec instructions (loop explicatif)
- [ ] Process d'onboarding : Client remplit ESOP → Setter vérifie → Appel à 3 (Damien + setter + client) → Let's go

### Création de Contrat Automatique
- [ ] Génération automatique du contrat en cliquant sur un client dans le CRM
- [ ] Variables dynamiques : nom, prénom du client
- [ ] Modalités de paiement configurables (1x, 2x, Secura, etc.)
- [ ] Montant paramétrable (2000€ TTC de base)

### Facturation Automatique
- [ ] Génération de factures automatiques

### Communication Interne (remplacement de Discord + WhatsApp)
- [ ] Communauté globale intégrée dans l'app (questions, wins, chat général)
- [ ] Canal privé par client / par équipe
- [ ] Canal team interne (setter ↔ Damien / CSM)
- [ ] Retours/feedbacks des setters via l'app

### Appels de Groupe
- [ ] Notifications push sur téléphone et desktop avant chaque appel de groupe (mercredi et vendredi soir)
- [ ] Possibilité de faire les appels de groupe directement dans l'app (ou intégrer Google Meet)
- [ ] Enregistrement automatique des appels
- [ ] Import automatique de l'enregistrement dans la section "Rediffusion appel de groupe"

---

## 2. FEATURES SECONDAIRES (Nice to have / Futures)

### Setting IA (offre B2B — très demandé)
- [ ] IA de setting automatique sur Instagram (envoi de premiers messages)
- [ ] IA de setting automatique sur LinkedIn (envoi de premiers messages)
- [ ] IA de setting automatique sur WhatsApp (envoi de premiers messages)
- [ ] Messages ultra-personnalisés en fonction du profil de la personne (scraping du profil, derniers posts)
- [ ] Réponses automatiques aux messages simples
- [ ] Notification à l'humain (setter) quand l'IA ne peut pas gérer (besoin de valeur humaine)
- [ ] Centralisation de TOUTES les conversations (Insta + LinkedIn + WhatsApp) au même endroit dans l'app
- [ ] Réaction aux stories Instagram (nice to have, pas prioritaire selon Damien)

### Relances Automatisées
- [ ] Workflow de relance : si pas de réponse après 2 jours → message auto
- [ ] Workflow de relance : si pas de réponse après 3 jours → autre message auto
- [ ] L'IA s'auto-adapte en fonction des taux de réponse par type de relance
- [ ] Tracking des taux de réponse par type de relance

### Script IA (Génération automatique de scripts de setting)
- [ ] L'IA analyse toutes les conversations passées
- [ ] Tri automatique : conversations ayant abouti à un call vs. celles qui n'ont pas abouti
- [ ] Extraction d'une structure/trame de script basée sur les conversations réussies
- [ ] Style visuel type Miro (mind map / arbre de décision)

### Compatibilité Setter ↔ Entrepreneur
- [ ] Score de compatibilité de 0 à 100 (rouge à vert)
- [ ] Basé sur : objectifs du setter (complément de revenu vs. full-time), heures dispo/jour, profil de l'entrepreneur (CA mensuel)
- [ ] Aide Damien à placer le bon setter chez le bon entrepreneur

### Multi-workspace B2B
- [ ] Chaque client B2B a son propre workspace isolé
- [ ] Workspace avec : CRM, connexion Instagram, connexion LinkedIn, conversations centralisées
- [ ] Admin (Damien) crée et gère les workspaces

### Parrainage
- [ ] Système de parrainage intégré dans l'app

### Certificats
- [ ] Certificat envoyé aux setters qui finissent la formation (par email ou dans l'app)

### To-do List / Suivi
- [ ] To-do list pour les setters (mentionnée mais pas encore implémentée côté Damien)

### Ressources IA par Pilier d'Offre (idée de Timothée)
- [ ] Pour chaque pilier de l'offre du client B2B, associer des ressources éducationnelles
- [ ] L'IA envoie automatiquement la ressource associée quand elle détecte une problématique liée à ce pilier

### Dashboard Data / Tracking (inspiration Ayros)
- [ ] Dashboard centralisé avec tous les chiffres sur toutes les plateformes
- [ ] Connexion Stripe (revenus)
- [ ] Connexion équipe de vente
- [ ] Suivi des leads, nombre de calls, KPIs globaux
- [ ] Partie reporting

---

## 3. PRÉFÉRENCES UI / DESIGN

- [ ] Direction artistique : **noir et vert** (Damien a un doc DA à envoyer)
- [ ] Logo existant (à récupérer auprès du designer de Damien)
- [ ] Design inspiration : **landing page de N8N** (Damien a dit "elle est dingue, elle est folle")
- [ ] Damien aime les trucs "beaux" mais préfère les trucs fonctionnels avant tout
- [ ] App installable en PWA (ajout au dock du Mac + écran d'accueil iPhone)
- [ ] Connexion par email/mot de passe (pas de Magic Link — "trop chiant de recevoir un mail")
- [ ] Fonctionnalité "voir le mot de passe" (eye icon) sur la page de connexion
- [ ] Landing page souhaitée (inspirée N8N)
- [ ] Pas de design Lovable (Damien trouve que c'est "le pire des trucs")
- [ ] CRUD admin complet (ajouter, modifier, supprimer du contenu dans la communauté et les modules)

---

## 4. INTÉGRATIONS / APIs MENTIONNÉES

- [ ] **Instagram API** — setting IA, messages, scraping profils
- [ ] **LinkedIn API** — setting IA, messages, scraping profils et posts
- [ ] **WhatsApp API** — setting IA, messages, relances
- [ ] **Stripe** — connexion pour le dashboard de revenus
- [ ] **Meta Business Manager** — potentiellement pour le tracking publicitaire (demande de Timothée)
- [ ] **AirTable** — import/export des données (certains clients B2B utilisent AirTable)
- [ ] **iClosed** — à remplacer ou intégrer (Damien paye iClosed actuellement pour booker des calls)
- [ ] **GHL / GoHighLevel** — mentionné (Damien a 300-400 opt-in sur GHL, leads à appeler)
- [ ] **Discord** — migration complète depuis Discord vers l'app
- [ ] **School / Skool** — migration complète de la formation depuis School vers l'app
- [ ] **Loom** — à remplacer par l'enregistrement intégré
- [ ] **Fathom** — à remplacer par l'enregistrement intégré
- [ ] **OBS** — à remplacer (Damien dit "quelle angoisse", ça bug tout le temps)
- [ ] **Ayros** — inspiration pour le tracking multi-plateformes (outil d'Alex Baker, pixel de tracking, attribution ROI)
- [ ] **7smart** — concurrent en setting IA, à étudier pour s'en inspirer

---

## 5. POINTS DE DOULEUR DU CLIENT (Ce que Damien veut ABSOLUMENT éviter)

- [ ] ❌ **Tout faire à la main** — contrats, CRM, tracking : "je fais tout à la main" → tout doit être automatisé
- [ ] ❌ **Pas de structure / pas de process** — "c'est dramatique, c'est le plus gros point noir"
- [ ] ❌ **Éparpillement des outils** — Discord pour la communauté, WhatsApp pour la com, School pour la formation, iClosed pour les calls, OBS pour enregistrer → tout centraliser dans UNE app
- [ ] ❌ **Pas de tracking de data** — "je ne traque même pas, la data c'est le plus important"
- [ ] ❌ **Clients qui disparaissent** — pas de signal quand un client ne se manifeste plus depuis 7+ jours → alertes automatiques
- [ ] ❌ **Setters qui ne font pas leur EOD** — forcer le reporting quotidien via l'app
- [ ] ❌ **OBS = galère** — "quelle angoisse, mal positionné, ça bug" → enregistrement intégré simple
- [ ] ❌ **Discord confus** — "je ne savais pas sur quel pied danser, je ne savais même pas comment ajouter des gens"
- [ ] ❌ **Payer plein d'outils séparés** — iClosed, Loom, Fathom, GenSpark, School → tout remplacer
- [ ] ❌ **Disponibilité perçue** — des clients se plaignent qu'il n'est pas assez dispo → le CSM + l'app doivent résoudre ça
- [ ] ❌ **Magic Link pour la connexion** — "trop chiant" → connexion classique email/mdp

---

## 6. PASSAGES FLOUS / INAUDIBLES / À CLARIFIER

| # | Passage | Timestamp approx. | Mon interprétation |
|---|---------|-------------------|---------------------|
| 1 | "les SOPI" / "ESOP" / "SOP" — utilisé de manière interchangeable | Tout au long | Il s'agit de **SOPs (Standard Operating Procedures)** = documents de process pour les setters. "ESOP" semble être le nom de son template spécifique de SOP. |
| 2 | "l'application que j'avais faite sur Lovable" / "Owebel" | Call 1 @5min | Damien avait déjà créé des prototypes sur **Lovable** (outil no-code). Il veut migrer/améliorer ça. |
| 3 | "Ayros" — outil de tracking mentionné par Timothée | Call 3 @0:16 | **Ayros** = outil de tracking/attribution marketing développé par Alex Baker. Inspiration pour le dashboard de data. À clarifier si Damien veut une intégration Ayros ou juste s'en inspirer. |
| 4 | Plusieurs passages passent soudainement en anglais (transcription automatique défaillante) | Call 1 @12min, @17min, Call 3 passim | La transcription Fathom a basculé en anglais par erreur. Le sens reste globalement compréhensible mais certaines phrases sont incohérentes. |
| 5 | "genre tu peux pas me refaire un Claude" → "tu ne vas pas recréer Claude" | Call 1 @9:15 | Malentendu humoristique. Damien listait ses abonnements payants (dont Claude AI). Il ne demande PAS de recréer Claude — c'était une blague. |
| 6 | "Minichat" mentionné dans les modules bonus | Call 1 @18:08 | Probablement **ManyChat** ou un outil de chatbot. À clarifier avec Damien s'il veut intégrer un chatbot ou si c'est juste du contenu de formation. |
| 7 | "marque blanche" pour le CRM B2B | Call 3 @50:20 | Damien veut pouvoir **vendre l'accès à l'app** à ses clients B2B comme un produit. À clarifier : est-ce un vrai white-label (branding du client) ou juste un accès multi-tenant ? |
| 8 | "Secura" comme moyen de paiement | Call 1 @12:08 | Probablement un service de paiement en plusieurs fois. À confirmer le nom exact et si une intégration est nécessaire. |
| 9 | Rôle exact du CSM dans l'app | Call 1 @22:46 | Le CSM doit avoir accès à : satisfaction client, gestion des canaux, réponses aux questions, suivi régulier, reporting CRM, identification des blocages, remontée de feedbacks. Mais les permissions exactes dans l'app restent à définir. |
| 10 | Landing page : pour le B2C, le B2B, ou les deux ? | Call 1 @58min | Damien a validé vouloir une landing page inspirée de N8N. À clarifier : est-ce pour vendre sa formation B2C, son offre B2B, ou les deux ? |

---

## RÉSUMÉ DES PRIORITÉS (selon Damien, Call 1 @46:14)

> "Si tu me dis que tu peux finir en une semaine, c'est quoi la priorité ?"

1. **CRM automatisé** — "ça mec, c'est... laisse tomber"
2. **Communication + tout pour les setters** — modules, formations, app
3. **Partie B2B** — SOPs, workspace client, application interne

---

*Document généré à partir des transcriptions Fathom des 18 et 19 février.*
*3 appels analysés : Call 1 (60 min), Call 2 (4 min), Call 3 (52 min).*
