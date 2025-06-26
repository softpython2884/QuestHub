# Étape 10 : Créer des Applications OAuth

## 1. Objectif

Le système d'applications OAuth de FlowUp permet à des développeurs tiers de créer des intégrations qui peuvent accéder aux données d'un utilisateur (projets, tâches, etc.) de manière sécurisée, après avoir obtenu son consentement explicite.

Ceci est essentiel pour construire un écosystème d'outils autour de FlowUp, comme des applications de reporting personnalisées, des bots, ou des intégrations avec d'autres services.

## 2. Processus de Création d'une Application

Tout développeur peut créer sa propre application OAuth directement depuis son profil FlowUp.

1.  **Accéder aux Paramètres Développeur** : Se rendre dans `Settings > Developer Settings`.
2.  **Créer une Nouvelle Application** : Cliquer sur "Create New Application".
3.  **Remplir les Informations Requises** :
    *   **Application Name** : Le nom qui sera affiché aux utilisateurs sur l'écran de consentement.
    *   **Description** : Une brève description de ce que fait l'application.
    *   **Homepage URL** : L'URL du site web de l'application.
    *   **Authorization callback URLs** : La partie la plus importante. C'est l'URL de votre application vers laquelle FlowUp redirigera l'utilisateur après qu'il ait donné son accord. Elle doit être sécurisée (HTTPS en production). Vous pouvez en ajouter plusieurs (par exemple, une pour le développement local).

4.  **Obtenir les Identifiants** :
    *   Après la création, FlowUp fournira un **Client ID** et un **Client Secret**.
    *   Le **Client ID** est public et identifie votre application.
    *   Le **Client Secret** est confidentiel et doit être stocké de manière sécurisée sur votre serveur. **Il ne sera affiché qu'une seule fois.**

## 3. Le Flux d'Autorisation OAuth2

FlowUp utilise le flux standard "Authorization Code Grant".

### Étape 1 : Redirection vers la Page de Consentement

Votre application doit rediriger l'utilisateur vers l'URL d'autorisation de FlowUp :

`GET /oauth/authorize`

Avec les paramètres suivants :
-   `response_type=code` : Indique que nous voulons un code d'autorisation.
-   `client_id=[votre_client_id]` : L'identifiant de votre application.
-   `redirect_uri=[votre_callback_url]` : L'une des URLs de callback que vous avez enregistrées.
-   `state=[valeur_aleatoire]` : Une chaîne de caractères aléatoire que vous générez pour prévenir les attaques CSRF. Vous devrez la vérifier plus tard.
-   `scope=[scopes_demandes]` : (Facultatif) Les permissions que votre application demande (ex: `projects:read tasks:write`).

### Étape 2 : Consentement de l'Utilisateur

L'utilisateur voit une page sur FlowUp lui demandant s'il autorise votre application à accéder à ses données. S'il accepte, FlowUp le redirige vers votre `redirect_uri`.

### Étape 3 : Réception du Code d'Autorisation

FlowUp redirige l'utilisateur vers votre serveur à l'adresse suivante :

`[votre_callback_url]?code=[code_d_autorisation]&state=[valeur_aleatoire_retournée]`

Votre serveur doit alors :
1.  Vérifier que le paramètre `state` reçu correspond à celui que vous aviez envoyé à l'étape 1.
2.  Préparer la prochaine requête pour échanger le `code` contre un jeton d'accès.

### Étape 4 : Échange du Code contre un Jeton d'Accès (Access Token)

Depuis votre **backend** (jamais depuis le frontend), faites une requête `POST` vers le point de terminaison de jeton de FlowUp :

`POST /api/oauth/token`

Avec les paramètres suivants dans le corps de la requête (`application/x-www-form-urlencoded`) :
-   `grant_type=authorization_code`
-   `code=[code_reçu_a_l_etape_3]`
-   `redirect_uri=[votre_callback_url]`
-   `client_id=[votre_client_id]`
-   `client_secret=[votre_client_secret]`

Si tout est correct, FlowUp répondra avec un JSON contenant l'access token :

```json
{
  "access_token": "fup_at_...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "fup_rt_...",
  "scope": "projects:read"
}
```

**Stockez cet `access_token` de manière sécurisée**, associé à l'utilisateur de votre application.

## 4. Utiliser l'Access Token pour appeler l'API

Une fois que vous avez l'access token, vous pouvez faire des requêtes à l'API de FlowUp au nom de l'utilisateur.

Incluez le jeton dans l'en-tête `Authorization` de vos requêtes :

```
Authorization: Bearer [votre_access_token]
```

Exemple de requête pour obtenir les projets de l'utilisateur :

`GET https://[flowup_url]/api/v1/projects`

Cette approche garantit que les applications tierces ne voient jamais les identifiants de l'utilisateur et ne peuvent accéder qu'aux données pour lesquelles elles ont reçu une autorisation explicite.