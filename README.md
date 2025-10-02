# FlowUp - Plateforme de Développement Tout-en-Un

FlowUp est une plateforme complète conçue pour les équipes de développement modernes. Elle intègre la gestion de projet, la collaboration sur le code, la documentation, et une assistance par IA pour optimiser le flux de travail, de l'idée à la production.

## 1. Prérequis

-   [Node.js](https://nodejs.org/) (version 20 ou supérieure recommandée)
-   [npm](https://www.npmjs.com/) (généralement inclus avec Node.js)

## 2. Installation

1.  Clonez le dépôt sur votre machine locale.
2.  Installez les dépendances du projet :
    ```bash
    npm install
    ```

## 3. Configuration des Services Externes

FlowUp s'intègre avec plusieurs services externes. Vous devrez obtenir des clés d'API et des identifiants pour chacun d'eux et les ajouter à votre fichier d'environnement.

### 3.1. Fichier d'Environnement (`.env`)

1.  Créez un fichier nommé `.env` à la racine du projet.
2.  Copiez le contenu du fichier `.env.example` dans votre nouveau fichier `.env`.
3.  Remplissez les valeurs pour chaque variable.

### 3.2. Google AI (pour Genkit)

1.  Allez sur [Google AI Studio](https://aistudio.google.com/).
2.  Créez une nouvelle clé d'API.
3.  Ajoutez cette clé à votre fichier `.env` :
    ```
    GEMINI_API_KEY=VOTRE_CLE_API_GOOGLE_AI
    ```

### 3.3. GitHub (App & OAuth)

Vous avez besoin de deux configurations GitHub : une **GitHub App** pour l'intégration avec les dépôts (CodeSpace) et une **OAuth App** pour l'authentification des utilisateurs.

#### a) GitHub App (pour l'accès aux dépôts)

1.  Allez dans `Settings > Developer settings > GitHub Apps` sur GitHub.
2.  Créez une nouvelle application avec les permissions suivantes :
    -   **Repository permissions:** `Contents` (Read & Write), `Metadata` (Read-only).
3.  Générez une clé privée (`.pem`) pour votre application.
4.  Notez l'**App ID**.
5.  Ajoutez les informations à votre fichier `.env` :
    ```
    GITHUB_APP_ID=VOTRE_APP_ID
    GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
    ```
    *Important : Pour `GITHUB_PRIVATE_KEY`, copiez le contenu complet du fichier `.pem` et remplacez les sauts de ligne par `\n`.*

#### b) GitHub OAuth App (pour l'authentification)

1.  Allez dans `Settings > Developer settings > OAuth Apps` sur GitHub.
2.  Créez une nouvelle application OAuth.
3.  Définissez l'**Authorization callback URL** sur : `http://localhost:9002/api/auth/github/oauth/callback`
4.  Notez le **Client ID** et générez un **Client Secret**.
5.  Ajoutez-les à votre fichier `.env` :
    ```
    GITHUB_CLIENT_ID=VOTRE_CLIENT_ID
    GITHUB_CLIENT_SECRET=VOTRE_CLIENT_SECRET
    ```

### 3.4. Discord (OAuth & Bot)

#### a) Discord OAuth App (pour l'authentification et les infos utilisateur)

1.  Allez sur le [Portail Développeur de Discord](https://discord.com/developers/applications).
2.  Créez une nouvelle application.
3.  Dans la section `OAuth2 > General`, ajoutez une **Redirect URI** : `http://localhost:9002/api/auth/discord/oauth/callback`
4.  Notez le **Client ID** et le **Client Secret**.
5.  Ajoutez-les à votre fichier `.env` :
    ```
    DISCORD_CLIENT_ID=VOTRE_CLIENT_ID
    DISCORD_CLIENT_SECRET=VOTRE_CLIENT_SECRET
    ```

#### b) Discord Bot (pour les notifications)

1.  Dans les paramètres de votre application Discord, allez dans l'onglet `Bot`.
2.  Cliquez sur "Add Bot".
3.  Réinitialisez et copiez le **token** du bot.
4.  Ajoutez-le à votre fichier `.env` :
    ```
    DISCORD_BOT_TOKEN=VOTRE_TOKEN_DE_BOT
    ```

### 3.5. Sécurité de la Session (JWT)

Générez une chaîne de caractères longue et aléatoire pour sécuriser les sessions utilisateur.

```
JWT_SECRET=VOTRE_SECRET_JWT_TRES_LONG_ET_ALEATOIRE
```

### 3.6. API Interne

Si vous prévoyez d'utiliser l'API interne pour une autre application (comme FlowUp Team), générez une clé secrète.

```
INTERNAL_API_SECRET_KEY=VOTRE_CLE_SECRETE_POUR_L_API_INTERNE
```

## 4. Lancer l'Application

FlowUp nécessite deux processus distincts pour fonctionner : le serveur web Next.js et le serveur Genkit pour l'IA.

1.  **Lancer le serveur web :**
    ```bash
    npm run dev
    ```
    L'application sera accessible à l'adresse [http://localhost:9002](http://localhost:9002).

2.  **Lancer le serveur IA (Genkit) :** (dans un terminal séparé)
    ```bash
    npm run genkit:watch
    ```
    Cela démarre le serveur Genkit et le recharge automatiquement lorsque vous modifiez un flow d'IA.

## 5. Structure du Projet

-   `/src/app/(app)` : Pages et layouts de l'application principale (accessible après connexion).
-   `/src/app/(auth)` : Pages d'authentification (login, signup).
-   `/src/app/api` : Routes d'API pour l'OAuth et les webhooks.
-   `/src/components` : Composants React réutilisables.
-   `/src/lib` : Logique principale (base de données, authentification, services externes).
-   `/src/ai/flows` : Fichiers contenant les flows Genkit pour les fonctionnalités d'IA.
-   `/db` : Contient la base de données SQLite.
