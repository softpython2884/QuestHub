# Étape 7 : Découverte et Collaboration (Discover & Team)

## 1. Objectif Commun

Les pages **Discover** et **Team** forment le cœur social de FlowUp. Elles permettent aux utilisateurs de se connecter, de trouver des projets inspirants et de communiquer efficacement.

-   **Discover** : Tournée vers l'extérieur, cette page permet d'explorer la communauté et les projets publics.
-   **Team** : Tournée vers l'intérieur, elle offre une vue d'ensemble de vos collaborateurs et projets de groupe actuels.

## 2. La Page "Discover" (Découvrir)

### Objectif
Permettre aux utilisateurs d'explorer tous les projets publics disponibles sur la plateforme, de trouver des utilisateurs et de mettre en avant les projets qu'ils apprécient.

### Fonctionnalités Clés
-   **Recherche Globale**: Une barre de recherche permet de trouver des projets et des utilisateurs par leur nom.
-   **Liste des Projets Publics**: Affiche tous les projets dont la visibilité est définie sur "Public".
-   **Système d'Étoiles (Stars)**: Les utilisateurs connectés peuvent "étoiler" un projet pour le sauvegarder ou montrer leur appréciation. Le nombre d'étoiles est un indicateur de popularité.
-   **Visualisation des Utilisateurs**: Les résultats de recherche peuvent inclure des profils d'utilisateurs, avec un lien vers leur page de profil publique.

### Logique Backend (`discover/actions.ts`)
-   `getPublicProjects`: Récupère tous les projets non privés et, pour l'utilisateur connecté, indique s'il a déjà étoilé chaque projet (`isStarred`).
-   `searchPublic`: Prend une chaîne de recherche et retourne une liste filtrée de projets et d'utilisateurs.
-   `toggleStarProject`: Ajoute ou retire une étoile pour un projet donné au nom de l'utilisateur authentifié.

## 3. La Page "Team" (Équipe)

### Objectif
Fournir un hub central pour visualiser les personnes et les groupes avec lesquels un utilisateur collabore, et initier des conversations rapidement.

### Fonctionnalités Clés
-   **Liste des Groupes de Projet**: Affiche uniquement les projets auxquels l'utilisateur appartient et qui comptent au moins deux membres, ce qui en fait des "groupes".
-   **Liste des Membres de l'Équipe**: Affiche une liste unique de tous les utilisateurs (à l'exception de l'utilisateur actuel) qui sont membres des mêmes projets que lui.
-   **Lancement de Conversations**:
    -   Un bouton "Open Chat" sur une carte de projet permet de rejoindre ou de démarrer une conversation de groupe pour ce projet.
    -   Un bouton "Direct Message" sur une carte d'utilisateur permet de démarrer une conversation privée (DM) avec cette personne.

### Logique Backend (`team/actions.ts`)
-   `getTeamData`: Récupère et agrège deux listes distinctes pour l'utilisateur connecté : ses projets de groupe et ses coéquipiers uniques.
-   `searchTeam`: Filtre les listes de projets et de membres de l'équipe en fonction d'une requête de recherche.
-   `startConversationAction`:
    -   Action centrale qui prend soit un `projectUuid`, soit un `otherUserUuid`.
    -   Elle vérifie s'il existe déjà une conversation (de groupe ou DM) et la retourne.
    -   Si aucune conversation n'existe, elle en crée une nouvelle, y ajoute les membres nécessaires, et retourne son identifiant.
    -   Le frontend utilise cet identifiant pour rediriger l'utilisateur vers la page de chat correspondante.