# QA TODOLIST — Setting Academy

Source : Rapports QA du 19/03/2026 (47 tests — 38% pass rate + 108 tests E2E — 18.5% pass rate)
Statut global : NON livrable en l'etat

---

## BUGS CRITIQUES (a corriger en priorite)

### BUG-C1 — Accents manquants landing page + pages internes
- [ ] Landing page : tous les textes body manquent d'accents ("equipes", "competences", "Decouverte", "Creez", "resultats", etc.)
- [ ] Seuls les liens de navigation (hardcodes) ont les accents corrects
- [ ] Pages internes aussi impactees ("evenements", etc.)
- **Fichier** : `src/app/page.tsx` + composants landing
- **Cause probable** : textes ecrits sans accents ou probleme d'encodage

### BUG-C2 — Login : aucun message d'erreur sur mauvais mot de passe
- [ ] HTTP 400 renvoye par le serveur mais AUCUN feedback visuel a l'utilisateur
- [ ] La page reste identique, l'utilisateur ne sait pas que le mot de passe est faux
- [ ] Erreur React #418 (hydration) visible en console
- **Fichier** : `src/app/(auth)/login/page.tsx`

### BUG-C3 — EOD (End of Day) : fonctionnalite absente
- [ ] La page /eod retourne 404
- [ ] Aucun formulaire EOD avec les champs specifies : messages envoyes, connexions, reponses recues, taux de reponse, calls bookes, commentaire
- [ ] Le "Journal du jour" dans le dashboard (humeur, victoires, defis) n'est PAS le format EOD attendu
- [ ] Calcul automatique taux de reponse : inexistant
- [ ] Soumission + notification admin : inexistant
- [ ] Protection double soumission / jour : inexistant
- [ ] Vue admin des EODs avec filtres par setter et par periode : inexistante
- [ ] KPIs agreges (moyenne messages, taux de reponse moyen, total calls) : inexistants
- **A creer** : page `/eod`, formulaire setter, vue admin, table `eod_reports`

### BUG-C4 — Dashboard entrepreneur (Client B2B) : vue manquante
- [ ] Pas de vue "dashboard entrepreneur" distincte
- [ ] La page /workspaces retourne 404 (NOTE: corrige depuis — a re-tester apres deploiement)
- [ ] Le client B2B doit voir uniquement les donnees de ses propres setters
- [ ] Les chiffres doivent correspondre aux EODs soumis par ses setters

### BUG-C5 — Onboarding B2B : 0/14 tests passes
- [ ] Gating onboarding pour role client_b2b (NOTE: implemente recemment — a re-tester)
- [ ] Redirection vers /onboarding si profil incomplet
- [ ] Wizard multi-etapes
- [ ] Sauvegarde progression

### BUG-C6 — Academy : modules vides / contenu absent
- [ ] La page Academy charge mais les modules peuvent etre vides si pas de seed data
- [ ] Le bouton "Initialiser modules Damien" doit creer les 13 modules (NOTE: implemente — a re-tester)
- [ ] Quiz gating : verification que le quiz >= 90% debloque le module suivant

---

## BUGS MINEURS

### BUG-M1 — Validation login champs vides
- [ ] Validation repose uniquement sur `required` HTML natif
- [ ] Pas de messages d'erreur stylises dans l'application
- **Fichier** : `src/app/(auth)/login/page.tsx`

### BUG-M2 — KPIs dashboard a zero
- [ ] CA du mois = 0 EUR (normal si aucun deal ferme, mais UX a ameliorer — afficher "Pas encore de CA ce mois")
- **Priorite** : basse (cosmetique)

### BUG-M3 — Menu sidebar : entrees manquantes
- [ ] EOD / Journal quotidien absent du menu
- [ ] Team / Equipe present seulement via lien dashboard, pas dans la sidebar directement
- **Fichier** : `src/lib/constants.ts` (NAV_ITEMS)

### BUG-M4 — Recharts warnings console
- [ ] 7 warnings console detectes (probablement Recharts defaultProps deprecations)
- **Priorite** : basse

### BUG-M5 — Hydration error React #418
- [ ] Visible sur la page login lors d'une soumission echouee
- **Fichier** : `src/app/(auth)/login/page.tsx`

