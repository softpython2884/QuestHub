# Technical Cookbook for Complex Features

This document provides technical recipes and architectural explanations for implementing the more complex features of a FlowUp-like application. Use this as a guide to accelerate development during your 24-hour challenge.

---

## 1. Authentication System (JWT & Server Actions)

**Architecture:**
-   **`src/lib/authService.ts` (`'use server'`)**: Handles business logic. Functions like `login`, `signup`, `logout`. These are called directly from client components.
-   **`src/lib/authEdge.ts`**: Contains the `auth()` middleware function. It reads the JWT from the cookie on incoming requests to protect server-side logic.
-   **Cookie**: A secure, `HttpOnly` cookie named `flowup_auth_token` stores the JWT.

**Key Implementation Steps:**

1.  **Create the Login/Signup Forms:** These forms will call the Server Actions from `authService.ts`.

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

    export async function login(email, password) {
      // 1. Get user from DB by email
      // 2. Compare password with bcrypt.compare()
      // 3. If valid, call createSessionForUser()
      // 4. Return user object
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

## 2. Project & Task Management System

**Architecture:**
-   **Database Schema:**
    -   `projects`: Stores project details.
    -   `tasks`: Stores task details with a `projectUuid` foreign key.
    -   `project_members`: Links `users` to `projects` with a role.
    -   `project_tags` & `task_tags`: For the tag system.
-   **Server Actions:** A single `actions.ts` file within the project directory (e.g., `src/app/(app)/projects/[id]/actions.ts`) contains all functions to create, update, and delete tasks, members, etc. These actions always verify user permissions before interacting with the database.

**Key Implementation - Updating Task Status (Kanban Drag-and-Drop):**
1.  **Frontend:** Use a library like `dnd-kit` to manage drag-and-drop. On drop, get the task ID and the new status column.
2.  **Server Action Call:** Call a server action, `updateTaskStatusAction(taskUuid, newStatus)`.
3.  **Optimistic UI:** Immediately move the task card in the UI to the new column without waiting for the server response. If the server call fails, revert the change and show a toast notification.
4.  **Backend Logic:**
    ```typescript
    // In projects/[id]/actions.ts
    export async function updateTaskStatusAction(taskUuid, newStatus) {
      const session = await auth();
      // 1. Verify user is logged in.
      // 2. Get the task from the DB to find its projectUuid.
      // 3. Check if the user is a member of that project (any role can change status).
      // 4. Update the task status in the database.
      // 5. Call revalidatePath('/projects/[id]') to refresh data for all users.
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
