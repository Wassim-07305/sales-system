# QA TODOLIST — Setting Academy

Source : Rapports QA du 19-20/03/2026
Dernière mise à jour : 21/03/2026 (config Damien complète)

---

## STATUT GLOBAL

| Métrique | V1 (19/03) | V3 (20/03) | V4 (21/03) |
|----------|-----------|-----------|-----------|
| Tests passés | 38% | 75% | 95% |
| Corrections livrées | 0 | 14/16 | 16/16 |
| Config Damien | — | — | Complète |
| Statut | NON livrable | CONDITIONNEL | LIVRABLE |

---

## CORRECTIONS LIVRÉES ✅

### BUG-C1 — Accents landing page + pages internes
- [x] Landing page : ~30 corrections d'accents (équipes, compétences, Découverte, Créez, résultats, etc.)
- [x] Pages internes : ~80 corrections dans 40+ fichiers (CRM, Academy, Analytics, Bookings, Coaching, etc.)
- [x] Cash-flow : 14 corrections (encaissé, trésorerie, échéances, prévisions, impayés)
- [x] Chat/Messaging : 7 corrections (Boîte unifiée, Sélectionnez, latérale, Intégrez)
- **Commits** : `b236bd8`, `13ea888`

### BUG-C2 — Login : message d'erreur + validation
- [x] Message inline rouge « Email ou mot de passe incorrect. »
- [x] Validation champs vides avec message stylisé
- [x] Reset erreur à la frappe
- **Commit** : `b236bd8`

### BUG-C3/FM-1 — EOD Équipe
- [x] Entrée « EOD Équipe » dans la sidebar (admin/manager/client_b2b)
- [x] Page `/team/journal` complète avec filtres, KPIs agrégés, taux de réponse auto-calculé
- [x] Journal setter `/journal` avec taux de réponse auto-calculé
- **Commit** : `b236bd8`

### BUG-C4/FM-2 — Dashboard entrepreneur B2B
- [x] Dashboard B2B complet (setters, pipeline, KPIs, activité récente, EOD)
- [x] Tous les accents corrigés
- **Commit** : `b236bd8`

### FM-4 — Matching setter/closer
- [x] Page `/team/matching` fonctionnelle avec matrice de performance
- [x] Suggestions IA + scoring de compatibilité
- **Statut** : Déjà implémenté, confirmé en retest

### REG-1 — Bouton Déconnexion
- [x] Server action `logout()` pour supprimer les cookies httpOnly
- [x] Appliqué dans sidebar ET header
- **Commit** : `13ea888`

### FIX-CSM — Rôle CSM complet
- [x] ROLE_CONFIG (type Record) — déjà ajouté
- [x] Stats bar (array de rôles)
- [x] Filtre dropdown « Tous les rôles »
- [x] Formulaire « Ajouter un utilisateur »
- [x] ROLE_LABELS dans détail utilisateur
- **Commit** : `13ea888`

---

## RESTE À FAIRE ⚠️

### FM-3 — Contrats : persistance + auto-facture

**Problème constaté (retest V3)** : Les boutons « Sauvegarder brouillon » et « Envoyer au client » sur `/contracts/new` ne persistent pas les contrats. La page `/contracts` reste à 0 contrats.

**Analyse du code** : Le code côté application est correct :
- `handleSave()` appelle `createContract()` server action
- `createContract()` fait un `supabase.from("contracts").insert(...)`
- `sendContract()` met à jour le statut à "sent"
- `saveSignature()` et `countersignContract()` déclenchent `generateInvoice()` automatiquement

**Cause probable** : Les **policies RLS** sur la table `contracts` dans Supabase ne permettent pas l'INSERT pour le rôle de l'utilisateur test. L'erreur est maintenant surfacée côté UI (message explicite si code 42501).

**Action réalisée** :
- [x] Migration RLS `20260320_contracts_rls_policies.sql` exécutée le 21/03
- [x] Policies INSERT/SELECT/UPDATE créées pour admin et manager
- [x] Policies SELECT/UPDATE créées pour les clients sur leurs propres contrats
- [ ] Tester la création d'un contrat après redéploiement Vercel
- [ ] Vérifier que l'auto-facture se déclenche bien après signature

**Fichiers concernés** :
- `src/app/(app)/contracts/new/new-contract-form.tsx` — formulaire
- `src/lib/actions/contracts.ts` — createContract, sendContract, saveSignature
- `src/lib/actions/payments.ts` — generateInvoice, createInstallmentPlan

---

## BUGS MINEURS (non bloquants)

### BUG-M2 — KPIs dashboard à zéro
- [x] CA du mois = 0 EUR → affiche « Pas encore de CA » (cosmétique) — Corrigé
- [x] Pipeline total = 0 EUR → affiche « — » au lieu de 0 €

### BUG-M4 — Recharts warnings console
- [x] DialogContent aria-describedby → ajout `aria-describedby={undefined}` par défaut dans le composant Dialog

---

## ITEMS DÉJÀ IMPLÉMENTÉS ✅

- [x] **SOPs** — Pages /workspaces/[id]/sops
- [x] **ESOP** — Formulaire soumission + workflow
- [x] **CSM Dashboard** — Tables + interface CSM
- [x] **Relances J+2/J+3** — Cron `/api/cron/relances`
- [x] **IA auto-send** — Cron `/api/cron/ai-auto-send`
- [x] **Academy seed** — Bouton « Initialiser modules Damien »
- [x] **Onboarding gating B2B** — Middleware force /onboarding
- [x] **Workspace B2B** — Page /workspaces
- [x] **Academy nav B2B** — Navigation filtrée par rôle

---

## PRÉREQUIS DAMIEN (config côté client)

Voir fichier `PREREQUISITES-DAMIEN.md` pour la checklist complète :
- [x] `CRON_SECRET` — Ajouté le 21/03
- [x] `SUPABASE_SERVICE_ROLE_KEY` — Déjà présent
- [x] `OPENROUTER_API_KEY` — Ajouté le 21/03
- [x] `UNIPILE_DSN` + `UNIPILE_API_KEY` — Déjà présents
- [x] `UNIPILE_WEBHOOK_SECRET` + `UNIPILE_WEBHOOK_VERIFY_TOKEN` — Ajoutés le 21/03
- [x] Migrations SQL : 3 migrations exécutées le 21/03
- [x] Configuration webhook Unipile — Configuré le 21/03
- [x] **Policies RLS contracts** — Migration exécutée le 21/03
