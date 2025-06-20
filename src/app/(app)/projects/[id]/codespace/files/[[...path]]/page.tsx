
'use client';

import { useEffect, useState, Suspense, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as UIAlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"; // Renamed to avoid conflict
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Folder, FileText, FileCode, Loader2, AlertTriangle, Home, ChevronRight, ExternalLink, Image as ImageIcon, Download, Edit, Save, UploadCloud, FolderPlus, FilePlus, Trash2, RefreshCw, FileEdit, Sparkles } from 'lucide-react';
import {
  getRepoContentsAction,
  getFileContentAction,
  fetchProjectAction,
  saveFileContentAction,
  createGithubFileAction,
  createGithubFolderAction,
  deleteGithubFileAction,
  generateProjectFilesWithAIAction,
  type GenerateProjectFilesAIFormState,
  editFileWithAIAction,
  type EditFileContentAIOutput,
} from '@/app/(app)/projects/[id]/actions';
import type { GithubRepoContentItem, Project } from '@/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Badge } from '@/components/ui/badge';
import NextImage from 'next/image';
import { useForm } from 'react-hook-form';
import { useActionState, startTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';


const TEXT_EXTENSIONS = ['.txt', '.log', '.json', '.yaml', '.yml', '.xml', '.html', '.css', '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.php', '.rb', '.go', '.sh', '.gitignore', '.env', '.config', '.cfg', '.ini', '.sql', '.r', '.swift', '.kt', '.kts', '.rs', '.toml', '.lua', '.pl', '.dart', '.ex', '.exs', '.erl', '.hrl', '.vue', '.svelte', '.tf', '.tfvars', '.hcl', '.gradle', '.diff', '.patch', '.csv', '.tsv', '.ps1', '.psm1', '.fish', '.zsh', '.bash'];
const MARKDOWN_EXTENSIONS = ['.md', '.markdown', '.mdown', '.mkdn'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp', '.tiff'];


const newFileFormSchema = z.object({
  fileName: z.string().min(1, "File name is required.").refine(name => !name.includes('/'), "File name cannot contain slashes. Include path in the main path if needed."),
  initialContent: z.string().optional(),
});
type NewFileFormValues = z.infer<typeof newFileFormSchema>;

const newFolderFormSchema = z.object({
  folderName: z.string().min(1, "Folder name is required.").refine(name => !name.includes('/'), "Folder name cannot contain slashes."),
});
type NewFolderFormValues = z.infer<typeof newFolderFormSchema>;

const aiScaffoldFormSchema = z.object({
  prompt: z.string().min(10, "Prompt must be at least 10 characters.").max(2000, "Prompt is too long."),
});
type AiScaffoldFormValues = z.infer<typeof aiScaffoldFormSchema>;

const aiEditFileFormSchema = z.object({
  aiEditPrompt: z.string().min(5, "Prompt must be at least 5 characters.").max(1000, "Prompt is too long."),
});
type AiEditFileFormValues = z.infer<typeof aiEditFileFormSchema>;


function getFileExtension(filename: string): string {
  return (filename.split('.').pop() || '').toLowerCase();
}

function FileExplorerContent() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const projectUuid = params.id as string;

  const filePathArray = useMemo(() => (params.path || []) as string[], [params.path]);
  const currentPath = useMemo(() => filePathArray.join('/'), [filePathArray]);

  const [project, setProject] = useState<Project | null>(null);
  const [contents, setContents] = useState<GithubRepoContentItem[]>([]);
  const [fileData, setFileData] = useState<{ name: string; path: string; content: string; type: 'md' | 'image' | 'html' | 'text' | 'other'; downloadUrl?: string | null, encoding?: string, sha: string } | null>(null);

  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [isLoadingPathContent, setIsLoadingPathContent] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isViewingFile, setIsViewingFile] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState('');
  const [isSavingFile, setIsSavingFile] = useState(false);

  const [isCreateFileModalOpen, setIsCreateFileModalOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isProcessingCreate, setIsProcessingCreate] = useState(false);

  const [contentToDelete, setContentToDelete] = useState<GithubRepoContentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isAiScaffoldModalOpen, setIsAiScaffoldModalOpen] = useState(false);
  const aiScaffoldForm = useForm<AiScaffoldFormValues>({ resolver: zodResolver(aiScaffoldFormSchema), defaultValues: { prompt: ''}});
  const [aiScaffoldState, aiScaffoldFormAction, isAiScaffolding] = useActionState(generateProjectFilesWithAIAction, { message: "", error: ""});

  const [isAiEditFileModalOpen, setIsAiEditFileModalOpen] = useState(false);
  const aiEditFileForm = useForm<AiEditFileFormValues>({ resolver: zodResolver(aiEditFileFormSchema), defaultValues: { aiEditPrompt: ''}});
  const [isAiEditingFile, setIsAiEditingFile] = useState(false);


  const newFileForm = useForm<NewFileFormValues>({ resolver: zodResolver(newFileFormSchema), defaultValues: { fileName: '', initialContent: ''}});
  const newFolderForm = useForm<NewFolderFormValues>({ resolver: zodResolver(newFolderFormSchema), defaultValues: { folderName: ''}});


  const loadContent = useCallback(async (pathToLoad: string) => {
    if (!project || !project.githubRepoName || authLoading || isLoadingProject) {
      return;
    }
    setIsLoadingPathContent(true);
    setError(null);
    setFileData(null);
    setIsViewingFile(false);

    try {
      const extension = pathToLoad.includes('.') ? getFileExtension(pathToLoad.split('/').pop()!) : null;
      const isFileCandidate = !!extension && !pathToLoad.endsWith('/');

      if (isFileCandidate) {
        const fetchedFileData = await getFileContentAction(projectUuid, pathToLoad);
        if ('content' in fetchedFileData && fetchedFileData.sha) {
          let fileDisplayType: 'md' | 'image' | 'html' | 'text' | 'other' = 'other';
          if (MARKDOWN_EXTENSIONS.includes(`.${extension}`)) fileDisplayType = 'md';
          else if (IMAGE_EXTENSIONS.includes(`.${extension}`)) fileDisplayType = 'image';
          else if (extension === 'html') fileDisplayType = 'html';
          else if (TEXT_EXTENSIONS.includes(`.${extension}`) || fetchedFileData.encoding === 'utf-8' || !fetchedFileData.encoding) fileDisplayType = 'text';

          setFileData({
            name: pathToLoad.split('/').pop()!,
            path: pathToLoad,
            content: fetchedFileData.content,
            type: fileDisplayType,
            downloadUrl: fetchedFileData.download_url,
            encoding: fetchedFileData.encoding,
            sha: fetchedFileData.sha,
          });
          setEditingContent(fetchedFileData.content);
          setIsViewingFile(true);
        } else {
          setError(fetchedFileData.error || "Failed to load file content.");
          setIsViewingFile(false);
        }
      } else {
        const dirData = await getRepoContentsAction(projectUuid, pathToLoad);
        if (Array.isArray(dirData)) {
          setContents(dirData.sort((a, b) => {
            if (a.type === 'dir' && b.type !== 'dir') return -1;
            if (a.type !== 'dir' && b.type === 'dir') return 1;
            return a.name.localeCompare(b.name);
          }));
        } else {
          setError(dirData.error || "Failed to fetch repository contents.");
        }
      }
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred while loading content.');
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsLoadingPathContent(false);
    }
  }, [projectUuid, project, authLoading, isLoadingProject, toast]);


  useEffect(() => {
    if (!projectUuid || authLoading) return;
    if (!user) {
        router.push('/login');
        return;
    }
    setIsLoadingProject(true);
    fetchProjectAction(projectUuid)
      .then((fetchedProject) => {
        if (!fetchedProject) {
          setError("Project not found or access denied.");
          setProject(null);
        } else {
          setProject(fetchedProject);
          if (!fetchedProject.githubRepoName) {
            setError("Project is not linked to a GitHub repository.");
            setIsLoadingPathContent(false);
          }
        }
      })
      .catch(err => {
        setError("Failed to load project details.");
        setProject(null);
      })
      .finally(() => {
        setIsLoadingProject(false);
      });
  }, [projectUuid, user, authLoading, router]);


  useEffect(() => {
    if (project && project.githubRepoName && !isLoadingProject) {
        loadContent(currentPath);
    } else if (project && !project.githubRepoName && !isLoadingProject) {
      setIsLoadingPathContent(false);
    }
  }, [project, isLoadingProject, currentPath, loadContent]);


  const handleSaveFile = async () => {
    if (!project || !fileData) return;
    setIsSavingFile(true);
    const result = await saveFileContentAction(project.uuid, fileData.path, editingContent, fileData.sha, `Update ${fileData.name} via FlowUp`);
    setIsSavingFile(false);
    if (result.success && result.newSha) {
      toast({ title: "File Saved", description: `${fileData.name} has been updated.` });
      setFileData(prev => prev ? { ...prev, content: editingContent, sha: result.newSha! } : null);
      setIsEditModalOpen(false);
    } else {
      toast({ variant: "destructive", title: "Save Error", description: result.error || "Failed to save file." });
    }
  };

  const handleCreateFile = async (values: NewFileFormValues) => {
    if (!project) return;
    setIsProcessingCreate(true);
    const fullPath = currentPath ? `${currentPath}/${values.fileName}` : values.fileName;
    const result = await createGithubFileAction(project.uuid, fullPath, values.initialContent || '', `Create ${values.fileName} via FlowUp`);
    setIsProcessingCreate(false);
    if (result.success) {
      toast({ title: "File Created", description: `${values.fileName} created successfully.`});
      setIsCreateFileModalOpen(false);
      newFileForm.reset();
      loadContent(currentPath);
    } else {
      toast({ variant: "destructive", title: "Creation Error", description: result.error || "Failed to create file."});
    }
  };

  const handleCreateFolder = async (values: NewFolderFormValues) => {
    if (!project) return;
    setIsProcessingCreate(true);
    const fullPath = currentPath ? `${currentPath}/${values.folderName}` : values.folderName;
    const result = await createGithubFolderAction(project.uuid, fullPath, `Create folder ${values.folderName} via FlowUp`);
    setIsProcessingCreate(false);
    if (result.success) {
      toast({ title: "Folder Created", description: `${values.folderName} created successfully.`});
      setIsCreateFolderModalOpen(false);
      newFolderForm.reset();
      loadContent(currentPath);
    } else {
      toast({ variant: "destructive", title: "Creation Error", description: result.error || "Failed to create folder."});
    }
  };

  const handleDeleteFile = async () => {
    if (!project || !contentToDelete || contentToDelete.type === 'dir') return;
    setIsDeleting(true);
    const result = await deleteGithubFileAction(project.uuid, contentToDelete.path, contentToDelete.sha, `Delete ${contentToDelete.name} via FlowUp`);
    setIsDeleting(false);
    if (result.success) {
      toast({ title: "File Deleted", description: `${contentToDelete.name} deleted successfully.`});
      setContentToDelete(null);
      if (isViewingFile && fileData?.path === contentToDelete.path) {
        const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
        router.push(`/projects/${projectUuid}/codespace/files${parentPath ? '/' + parentPath : ''}`);
      } else {
        loadContent(currentPath);
      }
    } else {
      toast({ variant: "destructive", title: "Deletion Error", description: result.error || "Failed to delete file."});
    }
  };

  const handleAiScaffoldSubmit = (values: AiScaffoldFormValues) => {
    if (!project) return;
    const formData = new FormData();
    formData.append('projectUuid', project.uuid);
    formData.append('prompt', values.prompt);
    formData.append('basePath', currentPath);
    startTransition(() => {
        aiScaffoldFormAction(formData);
    });
  };

  useEffect(() => {
    if (!isAiScaffolding && aiScaffoldState) {
        if (aiScaffoldState.message && !aiScaffoldState.error) {
            toast({ title: "AI Scaffold Success", description: aiScaffoldState.message });
            setIsAiScaffoldModalOpen(false);
            aiScaffoldForm.reset();
            loadContent(currentPath);
        }
        if (aiScaffoldState.error) {
            toast({ variant: "destructive", title: "AI Scaffold Error", description: aiScaffoldState.error });
        }
    }
  }, [aiScaffoldState, isAiScaffolding, toast, loadContent, currentPath, aiScaffoldForm]);

  const handleAiEditFile = async (values: AiEditFileFormValues) => {
    if (!project || !fileData || !editingContent) return;
    setIsAiEditingFile(true);
    try {
      const result: EditFileContentAIOutput | { error: string } = await editFileWithAIAction(project.uuid, editingContent, values.aiEditPrompt);
      if ('newContent' in result) {
        setEditingContent(result.newContent);
        toast({ title: "AI Edit Success", description: "Content updated by AI." });
        setIsAiEditFileModalOpen(false);
        aiEditFileForm.reset();
      } else {
        toast({ variant: "destructive", title: "AI Edit Error", description: result.error || "AI failed to edit content." });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "AI Edit Error", description: error.message || "An unexpected error occurred." });
    } finally {
      setIsAiEditingFile(false);
    }
  };

  const getBreadcrumbs = () => {
    const crumbs = [{ name: project?.githubRepoName || 'Repository Root', path: '', isRoot: true }];
    let currentCrumbPath = '';
    filePathArray.forEach(segment => {
      currentCrumbPath += (currentCrumbPath ? '/' : '') + segment;
      crumbs.push({ name: segment, path: currentCrumbPath, isRoot: false });
    });
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  const canEditCurrentFile = fileData && (fileData.type === 'text' || fileData.type === 'md' || fileData.type === 'html');
  const isLoadingPage = authLoading || isLoadingProject || isLoadingPathContent;


  if (isLoadingPage && !error && !project?.githubRepoName) {
    return (
      <div className="space-y-6">
         <div className="flex justify-between items-center">
             <Skeleton className="h-9 w-48" />
        </div>
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-1/2 mb-2" />
                <Skeleton className="h-5 w-3/4" />
                <div className="mt-2 flex space-x-1 pb-1 border-t pt-2">
                    <Skeleton className="h-5 w-16" /> <Skeleton className="h-5 w-4" /> <Skeleton className="h-5 w-20" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
            </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <Button variant="outline" onClick={() => router.push(`/projects/${projectUuid}?tab=codespace`)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to CodeSpace Overview
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
            <Dialog open={isCreateFileModalOpen} onOpenChange={setIsCreateFileModalOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isViewingFile || !project?.githubRepoName || isLoadingPathContent}>
                        <FilePlus className="mr-2 h-4 w-4" /> Create File
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader><DialogTitle>Create New File in /{currentPath}</DialogTitle></DialogHeader>
                    <form onSubmit={newFileForm.handleSubmit(handleCreateFile)} className="space-y-4">
                        <div>
                            <Label htmlFor="fileName">File Name (e.g., notes.txt, script.js)</Label>
                            <Input id="fileName" {...newFileForm.register("fileName")} />
                            {newFileForm.formState.errors.fileName && <p className="text-sm text-destructive">{newFileForm.formState.errors.fileName.message}</p>}
                        </div>
                        <div>
                            <Label htmlFor="initialContent">Initial Content (Optional)</Label>
                            <Textarea id="initialContent" {...newFileForm.register("initialContent")} rows={5} />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="ghost" disabled={isProcessingCreate}>Cancel</Button></DialogClose>
                            <Button type="submit" disabled={isProcessingCreate}>
                                {isProcessingCreate ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Create File
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={isCreateFolderModalOpen} onOpenChange={setIsCreateFolderModalOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isViewingFile || !project?.githubRepoName || isLoadingPathContent}>
                        <FolderPlus className="mr-2 h-4 w-4" /> Create Folder
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader><DialogTitle>Create New Folder in /{currentPath}</DialogTitle></DialogHeader>
                     <form onSubmit={newFolderForm.handleSubmit(handleCreateFolder)} className="space-y-4">
                        <div>
                            <Label htmlFor="folderName">Folder Name (e.g., components, assets)</Label>
                            <Input id="folderName" {...newFolderForm.register("folderName")} />
                            {newFolderForm.formState.errors.folderName && <p className="text-sm text-destructive">{newFolderForm.formState.errors.folderName.message}</p>}
                        </div>
                         <p className="text-xs text-muted-foreground">A <code className="font-mono bg-muted px-1 py-0.5 rounded">.gitkeep</code> file will be added to empty folders so GitHub can track them.</p>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="ghost" disabled={isProcessingCreate}>Cancel</Button></DialogClose>
                            <Button type="submit" disabled={isProcessingCreate}>
                                {isProcessingCreate ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Create Folder
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={isAiScaffoldModalOpen} onOpenChange={setIsAiScaffoldModalOpen}>
                <DialogTrigger asChild>
                     <Button variant="outline" size="sm" disabled={isViewingFile || !project?.githubRepoName || isLoadingPathContent}>
                        <Sparkles className="mr-2 h-4 w-4 text-primary" /> Scaffold with AI
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader><DialogTitle>Scaffold Project Files with AI in /{currentPath}</DialogTitle>
                    <DialogDescription>Describe the mini-project or files you want the AI to generate in the current directory.</DialogDescription>
                    </DialogHeader>
                     <form onSubmit={aiScaffoldForm.handleSubmit(handleAiScaffoldSubmit)} className="space-y-4">
                        <div>
                            <Label htmlFor="aiPrompt">AI Prompt</Label>
                            <Textarea id="aiPrompt" {...aiScaffoldForm.register("prompt")} rows={5} placeholder="e.g., A simple React component with a button and a counter." />
                            {aiScaffoldForm.formState.errors.prompt && <p className="text-sm text-destructive">{aiScaffoldForm.formState.errors.prompt.message}</p>}
                        </div>
                        {aiScaffoldState?.error && <p className="text-sm text-destructive">{aiScaffoldState.error}</p>}
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="ghost" disabled={isAiScaffolding}>Cancel</Button></DialogClose>
                            <Button type="submit" disabled={isAiScaffolding || !aiScaffoldForm.formState.isValid}>
                                {isAiScaffolding ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4"/>} Generate Files
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
             <Button variant="outline" size="sm" onClick={() => loadContent(currentPath)} title="Refresh content" disabled={isLoadingPathContent || !project?.githubRepoName}>
                {isLoadingPathContent ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4" />} Refresh
            </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="h-6 w-6 text-primary" />
                Repository: {project?.githubRepoName || <span className="text-muted-foreground italic">Not Linked</span>}
              </CardTitle>
               <CardDescription>
                {isViewingFile ? `Viewing: ${fileData?.name}` : `Path: /${currentPath || ''}`}
              </CardDescription>
            </div>
          </div>
          {project?.githubRepoName && (
            <div className="flex items-center space-x-1 text-sm text-muted-foreground mt-2 overflow-x-auto whitespace-nowrap pb-1 border-t pt-2">
              {breadcrumbs.map((crumb, index) => (
                <span key={crumb.path} className="inline-flex items-center">
                  {index > 0 && <ChevronRight className="h-4 w-4 inline-block mx-1 flex-shrink-0" />}
                  { (index === breadcrumbs.length - 1 && (isViewingFile || currentPath === crumb.path)) ? (
                      <span className="font-medium text-foreground flex items-center">
                          {crumb.isRoot && index === 0 && <Home className="h-4 w-4 mr-1 inline-block flex-shrink-0" />}
                          {crumb.name}
                      </span>
                  ): (
                      <Link href={`/projects/${projectUuid}/codespace/files${crumb.path ? '/' + crumb.path : ''}`} className="hover:underline flex items-center">
                          {crumb.isRoot && index === 0 && <Home className="h-4 w-4 mr-1 inline-block flex-shrink-0" />} {crumb.name}
                      </Link>
                  )}
                </span>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoadingPathContent && !error ? (
            <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Loading Content</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : !project?.githubRepoName ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Repository Not Linked</AlertTitle>
                <AlertDescription>
                  This project is not linked to a GitHub repository. Please link it first from the main CodeSpace tab.
                  <Button asChild variant="link" className="ml-1 p-0 h-auto">
                    <Link href={`/projects/${projectUuid}?tab=codespace`}>Go to CodeSpace Setup</Link>
                  </Button>
                </AlertDescription>
              </Alert>
          ) : isViewingFile && fileData ? (
            <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h3 className="text-xl font-semibold truncate">{fileData.name}</h3>
                    <div className="flex items-center gap-2">
                        {canEditCurrentFile && (
                            <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)}>
                                <Edit className="mr-2 h-4 w-4"/> Edit File
                            </Button>
                        )}
                         {fileData.downloadUrl && (
                             <Button variant="outline" size="sm" asChild>
                                <a href={fileData.downloadUrl} target="_blank" rel="noopener noreferrer">
                                    <Download className="mr-2 h-4 w-4"/> Download
                                </a>
                            </Button>
                         )}
                         {project?.githubRepoUrl && fileData.path && (
                            <Button variant="outline" size="icon" asChild>
                                <a href={`${project.githubRepoUrl}/blob/main/${fileData.path}`} target="_blank" rel="noopener noreferrer" title="View on GitHub">
                                    <ExternalLink className="h-4 w-4"/>
                                </a>
                            </Button>
                         )}
                    </div>
                </div>
                <div className="overflow-auto flex-grow">
                    {fileData.type === 'md' && (
                        <div className="prose dark:prose-invert max-w-none p-4 border rounded-md bg-muted/30 min-w-max">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{fileData.content}</ReactMarkdown>
                        </div>
                    )}
                    {fileData.type === 'image' && fileData.encoding === 'base64' && (
                        <div className="p-4 border rounded-md bg-muted/30 flex justify-center items-center max-h-[70vh]">
                            <NextImage
                                src={`data:image/${getFileExtension(fileData.name)};base64,${fileData.content}`}
                                alt={fileData.name}
                                width={0}
                                height={0}
                                sizes="100vw"
                                style={{ width: 'auto', height: 'auto', maxHeight: '65vh', maxWidth: '100%' }}
                                className="rounded-md object-contain"
                                data-ai-hint="code image"
                            />
                        </div>
                    )}
                    {fileData.type === 'html' && (
                         <div className="p-4 border rounded-md bg-muted/30">
                            <h4 className="text-sm font-semibold mb-2">HTML Preview:</h4>
                            <iframe
                                srcDoc={fileData.content}
                                title={`Preview of ${fileData.name}`}
                                className="w-full h-[50vh] border rounded-md bg-white min-w-[600px]"
                                sandbox="allow-scripts"
                            />
                        </div>
                    )}
                    {fileData.type === 'text' && (
                        <pre className="p-4 border rounded-md bg-muted/30 text-sm max-h-[60vh] min-w-max overflow-x-auto">
                            <code>{fileData.content}</code>
                        </pre>
                    )}
                    {fileData.type === 'other' && (
                         <Alert>
                            <ImageIcon className="h-4 w-4" />
                            <AlertTitle>Cannot Display File</AlertTitle>
                            <AlertDescription>
                                This file type ({getFileExtension(fileData.name) || 'unknown'}) cannot be displayed directly.
                                {fileData.downloadUrl && (
                                    <Button asChild variant="link" className="p-0 h-auto ml-1">
                                        <a href={fileData.downloadUrl} target="_blank" rel="noopener noreferrer">
                                            Download file <Download className="ml-1 h-3 w-3" />
                                        </a>
                                    </Button>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            </div>
          ) : !isViewingFile && contents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="hidden md:table-cell">Size</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filePathArray.length > 0 && (
                  <TableRow className="hover:bg-muted/30 cursor-pointer">
                    <TableCell colSpan={4}>
                      <Link href={
                        filePathArray.length > 1
                          ? `/projects/${projectUuid}/codespace/files/${filePathArray.slice(0, -1).join('/')}`
                          : `/projects/${projectUuid}/codespace/files`
                      } className="flex items-center text-primary hover:underline py-2">
                        <Folder className="mr-2 h-4 w-4 opacity-70" /> .. (Parent Directory)
                      </Link>
                    </TableCell>
                  </TableRow>
                )}
                {contents.map((item) => (
                  <TableRow key={item.path}><TableCell>
                      <Link
                        href={`/projects/${projectUuid}/codespace/files/${item.path}`}
                        className="flex items-center hover:underline group"
                      >
                        {item.type === 'dir' ? <Folder className="mr-2 h-5 w-5 text-sky-500 group-hover:text-sky-600 flex-shrink-0" /> : <FileText className="mr-2 h-5 w-5 text-gray-500 group-hover:text-gray-700 flex-shrink-0" />}
                        <span className="truncate">{item.name}</span>
                      </Link>
                    </TableCell><TableCell className="hidden sm:table-cell capitalize">{item.type === 'dir' ? 'Folder' : 'File'}</TableCell><TableCell className="hidden md:table-cell">{item.type === 'file' && item.size > 0 ? `${(item.size / 1024).toFixed(2)} KB` : item.type === 'file' ? '0 KB' : '-'}</TableCell><TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                           <Button variant="outline" size="sm" asChild>
                               <Link href={`/projects/${projectUuid}/codespace/files/${item.path}`}>
                                    {item.type === 'dir' ? 'Open' : 'View'}
                               </Link>
                           </Button>
                           {item.type === 'file' && (
                               <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" title="Delete File" onClick={() => setContentToDelete(item)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    {contentToDelete?.path === item.path && (
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete File: "{contentToDelete.name}"?</AlertDialogTitle>
                                                <UIAlertDialogDescription>This action cannot be undone.</UIAlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel onClick={() => setContentToDelete(null)}>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleDeleteFile} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    )}
                               </AlertDialog>
                           )}
                           {item.type === 'dir' && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Delete Folder (Not Implemented)" disabled>
                                    <Trash2 className="h-4 w-4 opacity-50" />
                                </Button>
                           )}
                        </div>
                    </TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          ) : !isViewingFile && contents.length === 0 && !currentPath ? (
            <Alert>
                <FileCode className="h-4 w-4" />
                <AlertTitle>Empty Repository</AlertTitle>
                <AlertDescription>This repository ('{project?.githubRepoName || 'Unknown'}') appears to be empty. You can create files or folders using the buttons above.</AlertDescription>
            </Alert>
          ) : !isViewingFile && contents.length === 0 && currentPath ? (
             <Alert>
                <Folder className="h-4 w-4" />
                <AlertTitle>Empty Directory</AlertTitle>
                <AlertDescription>This directory ('/{currentPath}') is empty. You can create files or folders here using the buttons above.</AlertDescription>
            </Alert>
          ) : null }
        </CardContent>
      </Card>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[70vw] md:max-w-[60vw] lg:max-w-[50vw] h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit: {fileData?.name}</DialogTitle>
            <DialogDescription className="flex justify-between items-center">
              Modify the content of the file. Your changes will be committed to GitHub.
              <Dialog open={isAiEditFileModalOpen} onOpenChange={setIsAiEditFileModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={!canEditCurrentFile || isSavingFile || isAiEditingFile}>
                      <Sparkles className="mr-2 h-4 w-4 text-primary" /> Assist with AI
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center"><Sparkles className="mr-2 h-5 w-5 text-primary"/>Edit File Content with AI</DialogTitle>
                    <DialogDescription>
                        Describe the changes you want the AI to make to the current file content.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={aiEditFileForm.handleSubmit(handleAiEditFile)} className="space-y-4 py-2">
                    <div>
                      <Label htmlFor="aiEditPrompt">Your Prompt</Label>
                      <Textarea
                          id="aiEditPrompt"
                          placeholder="e.g., 'Refactor this function to be asynchronous', 'Add error handling for XYZ case', 'Explain this code block'"
                          {...aiEditFileForm.register("aiEditPrompt")}
                          rows={5}
                      />
                      {aiEditFileForm.formState.errors.aiEditPrompt && <p className="text-sm text-destructive">{aiEditFileForm.formState.errors.aiEditPrompt.message}</p>}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost" disabled={isAiEditingFile}>Cancel</Button></DialogClose>
                        <Button type="submit" disabled={isAiEditingFile || !aiEditFileForm.formState.isValid}>
                            {isAiEditingFile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Apply AI Edit
                        </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={editingContent}
            onChange={(e) => setEditingContent(e.target.value)}
            className="flex-grow font-mono text-sm resize-none h-full min-h-[300px]"
            placeholder="Enter file content..."
            disabled={!canEditCurrentFile}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)} disabled={isSavingFile}>Cancel</Button>
            <Button onClick={handleSaveFile} disabled={isSavingFile || !canEditCurrentFile}>
              {isSavingFile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function GitHubFilesPage() {
    return (
        <Suspense fallback={<div className="flex min-h-[calc(100vh-10rem)] items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <FileExplorerContent />
        </Suspense>
    )
}
