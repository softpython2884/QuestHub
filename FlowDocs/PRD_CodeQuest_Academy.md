# Product Requirements Document: CodeQuest Academy

## 1. Vision & Objective

**CodeQuest Academy** is a gamified learning and project management platform designed for private IT schools. Its goal is to transform the educational journey into an engaging adventure by structuring learning around "Quests." It provides students with the tools to manage their projects, professors with the means to guide and evaluate them, and administrators with the ability to manage the ecosystem.

---

## 2. User Roles & Permissions

*   **Student (User):** The primary user. They can accept Quests, manage their corresponding projects (tasks, documentation), collaborate with others, and submit their work for evaluation.
*   **Professor (Manager):** Creates and assigns "Quests" to students or groups. They can monitor progress, provide feedback, create quizzes, and grade final submissions.
*   **Administrator (Admin):** Manages the entire platform. Their key responsibilities include:
    *   Sending out all user invitations (students and professors). Registration is **invite-only**.
    *   Managing platform-wide settings and announcements.
    *   Overseeing all users and quests.

---

## 3. Core Features

### 3.1. The Quest System
*   **What it is:** The central learning unit of the platform. A "Quest" is a high-level assignment created by a Professor.
*   **Functionality:**
    *   Professors create Quests with a title, detailed description (learning objectives, required technologies), and a deadline.
    *   They can assign a Quest to one or more students.
    *   When a student accepts a Quest, a new **Project** is automatically created and linked to it in their workspace.

### 3.2. Project Management (Student Workspace)
*   **What it is:** The student's personal workspace for a given Quest.
*   **Functionality:**
    *   **Kanban Board:** Students break down their Quest into actionable tasks (`To Do`, `In Progress`, `Done`).
    *   **CodeSpace:** Full GitHub integration. Students can link their project to a new or existing GitHub repository to manage their code.
    *   **Documents:** An integrated space to write project-specific documentation (e.g., technical design, user manual).

### 3.3. Quiz & Evaluation Engine
*   **What it is:** A tool for Professors to assess student knowledge.
*   **Functionality:**
    *   **Quiz Creation:** Professors can create quizzes with multiple-choice questions, true/false, or even "code snippet" questions where a student has to write a small piece of code.
    *   **Automated Grading:** Quizzes are automatically graded, providing instant feedback to students.
    *   **Quest Prerequisite:** A quiz can be set as a final step to complete a Quest.

### 3.4. Submission and Grading
*   **What it is:** The formal process for completing a Quest.
*   **Functionality:**
    *   A student marks their project as "Ready for Review."
    *   The corresponding Professor is notified.
    *   The Professor can access a read-only view of the student's entire project (tasks, code, docs) to evaluate it.
    *   A dedicated "Grading" interface allows the Professor to assign a grade (e.g., A, B, C or a point score) and leave detailed feedback.

### 3.5. AI Mentor ("Codex")
*   **What it is:** An integrated AI assistant to help students.
*   **Functionality:**
    *   **Contextual Help:** Codex can be invoked from the CodeSpace to explain a piece of code, suggest debugging strategies, or refactor a function.
    *   **Concept Explanation:** Students can ask Codex general programming questions.
    *   **Safety:** Codex will be configured to guide students toward a solution rather than giving it away directly.

---

## 4. Additional Feature Ideas (Brainstorm)

*   **Leaderboards:** A global or per-class leaderboard showing student progress based on completed Quests and grades, to encourage friendly competition.
*   **Skill Tree:** A visual representation of a student's acquired skills. Completing certain Quests (e.g., "Python Basics," "API Development") unlocks nodes on their personal skill tree.
*   **Peer Review System:** Allow students to review each other's code or projects before final submission, fostering collaboration.
*   **Live Help Queue:** A system where students can "raise their hand" digitally to request help from an available Professor.
*   **School-Wide Announcements:** A section for Admins to post important information for all platform users.
