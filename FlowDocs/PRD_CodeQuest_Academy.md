# Product Requirements Document: CodeQuest Academy

## 1. Vision & Objective

**CodeQuest Academy** is a gamified learning and project management platform designed for private IT schools. Its core objective is to transform the educational journey into an engaging adventure by structuring learning around "Quests" and practical project work. It provides students with the tools to manage their projects, professors with the means to create structured learning paths and evaluate progress, and administrators with the ability to manage the entire ecosystem.

---

## 2. User Roles & Permissions

*   **Student (User):** The primary user. They navigate the Quest Tree, accept Quests which generate Projects in their workspace, manage tasks, code, documentation, collaborate with peers, and submit completed Quests for evaluation.
*   **Professor (Manager):** The architect of the learning experience. They create and manage the Main Quest Tree, design Dynamic Side Quests for specific assignments, monitor student progress, provide feedback, create quizzes, and grade final submissions.
*   **Administrator (Admin):** Manages the entire platform. Their key responsibilities include:
    *   Sending out all user invitations (students and professors). Registration is **invite-only**.
    *   Managing platform-wide settings and announcements.
    *   Overseeing all users, quests, and platform integrity.

---

## 3. Core Features

### 3.1. The Quest System: A Dual Approach

The Quest System is the central pedagogical tool of the platform, composed of two distinct but complementary quest types.

#### 3.1.1. Main Quest Tree (The Curriculum)
*   **Concept:** This is the school's entire curriculum, visualized as a vast **skill tree**, similar to those found in video games. It provides students with a clear and motivating path of progression.
*   **Structure:**
    *   **Branching Paths:** The tree starts with foundational quests (e.g., "Git Basics," "Intro to Python"). Upon completion, new branches unlock, allowing students to specialize in areas like "Web Development," "Data Science," "Cybersecurity," or "Mobile Development."
    *   **Increasing Difficulty:** As a student progresses down a branch, the quests become more complex and challenging.
    *   **Prerequisites:** Quests can have one or more prerequisite quests, ensuring a logical learning order. A student cannot start the "React Frameworks" quest without first completing "JavaScript Fundamentals."
*   **Management:** Professors and Admins collaborate to build, update, and balance the Main Quest Tree to reflect the school's curriculum.

#### 3.1.2. Dynamic Side Quests (Assignments)
*   **Concept:** A flexible tool for professors to create smaller, ad-hoc assignments for specific needs.
*   **Creation:** A professor can rapidly design a "mini quest tree" (even a single quest) with a specific objective, description, and deadline.
*   **Assignment:** These quests can be assigned to an individual student, a group of students, or an entire project team.
*   **Purpose:** Ideal for weekly homework, targeted exercises (e.g., "Refactor this function"), or special challenges that fall outside the main curriculum.

### 3.2. Project Workspace (The Workshop)

This is the student's personal or collaborative space where the actual work gets done. It retains all the powerful features of FlowUp.

*   **The Link:** **When a student accepts any Quest (Main or Side), a new Project is automatically created in their workspace.** This Project is intrinsically linked to that specific Quest attempt.
*   **Functionality:**
    *   **Kanban Board:** Students break down their Quest requirements into actionable tasks (`To Do`, `In Progress`, `Done`).
    *   **CodeSpace:** Full GitHub integration. Students can link their project to a new or existing GitHub repository to manage their code. This is where they write the code to solve the Quest's challenges.
    *   **Documents:** An integrated space to write project-specific documentation (e.g., technical design, user manual, research notes).

### 3.3. Evaluation & Learning Tools

*   **Quiz Engine:**
    *   Professors can create quizzes with multiple-choice, true/false, or even "code snippet" questions.
    *   Quizzes can be attached to a Quest as a mandatory step for completion, testing theoretical knowledge.
    *   Grading is automated for instant student feedback.
