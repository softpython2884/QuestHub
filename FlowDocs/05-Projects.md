# Étape 5 : Feature Focus - Les Projets

Ce document est une plongée technique complète dans l'entité centrale de FlowUp : le **Projet**. C'est le conteneur principal qui regroupe les utilisateurs, les tâches, la documentation et le code.

## 1. Modèle de Données (`projects` table)

La table `projects` dans la base de données SQLite est le cœur de cette fonctionnalité.

### 1.1. Colonnes et Descriptions

-   `uuid` (TEXT, PK): Identifiant unique universel du projet.
-   `name` (TEXT): Nom du projet (ex: "Refonte du site web").
-   `description` (TEXT): Description détaillée, supporte le format Markdown.
-   `ownerUuid` (TEXT, FK -> users.uuid): UUID de l'utilisateur propriétaire.
-   `isPrivate` (BOOLEAN): `1` pour privé (accessible uniquement aux membres), `0` pour public (visible dans la section "Découvrir").
-   `readmeContent` (TEXT): Contenu Markdown du fichier README du projet.
-   `isUrgent` (BOOLEAN): `1` si le projet est marqué comme urgent, `0` sinon.
-   `storageBackend` (TEXT): Définit où les fichiers du projet sont stockés. Actuellement `'github'` ou `'local'`.
-   `githubRepoUrl` (TEXT): URL complète du dépôt GitHub lié (ex: `https://github.com/user/repo`).
-   `githubRepoName` (TEXT): Nom complet du dépôt (ex: `user/repo`).
-   `discordWebhookUrl` (TEXT): URL du webhook Discord pour les notifications.
-   `createdAt`, `updatedAt` (TEXT): Timestamps de création et de dernière mise à jour.

### 1.2. Relations avec les Autres Tables

Le `projectUuid` est une clé étrangère essentielle dans de nombreuses autres tables :

-   **`project_members`**: Table de liaison qui associe les `users` aux `projects` et définit leur rôle (`owner`, `co-owner`, `editor`, `viewer`).
-   **`tasks`**: Chaque tâche appartient à un seul projet via `projectUuid`.
-   **`project_documents`**: Chaque document est lié à un projet.
-   **`project_announcements`**: Chaque annonce est spécifique à un projet.
-   **`project_tags`**: Les tags (étiquettes) sont créés au sein d'un projet.

## 2. Logique Backend (Server Actions)

Le fichier `src/app/(app)/projects/[id]/actions.ts` centralise la majorité de la logique métier liée aux projets. Ces actions sont exécutées côté serveur pour des raisons de sécurité et de performance.

### 2.1. Gestion du Projet et des Permissions

-   **`fetchProjectAction(uuid)`**: Récupère les détails complets d'un projet.
-   **`updateProjectAction(...)`**: Met à jour le nom et la description. Vérifie si l'utilisateur connecté est `owner` ou `co-owner` avant d'autoriser la modification.
-   **`toggleProjectVisibilityAction(...)`**: Change la visibilité (public/privé). Si un dépôt GitHub est lié, cette action tente également de changer la visibilité du dépôt via l'API GitHub. Seul le `owner` peut effectuer cette action.
-   **`toggleProjectUrgencyAction(...)`**: Marque ou démarque un projet comme urgent.

### 2.2. Gestion des Membres

-   **`inviteUserToProjectAction(...)`**: Ajoute un utilisateur existant à un projet avec un rôle spécifique. Si le projet est privé et lié à GitHub, une tentative est faite pour inviter l'utilisateur comme collaborateur sur le dépôt.
-   **`removeUserFromProjectAction(...)`**: Retire un membre du projet. Le propriétaire ne peut pas être retiré.

### 2.3. Logique Spécifique aux Fonctionnalités du Projet

Le fichier `actions.ts` contient également les actions pour les sous-fonctionnalités :

-   **Tâches** : `createTaskAction`, `updateTaskAction`, `deleteTaskAction`. La logique de permission est fine : un `viewer` ne peut rien modifier, un `editor` peut tout faire sauf supprimer/créer, etc.
-   **Documents** : `createDocumentAction`, `updateDocumentAction`, `deleteDocumentAction`.
-   **Annonces** : `createProjectAnnouncementAction`, `deleteProjectAnnouncementAction`.
-   **README** : `saveProjectReadmeAction` sauvegarde le contenu dans la base de données et le pousse vers le dépôt GitHub si lié.

## 3. Intégration avec GitHub

L'intégration GitHub est une fonctionnalité clé du "CodeSpace".

-   **Liaison**: L'action `linkProjectToGithubAction` permet de créer un nouveau dépôt sur GitHub pour l'utilisateur authentifié et de le lier au projet FlowUp en stockant `githubRepoUrl` et `githubRepoName`.
-   **Gestion des Fichiers (CodeSpace)**: Une suite d'actions permet d'interagir avec le dépôt :
    -   `getRepoContentsAction`: Lister les fichiers/dossiers.
    -   `getFileContentAction`: Lire le contenu d'un fichier.
    -   `saveFileContentAction`: Sauvegarder les modifications d'un fichier (crée un commit).
    -   `createGithubFileAction`, `createGithubFolderAction`, `deleteGithubFileAction`: Gèrent le cycle de vie des fichiers.
-   **Authentification**: La logique est gérée via une application GitHub OAuth. Le token de l'utilisateur est stocké dans la table `user_github_oauth_tokens` et utilisé par Octokit pour toutes les interactions API.

## 4. Interface Frontend

La page principale d'un projet (`src/app/(app)/projects/[id]/page.tsx`) est le centre névralgique de l'expérience utilisateur.

### 4.1. Structure de la Page

-   **Layout à Onglets (`Tabs`)**: L'interface utilise le composant `Tabs` de ShadCN pour organiser les différentes facettes d'un projet :
    -   **Tasks**: Un tableau Kanban affichant les tâches par statut.
    -   **README**: Affiche le `readmeContent` et permet son édition en direct.
    -   **Documents**: Liste les documents Markdown du projet.
    -   **Announcements**: Affiche les annonces.
    -   **CodeSpace**: L'explorateur de fichiers pour interagir avec le dépôt GitHub.
    -   **Team & Settings**: Gère les membres, les intégrations (Discord) et les paramètres de danger (suppression du projet).

### 4.2. Gestion de l'État et des Données

-   **Chargement Initial**: `useEffect` est utilisé pour appeler les `Server Actions` (`fetchProjectAction`, `fetchTasksAction`, etc.) au chargement de la page pour récupérer toutes les données nécessaires.
-   **Actions et Formulaires**: Les formulaires (pour inviter un membre, créer une tâche, etc.) utilisent `react-hook-form` pour la validation et le hook `useActionState` pour gérer l'état de soumission des `Server Actions`. Cela permet de créer des interfaces réactives qui affichent des messages de succès/erreur sans recharger la page.
-   **Permissions Frontend**: Le rôle de l'utilisateur (`currentUserRole`) est stocké dans un état et utilisé pour afficher ou masquer conditionnellement les boutons et fonctionnalités (ex: le bouton "Edit" n'est visible que pour les `owner`/`co-owner`).
