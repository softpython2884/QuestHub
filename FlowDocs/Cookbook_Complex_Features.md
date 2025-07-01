# Technical Cookbook for Complex Features

This document provides technical recipes and architectural explanations for implementing the more complex features of a **CodeQuest Academy** application. Use this as a guide to accelerate development during your 24-hour challenge.

---

## 1. Authentication System (JWT & Server Actions)

**Architecture:**
-   **`src/lib/authService.ts` (`'use server'`)**: Handles business logic. Functions like `login`, `signup`, `logout`. These are called directly from client components.
-   **`src/lib/authEdge.ts`**: Contains the `auth()` middleware function. It reads the JWT from the cookie on incoming requests to protect server-side logic.
-   **Cookie**: A secure, `HttpOnly` cookie named `flowup_auth_token` stores the JWT.

**Key Implementation Steps:**

1.  **Create the Login/Signup Forms:** These forms will call the Server Actions from `authService.ts`. The signup form should be disabled unless a valid invitation token is present in the URL, as registration is invite-only.

2.  **Implement `authService.ts`:**
    ```typescript
    // In src/lib/authService.ts
    'use server';
    import jwt from 'jsonwebtoken';
    import { cookies } from 'next/headers';
    // ... other imports like bcrypt, db functions

    export async function createSessionForUser(user: User) {
      const token = jwt.sign({ uuid: user.uuid }, process.env.JWT_SECRET!, { expiresIn: '7d' });
      cookies().set('flowup_auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    export async function signup(name, email, password, invitationToken) {
      // 1. Validate invitationToken against the database.
      // 2. If valid, create user with the role from the invitation.
      // 3. Mark token as used.
      // 4. Create session with createSessionForUser().
      // 5. Return user object.
    }
    ```

3.  **Implement `authEdge.ts`:**
    ```typescript
    // In src/lib/authEdge.ts
    import jwt from 'jsonwebtoken';
    import { cookies } from 'next/headers';
    // ... other imports

    export async function auth() {
      const tokenCookie = cookies().get('flowup_auth_token');
      if (!tokenCookie) return null;

      try {
        const decoded = jwt.verify(tokenCookie.value, process.env.JWT_SECRET!);
        const user = await dbGetUserByUuid(decoded.uuid);
        // return { user: ... }
      } catch (error) {
        return null;
      }
    }
    ```

---

## 2. The Quest System Data Model

This is the most complex new feature. It requires careful data modeling to represent the skill tree and student progress.

**Architecture:**
-   **`quests` table**: Stores the definition of each quest (title, description, xp_reward, etc.).
-   **`quest_prerequisites` table**: A many-to-many junction table that defines the skill tree. It links a quest to the quests that must be completed before it becomes available (e.g., `quest_uuid` requires `prerequisite_quest_uuid`).
-   **`student_quests` table**: Tracks a student's progress on a specific quest. It links a `user`, a `quest`, and crucially, the `project_uuid` that was created for that quest attempt. It also stores status (`accepted`, `submitted`, `graded`) and the final grade.
-   **`quizzes` table**: Stores quiz definitions.
-   **`quiz_questions` table**: Stores questions for a specific quiz.
-   **`student_quiz_attempts` table**: Tracks student answers and scores for quizzes.

