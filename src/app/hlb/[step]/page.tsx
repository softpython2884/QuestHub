'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Database, Shield, Lock, Layers, Cpu, Users, MessageSquare, Star, KeyRound, Workflow, BrainCircuit, Bot, Megaphone, Lightbulb, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const PresentationFrame = ({ step, title, children }: { step: number, title: string, children: React.ReactNode }) => (
    <div className="w-full">
        <Card className="bg-card/80 backdrop-blur-sm border-white/10 w-full">
            <CardHeader>
                <CardTitle className="text-3xl font-bold tracking-tight">{title}</CardTitle>
                <CardDescription>Partie {step} de la présentation technique</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-muted-foreground text-base leading-relaxed">
                {children}
            </CardContent>
        </Card>
        <div className="mt-6 flex justify-between w-full">
            <Button variant="outline" asChild disabled={step <= 1}>
                <Link href={`/hlb/${step - 1}`}><ArrowLeft className="mr-2 h-4 w-4" /> Précédent</Link>
            </Button>
            <Button asChild disabled={step >= 9}>
                <Link href={`/hlb/${step + 1}`}>Suivant <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
        </div>
    </div>
);

const Step1 = () => (
    <div className="space-y-4">
        <p>
            FlowUp est une plateforme de gestion de projet conçue pour les développeurs, centralisant tous les outils nécessaires à la collaboration et à la productivité. Elle intègre la gestion des tâches, le code, la documentation, l'IA et la communication en temps réel.
        </p>
        <h3 className="font-semibold text-xl text-foreground pt-4">Stack Technique</h3>
        <ul className="list-disc pl-5 space-y-2">
            <li><strong>Next.js & React :</strong> Pour un frontend moderne, réactif et optimisé pour le SEO.</li>
            <li><strong>Tailwind CSS & ShadCN :</strong> Pour une interface utilisateur élégante, cohérente et rapidement développable.</li>
            <li><strong>Genkit (AI) :</strong> Pour toutes les fonctionnalités d'intelligence artificielle, de la génération de code à l'assistance.</li>
            <li><strong>SQLite :</strong> Pour une base de données légère, performante et facile à gérer, intégrée directement dans le projet.</li>
        </ul>
        <h3 className="font-semibold text-xl text-foreground pt-4">Architecture des Dossiers</h3>
        <ul className="list-disc pl-5 space-y-2">
            <li><code>/src/app</code> : Contient les routes, les pages et la logique backend (Server Actions).</li>
            <li><code>/src/components</code> : Composants React réutilisables.</li>
            <li><code>/src/lib</code> : Fonctions utilitaires, logique de base de données (db.ts) et d'authentification (authService.ts).</li>
            <li><code>/src/ai</code> : Tous les "flows" Genkit qui définissent le comportement de l'IA.</li>
        </ul>
    </div>
);

const Step2 = () => (
    <div className="space-y-4">
        <p>La base de données est le cœur du système. Elle est conçue pour être relationnelle et garantir l'intégrité des données.</p>
        <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-background/50">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users /> Tables Principales</CardTitle></CardHeader>
                <CardContent className="text-sm">
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>users :</strong> Stocke les informations des utilisateurs (profil, rôle, etc.).</li>
                        <li><strong>projects :</strong> Contient les détails de chaque projet (nom, propriétaire, visibilité).</li>
                        <li><strong>tasks :</strong> Gère les tâches individuelles liées à un projet.</li>
                    </ul>
                </CardContent>
            </Card>
            <Card className="bg-background/50">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Layers /> Tables de Liaison</CardTitle></CardHeader>
                <CardContent className="text-sm">
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>project_members :</strong> Associe les utilisateurs aux projets avec un rôle spécifique.</li>
                        <li><strong>task_tags :</strong> Lie les tags (étiquettes) aux tâches.</li>
                        <li><strong>conversation_members :</strong> Connecte les utilisateurs aux conversations de chat.</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
        <p className="pt-2">L'utilisation de clés étrangères (comme `projectUuid`) et de contraintes assure que les relations entre les données sont toujours valides, empêchant par exemple une tâche d'exister sans projet.</p>
    </div>
);

