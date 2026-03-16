# Guide de Configuration des APIs — Sales System

> Guide etape par etape pour brancher toutes les APIs externes.
> Suis chaque section dans l'ordre. Coche au fur et a mesure.

---

## SOMMAIRE

| #   | API                            | Ce que ca debloque                                                 | Temps estime | Difficulte |
| --- | ------------------------------ | ------------------------------------------------------------------ | ------------ | ---------- |
| 1   | **OpenAI**                     | 15 fonctionnalites IA (roleplay, messages, correction, scripts...) | 10 min       | Facile     |
| 2   | **Stripe**                     | Paiements reels, abonnements, factures                             | 30 min       | Moyen      |
| 3   | **VAPID (Web Push)**           | Notifications push sur mobile/desktop                              | 5 min        | Facile     |
| 4   | **Meta — WhatsApp Business**   | Envoi de messages WhatsApp reels                                   | 45 min       | Moyen      |
| 5   | **Meta — Instagram Messaging** | DMs Instagram depuis l'app                                         | 45 min       | Moyen      |
| 6   | **Extension Chrome LinkedIn**  | Prospection LinkedIn depuis l'app                                  | A developper | Avance     |

**Total pour les APIs 1-5 : environ 2h de configuration.**

---

## ETAPE 1 — OpenAI (10 min)

### Ce que ca debloque

- Roleplay IA (conversations realistes)
- Generation de messages personnalises (LinkedIn, Instagram, WhatsApp)
- Correction d'exercices IA
- Resume post-appel
- Generation de scripts depuis mind maps
- Analyse de profils prospects
- Suggestions de commentaires LinkedIn
- Detection d'objections avancee
- Reponses rapides IA
- Scraping & analyse de stories (traitement IA)

### Etapes

#### 1.1 — Creer un compte OpenAI

1. Va sur https://platform.openai.com/signup
2. Cree un compte (ou connecte-toi si tu en as deja un)
3. Confirme ton email

#### 1.2 — Ajouter un moyen de paiement

1. Va sur https://platform.openai.com/account/billing
2. Clique "Add payment method"
3. Entre ta carte bancaire
4. Ajoute du credit (10$ suffisent pour commencer — ca fait environ 2 millions de mots generes)

#### 1.3 — Generer une cle API

1. Va sur https://platform.openai.com/api-keys
2. Clique "+ Create new secret key"
3. Nom : `Sales System Production`
4. Permissions : **All** (ou au minimum "Model capabilities" > "Write")
5. Clique "Create secret key"
6. **COPIE LA CLE** — elle ne sera plus visible apres !
   - Elle ressemble a : `sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx`

#### 1.4 — Ajouter la cle au projet

1. Ouvre le fichier `.env.local` a la racine du projet Sales System
2. Ajoute cette ligne :

```
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx
```

3. Sauvegarde le fichier

#### 1.5 — Ajouter la cle sur Vercel

1. Va sur https://vercel.com → ton projet Sales System → Settings → Environment Variables
2. Ajoute :
   - Name : `OPENAI_API_KEY`
   - Value : `sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx`
   - Environment : Production, Preview, Development (coche les 3)
3. Clique "Save"

#### 1.6 — Verification

Envoie-moi un message avec la cle et je brancherai les 15 fonctionnalites IA.

---

## ETAPE 2 — Stripe (30 min)

### Ce que ca debloque

- Paiements echelonnes reels (cartes bancaires)
- Abonnements recurrents (setter premium)
- Facturation automatique avec PDF
- Webhooks de confirmation de paiement

### Etapes

#### 2.1 — Creer un compte Stripe

1. Va sur https://dashboard.stripe.com/register
2. Cree un compte avec ton email pro
3. Confirme ton email

#### 2.2 — Activer ton compte (pour les vrais paiements)

1. Va sur https://dashboard.stripe.com/account/onboarding
2. Remplis les infos de ton entreprise :
   - Nom de l'entreprise
   - Adresse
   - SIRET / numero d'identification
   - Coordonnees bancaires (IBAN pour recevoir les paiements)
3. Stripe va verifier — ca peut prendre 24-48h
   > **En attendant**, tu peux utiliser le mode TEST (les cles test fonctionnent immediatement)

#### 2.3 — Recuperer les cles API

