# Documentation du Projet FlowUp

Bienvenue dans la documentation technique et fonctionnelle de FlowUp. Ce guide est conçu pour permettre une compréhension complète du projet, de son architecture à ses fonctionnalités, afin qu'un développeur puisse prendre en main le code base rapidement.

## Plan de la Documentation

Nous allons construire cette documentation en suivant les étapes ci-dessous. Chaque étape correspond à un fichier Markdown dédié.

- **Étape 1 : Introduction & Architecture Générale (`01-Introduction.md`)**
  - Objectif du projet.
  - Présentation de la stack technique (Next.js, React, Tailwind, Genkit, SQLite).
  - Architecture globale et structure des dossiers.

- **Étape 2 : Schéma de la Base de Données (`02-Database-Schema.md`)**
  - Description détaillée de chaque table (`users`, `projects`, `tasks`, etc.).
  - Explication des relations entre les tables.

- **Étape 3 : Système d'Authentification (`03-Authentication.md`)**
  - Fonctionnement de l'authentification (JWT, cookies).
  - Processus de connexion, inscription et intégrations OAuth.

- **Étape 4 : Composants & UI (`04-UI-Components.md`)**
  - Utilisation de ShadCN UI et Tailwind CSS.
  - Structure des composants et principes de styling.

- **Étape 5 : Feature Focus - Projets (`05-Projects.md`)**
  - Documentation complète de la fonctionnalité "Projets".

- **Étape 6 : Intégration de l'IA avec Genkit (`06-AI-Integration.md`)**
  - Présentation de Genkit.
  - Structure des `flows` et comment interagir avec l'IA.

- **Étape 7 : Découverte & Équipe (`07-Discover-and-Team.md`)**
  - Fonctionnalités sociales de l'application.

- **Étape 8 : Feature Focus - Chat (`08-Chat.md`)**
  - Fonctionnement de la messagerie instantanée.

- **Étape 9 : Fonctionnalités Communautaires (`09-Community-Features.md`)**
  - Fonctionnement des Annonces, Documents, Suggestions et du Coffre-Fort.

- **Étape 10 : Applications OAuth (`10-OAuth-Apps.md`)**
  - Explique comment les développeurs tiers peuvent créer des applications s'intégrant à FlowUp.

- **Étape 11 : Déploiement & Configuration (`11-Deployment.md`)**
  - Variables d'environnement nécessaires.
  - Instructions pour le build et le déploiement.

- **Étape 12 : API FlowApps (`12-FlowApps-API.md`)**
  - Explique comment utiliser les jetons d'accès personnels pour les scripts et automations.