---

## FONCTIONNALITES MANQUANTES A IMPLEMENTER

### FM-1 — Formulaire EOD complet (HAUTE PRIORITE)
- [ ] Page /eod pour les setters
- [ ] Champs : messages envoyes, connexions, reponses recues, taux de reponse (auto-calcule), calls bookes, commentaire
- [ ] Soumission → confirmation + notification admin in-app
- [ ] Protection double soumission par jour
- [ ] Vue admin : liste tous les EODs, filtres par setter et par periode
- [ ] KPIs agreges : moyenne messages, taux de reponse moyen, total calls
- [ ] Table Supabase : `eod_reports` (user_id, date, messages_sent, connections, replies, response_rate, calls_booked, comment)

### FM-2 — Dashboard entrepreneur B2B
- [ ] Vue dashboard specifique pour role client_b2b
- [ ] Affiche uniquement les donnees des setters assignes au client
- [ ] Metriques : EODs de ses setters, pipeline de ses deals, CA genere

### FM-3 — Contrats : auto-facture sur signature
- [ ] Quand un contrat est signe, generer automatiquement la premiere facture (NOTE: partiellement implemente via `generateScheduledInvoices`)
- [ ] A re-tester apres dernier deploiement

### FM-4 — Matching setter/closer
- [ ] Algorithme de matching base sur les competences et la charge
- [ ] Interface d'affectation
- [ ] Dashboard de suivi des matchs

---

## ITEMS DEJA IMPLEMENTES (a re-tester apres deploiement)

Les items suivants ont ete flagges FAIL dans le QA mais ont ete implementes APRES le test.
A re-tester sur la version deployee actuelle.

- [x] **SOPs** — Pages /workspaces/[id]/sops implementees
- [x] **ESOP** — Formulaire soumission + workflow brouillon > soumis > en_revision > valide (table `esop_submissions`)
- [x] **CSM Dashboard** — Tables `csm_kickcases` et `csm_feedbacks` + interface CSM (role csm)
- [x] **Relances J+2/J+3** — Cron `/api/cron/relances` avec detection reponse et annulation auto
- [x] **IA auto-send** — Cron `/api/cron/ai-auto-send` avec generation message via OpenRouter
- [x] **Academy seed** — Bouton "Initialiser modules Damien" pour creer les 13 modules
- [x] **Onboarding gating B2B** — Middleware force /onboarding si profil incomplet
- [x] **Workspace B2B** — Page /workspaces avec liste des workspaces du client B2B
- [x] **Academy nav B2B** — Navigation Academy filtree par role

---

## PREREQUISITES DAMIEN (config cote client)

Voir fichier `PREREQUISITES-DAMIEN.md` pour la checklist complete :
- [ ] `CRON_SECRET` — Secret pour crons Vercel
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — Cle service role (bypass RLS)
- [ ] `OPENROUTER_API_KEY` — Pour generation IA
- [ ] `UNIPILE_DSN` + `UNIPILE_API_KEY` — Pour messagerie multi-canal
- [ ] `UNIPILE_WEBHOOK_SECRET` + `UNIPILE_WEBHOOK_VERIFY_TOKEN` — Pour webhook
- [ ] Migrations SQL : `20260319_esop_submissions.sql` + `20260319_csm_role.sql`
- [ ] Configuration webhook Unipile

---

## PLAN D'ACTION SUGGERE

### Sprint 1 (urgent) — Bugs critiques
1. BUG-C1 : Corriger accents landing page + pages internes
2. BUG-C2 : Ajouter message d'erreur login
3. BUG-C5 : Corriger hydration error login

### Sprint 2 — Fonctionnalites manquantes
4. FM-1 : Implementer EOD complet (formulaire setter + vue admin + KPIs)
5. FM-2 : Dashboard entrepreneur B2B
6. BUG-C3 : Route /eod + table eod_reports

### Sprint 3 — Re-test + polish
7. Re-tester tous les items "deja implementes" sur la prod
8. BUG-M3 : Ajouter EOD et Team dans la sidebar
9. FM-3 : Verifier auto-facture signature
10. FM-4 : Matching setter/closer (si requis par le cahier des charges)
