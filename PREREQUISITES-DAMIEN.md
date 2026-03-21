# Prerequis Setting Academy — Configuration Damien

## 1. Variables d'environnement (Vercel Dashboard > Settings > Environment Variables)

### Obligatoires pour les crons

- [x] `CRON_SECRET` — Secret pour authentifier les crons Vercel ✅ Ajouté le 21/03
  - Utilise par : `/api/cron/relances`, `/api/cron/ai-auto-send`, `/api/cron/campaigns`, etc.

- [x] `SUPABASE_SERVICE_ROLE_KEY` — Cle service role Supabase (bypass RLS) ✅ Déjà présent
  - Utilise par : les crons qui n'ont pas de session utilisateur

### Obligatoires pour l'IA

- [x] `OPENROUTER_API_KEY` — Cle API OpenRouter pour la generation IA ✅ Ajouté le 21/03
  - Utilise par : cron ai-auto-send, personnalisation messages, roleplay, scripts IA
  - Modele utilise : `anthropic/claude-3.5-haiku` (rapide et economique)

### Obligatoires pour la messagerie multi-canal (Unipile)

- [x] `UNIPILE_DSN` — URL du serveur Unipile ✅ Déjà présent
  - Utilise par : envoi DM LinkedIn/Instagram, relances auto, IA auto-send

- [x] `UNIPILE_API_KEY` — Cle API Unipile ✅ Déjà présent
  - Utilise par : tous les appels Unipile

- [x] `UNIPILE_WEBHOOK_SECRET` — Secret HMAC pour verifier les webhooks entrants ✅ Ajouté le 21/03
  - A renseigner aussi dans le dashboard Unipile (voir section 3)

- [x] `UNIPILE_WEBHOOK_VERIFY_TOKEN` — Token de verification GET ✅ Ajouté le 21/03

---

## 2. Migrations SQL a executer

Executer dans le **SQL Editor de Supabase** (https://supabase.com/dashboard > SQL Editor), dans cet ordre :

### Migration 1 : ESOP Submissions
- [x] Fichier : `supabase/migrations/20260319_esop_submissions.sql` ✅ Exécuté le 21/03
- Cree la table `esop_submissions` avec RLS
- Workflow : brouillon > soumis > en_revision > valide

### Migration 2 : CSM Role
- [x] Fichier : `supabase/migrations/20260319_csm_role.sql` ✅ Exécuté le 21/03
- Cree les tables `csm_kickcases` et `csm_feedbacks` avec RLS
- Permet le suivi des clients a risque par le CSM

### Migration 3 : Contracts RLS Policies
- [x] Fichier : `supabase/migrations/20260320_contracts_rls_policies.sql` ✅ Exécuté le 21/03
- Ajoute les policies RLS sur `contracts`
- Permet la creation/modification de contrats par admin/manager
- Permet aux clients de voir et signer leurs propres contrats

### Deja existantes (migration 20260315)
- Table `relance_workflows` — deja creee
- Colonnes `auto_send_*` sur `ai_mode_configs` — deja creees

---

## 3. Configuration Webhook Unipile

Dans le dashboard Unipile, configurer un webhook :

- [x] **URL** : `https://sales-system-six.vercel.app/api/unipile/webhook` ✅ Configuré le 21/03
- [x] **Secret** : la meme valeur que `UNIPILE_WEBHOOK_SECRET` dans Vercel ✅
- [x] **Events activés** : tous les events messaging (new message, read, reaction, edit, delete, delivered) ✅
  - Permet la detection automatique des reponses prospects
  - Stoppe les relances J+2/J+3 quand un prospect repond

---

## 4. Crons Vercel (automatique)

Les crons sont configures dans `vercel.json` et seront actifs au prochain deploiement.
Ils necessitent que `CRON_SECRET` soit defini pour fonctionner.

| Cron | Horaire | Description |
|---|---|---|
| `/api/cron/relances` | 9h et 14h | Traitement relances J+2/J+3 |
| `/api/cron/ai-auto-send` | 8h et 13h | Envoi IA premiers messages aux nouveaux prospects |
| `/api/cron/campaigns` | 6h | Drip campaigns existantes |
| `/api/cron/auto-followups` | 10h | Notifications de relance manuelle |

---

## 5. Creation d'un utilisateur CSM (optionnel)

Pour tester le role CSM :
1. Creer un compte via `/register`
2. Dans Supabase > Table Editor > `profiles`, changer le `role` en `csm`
3. Le CSM aura acces a : Dashboard CSM, Contacts, CRM, Communaute, Chat

---

## 6. Policies RLS — Tables `contracts`, `invoices`, `payment_installments`

La création de contrats (`/contracts/new`) nécessite les policies RLS.

- [x] **Migration exécutée** : `supabase/migrations/20260320_contracts_rls_policies.sql` ✅ Exécuté le 21/03
  - Policies RLS sur `contracts` (INSERT/SELECT/UPDATE pour admin/manager, SELECT/UPDATE pour clients)
- [ ] Tester la création d'un contrat depuis `/contracts/new` (après redéploiement)
- [ ] Vérifier que l'auto-facture se génère après signature (le code est en place via `generateInvoice()`)

---

## 7. Test rapide post-configuration

- [ ] Se connecter en admin > Academy > cliquer "Initialiser modules Damien" > verifier les 13 modules
- [ ] Se connecter en client_b2b > verifier l'acces a "Mon ESOP" et "Mes SOPs" dans la sidebar
- [ ] Verifier que le deploiement Vercel est OK (pas d'erreur de build)
- [ ] Tester un cron manuellement : `curl -H "Authorization: Bearer VOTRE_CRON_SECRET" https://sales-system-six.vercel.app/api/cron/relances`
