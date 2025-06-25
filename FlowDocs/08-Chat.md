# Étape 8 : Fonctionnalité Clé - Le Chat

## 1. Objectif du Chat

Le système de **Chat** de FlowUp est conçu pour faciliter la communication en temps réel, que ce soit au sein d'une équipe de projet ou en messages directs (DM) entre deux utilisateurs. L'objectif est de fournir un outil de messagerie intégré, contextuel et efficace.

## 2. Modèles de Données

Le chat repose sur plusieurs tables interdépendantes :

-   **`conversations`**:
    -   `uuid`: Identifiant unique de la conversation.
    -   `type`: Définit le type de conversation (`project` ou `dm`).
    -   `projectUuid`: (Optionnel) Lie la conversation à un projet si `type` est `project`.
    -   `updatedAt`: Timestamp de la dernière activité, utilisé pour trier les conversations.

-   **`conversation_members`**:
    -   Table de liaison qui associe les `users` aux `conversations`.
    -   `conversationUuid`, `userUuid`: Clés étrangères.

-   **`messages`**:
    -   `uuid`: Identifiant unique du message.
    -   `conversationUuid`: Lie le message à une conversation.
    -   `authorUuid`: `uuid` de l'utilisateur qui a envoyé le message.
    -   `content`: Contenu du message (supporte le Markdown).
    -   `createdAt`, `updatedAt`: Timestamps pour le tri et le statut "édité".
    -   `isEdited`, `isDeleted`: Booléens pour gérer l'édition et la suppression non destructive.

-   **`conversation_read_status`**:
    -   `conversationUuid`, `userUuid`: Clés étrangères.
    -   `lastReadAt`: Timestamp du dernier moment où un utilisateur a consulté une conversation, utilisé pour déterminer les messages non lus.

## 3. Logique Backend (`chat/actions.ts`)

Le fichier `src/app/(app)/chat/actions.ts` expose les fonctions serveur sécurisées pour interagir avec le chat :

-   `getConversationsAction`:
    -   Récupère toutes les conversations de l'utilisateur connecté.
    -   Pour chaque conversation, elle calcule le nom, l'avatar, le dernier message et un indicateur `hasUnread` en comparant `updatedAt` de la conversation avec `lastReadAt` de l'utilisateur.

-   `getMessagesAction`:
    -   Récupère tous les messages d'une conversation donnée.
    -   **Important**: Avant de retourner les messages, elle met à jour le `lastReadAt` de l'utilisateur pour cette conversation, marquant ainsi tous les messages comme lus.

-   `sendMessageAction`:
    -   Crée un nouveau message dans la base de données.
    -   Met à jour le `updatedAt` de la conversation pour la faire remonter en haut de la liste.
    -   Déclenche une revalidation (`revalidatePath`) pour que les clients mettent à jour leur interface.

-   `editMessageAction` & `deleteMessageAction`:
    -   Gèrent la modification et la suppression (soft delete) des messages, avec vérification des permissions (seul l'auteur peut modifier/supprimer).

## 4. Logique Frontend (`chat/[conversationId]/page.tsx` & `_components`)

L'interface du chat est conçue pour être réactive et dynamique.

-   **`ChatLayoutClient` & `ChatSidebar`**:
    -   Le layout gère l'affichage adaptatif sur mobile, montrant soit la liste des conversations, soit une conversation active.
    -   La `ChatSidebar` affiche la liste des conversations et utilise un **polling** (interrogation à intervalle régulier, toutes les 5 secondes) pour se mettre à jour sans nécessiter de rafraîchissement manuel de la page.

-   **`ConversationPage` (`page.tsx`)**:
    -   **Polling des Messages**: Comme la sidebar, la page de conversation interroge le serveur toutes les 3 secondes pour récupérer les nouveaux messages, simulant une communication en temps réel. Le polling est désactivé si l'onglet du navigateur n'est pas actif pour économiser les ressources.
    -   **Envoi Optimiste**: Quand un utilisateur envoie un message, il est immédiatement ajouté à l'interface avec un état "pending" (légèrement grisé). Lorsque le serveur confirme la création, le message est remplacé par sa version finale. Cela donne une impression de réactivité instantanée.
    -   **Édition et Suppression**: Les actions d'édition et de suppression sont également gérées de manière optimiste, avec des dialogues de confirmation pour les actions destructrices.
    -   **Affichage Markdown**: Le contenu des messages est rendu via `ReactMarkdown` pour afficher correctement le formatage, les liens et les listes.

Cette architecture, bien que basée sur le polling, offre une expérience utilisateur fluide et réactive sans la complexité d'une connexion WebSocket.