1. Va sur https://dashboard.stripe.com/apikeys
2. Tu verras 2 cles :
   - **Publishable key** : `pk_test_xxxxx` (ou `pk_live_xxxxx` en prod)
   - **Secret key** : `sk_test_xxxxx` (ou `sk_live_xxxxx` en prod)
3. Copie les deux

> **IMPORTANT** : Commence avec les cles `test` pour tester. Passe en `live` quand tout fonctionne.

#### 2.4 — Creer un webhook

1. Va sur https://dashboard.stripe.com/webhooks
2. Clique "Add endpoint"
3. URL : `https://ton-domaine-vercel.vercel.app/api/stripe/webhook`
4. Selectionne les evenements :
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Clique "Add endpoint"
6. Copie le **Webhook signing secret** : `whsec_xxxxx`

#### 2.5 — Ajouter les cles au projet

1. Ouvre `.env.local` et ajoute :

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
```

#### 2.6 — Ajouter les cles sur Vercel

1. Va sur Vercel → Settings → Environment Variables
2. Ajoute les 3 variables (memes noms, memes valeurs)
3. Save

#### 2.7 — Verification

Envoie-moi les cles (au moins les cles test) et je brancherai les paiements.

---

## ETAPE 3 — VAPID Keys pour Web Push (5 min)

### Ce que ca debloque

- Notifications push sur Chrome, Firefox, Safari, mobile
- Alertes temps reel (nouveau deal, level up, message recu...)

### Etapes

#### 3.1 — Generer les cles VAPID

Pas besoin de compte externe ! Je peux les generer pour toi avec une commande.
Mais si tu veux le faire toi-meme :

1. Ouvre un terminal
2. Execute :

```bash
npx web-push generate-vapid-keys
```

3. Tu obtiendras :

```
Public Key: BxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ=
Private Key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### 3.2 — Ajouter au projet

1. Ouvre `.env.local` et ajoute :

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ=
VAPID_PRIVATE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_EMAIL=mailto:ton@email.com
```

#### 3.3 — Ajouter sur Vercel

Memes 3 variables sur Vercel → Settings → Environment Variables.

#### 3.4 — Verification

Dis-moi quand c'est fait et je branche les push notifications.

---

## ETAPE 4 — Meta WhatsApp Business API (45 min)

### Ce que ca debloque

- Envoi de messages WhatsApp reels aux prospects
- Sequences de nurturing automatiques par WhatsApp
- Declenchement automatique apres opt-in

### Pre-requis

- Un compte Meta Business (tu m'as dit que tu en as un)
- Un numero de telephone dedie pour WhatsApp Business (pas ton numero perso)

### Etapes

#### 4.1 — Creer une application Meta

1. Va sur https://developers.facebook.com/apps/
2. Clique "Create App"
3. Type : **Business**
4. Nom de l'app : `Sales System`
5. Selectionne ton Meta Business Account
6. Clique "Create App"

#### 4.2 — Ajouter le produit WhatsApp

1. Dans le dashboard de ton app, va dans "Add Products"
2. Trouve **WhatsApp** et clique "Set Up"
3. Suis le guide de configuration :
   - Selectionne ton Business Account
   - Tu recevras un **Phone Number ID** de test temporaire
   - Tu recevras un **WhatsApp Business Account ID**

#### 4.3 — Configurer un numero de telephone

1. Va dans WhatsApp → Getting Started
2. Option A : **Utiliser le numero test** (gratuit, pour tester)
3. Option B : **Ajouter ton propre numero** :
   - Clique "Add phone number"
   - Entre le numero dedie (pas ton perso !)
   - Verifie par SMS ou appel
   - Ce numero sera associe a ton WhatsApp Business

#### 4.4 — Recuperer les tokens

1. Va dans WhatsApp → Configuration → API Setup
2. Tu trouveras :
   - **Temporary access token** (expire en 24h — pour tester)
   - **Phone number ID** : `1234567890`
   - **WhatsApp Business Account ID** : `9876543210`
3. Pour un **token permanent** :
   - Va dans App Settings → Basic
   - Copie le **App Secret**
   - Va dans https://developers.facebook.com/tools/explorer/
   - Selectionne ton app
   - Genere un token avec les permissions `whatsapp_business_messaging` et `whatsapp_business_management`
   - Clique "Generate Long-Lived Token" (valide 60 jours)

#### 4.5 — Configurer le webhook

1. Dans WhatsApp → Configuration → Webhook
2. URL : `https://ton-domaine-vercel.vercel.app/api/whatsapp/webhook`
3. Verify Token : choisis un mot de passe (ex: `sales_system_whatsapp_2024`)
4. Abonne-toi aux champs : `messages`, `message_deliveries`, `message_reads`

