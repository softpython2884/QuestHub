# Étape 6 : Intégration de l'IA avec Genkit (AI Studio)

## 1. Objectif de l'AI Studio

L'**AI Studio** est le centre de commande pour toutes les fonctionnalités d'intelligence artificielle générative de FlowUp. Il offre une suite d'outils conçus pour accélérer le processus de développement, de l'idéation à la création de code et de documentation.

L'objectif est de fournir une assistance contextuelle et puissante, directement intégrée dans le flux de travail du développeur.

## 2. Technologie Clé : Genkit

Toutes les fonctionnalités d'IA de FlowUp sont basées sur **Genkit**, le framework open-source de Google pour construire des applications et des agents IA.

-   **Flows (`/src/ai/flows`)**: Chaque outil de l'AI Studio correspond à un "flow" Genkit. Un flow est une fonction TypeScript sécurisée qui s'exécute côté serveur. Il définit la logique, prépare les prompts, appelle les modèles d'IA (comme Gemini), et formate la réponse pour l'application.
-   **Schémas Zod**: Nous utilisons Zod pour définir des schémas de données stricts pour les entrées et les sorties des flows. Cela garantit que l'IA respecte le format attendu, rendant les intégrations fiables et prévisibles.

## 3. Outils Disponibles et Flows Associés

### Outil "Project Idea Generator" (Générateur d'idées de projet)
-   **Objectif Utilisateur**: Lutter contre le syndrome de la page blanche. Un utilisateur peut décrire un concept (ex: "une app pour les plantes") et obtenir des idées de projets concrets.
-   **Flow Associé**: `generateProjectIdeas` (`/src/ai/flows/generate-project-ideas.ts`)
    -   **Entrée**: Un prompt utilisateur (chaîne de caractères).
    -   **Sortie**: Un objet contenant deux listes : `projectIdeas` (noms de projets) et `taskLists` (listes de tâches au format Markdown pour chaque idée).

### Outil "Project Scaffolder" (Générateur de structure de projet)
-   **Objectif Utilisateur**: Générer instantanément une arborescence de fichiers et le code de base pour une petite application (ex: "un site vitrine simple avec une page contact").
-   **Flow Associé**: `generateProjectScaffold` (`/src/ai/flows/generate-project-scaffold.ts`)
    -   **Entrée**: Un prompt décrivant le projet.
    -   **Sortie**: Un objet contenant une liste de fichiers (`files`), où chaque fichier a un `filePath` (chemin) et un `content` (contenu du fichier).
-   **Intégration**: Le résultat peut être directement ajouté à un projet FlowUp existant, ce qui crée les fichiers dans le dépôt GitHub lié.

### Outil "Document Generator" (Générateur de documentation)
-   **Objectif Utilisateur**: Rédiger rapidement de la documentation technique ou fonctionnelle.
-   **Flow Associé**: `generateDocumentContent` (`/src/ai/flows/generate-document-content.ts`)
    -   **Entrée**: Un prompt décrivant le document souhaité (ex: "un guide d'installation pour une API Node.js").
    -   **Sortie**: Un objet contenant une chaîne de caractères `markdownContent` prête à être utilisée.

### Outil "AI File Editor" (Éditeur de fichiers par IA)
-   **Objectif Utilisateur**: Modifier un fichier de code ou de texte existant en utilisant des instructions en langage naturel.
-   **Flow Associé**: `editFileContentWithAI` (`/src/ai/flows/edit-file-content-ai.ts`)
    -   **Entrée**: Le contenu actuel du fichier et un prompt utilisateur décrivant la modification (ex: "refactorise cette fonction pour qu'elle soit asynchrone").
    -   **Sortie**: Un objet contenant le **nouveau contenu complet** du fichier (`newContent`).
-   **Intégration**: Cette fonctionnalité est accessible depuis le "CodeSpace" d'un projet.

## 4. Assistant Conversationnel "Flowy"

En plus des outils du studio, une IA conversationnelle est disponible à travers l'application.
-   **Objectif Utilisateur**: Obtenir de l'aide rapide, des explications ou des suggestions sans quitter le contexte de travail.
-   **Flow Associé**: `workspaceAssistant` (`/src/ai/flows/workspace-assistant.ts`)
    -   **Entrée**: L'historique de la conversation.
    -   **Sortie**: La réponse de l'IA.
-   **Intégration**: Le chatbot "Flowy" accessible en bas à droite de l'interface.
