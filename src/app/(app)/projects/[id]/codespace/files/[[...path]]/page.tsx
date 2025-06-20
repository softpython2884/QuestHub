
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Folder, FileText, FileCode, Loader2, AlertTriangle, Home, ChevronRight, ExternalLink, Image as ImageIcon, Download } from 'lucide-react';
import { getRepoContentsAction, getFileContentAction, fetchProjectAction } from '@/app/(app)/projects/[id]/actions'; // Corrected import path
import type { GithubRepoContentItem, Project } from '@/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Badge } from '@/components/ui/badge';
import NextImage from 'next/image'; // For displaying images from base64

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
  const filePathArray = (params.path || []) as string[];
  const currentPath = filePathArray.join('/');

  const [project, setProject] = useState<Project | null>(null);
  const [contents, setContents] = useState<GithubRepoContentItem[]>([]);
  const [fileData, setFileData] = useState<{ name: string; path: string; content: string; type: 'md' | 'image' | 'text' | 'other'; downloadUrl?: string | null, encoding?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingFile, setViewingFile] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!user || !projectUuid) {
        if (!authLoading && !user) router.push('/login');
        return;
      }
      setIsLoading(true);
      setError(null);
      setViewingFile(false);
      setFileData(null);

      const fetchedProject = await fetchProjectAction(projectUuid);
      if (!fetchedProject) {
        setError("Project not found.");
        setIsLoading(false);
        return;
      }
      setProject(fetchedProject);

      if (!fetchedProject.githubRepoName) {
        setError("Project is not linked to a GitHub repository.");
        setIsLoading(false);
        return;
      }

      try {
        const isFileView = filePathArray.length > 0 && (
            TEXT_EXTENSIONS.some(ext => filePathArray[filePathArray.length - 1].toLowerCase().endsWith(ext)) ||
            MARKDOWN_EXTENSIONS.some(ext => filePathArray[filePathArray.length - 1].toLowerCase().endsWith(ext)) ||
            IMAGE_EXTENSIONS.some(ext => filePathArray[filePathArray.length - 1].toLowerCase().endsWith(ext)) ||
            // Add a fallback for files that might not have common extensions but are still files
            (filePathArray.length > 0 && !currentPath.endsWith('/') && filePathArray[filePathArray.length-1].includes('.'))
        );


        if (isFileView) {
          const fetchedFileData = await getFileContentAction(projectUuid, currentPath);
          if ('content' in fetchedFileData) {
            const extension = getFileExtension(filePathArray[filePathArray.length - 1]);
            let fileDisplayType: 'md' | 'image' | 'text' | 'other' = 'other';

            if (MARKDOWN_EXTENSIONS.includes(`.${extension}`)) {
              fileDisplayType = 'md';
            } else if (IMAGE_EXTENSIONS.includes(`.${extension}`)) {
              fileDisplayType = 'image';
            } else if (TEXT_EXTENSIONS.includes(`.${extension}`)) {
              fileDisplayType = 'text';
            } else if (fetchedFileData.encoding === 'base64' && !IMAGE_EXTENSIONS.includes(`.${extension}`)){
                // If it's base64 but not an image we'll assume it's some binary we can't display directly.
                fileDisplayType = 'other';
            } else if (fetchedFileData.encoding === 'utf-8') { // If it's utf-8 and not matched, treat as text.
                fileDisplayType = 'text';
            }


            setFileData({
              name: filePathArray[filePathArray.length - 1],
              path: currentPath,
              content: fetchedFileData.content,
              type: fileDisplayType,
              downloadUrl: fetchedFileData.download_url,
              encoding: fetchedFileData.encoding
            });
            setViewingFile(true);
            setContents([]);
          } else {
            setError(fetchedFileData.error || "Failed to fetch file content. It might be a directory or an error occurred.");
            // Try fetching as directory if file fetch failed
            const dirData = await getRepoContentsAction(projectUuid, currentPath);
            if (Array.isArray(dirData)) {
                setContents(dirData.sort((a, b) => {
                    if (a.type === 'dir' && b.type !== 'dir') return -1;
                    if (a.type !== 'dir' && b.type === 'dir') return 1;
                    return a.name.localeCompare(b.name);
                }));
                setViewingFile(false);
            } else {
                 setError(dirData.error || "Failed to fetch repository contents or file.");
            }
          }
        } else {
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
        setError(e.message || 'An unexpected error occurred.');
        toast({ variant: 'destructive', title: 'Error', description: e.message });
      } finally {
        setIsLoading(false);
      }
    }
    if (!authLoading) loadData();
  }, [projectUuid, currentPath, user, authLoading, router, toast]);


  const getBreadcrumbs = () => {
    const crumbs = [{ name: project?.githubRepoName || 'Root', path: '', isRoot: true }];
    let currentCrumbPath = '';
    filePathArray.forEach(segment => {
      currentCrumbPath += (currentCrumbPath ? '/' : '') + segment;
      crumbs.push({ name: segment, path: currentCrumbPath, isRoot: false });
    });
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => router.push(`/projects/${projectUuid}?tab=codespace`)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to CodeSpace Overview
        </Button>
        {project?.githubRepoUrl && (
            <Button variant="outline" asChild>
                <a href={`${project.githubRepoUrl}${currentPath ? '/blob/main/' + currentPath : ''}`} target="_blank" rel="noopener noreferrer">
                    View on GitHub <ExternalLink className="ml-2 h-4 w-4"/>
                </a>
            </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="h-6 w-6 text-primary" />
            Repository Browser
          </CardTitle>
          <CardDescription>
            Browse files and folders in {project?.githubRepoName || 'your linked repository'}.
          </CardDescription>
          <div className="flex items-center space-x-1 text-sm text-muted-foreground mt-2 overflow-x-auto whitespace-nowrap pb-1">
            {breadcrumbs.map((crumb, index) => (
              <span key={index} className="inline-flex items-center">
                {index > 0 && <ChevronRight className="h-4 w-4 inline-block mx-1 flex-shrink-0" />}
                {crumb.isRoot && !viewingFile && index === breadcrumbs.length -1 && filePathArray.length === 0 ? (
                     <span className="font-medium text-foreground flex items-center"><Home className="h-4 w-4 mr-1 inline-block" />{crumb.name}</span>
                ): crumb.isRoot ? (
                     <Link href={`/projects/${projectUuid}/codespace/files`} className="hover:underline flex items-center">
                        <Home className="h-4 w-4 mr-1 inline-block" /> {crumb.name}
                    </Link>
                ) : index === breadcrumbs.length - 1 && (!viewingFile || fileData?.path === crumb.path) ? (
                  <span className="font-medium text-foreground">{crumb.name}</span>
                ) : (
                  <Link href={`/projects/${projectUuid}/codespace/files${crumb.path ? '/' + crumb.path : ''}`} className="hover:underline">
                    {crumb.name}
                  </Link>
                )}
              </span>
            ))}
             {viewingFile && fileData && breadcrumbs[breadcrumbs.length - 1].path !== fileData.path && (
                <>
                 <ChevronRight className="h-4 w-4 inline-block mx-1" />
                 <span className="font-medium text-foreground">{fileData.name}</span>
                </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Loading Content</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!isLoading && !error && viewingFile && fileData && (
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">{fileData.name}</h3>
                    <Badge variant="secondary">{fileData.path}</Badge>
                </div>
                {fileData.type === 'md' && (
                    <div className="prose dark:prose-invert max-w-none p-4 border rounded-md bg-muted/30">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{fileData.content}</ReactMarkdown>
                    </div>
                )}
                {fileData.type === 'image' && fileData.encoding === 'base64' && (
                    <div className="p-4 border rounded-md bg-muted/30 flex justify-center">
                        <NextImage
                            src={`data:image/${getFileExtension(fileData.name)};base64,${fileData.content}`}
                            alt={fileData.name}
                            width={0}
                            height={0}
                            sizes="100vw"
                            style={{ width: 'auto', height: 'auto', maxHeight: '60vh', maxWidth: '100%' }}
                            className="rounded-md"
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
          {!isLoading && !error && !viewingFile && contents.length > 0 && (
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
                {filePathArray.length > 0 && ( // Show ".." only if not at root
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Link href={
                        filePathArray.length > 1
                          ? `/projects/${projectUuid}/codespace/files/${filePathArray.slice(0, -1).join('/')}`
                          : `/projects/${projectUuid}/codespace/files`
                      } className="flex items-center text-primary hover:underline">
                        <ArrowLeft className="mr-2 h-4 w-4" /> .. (Parent Directory)
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
                        {item.type === 'dir' ? <Folder className="mr-2 h-5 w-5 text-sky-500 group-hover:text-sky-600" /> : <FileText className="mr-2 h-5 w-5 text-gray-500 group-hover:text-gray-700" />}
                        {item.name}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell capitalize">{item.type === 'dir' ? 'Folder' : 'File'}</TableCell>
                    <TableCell className="hidden md:table-cell">{item.type === 'file' ? `${(item.size / 1024).toFixed(2)} KB` : '-'}</TableCell>
                    <TableCell className="text-right">
                       <Button variant="outline" size="sm" asChild>
                           <Link href={`/projects/${projectUuid}/codespace/files/${item.path}`}>
                                {item.type === 'dir' ? 'Open' : 'View'}
                           </Link>
                       </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
           {!isLoading && !error && !viewingFile && contents.length === 0 && !currentPath && (
            <Alert>
                <FileCode className="h-4 w-4" />
                <AlertTitle>Empty Repository</AlertTitle>
                <AlertDescription>This repository appears to be empty or could not be accessed. You might need to initialize it with a README or some files on GitHub.</AlertDescription>
            </Alert>
          )}
          {!isLoading && !error && !viewingFile && contents.length === 0 && currentPath && (
             <Alert>
                <Folder className="h-4 w-4" />
                <AlertTitle>Empty Directory</AlertTitle>
                <AlertDescription>This directory is empty.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
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