const Step3 = () => (
    <div className="space-y-4">
        <p>Le système d'authentification est sécurisé et flexible, basé sur des standards modernes.</p>
        <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-lg bg-background/50">
                <Shield className="h-8 w-8 text-primary mt-1" />
                <div>
                    <h4 className="font-semibold text-foreground">JWT & Cookies HttpOnly</h4>
                    <p className="text-sm">Après une connexion réussie, un JSON Web Token (JWT) est généré et stocké dans un cookie `HttpOnly`, le protégeant des attaques XSS car il est inaccessible par le JavaScript côté client.</p>
                </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg bg-background/50">
                <Lock className="h-8 w-8 text-primary mt-1" />
                <div>
                    <h4 className="font-semibold text-foreground">Middleware & Server Actions</h4>
                    <p className="text-sm">Chaque requête sensible est validée par un middleware (`authEdge.ts`) qui vérifie le JWT. La logique métier (connexion, inscription) est gérée par des "Server Actions" (`authService.ts`), garantissant que toutes les opérations critiques sont exécutées côté serveur.</p>
                </div>
            </div>
             <div className="flex items-start gap-4 p-4 rounded-lg bg-background/50">
                <GitBranch className="h-8 w-8 text-primary mt-1" />
                <div>
                    <h4 className="font-semibold text-foreground">Flux OAuth (GitHub & Discord)</h4>
                    <p className="text-sm">FlowUp utilise le flux OAuth2 pour la connexion et la liaison de compte. Si l'utilisateur est déjà connecté à FlowUp, le service tiers est simplement lié. Sinon, le système crée un nouveau compte FlowUp ou se connecte à un compte existant basé sur l'adresse e-mail, assurant une expérience fluide.</p>
                </div>
            </div>
        </div>
    </div>
);

const Step4 = () => (
     <div className="space-y-4">
        <p>La page Projet est la fonctionnalité centrale. Elle est organisée en onglets pour une navigation claire.</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-background/50">
                <h4 className="font-semibold text-foreground mb-2">Tasks</h4>
                <p className="text-sm">Un tableau Kanban visuel (`To Do`, `In Progress`, `Done`) pour suivre le travail.</p>
            </div>
             <div className="p-4 rounded-lg bg-background/50">
                <h4 className="font-semibold text-foreground mb-2">README</h4>
                <p className="text-sm">La page d'accueil du projet, éditable en Markdown et synchronisée avec GitHub.</p>
            </div>
             <div className="p-4 rounded-lg bg-background/50">
                <h4 className="font-semibold text-foreground mb-2">Documents</h4>
                <p className="text-sm">Un espace pour la documentation interne (notes de réunion, spécifications).</p>
            </div>
             <div className="p-4 rounded-lg bg-background/50">
                <h4 className="font-semibold text-foreground mb-2">Announcements</h4>
                <p className="text-sm">Pour communiquer les informations importantes à l'équipe du projet.</p>
            </div>
            <div className="p-4 rounded-lg bg-background/50">
                <h4 className="font-semibold text-foreground mb-2">CodeSpace</h4>
                <p className="text-sm">Un explorateur de fichiers intégré à GitHub pour lire, modifier et générer du code directement dans FlowUp.</p>
            </div>
             <div className="p-4 rounded-lg bg-background/50">
                <h4 className="font-semibold text-foreground mb-2">Team & Settings</h4>
                <p className="text-sm">Gérer les membres, leurs rôles, et les intégrations comme les webhooks Discord.</p>
            </div>
        </div>
         <p className="pt-2">Toute la logique est gérée par des "Server Actions" dans `projects/[id]/actions.ts`, ce qui garantit que les règles de permissions sont toujours respectées.</p>
    </div>
);

const Step5 = () => (
    <div className="space-y-4">
        <p>Toutes les fonctionnalités d'IA sont construites avec Genkit, le framework open-source de Google, pour une intégration fiable et structurée.</p>
        <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-background/50">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Workflow /> Flows & Schémas</CardTitle></CardHeader>
                <CardContent className="text-sm">
                   Chaque outil de l'AI Studio correspond à un "flow" Genkit, une fonction TypeScript sécurisée côté serveur. Nous utilisons des schémas Zod pour définir strictement les entrées et les sorties, garantissant que l'IA respecte le format de données attendu.
                </CardContent>
            </Card>
             <Card className="bg-background/50">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BrainCircuit /> Outils Disponibles</CardTitle></CardHeader>
                <CardContent className="text-sm">
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Project Idea Generator :</strong> Génère des idées de projets et des listes de tâches.</li>
                        <li><strong>Project Scaffolder :</strong> Crée une arborescence de fichiers et le code de base.</li>
                        <li><strong>Document Generator :</strong> Rédige de la documentation technique.</li>
                        <li><strong>AI File Editor :</strong> Modifie un fichier existant à partir d'un prompt.</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
        <div className="p-4 rounded-lg bg-background/50 flex items-start gap-4 mt-4">
             <Bot className="h-8 w-8 text-primary mt-1 flex-shrink-0" />
            <div>
                <h4 className="font-semibold text-foreground">Assistant "Flowy"</h4>
                <p className="text-sm">Un chatbot conversationnel disponible dans toute l'application pour fournir de l'aide contextuelle, comme créer une tâche ou lister des projets, en utilisant les "tools" de Genkit.</p>
            </div>
        </div>
    </div>
);

