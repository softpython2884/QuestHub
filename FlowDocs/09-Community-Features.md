# Étape 9 : Fonctionnalités Communautaires et Utilitaires

Cette section couvre plusieurs fonctionnalités clés qui enrichissent l'expérience utilisateur en favorisant la communication, le partage de connaissances et la sécurité.

## 1. Annonces Globales (`Announcements`)

### Objectif
Permettre aux administrateurs de communiquer des informations importantes à l'ensemble des utilisateurs de la plateforme (mises à jour, maintenances, etc.).

### Modèles de Données
-   **`global_announcements`**: Table principale qui stocke le titre, le contenu, l'auteur, et un booléen `isPinned`.

### Fonctionnalités
-   **Création & Gestion**: Seuls les utilisateurs avec le rôle `admin` peuvent créer, modifier, épingler et supprimer des annonces globales.
-   **Visibilité**: Les annonces sont visibles par tous les utilisateurs connectés sur la page "Announcements".
-   **Épinglage**: Les annonces épinglées apparaissent en haut de la liste pour garantir une visibilité maximale.

---

## 2. Documentation Globale (`Docs`)

### Objectif
Créer une base de connaissances partagée où la communauté peut rédiger et consulter des guides, des tutoriels et de la documentation technique non spécifique à un projet.

### Modèles de Données
-   **`global_documents`**: Stocke le contenu Markdown, l'auteur et les métadonnées.
-   **`global_tags`**: Table pour les tags (étiquettes).
-   **`global_document_projects`**: Table de liaison pour associer un document global à un projet public spécifique.

### Fonctionnalités
-   **Éditeur Markdown**: Création et édition de documents avec un éditeur Markdown complet incluant une prévisualisation en direct.
-   **Gestion des Permissions**: Les utilisateurs peuvent créer et modifier leurs propres documents. Les administrateurs peuvent gérer tous les documents.
-   **Organisation**:
    -   **Tags**: Ajout de tags pour catégoriser et retrouver facilement les documents.
    -   **Lien vers un Projet**: Possibilité d'associer un document à un projet public pour le contextualiser.
-   **Épinglage**: Les administrateurs peuvent épingler des documents importants pour les mettre en avant.

---

## 3. Boîte à Suggestions (`Suggestions`)

### Objectif
Fournir une plateforme démocratique où les utilisateurs peuvent proposer des améliorations pour FlowUp et voter pour les idées des autres.

### Modèles de Données
-   **`suggestions`**: Contient le titre, la description, l'auteur et le statut de la suggestion (`open`, `under_review`, `planned`, `done`).
-   **`suggestion_votes`**: Enregistre les votes (`up` ou `down`) de chaque utilisateur pour chaque suggestion.

### Fonctionnalités
-   **Soumission**: Tout utilisateur connecté peut soumettre une nouvelle suggestion.
-   **Vote**: Les utilisateurs peuvent voter positivement ou négativement pour les suggestions, influençant ainsi leur priorité.
-   **Tri**: La liste des suggestions est triée par nombre de votes, mettant en avant les plus populaires.
-   **Statuts**: Les administrateurs peuvent mettre à jour le statut d'une suggestion pour communiquer sa progression à la communauté.

---

## 4. Coffre-Fort Sécurisé (`Secure Vault`)

### Objectif
Offrir à chaque utilisateur un espace **strictement personnel et privé** pour stocker des informations sensibles (clés d'API, secrets, notes confidentielles) de manière sécurisée.

### Logique de Fonctionnement
Le "Secure Vault" n'est pas une entité distincte, mais une **implémentation spéciale d'un Projet FlowUp**.

-   **Création Automatique**: Lors du premier accès à la page "Secure Vault", le système vérifie si un projet nommé "My Secure Vault" existe pour l'utilisateur.
    -   Si non, il en crée un automatiquement.
    -   Ce projet est configuré pour être **strictement privé**.
-   **Dépôt GitHub Privé**:
    -   En parallèle, le système crée un **nouveau dépôt GitHub privé** nommé `FlowUp-Secure-Vault` sur le compte GitHub de l'utilisateur.
    -   Ce dépôt est automatiquement lié au projet "My Secure Vault".
-   **Interface**: L'utilisateur interagit avec son coffre-fort via l'onglet "CodeSpace" de ce projet spécial, lui permettant de créer, lire, modifier et supprimer des fichiers de manière sécurisée.
-   **Sécurité et Confidentialité**:
    -   Personne d'autre que l'utilisateur propriétaire ne peut accéder à ce projet ou à son contenu.
    -   Il est exclu des fonctionnalités de recherche et de découverte.
