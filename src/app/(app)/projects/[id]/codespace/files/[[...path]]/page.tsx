
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
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Folder, FileText, FileCode, Loader2, AlertTriangle, Home, ChevronRight, ExternalLink, Image as ImageIcon, Download, Edit, Save, UploadCloud, FolderPlus, FilePlus, Trash2, RefreshCw } from 'lucide-react';
import { getRepoContentsAction, getFileContentAction, fetchProjectAction, saveFileContentAction } from '@/app/(app)/projects/[id]/actions';
import type { GithubRepoContentItem, Project } from '@/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Badge } from '@/components/ui/badge';
import NextImage from 'next/image';

const TEXT_EXTENSIONS = ['.txt', '.log', '.json', '.yaml', '.yml', '.xml', '.html', '.css', '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.php', '.rb', '.go', '.sh', '.gitignore', '.env', '.config', '.cfg', '.ini', '.sql', '.r', '.swift', '.kt', '.kts', '.rs', '.toml', '.lua', '.pl', '.dart', '.ex', '.exs', '.erl', '.hrl', '.vue', '.svelte', '.tf', '.tfvars', '.hcl', '.gradle', '.diff', '.patch', '.csv', '.tsv', '.ps1', '.psm1', '.fish', '.zsh', '.bash'];
const MARKDOWN_EXTENSIONS = ['.md', '.markdown', '.mdown', '.mkdn'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp', '.tiff'];


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
  const [fileData, setFileData] = useState<{ name: string; path: string; content: string; type: 'md' | 'image' | 'text' | 'other'; downloadUrl?: string | null, encoding?: string, sha: string } | null>(null);
  
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [isLoadingPathContent, setIsLoadingPathContent] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isViewingFile, setIsViewingFile] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState('');
  const [isSavingFile, setIsSavingFile] = useState(false);

  // Load project data
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
          }
        }
      })
      .catch(err => {
        console.error("Error fetching project:", err);
        setError("Failed to load project details.");
        setProject(null);
      })
      .finally(() => {
        setIsLoadingProject(false);
      });
  }, [projectUuid, user, authLoading, router]);

  // Load path content (files/folders or file content)
  useEffect(() => {
    if (!project || !project.githubRepoName || authLoading || isLoadingProject) {
        if (project && !project.githubRepoName && !isLoadingProject) { // Project loaded but no repo
            setIsLoadingPathContent(false);
        }
        return;
    }

    setIsLoadingPathContent(true);
    setError(null);
    setIsViewingFile(false);
    setFileData(null);

    const loadContent = async () => {
      try {
        const isFileViewCandidate = filePathArray.length > 0 && filePathArray[filePathArray.length-1].includes('.');

        if (isFileViewCandidate) {
          const fetchedFileData = await getFileContentAction(projectUuid, currentPath);
          if ('content' in fetchedFileData && fetchedFileData.sha) {
            const extension = getFileExtension(filePathArray[filePathArray.length - 1]);
            let fileDisplayType: 'md' | 'image' | 'text' | 'other' = 'other';

            if (MARKDOWN_EXTENSIONS.includes(`.${extension}`)) fileDisplayType = 'md';
            else if (IMAGE_EXTENSIONS.includes(`.${extension}`)) fileDisplayType = 'image';
            else if (TEXT_EXTENSIONS.includes(`.${extension}`)) fileDisplayType = 'text';
            else if (fetchedFileData.encoding === 'base64' && !IMAGE_EXTENSIONS.includes(`.${extension}`)) fileDisplayType = 'other';
            else if (fetchedFileData.encoding === 'utf-8' || !fetchedFileData.encoding) fileDisplayType = 'text';
            
            setFileData({
              name: filePathArray[filePathArray.length - 1],
              path: currentPath,
              content: fetchedFileData.content,
              type: fileDisplayType,
              downloadUrl: fetchedFileData.download_url,
              encoding: fetchedFileData.encoding,
              sha: fetchedFileData.sha,
            });
            setEditingContent(fetchedFileData.content);
            setIsViewingFile(true);
            setContents([]);
          } else {
            // If getFileContentAction fails, it might be a directory with a dot in its name. Try listing as directory.
            const dirData = await getRepoContentsAction(projectUuid, currentPath);
            if (Array.isArray(dirData)) {
                setContents(dirData.sort((a, b) => {
                    if (a.type === 'dir' && b.type !== 'dir') return -1;
                    if (a.type !== 'dir' && b.type === 'dir') return 1;
                    return a.name.localeCompare(b.name);
                }));
                setIsViewingFile(false);
            } else {
                 setError(fetchedFileData.error || dirData.error || "Failed to fetch file or directory content.");
            }
          }
        } else { // Directory view
          const dirData = await getRepoContentsAction(projectUuid, currentPath);
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
    };
    loadContent();
  }, [project, currentPath, projectUuid, authLoading, isLoadingProject, toast, filePathArray]);


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
  const canEditCurrentFile = fileData && (fileData.type === 'text' || fileData.type === 'md');
  const isLoading = authLoading || isLoadingProject || isLoadingPathContent;

  if (isLoading) {
    return (
      <div className="space-y-6">
         <div className="flex justify-between items-center">
             <Skeleton className="h-9 w-48" /> {/* Back button */}
        </div>
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-1/2 mb-2" /> {/* Title */}
                <Skeleton className="h-5 w-3/4" /> {/* Description */}
                <div className="mt-2 flex space-x-1 pb-1 border-t pt-2"> {/* Breadcrumbs */}
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
        <div className="flex items-center gap-2">
             {/* Placeholder for future actions like Create File/Folder */}
             <Button variant="outline" size="sm" disabled>
                <FilePlus className="mr-2 h-4 w-4" /> Create File
            </Button>
             <Button variant="outline" size="sm" disabled>
                <FolderPlus className="mr-2 h-4 w-4" /> Create Folder
            </Button>
             <Button variant="outline" size="sm" onClick={() => {
                // Trigger a re-fetch, e.g., by briefly changing a dummy state or re-calling load functions
                // For simplicity, we can force a reload of project and path content:
                setIsLoadingProject(true); // This will re-trigger the project load useEffect
                // To specifically reload path content if project is already loaded:
                if(project) {
                    setIsLoadingPathContent(true);
                     // This re-triggers the second useEffect:
                    setProject(p => p ? ({...p}) : null ); // Force re-trigger if path hasn't changed
                }

             }} title="Refresh content">
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="h-6 w-6 text-primary" />
                Repository: {project?.githubRepoName || 'N/A'}
              </CardTitle>
               <CardDescription>
                {isViewingFile ? `Viewing: ${fileData?.name}` : `Path: /${currentPath || ''}`}
              </CardDescription>
            </div>
             {project?.githubRepoUrl && (
                <Button variant="outline" size="sm" asChild>
                    <a href={`${project.githubRepoUrl}${currentPath ? ( isViewingFile ? '/blob/main/' : '/tree/main/') + currentPath : ''}`} target="_blank" rel="noopener noreferrer">
                        View on GitHub <ExternalLink className="ml-2 h-4 w-4"/>
                    </a>
                </Button>
            )}
          </div>
          <div className="flex items-center space-x-1 text-sm text-muted-foreground mt-2 overflow-x-auto whitespace-nowrap pb-1 border-t pt-2">
            {breadcrumbs.map((crumb, index) => (
              <span key={index} className="inline-flex items-center">
                {index > 0 && <ChevronRight className="h-4 w-4 inline-block mx-1 flex-shrink-0" />}
                 { (index === breadcrumbs.length - 1) ? (
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
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Loading Content</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!error && isViewingFile && fileData && (
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">{fileData.name}</h3>
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
                        <Badge variant="secondary">{fileData.path}</Badge>
                    </div>
                </div>
                {fileData.type === 'md' && (
                    <div className="prose dark:prose-invert max-w-none p-4 border rounded-md bg-muted/30">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{fileData.content}</ReactMarkdown>
                    </div>
                )}
                {fileData.type === 'image' && fileData.encoding === 'base64' && (
                    <div className="p-4 border rounded-md bg-muted/30 flex justify-center items-center max-h-[70vh] overflow-hidden">
                        <NextImage
                            src={`data:image/${getFileExtension(fileData.name)};base64,${fileData.content}`}
                            alt={fileData.name}
                            width={0}
                            height={0}
                            sizes="100vw"
                            style={{ width: 'auto', height: 'auto', maxHeight: '65vh', maxWidth: '100%' }}
                            className="rounded-md object-contain"
                        />
                    </div>
                )}
                {fileData.type === 'text' && (
                    <pre className="p-4 border rounded-md bg-muted/30 text-sm overflow-x-auto max-h-[60vh]">
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
          )}
          {!error && !isViewingFile && contents.length > 0 && (
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
                  <TableRow key={item.sha}>
                    <TableCell>
                      <Link
                        href={`/projects/${projectUuid}/codespace/files/${item.path}`}
                        className="flex items-center hover:underline group"
                      >
                        {item.type === 'dir' ? <Folder className="mr-2 h-5 w-5 text-sky-500 group-hover:text-sky-600 flex-shrink-0" /> : <FileText className="mr-2 h-5 w-5 text-gray-500 group-hover:text-gray-700 flex-shrink-0" />}
                        <span className="truncate">{item.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell capitalize">{item.type === 'dir' ? 'Folder' : 'File'}</TableCell>
                    <TableCell className="hidden md:table-cell">{item.type === 'file' && item.size > 0 ? `${(item.size / 1024).toFixed(2)} KB` : item.type === 'file' ? '0 KB' : '-'}</TableCell>
                    <TableCell className="text-right">
                       <Button variant="outline" size="sm" asChild>
                           <Link href={`/projects/${projectUuid}/codespace/files/${item.path}`}>
                                {item.type === 'dir' ? 'Open' : 'View'}
                           </Link>
                       </Button>
                       {/* Future: Add Edit/Delete buttons here for directory items if needed */}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
           {!error && !isViewingFile && contents.length === 0 && !currentPath && project && project.githubRepoName && (
            <Alert>
                <FileCode className="h-4 w-4" />
                <AlertTitle>Empty Repository</AlertTitle>
                <AlertDescription>This repository ('{project.githubRepoName}') appears to be empty. You might need to initialize it with a README or some files on GitHub, or create them here.</AlertDescription>
            </Alert>
          )}
          {!error && !isViewingFile && contents.length === 0 && currentPath && project && project.githubRepoName && (
             <Alert>
                <Folder className="h-4 w-4" />
                <AlertTitle>Empty Directory</AlertTitle>
                <AlertDescription>This directory ('/{currentPath}') is empty.
                    {/* Future: <Button variant="link" size="sm" className="p-0 h-auto ml-1">Create a file here</Button> */}
                </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Edit File Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[70vw] md:max-w-[60vw] lg:max-w-[50vw] h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit: {fileData?.name}</DialogTitle>
            <DialogDescription>
              Modify the content of the file. Your changes will be committed to GitHub.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={editingContent}
            onChange={(e) => setEditingContent(e.target.value)}
            className="flex-grow font-mono text-sm resize-none h-full min-h-[300px]"
            placeholder="Enter file content..."
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)} disabled={isSavingFile}>Cancel</Button>
            <Button onClick={handleSaveFile} disabled={isSavingFile}>
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
