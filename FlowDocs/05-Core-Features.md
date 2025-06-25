
# Étape 5 : Fonctionnalités Clés

Ce document détaille la logique métier et technique des fonctionnalités principales de FlowUp, en se concentrant sur l'entité centrale : le **Projet**.

## 1. Le Projet : Entité Centrale

Un "Projet" est le conteneur principal de l'application. Il regroupe les utilisateurs, les tâches, la documentation, et le code source.

### 1.1. Modèle de Données (`projects` table)

La table `projects` dans la base de données SQLite contient les colonnes suivantes :

-   `uuid`: Identifiant unique du projet.
-   `name`: Nom du projet (ex: "Refonte du site web").
-   `description`: Description détaillée (supporte le Markdown).
-   `ownerUuid`: `uuid` de l'utilisateur propriétaire.
-   `isPrivate`: Booléen (1 pour privé, 0 pour public).
-   `readmeContent`: Contenu Markdown du README du projet.
-   `isUrgent`: Booléen pour marquer un projet comme prioritaire.
-   `storageBackend`: 'github' ou 'local'. Définit où les fichiers du projet sont stockés.
-   `githubRepoUrl`, `githubRepoName`: URL et nom complet (ex: `user/repo`) du dépôt GitHub lié.
-   `discordWebhookUrl`: URL pour les notifications Discord.
-   `createdAt`, `updatedAt`: Timestamps de création et de mise à jour.

### 1.2. Relations Clés

-   **Utilisateurs (`project_members`)**: Lie les `users` à un `projects` avec un rôle (`owner`, `co-owner`, `editor`, `viewer`).
-   **Tâches (`tasks`)**: Chaque tâche est liée à un `projectUuid`.
-   **Documents (`project_documents`)**: Idem, chaque document appartient à un projet.
-   **Annonces (`project_announcements`)**: Idem pour les annonces.
-   **Tags (`project_tags`)**: Les tags sont spécifiques à un projet.

---

## 2. Logique Backend (Server Actions)

Le fichier `src/app/(app)/projects/[id]/actions.ts` centralise la plupart des logiques métier.

### 2.1. Gestion des Projets et des Membres

-   `fetchProjectAction(uuid)`: Récupère les détails d'un projet.
-   `updateProjectAction(...)`: Met à jour le nom et la description. Vérifie que l'utilisateur est `owner` ou `co-owner`.
-   `inviteUserToProjectAction(...)`: Ajoute un membre à un projet. Si le projet est lié à un dépôt GitHub privé, tente d'envoyer une invitation de collaborateur via l'API GitHub.
-   `removeUserFromProjectAction(...)`: Retire un membre. Ne peut pas retirer le propriétaire.
-   `toggleProjectVisibilityAction(...)`: Change la visibilité du projet (public/privé). Si un dépôt GitHub est lié, tente également de changer la visibilité du dépôt.

### 2.2. Gestion des Tâches (`tasks`)

-   `createTaskAction(...)`: Crée une nouvelle tâche, y associe des tags et un assigné.
-   `updateTaskAction(...)`: Met à jour une tâche. La logique de permission permet à n'importe quel membre de changer le statut, mais seuls les éditeurs/propriétaires peuvent modifier le titre ou la description.
-   `deleteTaskAction(...)`: Supprime une tâche.

### 2.3. Intégration GitHub

-   **Liaison**: `linkProjectToGithubAction` crée un nouveau dépôt sur GitHub pour l'utilisateur authentifié et le lie au projet FlowUp.
-   **Gestion des Fichiers (CodeSpace)**:
    -   `getRepoContentsAction`: Liste les fichiers/dossiers d'un chemin dans le dépôt.
    -   `getFileContentAction`: Récupère le contenu d'un fichier.
    -   `saveFileContentAction`: Sauvegarde les modifications d'un fichier en créant un commit.
    -   `createGithubFileAction`, `createGithubFolderAction`, `deleteGithubFileAction`: Gèrent le cycle de vie des fichiers dans le dépôt.
-   **Authentification**: La logique est gérée via une application GitHub OAuth, dont les détails se trouvent dans `src/lib/githubAppClient.ts` et les routes API dans `src/app/api/auth/github/`. Le token de l'utilisateur est stocké dans la table `user_github_oauth_tokens`.

---

## 3. Interface Frontend

La page principale d'un projet se trouve dans `src/app/(app)/projects/[id]/page.tsx`.

### 3.1. Structure de la Page

-   **Layout à Onglets (`Tabs`)**: L'interface est divisée en plusieurs onglets pour séparer les fonctionnalités :
    -   **Tasks**: Affiche les tâches sous forme de colonnes de statut (Kanban).
    -   **README**: Affiche le `readmeContent` du projet et permet de l'éditer.
    -   **Documents**: Liste les documents Markdown associés au projet.
    -   **Announcements**: Affiche les annonces spécifiques au projet.
    -   **CodeSpace**: Un explorateur de fichiers pour interagir avec le dépôt GitHub lié.
    -   **Team & Settings**: Gère les membres, les intégrations (Discord) et les paramètres de danger (suppression).

### 3.2. État et Actions

-   La page utilise abondamment `useState` et `useEffect` pour charger les données initiales (projet, tâches, membres, etc.).
-   Les formulaires (pour éditer, inviter, créer une tâche) utilisent `react-hook-form` pour la validation et `useActionState` pour gérer l'état de soumission des Server Actions.
-   Cela permet une interface réactive qui met à jour l'UI de manière optimiste tout en attendant la réponse du serveur, offrant une expérience utilisateur fluide.
