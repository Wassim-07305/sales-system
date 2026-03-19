# Messaging Overhaul — Port Off-Market Chat UX

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refaire le module messagerie de Sales System pour matcher l'UX d'Off-Market — input en bas, vocaux avec waveform, meilleur layout, drag-drop fichiers.

**Architecture:** On porte les composants clés d'Off-Market (voice-recorder, chat-input amélioré) et on corrige le layout flex du container + chat-panel. On garde les hooks existants (use-messages, use-channels, use-typing) et on les enrichit pour supporter les vocaux. Pas de TipTap (trop lourd pour le scope), mais on ajoute vocaux + meilleur emoji picker + drag-drop.

**Tech Stack:** React 19, Next.js 16, Supabase (Storage + Realtime), Zustand, TanStack React Query, Web Audio API (MediaRecorder + AnalyserNode), Lucide React

**Source de référence :** `/Users/wassim/Projets/Off-Market/src/components/messaging/`

---

## Fichiers

### Nouveaux fichiers

- `src/components/messaging/voice-recorder.tsx` — Composant d'enregistrement vocal + preview (porté d'Off-Market)

### Fichiers modifiés

- `src/components/messaging/chat-input.tsx` — Refonte complète : ajout vocaux, drag-drop, meilleur layout
- `src/components/messaging/chat-panel.tsx` — Fix layout flex + ajout gestion vocaux/drag-drop
- `src/components/messaging/messaging-container.tsx` — Fix hauteur container (calc correct)
- `src/stores/messaging-store.ts` — Pas de changement nécessaire (déjà complet)

### Fichiers inchangés (déjà OK)

- `src/components/messaging/message-content.tsx` — Déjà gère audio/voice avec waveform player
- `src/components/messaging/message-list.tsx` — OK
- `src/components/messaging/message-bubble.tsx` — OK
- `src/lib/hooks/use-messages.ts` — Déjà gère sendMessage avec contentType + addAttachment

---

## Task 1: Voice Recorder — Nouveau composant

**Files:**

- Create: `src/components/messaging/voice-recorder.tsx`

Porté d'Off-Market avec adaptations :

- Couleurs adaptées au thème Sales System (primary au lieu de #AF0000)
- Import paths Sales System (@/lib/utils au lieu de @/lib/utils)
- Même logique : MediaRecorder + AnalyserNode pour waveform live + VoicePreview

- [ ] **Step 1: Créer voice-recorder.tsx**

Copier depuis Off-Market (`/Users/wassim/Projets/Off-Market/src/components/messaging/voice-recorder.tsx`) et adapter :

- Les imports restent identiques (lucide-react, sonner, react)
- Le composant est self-contained, pas de dépendance externe
- Garder VoiceRecorder + VoicePreview (les deux exports)

- [ ] **Step 2: Vérifier que le fichier compile**

Run: `cd "/Users/wassim/Projets/Sales System" && npx tsc --noEmit src/components/messaging/voice-recorder.tsx 2>&1 | head -20`

---

## Task 2: Refonte ChatInput — Vocaux + Drag-Drop + Meilleur UX

**Files:**

- Modify: `src/components/messaging/chat-input.tsx`

L'input actuel est un simple textarea. On le refait pour :

1. Ajouter bouton micro → VoiceRecorder
2. Ajouter drag-drop de fichiers dans l'input
3. Preview des fichiers/vocaux en attente avant envoi
4. Meilleur layout : boutons d'action dans une barre en bas du textarea
5. Garder textarea (pas TipTap — plus simple, moins de deps)

- [ ] **Step 1: Réécrire chat-input.tsx**

Nouveau ChatInput avec :

- Props : ajouter `onVoiceSend`, `channelName`, `droppedFile`, `onClearDroppedFile`
- State : `pendingFiles[]`, `pendingVoices[]`, `isDragging`
- UI : textarea + barre d'actions en dessous (attach, mic, emoji, urgent, schedule, send)
- Preview fichiers/vocaux au-dessus du textarea
- VoiceRecorder intégré (import depuis voice-recorder.tsx)
- Enter = envoyer, Shift+Enter = newline (existant, garder)

- [ ] **Step 2: Vérifier compilation**

Run: `cd "/Users/wassim/Projets/Sales System" && npx tsc --noEmit 2>&1 | head -30`

---

## Task 3: Fix ChatPanel — Layout + Voice Upload

**Files:**

- Modify: `src/components/messaging/chat-panel.tsx`

- [ ] **Step 1: Ajouter handleVoiceSend**

Même pattern que Off-Market :

1. Créer blob File avec bon mimetype
2. Upload vers Supabase Storage `messaging/{channelId}/{timestamp}.webm`
3. sendMessage avec contentType "audio"
4. addAttachment avec l'URL publique

- [ ] **Step 2: Ajouter drag-drop sur le panel**

Wrapper div avec onDragOver/onDragLeave/onDrop → state droppedFile → passé au ChatInput

- [ ] **Step 3: Mettre à jour les props de ChatInput**

Passer les nouvelles props : onVoiceSend, channelName, droppedFile, onClearDroppedFile

- [ ] **Step 4: S'assurer que le layout flex est correct**

Le layout doit être :

```
div.flex.flex-1.flex-col.min-h-0  ← important: min-h-0 pour que flex marche
  ChatHeader
  MessageList (flex-1 overflow-y-auto)
  TypingIndicator
  ChatInput (border-t, en bas)
```

- [ ] **Step 5: Vérifier compilation**

Run: `cd "/Users/wassim/Projets/Sales System" && npx tsc --noEmit 2>&1 | head -30`

---

## Task 4: Fix MessagingContainer — Hauteur

**Files:**

- Modify: `src/components/messaging/messaging-container.tsx`

- [ ] **Step 1: Corriger la hauteur du container**

Actuellement `h-[calc(100vh-10rem)]` → trop restrictif.
Changer en `h-[calc(100dvh-4rem)]` (4rem = hauteur du topbar/header).
Ajouter `min-h-0` sur le flex container enfant.

- [ ] **Step 2: Vérifier compilation + tester visuellement**

Run: `cd "/Users/wassim/Projets/Sales System" && npm run build 2>&1 | tail -20`

---

## Task 5: Build final + Vérification

- [ ] **Step 1: Build complet**

Run: `cd "/Users/wassim/Projets/Sales System" && npm run build`

- [ ] **Step 2: Vérifier visuellement**

Démarrer le serveur dev et vérifier :

- L'input est bien en bas de l'écran
- Le bouton micro apparaît
- L'enregistrement vocal fonctionne (waveform live)
- Le drag-drop de fichiers fonctionne
- L'envoi de messages texte fonctionne toujours
- Les vocaux s'affichent avec le player waveform existant

- [ ] **Step 3: Commit**

```bash
git add src/components/messaging/voice-recorder.tsx \
        src/components/messaging/chat-input.tsx \
        src/components/messaging/chat-panel.tsx \
        src/components/messaging/messaging-container.tsx
git commit -m "feat: messaging overhaul — voice recording, drag-drop, layout fix (ported from Off-Market)"
```
