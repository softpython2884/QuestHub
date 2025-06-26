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

1.  Lors du premier appel API pour un `userUuid` donné, l'API répondra avec un statut `403 Forbidden` et un message demandant le consentement.
2.  L'utilisateur doit alors se rendre dans ses `Settings > My User ID & API Access`, où une nouvelle demande d'autorisation apparaîtra.
3.  L'utilisateur peut **Autoriser** ou **Refuser** l'accès.
4.  Une fois autorisé, les appels API suivants pour cet utilisateur réussiront.

## 6. Actions Disponibles (v1)

### Catégorie : Profil (`profile:read`)

#### Action: `getUserDetails`
Récupère les informations publiques d'un utilisateur.
-   **Action**: `"getUserDetails"`
-   **Payload**:
    -   `userUuid` (string, requis): L'UUID de l'utilisateur à récupérer.
-   **Exemple de Réponse**:
    ```json
    { "uuid": "...", "name": "Alex Durand", "avatar": "...", "email": "alex@example.com", "bio": "...", "websiteUrl": "..." }
    ```

### Catégorie : Projets (`projects:read`, `projects:write`)

#### Action: `listUserProjects`
Liste tous les projets dont un utilisateur est membre.
-   **Scope**: `projects:read`
-   **Payload**:
    -   `userUuid` (string, requis): L'UUID de l'utilisateur.

#### Action: `getProjectDetails`
Récupère les détails d'un projet spécifique.
-   **Scope**: `projects:read`
-   **Payload**:
    -   `userUuid` (string, requis): UUID de l'utilisateur effectuant la demande.
    -   `projectUuid` (string, requis): UUID du projet.

#### Action: `createProject`
Crée un nouveau projet pour l'utilisateur.
-   **Scope**: `projects:write`
-   **Payload**:
    -   `userUuid` (string, requis): UUID du futur propriétaire.
    -   `name` (string, requis): Nom du projet.
    -   `description` (string, optionnel): Description du projet.

#### Action: `updateProject`
Met à jour les détails d'un projet.
-   **Scope**: `projects:write`
-   **Payload**:
    -   `userUuid` (string, requis): UUID de l'utilisateur (doit être owner/co-owner).
    -   `projectUuid` (string, requis): UUID du projet.
    -   `name` (string, optionnel): Nouveau nom.
    -   `description` (string, optionnel): Nouvelle description.
    -   `isPrivate` (boolean, optionnel): `true` pour privé, `false` pour public.

### Catégorie : Tâches (`tasks:read`, `tasks:write`)

#### Action: `listTasks`
Liste les tâches d'un projet.
-   **Scope**: `tasks:read`
-   **Payload**:
    -   `userUuid` (string, requis)
    -   `projectUuid` (string, requis)

#### Action: `createTask`
Crée une nouvelle tâche dans un projet.
-   **Scope**: `tasks:write`
-   **Payload**:
    -   `userUuid` (string, requis)
    -   `projectUuid` (string, requis)
    -   `title` (string, requis)
    -   `description` (string, optionnel)
    -   `status` (string, optionnel): "To Do", "In Progress", etc.

### Catégorie : Membres (`members:read`, `members:write`)

#### Action: `listMembers`
Liste les membres d'un projet.
-   **Scope**: `members:read`
-   **Payload**:
    -   `userUuid` (string, requis)
    -   `projectUuid` (string, requis)

#### Action: `addMember`
Ajoute un membre à un projet.
-   **Scope**: `members:write`
-   **Payload**:
    -   `userUuid` (string, requis)
    -   `projectUuid` (string, requis)
    -   `emailToInvite` (string, requis): Email du membre à ajouter.
    -   `role` (string, requis): "editor" ou "viewer".

### Et bien plus...
Cette documentation couvre les actions principales. L'API inclut également des actions pour gérer les documents de projet, les annonces, le CodeSpace et les annonces globales. Assurez-vous de demander les scopes appropriés (`documents:read/write`, `announcements:read/write`, `codespace:read/write`, `announcements:global:read`) pour utiliser ces fonctionnalités.

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
