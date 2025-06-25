# Étape 5 : Fonctionnalité Clé - Le Projet

## 1. Objectif de la page Projet

La page **Projet** est le cœur de l'application FlowUp. Elle centralise toutes les ressources, les discussions et les actions liées à un objectif spécifique. L'objectif est de fournir un espace de travail unique et intégré où une équipe peut :
-   Organiser et suivre les tâches.
-   Accéder et modifier le code source.
-   Rédiger et consulter la documentation.
-   Communiquer via des annonces.
-   Gérer les membres de l'équipe et leurs permissions.

## 2. Modèle de Données (`projects` table)

L'entité `Project` est stockée dans la table `projects` et contient les informations principales.

-   `uuid`: Identifiant unique du projet.
-   `name`, `description`: Nom et description (supporte le Markdown).
-   `ownerUuid`: `uuid` de l'utilisateur propriétaire.
-   `isPrivate`: Booléen (`1` pour privé, `0` pour public). Les projets publics sont visibles dans la section "Découvrir".
-   `readmeContent`: Contenu Markdown du README, affiché dans l'onglet principal.
-   `storageBackend`: Définit où le code est stocké (`github` ou `local`).
-   `githubRepoUrl`, `githubRepoName`: URL et nom du dépôt GitHub lié.
-   `discordWebhookUrl`: URL pour les notifications.

**Relations clés :** Un `projectUuid` lie le projet aux `tasks`, `project_members`, `project_documents`, et `project_announcements`.

## 3. Fonctionnalités Détaillées (par onglet)

L'interface de la page projet est organisée en onglets pour une navigation claire.

### Onglet "Tasks" (Tâches)
-   **Objectif**: Gérer le flux de travail du projet.
-   **Fonctionnalités**:
    -   **Tableau Kanban**: Visualisation des tâches par statut (`To Do`, `In Progress`, `Done`).
    -   **Création de tâches**: Les membres autorisés (`owner`, `co-owner`, `editor`) peuvent créer des tâches en spécifiant un titre, une description, un statut, un assigné et des tags.
    -   **Mise à jour**: Les membres peuvent changer le statut d'une tâche. Les éditeurs et propriétaires peuvent modifier tous les détails.
    -   **Suppression**: Seuls les éditeurs et propriétaires peuvent supprimer des tâches.
    -   **Assignation**: Attribuer une tâche à un membre du projet.

### Onglet "README"
-   **Objectif**: Fournir une page d'accueil et un aperçu complet du projet.
-   **Fonctionnalités**:
    -   **Visualisation**: Affiche le contenu du `readmeContent` en Markdown.
    -   **Édition en direct**: Les membres autorisés peuvent modifier le README directement depuis l'interface.
    -   **Synchronisation GitHub**: Si le projet est lié à GitHub, la sauvegarde du README met également à jour le fichier `README.md` dans le dépôt.

### Onglet "Documents"
-   **Objectif**: Centraliser la documentation spécifique au projet (notes de réunion, spécifications techniques, etc.).
-   **Fonctionnalités**:
    -   Créer, lire, mettre à jour et supprimer des documents au format Markdown.
    -   Accessible uniquement aux membres du projet.

### Onglet "Announcements" (Annonces)
-   **Objectif**: Communiquer des informations importantes à toute l'équipe du projet.
-   **Fonctionnalités**:
    -   Les `owner` et `co-owner` peuvent publier des annonces.
    -   Les annonces sont affichées par ordre chronologique.
    -   Possibilité de supprimer ses propres annonces (ou toutes les annonces pour les propriétaires).

### Onglet "CodeSpace"
-   **Objectif**: Interagir avec le code source du projet sans quitter FlowUp.
-   **Fonctionnalités**:
    -   **Liaison à GitHub**: Un propriétaire peut lier le projet à un nouveau dépôt GitHub, qui sera créé automatiquement.
    -   **Explorateur de fichiers**: Naviguer dans l'arborescence du dépôt GitHub.
    -   **Visualisation de fichiers**: Ouvrir et lire le contenu des fichiers (texte, code, Markdown, images).
    -   **Édition de fichiers**: Modifier le contenu des fichiers texte et le sauvegarder (ce qui crée un commit sur GitHub).
    -   **Opérations sur les fichiers**: Créer, supprimer des fichiers et des dossiers.
    -   **Génération par IA**: Utiliser l'IA pour générer une arborescence de fichiers ("scaffold") ou pour modifier un fichier existant à partir d'un prompt.

### Onglet "Team & Settings" (Équipe & Paramètres)
-   **Objectif**: Gérer les accès, les intégrations et les options du projet.
-   **Fonctionnalités**:
    -   **Gestion des membres**: Inviter de nouveaux utilisateurs par e-mail, changer leur rôle (`co-owner`, `editor`, `viewer`), et les retirer du projet.
    -   **Permissions**: Les rôles déterminent les actions possibles (ex: un `viewer` peut voir mais pas modifier).
    -   **Intégrations**: Configurer le webhook Discord pour recevoir des notifications sur les événements du projet (nouvelle tâche, nouveau membre, etc.).
    -   **Zone de danger**:
        -   Changer la visibilité du projet (public/privé).
        -   Supprimer définitivement le projet (action réservée au propriétaire).

## 4. Logique Backend (Server Actions)

Le fichier `src/app/(app)/projects/[id]/actions.ts` est le cerveau de la fonctionnalité. Il contient des fonctions sécurisées, exécutées côté serveur, pour toutes les opérations critiques :

-   `fetchProjectAction`: Récupère les données d'un projet.
-   `updateProjectAction`: Met à jour les informations de base.
-   `inviteUserToProjectAction`: Gère l'ajout de membres et les invitations GitHub.
-   `createTaskAction`, `updateTaskAction`, `deleteTaskAction`: Gèrent le cycle de vie des tâches avec vérification des permissions.
-   `saveProjectReadmeAction`: Sauvegarde le README et le pousse sur GitHub.
-   `getRepoContentsAction`, `saveFileContentAction`: Gèrent les interactions avec l'API GitHub pour le CodeSpace.

Cette approche garantit que les règles de gestion (ex: "seul un owner peut supprimer le projet") sont toujours respectées, car la logique est sur le serveur et non sur le client.