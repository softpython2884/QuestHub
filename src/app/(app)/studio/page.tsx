
'use client';

import { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  generateProjectIdeasAction,
  generateProjectScaffoldAction,
  generateDocumentContentAction,
  addScaffoldToProjectAction,
  createProjectFromAIAction,
} from './actions';
import { fetchProjectsAction } from '../projects/actions';
import type { Project } from '@/types';
import type { GenerateProjectIdeasOutput } from '@/ai/flows/generate-project-ideas';
import type { GenerateProjectScaffoldOutput } from '@/ai/flows/generate-project-scaffold';
import type { GenerateDocumentContentOutput } from '@/ai/flows/generate-document-content';
import { BrainCircuit, Bot, FileCode, FileText, Lightbulb, Loader2, Sparkles, FolderGit2, Rocket } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

type AIGeneratorTool = 'ideas' | 'scaffold' | 'docs' | 'kickstart';

export default function StudioPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { user } = useAuth();
    const [isPending, startTransition] = useTransition();
    
    // State for each tool
    const [prompt, setPrompt] = useState('');
    const [activeDialog, setActiveDialog] = useState<AIGeneratorTool | null>(null);
    const [ideaResult, setIdeaResult] = useState<GenerateProjectIdeasOutput | null>(null);
    const [scaffoldResult, setScaffoldResult] = useState<GenerateProjectScaffoldOutput | null>(null);
    const [docResult, setDocResult] = useState<GenerateDocumentContentOutput | null>(null);

    // State for adding scaffold to project
    const [isAddToProjectDialogOpen, setIsAddToProjectDialogOpen] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);
    const [selectedProjectUuid, setSelectedProjectUuid] = useState<string | null>(null);
    const [isAddingToProject, startAddingToProjectTransition] = useTransition();

    useEffect(() => {
        if (user) {
            setIsLoadingProjects(true);
            fetchProjectsAction(user.uuid)
                .then(setProjects)
                .catch(err => toast({ variant: 'destructive', title: 'Error', description: 'Could not load your projects.' }))
                .finally(() => setIsLoadingProjects(false));
        }
    }, [user, toast]);

    const handleGenerate = (tool: AIGeneratorTool) => {
        if (!prompt.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Prompt cannot be empty.' });
            return;
        }

        startTransition(async () => {
            let result;
            try {
                if (tool === 'ideas') {
                    result = await generateProjectIdeasAction(prompt);
                    if (result.data) setIdeaResult(result.data);
                } else if (tool === 'scaffold') {
                    result = await generateProjectScaffoldAction(prompt);
                    if (result.data) setScaffoldResult(result.data);
                } else if (tool === 'docs') {
                    result = await generateDocumentContentAction(prompt);
                    if (result.data) setDocResult(result.data);
                } else if (tool === 'kickstart') {
                    result = await createProjectFromAIAction(prompt);
                    if (result.data) {
                        toast({ title: 'Project Created!', description: `Successfully created "${result.data.name}". Redirecting...` });
                        router.push(`/projects/${result.data.uuid}`);
                    }
                }

                if (result?.error) {
                    toast({ variant: 'destructive', title: 'Generation Failed', description: result.error });
                }
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'Error', description: e.message || "An unexpected error occurred." });
            }
        });
    };
    
    const handleAddToProject = () => {
        if (!selectedProjectUuid || !scaffoldResult) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a project.' });
            return;
        }

        startAddingToProjectTransition(async () => {
            const result = await addScaffoldToProjectAction(selectedProjectUuid, scaffoldResult.files);
            if (result.errorCount > 0) {
                toast({
                    variant: 'destructive',
                    duration: 10000,
                    title: 'Error Adding Files',
                    description: (
                        <div>
                            <p>{result.successCount} files added, {result.errorCount} failed.</p>
                            <ul className="list-disc pl-5 mt-2">
                                {result.errors.slice(0, 3).map((e, i) => <li key={i} className="text-xs">{e}</li>)}
                            </ul>
                        </div>
                    )
                });
            } else {
                toast({
                    title: 'Success!',
                    description: `${result.successCount} files were added to your project.`
                });
                setIsAddToProjectDialogOpen(false);
                setSelectedProjectUuid(null);
            }
        });
    }

    const openDialog = (tool: AIGeneratorTool) => {
        setPrompt('');
        setIdeaResult(null);
        setScaffoldResult(null);
        setDocResult(null);
        setActiveDialog(tool);
    };

    const renderResult = () => {
        if (activeDialog === 'ideas' && ideaResult) {
            return (
                <div className="mt-4 space-y-4">
                    <h4 className="font-semibold">Generated Ideas</h4>
                    <Accordion type="single" collapsible className="w-full">
                        {ideaResult.projectIdeas.map((idea, index) => (
                            <AccordionItem value={`item-${index}`} key={index}>
                                <AccordionTrigger>{idea}</AccordionTrigger>
                                <AccordionContent>
                                    <h5 className="font-medium mb-2">Suggested Tasks:</h5>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm dark:prose-invert max-w-none">
                                        {ideaResult.taskLists[index] || "No tasks suggested."}
                                    </ReactMarkdown>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            );
        }
        if (activeDialog === 'scaffold' && scaffoldResult) {
             return (
                <div className="mt-4 space-y-4">
                    <h4 className="font-semibold">Generated Project Files ({scaffoldResult.files.length})</h4>
                    <Accordion type="single" collapsible className="w-full">
                        {scaffoldResult.files.map((file, index) => (
                            <AccordionItem value={`file-${index}`} key={index}>
                                <AccordionTrigger className="font-mono text-sm">{file.filePath}</AccordionTrigger>
                                <AccordionContent>
                                    <pre className="p-2 border rounded-md bg-muted/50 text-xs overflow-x-auto">
                                        <code>{file.content}</code>
                                    </pre>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                    <div className="pt-4 border-t">
                        <Button onClick={() => setIsAddToProjectDialogOpen(true)} disabled={isLoadingProjects}>
                            <FolderGit2 className="mr-2 h-4 w-4" /> Add to Project
                        </Button>
                         {isLoadingProjects && <p className="text-xs text-muted-foreground mt-1">Loading projects...</p>}
                    </div>
                </div>
            );
        }
         if (activeDialog === 'docs' && docResult) {
            return (
                <div className="mt-4 space-y-4">
                    <h4 className="font-semibold">Generated Document</h4>
                    <div className="prose dark:prose-invert max-w-none p-4 border rounded-md bg-muted/50">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{docResult.markdownContent}</ReactMarkdown>
                    </div>
                </div>
            );
        }
        return null;
    };

    const studioTools = [
         {
            tool: 'kickstart' as AIGeneratorTool,
            icon: Rocket,
            title: 'Project Kick-starter',
            description: "Describe your project idea, and the AI will generate a name, description, README, and create the project for you instantly.",
        },
        {
            tool: 'ideas' as AIGeneratorTool,
            icon: Lightbulb,
            title: 'Project Idea Generator',
            description: "Stuck in a rut? Describe a concept or technology and get a list of project ideas and initial task lists to get you started.",
        },
        {
            tool: 'scaffold' as AIGeneratorTool,
            icon: FolderGit2,
            title: 'Project Scaffolder',
            description: "Describe a simple application, and the AI will generate a complete file structure with starter code for HTML, CSS, JS, Python, and more.",
        },
         {
            tool: 'docs' as AIGeneratorTool,
            icon: FileText,
            title: 'Document Generator',
            description: "Automate your documentation. Provide a prompt about a feature or process, and the AI will generate comprehensive Markdown documentation.",
        },
         {
            tool: 'fileEditor' as const, // Not a generator tool
            icon: FileCode,
            title: 'AI File Editor',
            description: "Edit code and text files with natural language. Open a file in a project's CodeSpace and use the AI assistant to apply changes.",
            isLink: true,
            href: '/projects'
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-headline font-semibold flex items-center gap-2"><Sparkles className="text-primary"/>AI Studio</h1>
                <p className="text-muted-foreground">A suite of powerful AI tools to accelerate your development workflow.</p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {studioTools.map(tool => (
                    <Card key={tool.tool} className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><tool.icon className="h-6 w-6 text-primary"/>{tool.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <p className="text-sm text-muted-foreground">{tool.description}</p>
                        </CardContent>
                        <CardFooter>
                            {tool.isLink ? (
                                <Button className="w-full" asChild><Link href={tool.href!}>Go to CodeSpace</Link></Button>
                            ) : (
                                <Dialog onOpenChange={(open) => !open && setActiveDialog(null)}>
                                    <DialogTrigger asChild>
                                        <Button className="w-full" onClick={() => openDialog(tool.tool)}>Launch Generator</Button>
                                    </DialogTrigger>
                                </Dialog>
                            )}
                        </CardFooter>
                    </Card>
                ))}
            </div>

            <Dialog open={!!activeDialog} onOpenChange={(open) => !open && setActiveDialog(null)}>
                <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                           <Sparkles className="h-5 w-5 text-primary"/>
                           {studioTools.find(t => t.tool === activeDialog)?.title || 'AI Generator'}
                        </DialogTitle>
                         <DialogDescription>
                            Enter your prompt below and let the AI work its magic.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 flex-grow flex flex-col min-h-0">
                        <Label htmlFor="ai-prompt">Your Prompt</Label>
                        <Textarea
                            id="ai-prompt"
                            placeholder="e.g., 'A simple to-do list app using React and Tailwind CSS' or 'Generate project ideas for a weekend hackathon using Genkit'"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            rows={4}
                        />
                        <div className="pt-2 flex-grow min-h-0">
                           <ScrollArea className="h-full pr-4 -mr-4">
                            {isPending ? (
                                <div className="flex items-center justify-center h-full flex-col gap-3 text-muted-foreground">
                                    <BrainCircuit className="h-12 w-12 animate-pulse text-primary"/>
                                    <p>Generating... please wait.</p>
                                </div>
                            ) : renderResult()}
                           </ScrollArea>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost" disabled={isPending}>Close</Button></DialogClose>
                        <Button type="button" onClick={() => handleGenerate(activeDialog!)} disabled={isPending || !prompt}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Generate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <Dialog open={isAddToProjectDialogOpen} onOpenChange={setIsAddToProjectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Scaffold to Project</DialogTitle>
                        <DialogDescription>Select a project to add the {scaffoldResult?.files.length || 0} generated files to its GitHub repository.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <Label htmlFor="project-select">Target Project</Label>
                        <Select
                            value={selectedProjectUuid || ""}
                            onValueChange={setSelectedProjectUuid}
                            disabled={isLoadingProjects || isAddingToProject}
                        >
                            <SelectTrigger id="project-select">
                                <SelectValue placeholder={isLoadingProjects ? "Loading projects..." : "Select a project..."} />
                            </SelectTrigger>
                            <SelectContent>
                                {projects.filter(p => p.githubRepoName).map(project => (
                                    <SelectItem key={project.uuid} value={project.uuid}>
                                        {project.name}
                                    </SelectItem>
                                ))}
                                {projects.filter(p => !p.githubRepoName).length > 0 && (
                                    <p className="p-2 text-xs text-muted-foreground">Some projects are not shown because they are not linked to GitHub.</p>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="ghost" disabled={isAddingToProject}>Cancel</Button></DialogClose>
                        <Button onClick={handleAddToProject} disabled={isAddingToProject || !selectedProjectUuid}>
                            {isAddingToProject && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add Files to Project
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
