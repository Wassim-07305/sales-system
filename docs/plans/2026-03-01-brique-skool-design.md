# Brique Skool — Design

## Objectif

Extraire la fonctionnalite Academy (Formation) du projet Sales System en une brique autonome reutilisable, copiable dans n'importe quel projet Next.js + Supabase.

## Scope

### Inclus

- **Student** : grille formations (filtres, recherche, progression), lecteur de cours (sidebar modules collapsibles, video YouTube/Vimeo/upload, ressources, progression auto 80% + manuelle, navigation prev/next)
- **Admin** : CRUD complet (cours, modules, lecons), drag-drop reordering (@dnd-kit), upload miniatures/videos/ressources via Supabase Storage
- **SQL** : 5 tables autonomes (courses, course_modules, lessons, lesson_progress, lesson_attachments) + RLS + storage bucket
- **Upload** : composant file-upload.tsx reutilisable (drag-drop, preview, progress bar)

### Exclu

- Quiz / quiz_attempts (specifique Sales System)
- Library / bibliotheque de ressources
- Revision / flashcards
- Prerequis entre cours
- Navigation items (constants.ts)

## Structure

```
briques/skool/
├── README.md
├── migration.sql
├── types.ts
├── actions/
│   ├── academy.ts
│   └── academy-admin.ts
├── components/
│   └── file-upload.tsx
└── app/
    ├── page.tsx
    ├── course-grid.tsx
    ├── [courseId]/
    │   ├── page.tsx
    │   └── course-view.tsx
    └── admin/
        ├── page.tsx
        ├── course-list.tsx
        ├── course-form-dialog.tsx
        └── [courseId]/
            ├── page.tsx
            ├── course-editor.tsx
            ├── module-form-dialog.tsx
            └── lesson-form-dialog.tsx
```

## Prerequis projet cible

- Next.js 16 App Router + Supabase (Auth + DB + Storage) + shadcn/ui + Tailwind CSS 4
- @dnd-kit/core + @dnd-kit/sortable + @dnd-kit/utilities
- lucide-react + sonner + date-fns
- Table `profiles` avec colonnes `id` (UUID) et `role` (text)
- Composants shadcn : Button, Card, Badge, Input, Textarea, Dialog, Tabs, Select, Label, Switch, Progress, ScrollArea, Separator, Tooltip

## Installation (3 etapes)

1. Executer `migration.sql` sur Supabase
2. Copier les fichiers : `app/` → `src/app/(app)/academy/`, `actions/` → `src/lib/actions/`, `components/` → `src/components/ui/`, merger `types.ts` dans `src/lib/types/database.ts`
3. Verifier les imports Supabase (`@/lib/supabase/server` et `@/lib/supabase/client`)

## Approche

Copier-coller direct (Approche A). Pas de fichier de config, pas d'abstraction. Les fichiers sont nettoyés (sans quiz, library, revision, prerequis) et prets a copier. Adaptation par rechercher-remplacer si les chemins d'import different.

## Fichiers source (Sales System)

| Fichier source                                                | Destination brique                          | Action                                     |
| ------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------ |
| src/app/(app)/academy/page.tsx                                | app/page.tsx                                | Nettoyer (retirer quiz)                    |
| src/app/(app)/academy/course-grid.tsx                         | app/course-grid.tsx                         | Copier tel quel                            |
| src/app/(app)/academy/[courseId]/page.tsx                     | app/[courseId]/page.tsx                     | Nettoyer (retirer quiz)                    |
| src/app/(app)/academy/[courseId]/course-view.tsx              | app/[courseId]/course-view.tsx              | Nettoyer (retirer quiz, prerequis)         |
| src/app/(app)/academy/admin/page.tsx                          | app/admin/page.tsx                          | Copier tel quel                            |
| src/app/(app)/academy/admin/course-list.tsx                   | app/admin/course-list.tsx                   | Copier tel quel                            |
| src/app/(app)/academy/admin/course-form-dialog.tsx            | app/admin/course-form-dialog.tsx            | Copier tel quel                            |
| src/app/(app)/academy/admin/[courseId]/page.tsx               | app/admin/[courseId]/page.tsx               | Copier tel quel                            |
| src/app/(app)/academy/admin/[courseId]/course-editor.tsx      | app/admin/[courseId]/course-editor.tsx      | Copier tel quel                            |
| src/app/(app)/academy/admin/[courseId]/module-form-dialog.tsx | app/admin/[courseId]/module-form-dialog.tsx | Copier tel quel                            |
| src/app/(app)/academy/admin/[courseId]/lesson-form-dialog.tsx | app/admin/[courseId]/lesson-form-dialog.tsx | Copier tel quel                            |
| src/lib/actions/academy.ts                                    | actions/academy.ts                          | Nettoyer (retirer quiz, library, revision) |
| src/lib/actions/academy-admin.ts                              | actions/academy-admin.ts                    | Copier tel quel                            |
| src/components/ui/file-upload.tsx                             | components/file-upload.tsx                  | Copier tel quel                            |
| src/lib/types/database.ts                                     | types.ts                                    | Extraire types academy uniquement          |
| supabase/migration-academy-modules.sql                        | migration.sql                               | Rendre autonome (CREATE TABLE complet)     |