**Key Database Schemas:**
```sql
CREATE TABLE quests (
    uuid TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    xp_reward INTEGER DEFAULT 50,
    is_main_quest BOOLEAN DEFAULT TRUE, -- Differentiates between curriculum and dynamic side quests
    created_by_professor_uuid TEXT,
    FOREIGN KEY (created_by_professor_uuid) REFERENCES users(uuid)
);

CREATE TABLE quest_prerequisites (
    quest_uuid TEXT NOT NULL,
    prerequisite_quest_uuid TEXT NOT NULL,
    PRIMARY KEY (quest_uuid, prerequisite_quest_uuid),
    FOREIGN KEY (quest_uuid) REFERENCES quests(uuid),
    FOREIGN KEY (prerequisite_quest_uuid) REFERENCES quests(uuid)
);

CREATE TABLE student_quests (
    uuid TEXT PRIMARY KEY,
    student_uuid TEXT NOT NULL,
    quest_uuid TEXT NOT NULL,
    project_uuid TEXT NOT NULL UNIQUE, -- Each attempt gets a new, unique project
    status TEXT NOT NULL, -- e.g., 'accepted', 'in_progress', 'submitted', 'graded'
    grade INTEGER,
    feedback TEXT,
    started_at TEXT NOT NULL,
    submitted_at TEXT,
    FOREIGN KEY (student_uuid) REFERENCES users(uuid),
    FOREIGN KEY (quest_uuid) REFERENCES quests(uuid),
    FOREIGN KEY (project_uuid) REFERENCES projects(uuid)
);

CREATE TABLE quizzes (
    uuid TEXT PRIMARY KEY,
    quest_uuid TEXT UNIQUE, -- A quiz can be linked to one quest
    title TEXT NOT NULL,
    created_by_professor_uuid TEXT,
    FOREIGN KEY (quest_uuid) REFERENCES quests(uuid),
    FOREIGN KEY (created_by_professor_uuid) REFERENCES users(uuid)
);

-- etc. for questions and attempts...
```

**Key Server Logic - "Accept Quest" Action:**
```typescript
export async function acceptQuestAction(studentUuid, questUuid) {
  // 1. Verify the student has completed all prerequisite quests by checking `student_quests`.
  // 2. If prerequisites are met, create a new Project for the student.
  //    (This can call the FlowUp API via the student's fpat token).
  //    const newProject = await createProjectOnFlowUp(quest.title, quest.description, student.flowup_token);
  // 3. Create a `student_quests` record linking the student, quest, and the new project's UUID.
  //    await dbCreateStudentQuest(studentUuid, questUuid, newProject.uuid);
  // 4. Return the new Project so the student can be redirected to their new workspace.
}
```

---

## 3. Real-Time Chat System (Polling)

**Architecture:**
-   **Database Schema:** `conversations`, `conversation_members`, `messages`, `conversation_read_status`.
-   **Logic:** Since WebSockets can be complex to set up in a serverless environment, a polling strategy is a robust alternative.
-   **Client-Side:** The chat page and sidebar use a `useEffect` hook with `setInterval` to call a server action (`getMessagesAction` or `getConversationsAction`) every few seconds.
-   **Server-Side:** When a user sends a message (`sendMessageAction`), the server saves the message and calls `revalidatePath`. This ensures that the next poll from other clients will fetch the latest data.

**Key Implementation - Polling for Messages:**
```tsx
// In src/app/(app)/chat/[conversationId]/page.tsx
'use client';

useEffect(() => {
    if (!conversationId || !user) return;

    const poll = setInterval(async () => {
        // Don't poll if tab is not visible to save resources
        if (document.hidden) return;

        const freshMessages = await getMessagesAction(conversationId);
        // Compare and update state only if messages have changed
        setMessages(currentMessages => {
            if (JSON.stringify(freshMessages) !== JSON.stringify(currentMessages)) {
                return freshMessages;
            }
            return currentMessages;
        });
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(poll);
}, [conversationId, user]);
```

---

## 4. PWA (Progressive Web App) Installation

**Architecture:**
-   **`src/app/manifest.ts`:** A file that exports a `manifest` function, defining the app's name, icons, and display behavior for the PWA.
-   **`src/app/layout.tsx`:** The root layout must include the `<link rel="manifest" ...>` tag in the `<head>`.
-   **Client-Side Logic:** A component (e.g., in the Dashboard) listens for the `beforeinstallprompt` browser event.

**Key Implementation - Installation Prompt:**
```tsx
// In a client component, e.g., src/app/(app)/dashboard/page.tsx
'use client';

const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
const [isInstallable, setIsInstallable] = useState(false);

useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      // Store the event so it can be triggered later.
      setDeferredPrompt(e);
      // Show the install button.
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
}, []);

const handleInstallClick = () => {
    if (!deferredPrompt) return;
    // Show the browser's installation prompt.
    deferredPrompt.prompt();
};

// ... in your JSX ...
// {isInstallable && <Button onClick={handleInstallClick}>Install App</Button>}
```
