'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Database, Shield, Lock, Layers, Cpu, Users, MessageSquare, Star, KeyRound, Workflow, BrainCircuit, Bot, Megaphone, Lightbulb, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const AnimationStep = ({ step, currentStep, children, delay = 0 }: { step: number, currentStep: number, children: React.ReactNode, delay?: number }) => (
  <div
    className={cn(
      'transition-all duration-500 ease-out',
      currentStep >= step ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
    )}
    style={{ transitionDelay: `${delay}ms`}}
  >
    {children}
  </div>
);


const PresentationFrame = ({ step, title, children }: { step: number, title: string, children: React.ReactNode }) => {
    const [animationStep, setAnimationStep] = useState(0);
    useEffect(() => {
        const timer = setTimeout(() => setAnimationStep(1), 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="w-full">
            <AnimationStep step={1} currentStep={animationStep}>
                <Card className="bg-card/80 backdrop-blur-sm border-border/20 w-full shadow-2xl">
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold tracking-tight font-headline">{title}</CardTitle>
                        <CardDescription>Part {step} of the technical presentation</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 text-muted-foreground text-base leading-relaxed">
                        {children}
                    </CardContent>
                </Card>
            </AnimationStep>
            <div className="mt-6 flex justify-between w-full">
                <Button variant="outline" asChild disabled={step <= 1}>
                    <Link href={`/hlb/${step - 1}`}><ArrowLeft className="mr-2 h-4 w-4" /> Previous</Link>
                </Button>
                <Button asChild disabled={step >= 9}>
                    <Link href={`/hlb/${step + 1}`}>Next <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
            </div>
        </div>
    );
};

const Step1 = () => (
    <div className="space-y-4">
        <p>
            FlowUp is a project management platform designed for developers, centralizing all the necessary tools for collaboration and productivity. It integrates task management, code, documentation, AI, and real-time communication.
        </p>
        <h3 className="font-semibold text-xl text-foreground pt-4">Tech Stack</h3>
        <ul className="list-disc pl-5 space-y-2">
            <li><strong>Next.js & React:</strong> For a modern, reactive, and SEO-friendly frontend.</li>
            <li><strong>Tailwind CSS & ShadCN:</strong> For an elegant, consistent, and rapidly developed UI.</li>
            <li><strong>Genkit (AI):</strong> For all artificial intelligence features, from code generation to assistance.</li>
            <li><strong>SQLite:</strong> For a lightweight, performant, and easy-to-manage database integrated directly into the project.</li>
        </ul>
        <h3 className="font-semibold text-xl text-foreground pt-4">Folder Architecture</h3>
        <ul className="list-disc pl-5 space-y-2 font-code text-sm">
            <li><code>/src/app</code>: Contains routes, pages, and backend logic (Server Actions).</li>
            <li><code>/src/components</code>: Reusable React components.</li>
            <li><code>/src/lib</code>: Utility functions, database logic (db.ts), and authentication (authService.ts).</li>
            <li><code>/src/ai</code>: All Genkit "flows" that define the AI's behavior.</li>
        </ul>
    </div>
);

const Step2 = () => (
    <div className="space-y-4">
        <p>The database is the core of the system. It's designed to be relational and ensure data integrity.</p>
        <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-background/50">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users /> Main Tables</CardTitle></CardHeader>
                <CardContent className="text-sm">
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>users:</strong> Stores user information (profile, role, etc.).</li>
                        <li><strong>projects:</strong> Contains the details of each project (name, owner, visibility).</li>
                        <li><strong>tasks:</strong> Manages individual tasks related to a project.</li>
                    </ul>
                </CardContent>
            </Card>
            <Card className="bg-background/50">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Layers /> Junction Tables</CardTitle></CardHeader>
                <CardContent className="text-sm">
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>project_members:</strong> Associates users with projects with a specific role.</li>
                        <li><strong>task_tags:</strong> Links tags to tasks.</li>
                        <li><strong>conversation_members:</strong> Connects users to chat conversations.</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
        <p className="pt-2">The use of foreign keys (like `projectUuid`) and constraints ensures that relationships between data are always valid, preventing, for example, a task from existing without a project.</p>
    </div>
);

const Step3 = () => (
    <div className="space-y-4">
        <p>The authentication system is secure and flexible, based on modern standards.</p>
        <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-lg bg-background/50">
                <Shield className="h-8 w-8 text-primary mt-1" />
                <div>
                    <h4 className="font-semibold text-foreground">JWT & HttpOnly Cookies</h4>
                    <p className="text-sm">Upon successful login, a JSON Web Token (JWT) is generated and stored in an `HttpOnly` cookie, protecting it from XSS attacks as it is inaccessible to client-side JavaScript.</p>
                </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg bg-background/50">
                <Lock className="h-8 w-8 text-primary mt-1" />
                <div>
                    <h4 className="font-semibold text-foreground">Middleware & Server Actions</h4>
                    <p className="text-sm">Every sensitive request is validated by middleware (`authEdge.ts`) that verifies the JWT. Business logic (login, signup) is handled by Server Actions (`authService.ts`), ensuring all critical operations are executed server-side.</p>
                </div>
            </div>
             <div className="flex items-start gap-4 p-4 rounded-lg bg-background/50">
                <GitBranch className="h-8 w-8 text-primary mt-1" />
                <div>
                    <h4 className="font-semibold text-foreground">OAuth Flow (GitHub & Discord)</h4>
                    <p className="text-sm">FlowUp uses the OAuth2 flow for login and account linking. If the user is already logged into FlowUp, the third-party service is simply linked. Otherwise, the system creates a new FlowUp account or logs into an existing one based on the email address, ensuring a seamless experience.</p>
                </div>
            </div>
        </div>
    </div>
);

const Step4 = () => (
     <div className="space-y-4">
        <p>The Project page is the central feature. It's organized into tabs for clear navigation.</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-background/50">
                <h4 className="font-semibold text-foreground mb-2">Tasks</h4>
                <p className="text-sm">A visual Kanban board (`To Do`, `In Progress`, `Done`) to track work.</p>
            </div>
             <div className="p-4 rounded-lg bg-background/50">
                <h4 className="font-semibold text-foreground mb-2">README</h4>
                <p className="text-sm">The project's homepage, editable in Markdown and synced with GitHub.</p>
            </div>
             <div className="p-4 rounded-lg bg-background/50">
                <h4 className="font-semibold text-foreground mb-2">Documents</h4>
                <p className="text-sm">A space for internal documentation (meeting notes, specifications).</p>
            </div>
             <div className="p-4 rounded-lg bg-background/50">
                <h4 className="font-semibold text-foreground mb-2">Announcements</h4>
                <p className="text-sm">To communicate important information to the project team.</p>
            </div>
            <div className="p-4 rounded-lg bg-background/50">
                <h4 className="font-semibold text-foreground mb-2">CodeSpace</h4>
                <p className="text-sm">A file explorer integrated with GitHub to read, edit, and generate code directly within FlowUp.</p>
            </div>
             <div className="p-4 rounded-lg bg-background/50">
                <h4 className="font-semibold text-foreground mb-2">Team & Settings</h4>
                <p className="text-sm">Manage members, their roles, and integrations like Discord webhooks.</p>
            </div>
        </div>
         <p className="pt-2">All logic is handled by Server Actions in `projects/[id]/actions.ts`, which ensures that permission rules are always enforced.</p>
    </div>
);

const Step5 = () => (
    <div className="space-y-4">
        <p>All AI features are built with Genkit, Google's open-source framework, for reliable and structured integration.</p>
        <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-background/50">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Workflow /> Flows & Schemas</CardTitle></CardHeader>
                <CardContent className="text-sm">
                   Each AI Studio tool corresponds to a Genkit "flow", a secure server-side TypeScript function. We use Zod schemas to strictly define inputs and outputs, ensuring the AI adheres to the expected data format.
                </CardContent>
            </Card>
             <Card className="bg-background/50">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BrainCircuit /> Available Tools</CardTitle></CardHeader>
                <CardContent className="text-sm">
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Project Idea Generator:</strong> Generates project ideas and task lists.</li>
                        <li><strong>Project Scaffolder:</strong> Creates a file tree and boilerplate code.</li>
                        <li><strong>Document Generator:</strong> Writes technical documentation.</li>
                        <li><strong>AI File Editor:</strong> Modifies an existing file from a prompt.</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
        <div className="p-4 rounded-lg bg-background/50 flex items-start gap-4 mt-4">
             <Bot className="h-8 w-8 text-primary mt-1 flex-shrink-0" />
            <div>
                <h4 className="font-semibold text-foreground">"Flowy" Assistant</h4>
                <p className="text-sm">A conversational chatbot available throughout the application to provide contextual help, such as creating a task or listing projects, using Genkit's "tools".</p>
            </div>
        </div>
    </div>
);

const Step6 = () => (
     <div className="space-y-4">
        <p>FlowUp integrates tools to connect users and facilitate communication.</p>
        <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-background/50">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Star /> Discover & Team</CardTitle></CardHeader>
                <CardContent className="text-sm">
                   The <strong>Discover</strong> page allows exploring public projects and community users. The <strong>Team</strong> page provides an overview of your collaborators and allows you to quickly start group or private conversations.
                </CardContent>
            </Card>
             <Card className="bg-background/50">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><MessageSquare /> Chat</CardTitle></CardHeader>
                <CardContent className="text-sm">
                  The chat system supports project conversations and direct messages. To simulate real-time without the complexity of WebSockets, it uses a **polling** technique (querying the server at regular intervals) for messages and the conversation list, and **optimistic updates** to give an impression of instant reactivity when sending messages.
                </CardContent>
            </Card>
        </div>
    </div>
);

const Step7 = () => (
    <div className="space-y-4">
        <p>Beyond projects, FlowUp offers tools for the entire community.</p>
        <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-background/50">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Megaphone /> Global Announcements</CardTitle></CardHeader>
                <CardContent className="text-sm">
                   Allows administrators to communicate important information (updates, maintenance) to all users.
                </CardContent>
            </Card>
            <Card className="bg-background/50">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Lightbulb /> Suggestion Box</CardTitle></CardHeader>
                <CardContent className="text-sm">
                  A democratic platform where users can propose improvements for FlowUp and vote on others' ideas.
                </CardContent>
            </Card>
        </div>
        <div className="p-4 rounded-lg bg-background/50 mt-4">
             <h4 className="font-semibold text-foreground mb-2 text-lg">Secure Vault</h4>
             <p className="text-sm">This is a special implementation of a FlowUp Project. On first access, the system automatically creates a **strictly private** project and an associated **private GitHub repository**, providing each user with a personal and secure space to store sensitive information like API keys.</p>
        </div>
    </div>
);

const Step8 = () => (
    <div className="space-y-4">
        <p>FlowUp is designed to be extensible and integrate with other tools via two API types.</p>
        <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-background/50">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><KeyRound /> OAuth Applications</CardTitle></CardHeader>
                <CardContent className="text-sm">
                   <p>Allows third-party developers to create applications that access a user's data **after their explicit consent**. This system follows the standard OAuth2 "Authorization Code Grant" flow for secure integration.</p>
                </CardContent>
            </Card>
             <Card className="bg-background/50">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Cpu /> FlowApps API</CardTitle></CardHeader>
                <CardContent className="text-sm">
                  <p>Enables custom automations and scripts via **Personal Access Tokens (PATs)**. Each token has specific permissions (scopes) that define what it can do. The API uses a single endpoint (`/api/v1/flow`) and requires user consent upon first access by a new application.</p>
                </CardContent>
            </Card>
        </div>
    </div>
);

const Step9 = () => (
    <div className="text-center space-y-6 py-16">
        <h2 className="text-4xl font-bold text-foreground">Thank you for your attention.</h2>
        <p className="text-xl text-muted-foreground">Any questions?</p>
         <Button size="lg" asChild className="!mt-10">
            <Link href="/dashboard">Go to the Application <ArrowRight className="ml-2 h-5 w-5"/></Link>
        </Button>
    </div>
);


const stepComponents: { [key: number]: { title: string; component: React.FC } } = {
    1: { title: "Introduction & Architecture", component: Step1 },
    2: { title: "Database Schema", component: Step2 },
    3: { title: "Authentication System", component: Step3 },
    4: { title: "Key Feature: The Project", component: Step4 },
    5: { title: "AI Integration with Genkit", component: Step5 },
    6: { title: "Collaboration & Communication", component: Step6 },
    7: { title: "Community Features", component: Step7 },
    8: { title: "Developer APIs", component: Step8 },
    9: { title: "Conclusion", component: Step9 },
};

export default function HlbStepPage() {
    const router = useRouter();
    const params = useParams();
    const currentStep = parseInt(params.step as string, 10);
    const stepContent = stepComponents[currentStep];

    useEffect(() => {
        if (isNaN(currentStep) || !stepContent) {
            router.push('/hlb/1');
        }
    }, [currentStep, stepContent, router]);
    
    if (isNaN(currentStep) || !stepContent) {
        return null; // Or a loading spinner
    }

    return (
        <PresentationFrame step={currentStep} title={stepContent.title}>
            <stepContent.component />
        </PresentationFrame>
    );
}