*   **Submission and Grading:**
    *   A student marks their Quest as "Ready for Review" from within the associated Project.
    *   The professor is notified and gains access to a read-only snapshot of the student's entire project (tasks, code, docs).
    *   A dedicated interface allows the professor to assign a grade and leave detailed feedback on the **Quest**, which is then reflected in the student's progress on the skill tree.

### 3.4. AI Mentor ("Codex")
*   **Concept:** An integrated AI assistant, renamed "Codex," designed to guide, not to give answers.
*   **Functionality:**
    *   **Contextual Help:** From the CodeSpace, a student can ask Codex to "explain this algorithm," "suggest ways to debug this error," or "refactor this function for better readability."
    *   **Learning Tool:** Codex can explain programming concepts or documentation related to the current Quest's technologies.
    *   **Safety:** Codex is configured to be a Socratic mentor, guiding students toward solutions with questions and hints rather than providing the final code.

### 3.5. Gamification & Profile
*   **Levels and XP:** Users gain Experience Points (XP) for completing quests, quizzes, and even for collaborating on projects. Reaching XP thresholds increases their Level.
*   **User Profile:** The profile page becomes a student's portfolio, displaying:
    *   Their current **Level** and XP progress bar.
    *   A list of **Badges** and **Achievements** earned.
    *   A visualization of their completed Quests on the skill tree.
    *   Links to their public projects.

---

## 4. Platform Features (Transposed from FlowUp)

All existing FlowUp features are re-contextualized for the educational environment.

*   **Professor/Admin Dashboard:** A central hub for managing the academy.
    *   **Student Management:** View student progress, grades, and activity.
    *   **Quest Editor:** A visual tool to build and modify the Main Quest Tree (define prerequisites, branches, etc.).
    *   **Dynamic Quest Creator:** A simple form for creating ad-hoc Side Quests.
    *   **Quiz Builder:** An interface to create quizzes and link them to Quests.
    *   **Grading Queue:** A list of all submitted Quests awaiting review.
*   **School-Wide Announcements:** The existing "Global Announcements" feature, used by Admins to communicate with the entire school.
*   **Shared Knowledge Base:** The "Global Docs" feature becomes a collaborative wiki where students and professors can share tutorials and technical guides.
*   **Platform Suggestion Box:** The existing "Suggestions" feature for students to propose improvements to the platform.
*   **Team & Chat:** Students can form teams within projects and use the integrated chat for real-time collaboration. DMs are also available.
*   **Secure Vault:** Each user gets a private, secure project to store sensitive information like personal API keys.
*   **Discover Page:** This page is transformed into a "Quest Board" where students can see available Main Quests and track school-wide progress.
*   **FlowUp API Integration:**
    *   Upon registration, each user is prompted to enter their **FlowUp User UUID** and an **fpat token** from their personal FlowUp account.
    *   CodeQuest Academy will use this token via the FlowApps API to programmatically create **real private projects** in the student's own FlowUp workspace for each Quest they accept. This provides a powerful, real-world project management experience.
*   **OAuth & Developer Tools:** The platform will retain its own OAuth provider and FlowApps system, allowing for future integrations (e.g., a mobile app for the school).

---

## 5. Additional Feature Ideas (Brainstorm)

*   **Visual Skill Tree Interface:** A graphical, interactive UI where students can see the entire Main Quest Tree, their completed quests, available paths, and locked future quests.
*   **XP & Leaderboards:** Gamify the experience by awarding Experience Points (XP) for completing Quests and Quizzes. Display leaderboards (global or per class) to foster friendly competition.
*   **Peer Review System:** Before a final Quest submission, students can be prompted to review the Project of one or more peers, providing constructive feedback based on a professor's rubric.
*   **Live Help Queue:** A system where a student working on a Quest can "raise their hand" digitally, entering a queue for an available professor or teaching assistant to provide help.
*   **Badge & Achievement System:** Award unique badges for completing difficult quests, mastering a technology branch, or demonstrating exceptional collaboration.
*   **Group Projects:** Allow Quests to be assigned to teams, creating a shared project workspace for all team members.