const Step6 = () => (
     <div className="space-y-4">
        <p>FlowUp intègre des outils pour connecter les utilisateurs et faciliter la communication.</p>
        <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-background/50">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Star /> Discover & Team</CardTitle></CardHeader>
                <CardContent className="text-sm">
                   La page <strong>Discover</strong> permet d'explorer les projets publics et les utilisateurs de la communauté. La page <strong>Team</strong> offre une vue d'ensemble de vos collaborateurs et permet de lancer rapidement des conversations de groupe ou privées.
                </CardContent>
            </Card>
             <Card className="bg-background/50">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><MessageSquare /> Chat</CardTitle></CardHeader>
                <CardContent className="text-sm">
                  Le système de chat supporte les conversations de projet et les messages directs. Pour simuler le temps réel sans la complexité des WebSockets, il utilise une technique de **polling** (interrogation du serveur à intervalle régulier) pour les messages et la liste des conversations, et une **mise à jour optimiste** pour donner une impression de réactivité instantanée lors de l'envoi de messages.
                </CardContent>
            </Card>
        </div>
    </div>
);

const Step7 = () => (
    <div className="space-y-4">
        <p>Au-delà des projets, FlowUp offre des outils pour toute la communauté.</p>
        <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-background/50">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Megaphone /> Annonces Globales</CardTitle></CardHeader>
                <CardContent className="text-sm">
                   Permet aux administrateurs de communiquer des informations importantes (mises à jour, maintenances) à tous les utilisateurs.
                </CardContent>
            </Card>
            <Card className="bg-background/50">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Lightbulb /> Boîte à Suggestions</CardTitle></CardHeader>
                <CardContent className="text-sm">
                  Une plateforme démocratique où les utilisateurs peuvent proposer des améliorations pour FlowUp et voter pour les idées des autres.
                </CardContent>
            </Card>
        </div>
        <div className="p-4 rounded-lg bg-background/50 mt-4">
             <h4 className="font-semibold text-foreground mb-2 text-lg">Coffre-Fort Sécurisé (Secure Vault)</h4>
             <p className="text-sm">Il s'agit d'une implémentation spéciale d'un Projet FlowUp. Lors du premier accès, le système crée automatiquement un projet **strictement privé** et un **dépôt GitHub privé** associé, offrant à chaque utilisateur un espace personnel et sécurisé pour stocker des informations sensibles comme des clés d'API.</p>
        </div>
    </div>
);

const Step8 = () => (
    <div className="space-y-4">
        <p>FlowUp est conçu pour être extensible et s'intégrer à d'autres outils via deux types d'API.</p>
        <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-background/50">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><KeyRound /> Applications OAuth</CardTitle></CardHeader>
                <CardContent className="text-sm">
                   <p>Permet à des développeurs tiers de créer des applications qui accèdent aux données d'un utilisateur **après son consentement explicite**. Ce système suit le flux standard OAuth2 "Authorization Code Grant" pour une intégration sécurisée.</p>
                </CardContent>
            </Card>
             <Card className="bg-background/50">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Cpu /> API FlowApps</CardTitle></CardHeader>
                <CardContent className="text-sm">
                  <p>Permet des automations et des scripts personnalisés via des **jetons d'accès personnels (PAT)**. Chaque jeton a des permissions spécifiques (scopes) qui définissent ce qu'il peut faire. L'API utilise un point d'entrée unique (`/api/v1/flow`) et nécessite un consentement de l'utilisateur lors du premier accès par une nouvelle application.</p>
                </CardContent>
            </Card>
        </div>
    </div>
);

const Step9 = () => (
    <div className="text-center space-y-6 py-16">
        <h2 className="text-4xl font-bold text-foreground">Merci de votre attention.</h2>
        <p className="text-xl text-muted-foreground">Des questions ?</p>
         <Button size="lg" asChild className="!mt-10">
            <Link href="/dashboard">Accéder à l'application <ArrowRight className="ml-2 h-5 w-5"/></Link>
        </Button>
    </div>
);


const stepComponents: { [key: number]: { title: string; component: React.FC } } = {
    1: { title: "Introduction & Architecture", component: Step1 },
    2: { title: "Schéma de la Base de Données", component: Step2 },
    3: { title: "Système d'Authentification", component: Step3 },
    4: { title: "Fonctionnalité Clé : Le Projet", component: Step4 },
    5: { title: "Intégration de l'IA avec Genkit", component: Step5 },
    6: { title: "Collaboration & Communication", component: Step6 },
    7: { title: "Fonctionnalités Communautaires", component: Step7 },
    8: { title: "APIs pour Développeurs", component: Step8 },
    9: { title: "Conclusion", component: Step9 },
};

export default function HlbStepPage({ params }: { params: { step: string } }) {
    const router = useRouter();
    const currentStep = parseInt(params.step, 10);
    const stepContent = stepComponents[currentStep];

    if (isNaN(currentStep) || !stepContent) {
        router.push('/hlb/1');
        return null;
    }

    return (
        <PresentationFrame step={currentStep} title={stepContent.title}>
            <stepContent.component />
        </PresentationFrame>
    );
}
