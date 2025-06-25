# Étape 3 : Système d'Authentification

## 1. Objectif

Le système d'authentification de FlowUp est conçu pour être sécurisé, flexible et transparent pour l'utilisateur. Il gère l'inscription, la connexion et les intégrations avec des services tiers comme GitHub et Discord, qui sont essentiels pour les fonctionnalités de base de l'application (comme le CodeSpace et les notifications).

## 2. Technologies Clés et Logique

-   **JWT (JSON Web Tokens)** : Le cœur du système. Après une connexion réussie, le serveur génère un JWT signé qui contient l'identifiant unique de l'utilisateur (`uuid`).
-   **Cookies `HttpOnly`** : Ce token est stocké dans un cookie `HttpOnly`, ce qui signifie qu'il ne peut pas être accédé par du JavaScript côté client, le protégeant contre les attaques XSS. Ce cookie est envoyé automatiquement avec chaque requête au serveur.
-   **Middleware & Edge Functions (`/lib/authEdge.ts`)** : Une fonction `auth()` s'exécute sur le serveur (souvent à la "périphérie") pour valider le JWT de chaque requête entrante. Cela permet de sécuriser les "Server Actions" et les routes API en vérifiant l'identité de l'utilisateur avant toute opération critique.
-   **Server Actions & Services (`/lib/authService.ts`)** : Ce fichier contient la logique métier pour l'authentification :
    -   `login()` : Vérifie l'email et le mot de passe.
    -   `signup()` : Gère la création d'un nouvel utilisateur.
    -   `createSessionForUser()` : Crée et envoie le cookie JWT.
    -   `logout()` : Supprime le cookie.

## 3. Processus d'Inscription (`/signup`)

FlowUp supporte deux modes d'inscription, configurables par un administrateur dans les paramètres :

-   **Mode Public** : N'importe qui peut créer un compte en utilisant le formulaire d'inscription standard.
-   **Mode Privé (Invite-Only)** : Le formulaire d'inscription n'est accessible qu'avec un **jeton d'invitation** valide, généré par un administrateur. Ce jeton est passé dans l'URL (`/signup?token=...`) et est à usage unique.

## 4. Processus de Connexion (`/login`)

1.  L'utilisateur soumet son email et mot de passe via le formulaire.
2.  La "Server Action" `login()` dans `authService.ts` est appelée.
3.  Elle vérifie les identifiants contre la base de données (le mot de passe est "hashé" avec `bcrypt`).
4.  Si les identifiants sont valides, `createSessionForUser()` est appelée pour générer le JWT et définir le cookie.
5.  Le client est redirigé vers le tableau de bord (`/dashboard`).

## 5. Intégrations OAuth (GitHub & Discord)

FlowUp utilise OAuth2 pour deux scénarios principaux : **connexion/inscription** et **liaison de compte**.

### Flux OAuth (Simplifié)

1.  L'utilisateur clique sur "Continuer avec GitHub/Discord".
2.  Il est redirigé vers la page d'autorisation du service tiers.
3.  Après autorisation, il est redirigé vers une URL de "callback" sur FlowUp (`/api/auth/[service]/oauth/callback`).
4.  Le serveur FlowUp échange le code d'autorisation reçu contre un **jeton d'accès**.

### Logique du Callback (`/api/auth/[service]/oauth/callback/route.ts`)

La route de callback est la plus importante. Elle détermine s'il s'agit d'une liaison de compte ou d'une nouvelle connexion/inscription :

-   **Si un utilisateur est déjà connecté à FlowUp** (un cookie de session valide existe) :
    -   C'est une **liaison de compte**.
    -   Le jeton d'accès du service tiers est stocké dans la base de données, associé à l'utilisateur FlowUp actuel.
    -   L'utilisateur est redirigé vers sa page de profil avec un message de succès.

-   **Si aucun utilisateur n'est connecté** :
    -   C'est une **connexion ou une inscription**.
    -   Le serveur utilise le jeton d'accès pour récupérer l'adresse e-mail principale et vérifiée de l'utilisateur depuis l'API de GitHub/Discord.
    -   **Cas 1 : Un utilisateur FlowUp existe déjà avec cet e-mail.** Le système le connecte à ce compte existant et lie le service tiers.
    -   **Cas 2 : Aucun utilisateur FlowUp n'existe avec cet e-mail.** Un nouveau compte FlowUp est créé automatiquement, et l'utilisateur est connecté.

Cette approche garantit une expérience utilisateur fluide tout en maintenant un compte unique par adresse e-mail.