#### 4.6 — Ajouter les cles au projet

```
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=1234567890
WHATSAPP_BUSINESS_ACCOUNT_ID=9876543210
WHATSAPP_WEBHOOK_VERIFY_TOKEN=sales_system_whatsapp_2024
META_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

#### 4.7 — Ajouter sur Vercel

Les 5 variables sur Vercel → Settings → Environment Variables.

#### 4.8 — Verification

Envoie-moi les cles et je brancherai l'envoi WhatsApp reel.

---

## ETAPE 5 — Meta Instagram Messaging API (45 min)

### Ce que ca debloque

- Lecture et envoi de DMs Instagram depuis l'app
- Centralisation des conversations Instagram dans l'inbox

### Pre-requis

- La meme app Meta creee a l'etape 4 (tu reutilises la meme)
- Un compte Instagram **professionnel** (pas personnel) lie a une Page Facebook

### Etapes

#### 5.1 — Convertir ton Instagram en compte professionnel

> Si c'est deja fait, passe a 5.2

1. Ouvre Instagram → Parametres → Compte
2. Clique "Passer a un compte professionnel"
3. Choisis "Business" (pas Creator)
4. Lie-le a ta Page Facebook

#### 5.2 — Lier Instagram a ta Page Facebook

1. Va sur ta Page Facebook → Parametres → Instagram
2. Clique "Connect Account"
3. Connecte-toi avec le compte Instagram
4. Autorise les permissions

#### 5.3 — Ajouter le produit Instagram a ton app Meta

1. Va sur https://developers.facebook.com/apps/ → ton app Sales System
2. "Add Products" → **Instagram**
3. Clique "Set Up"

#### 5.4 — Demander les permissions

1. Va dans App Review → Permissions and Features
2. Demande ces permissions :
   - `instagram_manage_messages` — pour lire/envoyer des DMs
   - `instagram_basic` — pour les infos du profil
   - `pages_messaging` — pour la messagerie via Pages
3. Meta va revoir ta demande (quelques jours — en attendant, les permissions fonctionnent pour les comptes test)

#### 5.5 — Generer un token

1. Va dans https://developers.facebook.com/tools/explorer/
2. Selectionne ton app
3. Permissions : `instagram_manage_messages`, `instagram_basic`, `pages_messaging`, `pages_manage_metadata`
4. Clique "Generate Access Token"
5. Copie le token

#### 5.6 — Recuperer l'Instagram Business Account ID

1. Avec le token, appelle :

```
GET https://graph.facebook.com/v21.0/me/accounts
```

2. Recupere le `id` de ta Page
3. Puis appelle :

```
GET https://graph.facebook.com/v21.0/{page-id}?fields=instagram_business_account
```

4. Recupere le `instagram_business_account.id`

#### 5.7 — Configurer le webhook Instagram

1. Dans ton app Meta → Webhooks → Instagram
2. URL : `https://ton-domaine-vercel.vercel.app/api/instagram/webhook`
3. Verify Token : `sales_system_instagram_2024`
4. Abonne-toi : `messages`, `messaging_postbacks`

#### 5.8 — Ajouter les cles au projet

```
INSTAGRAM_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxx
INSTAGRAM_BUSINESS_ACCOUNT_ID=17841400xxxxxxxx
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=sales_system_instagram_2024
```

#### 5.9 — Ajouter sur Vercel

Les 3 variables sur Vercel → Settings → Environment Variables.

#### 5.10 — Verification

Envoie-moi les cles et je creerai les routes webhook + l'integration Instagram.

---

## ETAPE 6 — Extension Chrome LinkedIn (a developper)

### Ce que ca debloque

- Prospection LinkedIn automatique depuis l'app
- Envoi de demandes de connexion
- Scraping de profils
- Centralisation des messages LinkedIn dans l'inbox

### Pourquoi une extension Chrome ?

LinkedIn n'a pas d'API publique pour la messagerie. La seule solution est une **extension Chrome** qui agit comme un pont entre LinkedIn et ton app (comme Waalaxy, Lemlist, etc.).

