# **App Name**: NationQuest Hub

## Core Features:

- Secure Authentication: User authentication system with secure password hashing and JWT-based sessions managed via HttpOnly cookies. Role-Based Access Control (RBAC) enforced at UI and API levels, using AuthContext and middleware for login, logout, and user management.
- Responsive Dashboard: Dashboard presenting a personalized greeting, an overview of main projects with associated tasks. Visual elements adapt to screen size for optimal viewing, ensuring consistency across devices. Placeholders are implemented for future activity graphs and detailed status charts.
- Project Management Suite: Project management tools allowing users to create, view, and edit projects, to-do lists, and documentation. This MVP delivers task status updates through simple dropdowns within the detailed list views.
- Comprehensive Tag System: A versatile tag system facilitates organization of tasks, documents, and projects. Users can create new tags and assign them to multiple items, improving categorization.
- Team Announcements: Team announcements feature allowing admins and project managers to post important information globally or specifically to a project to communicate directly with members.
- Secure Vault Assistant: Provision for a secure vault for storing secrets. If there is an indication that a string contains an API key or password, flag the string to remind the user to save in a secure vault for the team, as needed.
- AI Assistant and Safe Secret Usage Tool: Track API Key Use. Use a tool that warns you that you're about to share an API key and remind you of best practices when generating code using AI and LLMs.

## Style Guidelines:

- Primary color: Soft blue (#64B5F6) to convey trust and stability, aligning with workspace environment aesthetics.
- Background color: Light gray (#F5F5F5), ensuring a clean and non-distracting backdrop for optimal readability and focus.
- Accent color: Warm orange (#FFAB40), for interactive elements and CTAs, to guide user attention and enhance engagement.
- Body and headline font: 'Inter', sans-serif, for a modern, objective, neutral look, working equally well for headlines and body text.
- Code font: 'Source Code Pro', monospaced, for clean code displays.
- Simple, professional icons from libraries like Feather or Lucid, maintaining consistency across the interface.
- Clean, structured layout with consistent spacing and alignment, promoting ease of navigation and content consumption.