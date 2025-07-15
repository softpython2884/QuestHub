# Étape 12 : Utiliser l'API FlowApps

## 1. Objectif

L'API **FlowApps** est conçue pour permettre des intégrations, des scripts et des automations personnalisés en utilisant des **jetons d'accès personnels** (Personal Access Tokens). Chaque jeton est lié au compte du développeur qui l'a créé et possède des permissions spécifiques (scopes) qui définissent ce qu'il peut faire.

## 2. Création d'une FlowApp

1.  Rendez-vous dans vos `Settings > Developer Settings`.
2.  Cliquez sur "Create New FlowApp".
3.  Donnez un nom, une description, et **sélectionnez les permissions (scopes)** requises pour votre application.
4.  Après la création, un **token** vous sera fourni (ex: `fpat_...`). **C'est la seule et unique fois que ce token sera affiché. Copiez-le et conservez-le en lieu sûr.**

## 3. Authentification

Toutes les requêtes à l'API FlowApps doivent être authentifiées en utilisant le token comme un "Bearer Token" dans l'en-tête `Authorization`.

```
Authorization: Bearer <VOTRE_TOKEN_FPAT>
```

## 4. Point d'Entrée de l'API (Endpoint)

L'API FlowApps utilise un point d'entrée unique pour toutes les actions.

-   **Méthode**: `POST`
-   **URL**: `https://flowup.nationquest.fr/api/v1/flow`

Le corps de la requête doit être un objet JSON contenant deux propriétés :
-   `action` (string): Le nom de l'action à exécuter.
-   `payload` (object): Un objet contenant les paramètres nécessaires pour cette action.

## 5. Le Flux de Consentement Utilisateur

Pour des raisons de sécurité, lorsqu'une FlowApp tente d'accéder aux données d'un utilisateur pour la première fois, un **consentement explicite** est requis.

1.  Lors du premier appel API pour un `userUuid` donné, l'API répondra avec un statut `403 Forbidden` et un objet JSON contenant une URL d'autorisation.
    ```json
    {
      "status": "consent_pending",
      "message": "User must grant permission...",
      "authorizationUrl": "https://flowup.nationquest.fr/flowapps/authorize/..."
    }
    ```
2.  Votre application externe doit rediriger l'utilisateur vers cette `authorizationUrl`.
3.  L'utilisateur se connecte à FlowUp (si nécessaire) et voit un écran lui demandant d'**Autoriser** ou de **Refuser** l'accès.
4.  Une fois autorisé, les appels API suivants pour cet utilisateur réussiront.

## 6. Actions Disponibles (v1)

### Catégorie : Profil (`profile:read`)

#### Action: `getUserDetails`
Récupère les informations publiques d'un utilisateur.
-   **Payload**: ` { "userUuid": "..." } `

### Catégorie : Projets (`projects:read`, `projects:write`)

#### Action: `listUserProjects`
Liste tous les projets d'un utilisateur.
-   **Scope**: `projects:read`
-   **Payload**: ` { "userUuid": "..." } `

#### Action: `getProjectDetails`
Récupère les détails d'un projet.
-   **Scope**: `projects:read`
-   **Payload**: ` { "userUuid": "...", "projectUuid": "..." } `

#### Action: `createProject`
Crée un nouveau projet.
-   **Scope**: `projects:write`
-   **Payload**: ` { "userUuid": "...", "name": "...", "description": "..." } `

#### Action: `updateProject`
Met à jour les détails d'un projet.
-   **Scope**: `projects:write`
-   **Payload**: ` { "userUuid": "...", "projectUuid": "...", "name": "...", "description": "...", "isPrivate": true/false } `

### Catégorie : Tâches (`tasks:read`, `tasks:write`)

#### Action: `listTasks`
Liste les tâches d'un projet.
-   **Scope**: `tasks:read`
-   **Payload**: ` { "userUuid": "...", "projectUuid": "..." } `

#### Action: `createTask`
Crée une nouvelle tâche.
-   **Scope**: `tasks:write`
-   **Payload**: ` { "userUuid": "...", "projectUuid": "...", "title": "...", "description": "...", "status": "To Do", "assigneeUuid": "..." } `

#### Action: `updateTask`
Met à jour une tâche.
-   **Scope**: `tasks:write`
-   **Payload**: ` { "userUuid": "...", "projectUuid": "...", "taskUuid": "...", "title": "...", ... } `

#### Action: `deleteTask`
Supprime une tâche.
-   **Scope**: `tasks:write`
-   **Payload**: ` { "userUuid": "...", "projectUuid": "...", "taskUuid": "..." } `

### Catégorie : Membres (`members:read`, `members:write`)

#### Action: `listMembers`
Liste les membres d'un projet.
-   **Scope**: `members:read`
-   **Payload**: ` { "userUuid": "...", "projectUuid": "..." } `

#### Action: `addMember`
Ajoute un membre à un projet.
-   **Scope**: `members:write`
-   **Payload**: ` { "userUuid": "...", "projectUuid": "...", "emailToInvite": "...", "role": "editor" } `

#### Action: `removeMember`
Retire un membre d'un projet.
-   **Scope**: `members:write`
-   **Payload**: ` { "userUuid": "...", "projectUuid": "...", "memberUuid": "..." } `

### Catégorie : CodeSpace (`codespace:read`, `codespace:write`)

#### Action: `listRepoContents`
Liste le contenu d'un dossier.
-   **Scope**: `codespace:read`
-   **Payload**: ` { "userUuid": "...", "projectUuid": "...", "path": "src/components" } `

#### Action: `getRepoFileContent`
Lit le contenu d'un fichier.
-   **Scope**: `codespace:read`
-   **Payload**: ` { "userUuid": "...", "projectUuid": "...", "path": "src/index.js" } `

#### Action: `createRepoFile`
Crée un nouveau fichier.
-   **Scope**: `codespace:write`
-   **Payload**: ` { "userUuid": "...", "projectUuid": "...", "path": "new.txt", "content": "Hello", "commitMessage": "..." } `

#### Action: `updateRepoFile`
Met à jour un fichier existant.
-   **Scope**: `codespace:write`
-   **Payload**: ` { "userUuid": "...", "projectUuid": "...", "path": "new.txt", "content": "Hello World", "sha": "...", "commitMessage": "..." } `

#### Action: `deleteRepoFile`
Supprime un fichier.
-   **Scope**: `codespace:write`
-   **Payload**: ` { "userUuid": "...", "projectUuid": "...", "path": "old.txt", "sha": "...", "commitMessage": "..." } `

### Et bien plus...
L'API inclut également des actions pour les documents de projet (`listDocuments`, `createDocument`, etc.), les annonces (`listAnnouncements`, `createAnnouncement`, etc.) et les annonces globales. Assurez-vous de demander les scopes appropriés (`documents:read/write`, `announcements:read/write`, `announcements:global:read`) pour utiliser ces fonctionnalités.

## 7. Exemple complet avec `cURL`

```bash
curl -X POST 'https://flowup.nationquest.fr/api/v1/flow' \
-H 'Authorization: Bearer fpat_votre_token_secret' \
-H 'Content-Type: application/json' \
-d '{
  "action": "listUserProjects",
  "payload": {
    "userUuid": "842f5fb0-3749-4f4c-8cba-7cea89f84b04"
  }
}'
```