### Ce qu'il faut faire

C'est du developpement — je m'en charge. Pas de compte a creer.
Tu auras juste a :

1. Installer l'extension en mode developpeur dans Chrome
2. Te connecter a ton compte LinkedIn normalement
3. L'extension synchronisera les donnees avec Sales System

> **Je developperai cette extension quand les APIs 1-5 seront branchees.**

---

## RECAPITULATIF — Ta checklist

Copie cette checklist et coche au fur et a mesure :

```
[ ] ETAPE 1 — OpenAI
    [ ] Compte cree sur platform.openai.com
    [ ] Credit ajoute (10$ minimum)
    [ ] Cle API generee
    [ ] Ajoutee dans .env.local
    [ ] Ajoutee sur Vercel

[ ] ETAPE 2 — Stripe
    [ ] Compte cree sur dashboard.stripe.com
    [ ] Infos entreprise remplies (ou mode test)
    [ ] Cles API copiees (pk_test + sk_test)
    [ ] Webhook cree avec les 6 evenements
    [ ] Webhook secret copie
    [ ] 3 variables ajoutees dans .env.local
    [ ] 3 variables ajoutees sur Vercel

[ ] ETAPE 3 — VAPID (Web Push)
    [ ] Cles generees avec npx web-push generate-vapid-keys
    [ ] 3 variables ajoutees dans .env.local
    [ ] 3 variables ajoutees sur Vercel

[ ] ETAPE 4 — WhatsApp Business
    [ ] App Meta creee sur developers.facebook.com
    [ ] Produit WhatsApp ajoute
    [ ] Numero configure (test ou reel)
    [ ] Token + IDs recuperes
    [ ] Webhook configure
    [ ] 5 variables ajoutees dans .env.local
    [ ] 5 variables ajoutees sur Vercel

[ ] ETAPE 5 — Instagram Messaging
    [ ] Instagram passe en compte pro Business
    [ ] Lie a une Page Facebook
    [ ] Produit Instagram ajoute a l'app Meta
    [ ] Permissions demandees
    [ ] Token + Business Account ID recuperes
    [ ] Webhook configure
    [ ] 3 variables ajoutees dans .env.local
    [ ] 3 variables ajoutees sur Vercel

[ ] ETAPE 6 — Extension Chrome LinkedIn
    [ ] (Sera developpee apres les etapes 1-5)
```

---

## VARIABLES D'ENVIRONNEMENT COMPLETES

Voici a quoi ressemblera ton `.env.local` final :

```env
# --- Supabase (deja configure) ---
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxxx

# --- OpenAI ---
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx

# --- Stripe ---
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx

# --- Web Push (VAPID) ---
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ=
VAPID_PRIVATE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_EMAIL=mailto:ton@email.com

# --- WhatsApp Business ---
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=1234567890
WHATSAPP_BUSINESS_ACCOUNT_ID=9876543210
WHATSAPP_WEBHOOK_VERIFY_TOKEN=sales_system_whatsapp_2024
META_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx

# --- Instagram ---
INSTAGRAM_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxx
INSTAGRAM_BUSINESS_ACCOUNT_ID=17841400xxxxxxxx
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=sales_system_instagram_2024
```

---

## ORDRE RECOMMANDE

```
Etape 1 (OpenAI)     ← Fais ca EN PREMIER, ca debloque 15 features d'un coup
   ↓
Etape 3 (VAPID)      ← 5 minutes, facile
   ↓
Etape 2 (Stripe)     ← Pour les paiements
   ↓
Etape 4 (WhatsApp)   ← Necessite l'app Meta
   ↓
Etape 5 (Instagram)  ← Reutilise la meme app Meta
   ↓
Etape 6 (LinkedIn)   ← Je developpe l'extension
```

---

## QUAND TU AS FINI

Une fois que tu as tes cles, envoie-les moi (ou mets-les dans `.env.local`) et dis-moi :

- "J'ai les cles OpenAI" → Je branche les 15 fonctionnalites IA
- "J'ai les cles Stripe" → Je branche les paiements reels
- "J'ai configure WhatsApp" → Je cree les routes webhook + integration
- "J'ai configure Instagram" → Je cree les routes webhook + integration
- "Tout est pret" → Je fais tout d'un coup

Chaque integration prendra environ 30-60 min de mon cote pour remplacer les stubs par du vrai code.
