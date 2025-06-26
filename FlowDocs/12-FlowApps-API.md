# Étape 12 : Utiliser l'API FlowApps

## 1. Objectif

L'API **FlowApps** est conçue pour permettre des intégrations, des scripts et des automations personnalisés. Contrairement aux applications OAuth qui agissent au nom d'autres utilisateurs, les FlowApps utilisent des **jetons d'accès personnels** (Personal Access Tokens) générés par un développeur pour son propre usage ou pour des services backend.

Chaque token est lié au compte du développeur qui l'a créé.

## 2. Création d'une FlowApp

1.  Rendez-vous dans vos `Settings > Developer Settings`.
2.  Cliquez sur "Create New FlowApp".
3.  Donnez un nom et une description à votre application.
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

1.  Lors du premier appel API pour un `userUuid` donné, l'API répondra avec un statut `403 Forbidden` et le message suivant :
    ```json
    {
      "status": "consent_pending",
      "message": "User must grant permission for the app 'AppName' to perform this action. The user can do this from their settings page."
    }
    ```
2.  L'utilisateur doit alors se rendre dans ses `Settings` sur FlowUp, où une nouvelle demande d'autorisation apparaîtra dans la section "FlowApp Permissions".
3.  L'utilisateur peut **Autoriser** ou **Refuser** l'accès.
4.  Une fois autorisé, les appels API suivants pour cet utilisateur réussiront. S'il refuse, l'API retournera une erreur `403 Forbidden` avec le message "Access denied by user.".

## 6. Actions Disponibles (v1)

### Action: `getUserDetails`

Récupère les informations publiques d'un utilisateur.

-   **Action**: `"getUserDetails"`
-   **Payload**:
    -   `userUuid` (string, requis): L'UUID de l'utilisateur à récupérer.

**Exemple de Requête :**
```json
{
  "action": "getUserDetails",
  "payload": {
    "userUuid": "uuid-de-l-utilisateur"
  }
}
```

**Exemple de Réponse :**
```json
{
  "uuid": "...",
  "name": "Alex Durand",
  "avatar": "https://...",
  "email": "alex@example.com",
  "bio": "Senior Software Engineer",
  "websiteUrl": "https://alex-durand.dev"
}
```

### Action: `listUserProjects`

Liste tous les projets dont un utilisateur est membre.

-   **Action**: `"listUserProjects"`
-   **Payload**:
    -   `userUuid` (string, requis): L'UUID de l'utilisateur.

**Exemple de Requête :**
```json
{
  "action": "listUserProjects",
  "payload": {
    "userUuid": "uuid-de-l-utilisateur"
  }
}
```

**Exemple de Réponse :**
```json
[
  {
    "uuid": "...",
    "name": "QuantumLeap AI",
    "description": "...",
    "ownerUuid": "...",
    "isPrivate": true,
    // ... autres champs du projet
  }
]
```

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
