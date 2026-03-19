# Prerequis Setting Academy — Configuration Damien

## 1. Variables d'environnement (Vercel Dashboard > Settings > Environment Variables)

### Obligatoires pour les crons

- [ ] `CRON_SECRET` — Secret pour authentifier les crons Vercel
  - Generer avec : `openssl rand -hex 32`
  - Utilise par : `/api/cron/relances`, `/api/cron/ai-auto-send`, `/api/cron/campaigns`, etc.

- [ ] `SUPABASE_SERVICE_ROLE_KEY` — Cle service role Supabase (bypass RLS)
  - Ou la trouver : Supabase Dashboard > Settings > API > section "service_role" (cle secrete)
  - Utilise par : les crons qui n'ont pas de session utilisateur

### Obligatoires pour l'IA

- [ ] `OPENROUTER_API_KEY` — Cle API OpenRouter pour la generation IA
  - Ou la trouver : https://openrouter.ai/keys
  - Utilise par : cron ai-auto-send, personnalisation messages, roleplay, scripts IA
  - Modele utilise : `anthropic/claude-3.5-haiku` (rapide et economique)

### Obligatoires pour la messagerie multi-canal (Unipile)

- [ ] `UNIPILE_DSN` — URL du serveur Unipile (ex: `https://api.unipile.com`)
  - Ou la trouver : Dashboard Unipile > Settings
  - Utilise par : envoi DM LinkedIn/Instagram, relances auto, IA auto-send

- [ ] `UNIPILE_API_KEY` — Cle API Unipile
  - Ou la trouver : Dashboard Unipile > API Keys
  - Utilise par : tous les appels Unipile

- [ ] `UNIPILE_WEBHOOK_SECRET` — Secret HMAC pour verifier les webhooks entrants
  - Generer avec : `openssl rand -hex 32`
  - A renseigner aussi dans le dashboard Unipile (voir section 3)

- [ ] `UNIPILE_WEBHOOK_VERIFY_TOKEN` — Token de verification GET (challenge endpoint)
  - Choisir une valeur arbitraire, la renseigner dans Unipile et dans Vercel

---

## 2. Migrations SQL a executer

Executer dans le **SQL Editor de Supabase** (https://supabase.com/dashboard > SQL Editor), dans cet ordre :

### Migration 1 : ESOP Submissions
- [ ] Fichier : `supabase/migrations/20260319_esop_submissions.sql`
- Cree la table `esop_submissions` avec RLS
- Workflow : brouillon > soumis > en_revision > valide

### Migration 2 : CSM Role
- [ ] Fichier : `supabase/migrations/20260319_csm_role.sql`
- Cree les tables `csm_kickcases` et `csm_feedbacks` avec RLS
- Permet le suivi des clients a risque par le CSM

### Deja existantes (migration 20260315)
- Table `relance_workflows` — deja creee
- Colonnes `auto_send_*` sur `ai_mode_configs` — deja creees

---

## 3. Configuration Webhook Unipile

Dans le dashboard Unipile, configurer un webhook :

- [ ] **URL** : `https://sales-system-six.vercel.app/api/unipile/webhook`
- [ ] **Secret** : la meme valeur que `UNIPILE_WEBHOOK_SECRET` dans Vercel
- [ ] **Events a activer** : `message_received`
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

## 6. Test rapide post-configuration

- [ ] Se connecter en admin > Academy > cliquer "Initialiser modules Damien" > verifier les 13 modules
- [ ] Se connecter en client_b2b > verifier l'acces a "Mon ESOP" et "Mes SOPs" dans la sidebar
- [ ] Verifier que le deploiement Vercel est OK (pas d'erreur de build)
- [ ] Tester un cron manuellement : `curl -H "Authorization: Bearer VOTRE_CRON_SECRET" https://sales-system-six.vercel.app/api/cron/relances`
