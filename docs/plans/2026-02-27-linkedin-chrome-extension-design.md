# Design : Extension Chrome LinkedIn Bridge — Sales System

**Date** : 2026-02-27
**Statut** : Approuve
**Approche** : B — APIs Voyager LinkedIn internes + Content Script

---

## Contexte

Sales System a une section prospection LinkedIn fonctionnelle (CRUD prospects, conversations, scoring, follow-ups) mais sans connexion reelle a LinkedIn. L'extension Chrome fait le pont : elle intercepte les APIs internes de LinkedIn pour synchroniser les profils, conversations et messages avec Supabase.

## Decisions

- **Bridge complet** : scraping de profils, sync bidirectionnelle des messages, envoi de DMs depuis Sales System
- **Pas d'invitations auto** : trop risque pour le compte LinkedIn
- **Communication via Supabase directe** : l'extension utilise le client Supabase avec le token auth de l'utilisateur
- **Code dans le meme repo** : dossier `/chrome-extension/` a la racine
- **Distribution privee** : chargement en mode developpeur Chrome

## Architecture

### 3 composants

1. **Background Script** (service worker Manifest V3)
   - Intercepte le CSRF token LinkedIn via `chrome.webRequest.onSendHeaders`
   - Appelle les APIs Voyager (`/voyager/api/...`) pour scraper et envoyer
   - Gere la sync periodique (toutes les 2 min)
   - Communique avec Supabase (CRUD prospects, conversations)

2. **Content Script** (injecte sur linkedin.com)
   - Detecte les pages profil et conversation
   - Affiche un badge "Dans Sales System" sur les profils connus
   - Panneau flottant avec actions rapides (importer profil, voir dans CRM)

3. **Popup** (click sur l'icone extension)
   - Statut de connexion (Sales System + LinkedIn)
   - Derniers prospects importes
   - Bouton sync manuelle
   - Compteur quotidien de DMs envoyes

### Flux de donnees

#### Authentification
1. L'utilisateur se connecte a Sales System dans le navigateur
2. Via la popup, il s'authentifie avec ses identifiants Sales System
3. Le background script stocke le JWT Supabase dans `chrome.storage.local`

#### Capture CSRF LinkedIn
1. L'utilisateur navigue sur linkedin.com (il doit etre connecte)
2. `chrome.webRequest.onSendHeaders` capture le header `csrf-token`
3. Stocke dans `chrome.storage.session` (volatile)

#### Scraping de profil
1. Content script detecte une URL `/in/{slug}/`
2. Message au background : `{ action: "scrape_profile", slug }`
3. Background GET `linkedin.com/voyager/api/identity/profiles/{slug}`
4. UPSERT dans `prospects` (name, profile_url, platform="linkedin")
5. Content script affiche le badge

#### Sync conversations
Toutes les 2 minutes :
1. Background GET `linkedin.com/voyager/api/messaging/conversations`
2. Pour chaque conversation avec un prospect en DB :
   - Compare timestamps des messages
   - Ajoute les nouveaux au JSONB `dm_conversations.messages`
   - Met a jour `prospect.status` si nouveau message recu
3. Cree une notification Sales System si message non lu

#### Envoi de message
1. L'utilisateur ecrit dans `/inbox` de Sales System
2. Le message est save dans `dm_conversations.messages` avec `pending_send: true`
3. Background poll les messages pending toutes les 30s
4. POST `linkedin.com/voyager/api/messaging/conversations/{id}/events`
5. Update `pending_send: false`, `sent_at: timestamp`

## Structure des fichiers

```
chrome-extension/
  manifest.json
  package.json
  tsconfig.json
  src/
    background/
      index.ts             # Service worker entry
      linkedin-api.ts      # Wrappers APIs Voyager
      supabase-client.ts   # Client Supabase
      sync-engine.ts       # Polling & sync logic
    content/
      index.ts             # Main content script
      profile-badge.ts     # Badge UI sur profils
      panel.ts             # Panneau flottant
    popup/
      popup.html
      popup.ts
      popup.css
    shared/
      types.ts
      constants.ts
      storage.ts           # chrome.storage wrapper
  icons/
  dist/
```

## Modifications Sales System

1. **Nouvelle table `linkedin_sync`** : statut de sync par utilisateur
2. **Colonne `linkedin_conversation_id`** dans `dm_conversations` : lien vers la conversation LinkedIn
3. **Flag `pending_send`** dans les messages JSONB : pour l'envoi via extension
4. **Indicateur extension** dans `/prospecting/linkedin` : connectee/deconnectee + bouton sync

## Securite & anti-ban

- Rate limiting : max 20 appels API/heure, delai aleatoire 3-8s entre actions
- Pas d'invitations automatiques
- User-Agent natif du navigateur
- Sync passive toutes les 2 min (pas de polling agressif)
- CSRF token jamais stocke en clair dans la DB (hash uniquement)
- Token Supabase dans chrome.storage.local (chiffre par Chrome)

## APIs LinkedIn Voyager utilisees

| Endpoint | Methode | Usage |
|----------|---------|-------|
| `/voyager/api/identity/profiles/{slug}` | GET | Scraping profil |
| `/voyager/api/messaging/conversations` | GET | Liste conversations |
| `/voyager/api/messaging/conversations/{id}` | GET | Messages d'une conversation |
| `/voyager/api/messaging/conversations/{id}/events` | POST | Envoyer un message |
| `/voyager/api/search/dash/clusters` | GET | Recherche de profils |

## Build & Installation

```bash
cd chrome-extension
npm install
npm run build        # tsup/esbuild → dist/
```

Puis dans Chrome :
1. `chrome://extensions/` → Mode developpeur ON
2. "Charger l'extension non empaquetee" → selectionner `chrome-extension/dist/`
