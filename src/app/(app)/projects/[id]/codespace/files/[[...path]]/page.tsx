
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Folder, FileText, FileCode, Loader2, AlertTriangle, Home, ChevronRight, ExternalLink } from 'lucide-react';
import { getRepoContentsAction, getFileContentAction, fetchProjectAction } from '../../actions';
import type { GithubRepoContentItem, Project } from '@/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Badge } from '@/components/ui/badge';

function FileExplorerContent() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const { toast } = useToast();

  const projectUuid = params.id as string;
  const filePathArray = (params.path || []) as string[];
  const currentPath = filePathArray.join('/');

  const [project, setProject] = useState<Project | null>(null);
  const [contents, setContents] = useState<GithubRepoContentItem[]>([]);
  const [fileContent, setFileContent] = useState<{ content: string; name: string; path: string } | null>(null);
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
      setFileContent(null);

      const fetchedProject = await fetchProjectAction(projectUuid);
      if (!fetchedProject) {
        setError("Project not found or not linked to GitHub.");
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
        // Determine if the current path points to a file or directory
        // This is a simplified check; a more robust way would be to try fetching as file, then dir if 404 or specific error.
        // For now, we assume if the last segment has a dot, it MIGHT be a file.
        const looksLikeFile = filePathArray.length > 0 && filePathArray[filePathArray.length - 1].includes('.');

        if (looksLikeFile) {
            // Try fetching as a file first
            const fileData = await getFileContentAction(projectUuid, currentPath);
            if ('content' in fileData) {
                setFileContent({ content: fileData.content, name: filePathArray[filePathArray.length - 1], path: currentPath });
                setViewingFile(true);
                setContents([]); // Clear directory contents
            } else {
                // If not a file, or error fetching as file, try as directory
                const dirData = await getRepoContentsAction(projectUuid, currentPath);
                if (Array.isArray(dirData)) {
                    setContents(dirData.sort((a, b) => {
                        if (a.type === 'dir' && b.type !== 'dir') return -1;
                        if (a.type !== 'dir' && b.type === 'dir') return 1;
                        return a.name.localeCompare(b.name);
                    }));
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
    const crumbs = [{ name: 'Root', path: '' }];
    let currentCrumbPath = '';
    filePathArray.forEach(segment => {
      currentCrumbPath += (currentCrumbPath ? '/' : '') + segment;
      crumbs.push({ name: segment, path: currentCrumbPath });
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
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to CodeSpace
        </Button>
        {project?.githubRepoUrl && (
            <Button variant="outline" asChild>
                <a href={`${project.githubRepoUrl}${currentPath ? '/tree/main/' + currentPath : ''}`} target="_blank" rel="noopener noreferrer">
                    View on GitHub <ExternalLink className="ml-2 h-4 w-4"/>
                </a>
            </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="h-6 w-6 text-primary" />
            Repository Files: {project?.githubRepoName || 'N/A'}
          </CardTitle>
          <CardDescription>
            Browse files and folders in your linked GitHub repository.
          </CardDescription>
          <div className="flex items-center space-x-1 text-sm text-muted-foreground mt-2 overflow-x-auto whitespace-nowrap">
            <Link href={`/projects/${projectUuid}/codespace/files`} className="hover:underline">
              <Home className="h-4 w-4 inline-block mr-1" />
            </Link>
            {breadcrumbs.map((crumb, index) => (
              <span key={index}>
                <ChevronRight className="h-4 w-4 inline-block mx-1" />
                {index === breadcrumbs.length - 1 && !viewingFile ? (
                  <span className="font-medium text-foreground">{crumb.name}</span>
                ) : (
                  <Link href={`/projects/${projectUuid}/codespace/files${crumb.path ? '/' + crumb.path : ''}`} className="hover:underline">
                    {crumb.name}
                  </Link>
                )}
              </span>
            ))}
             {viewingFile && fileContent && (
                <>
                 <ChevronRight className="h-4 w-4 inline-block mx-1" />
                 <span className="font-medium text-foreground">{fileContent.name}</span>
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
              <AlertTitle>Error Loading Files</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!isLoading && !error && viewingFile && fileContent && (
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">{fileContent.name}</h3>
                    <Badge variant="secondary">{fileContent.path}</Badge>
                </div>
                {fileContent.name.endsWith('.md') ? (
                    <div className="prose dark:prose-invert max-w-none p-4 border rounded-md bg-muted/30">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{fileContent.content}</ReactMarkdown>
                    </div>
                ) : (
                    <pre className="p-4 border rounded-md bg-muted/30 text-sm overflow-x-auto max-h-[60vh]">
                        <code>{fileContent.content}</code>
                    </pre>
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
                {currentPath && (
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
                        className="flex items-center hover:underline"
                      >
                        {item.type === 'dir' ? <Folder className="mr-2 h-5 w-5 text-sky-500" /> : <FileText className="mr-2 h-5 w-5 text-gray-500" />}
                        {item.name}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell capitalize">{item.type}</TableCell>
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
            <p className="text-center text-muted-foreground py-8">This repository appears to be empty or could not be accessed.</p>
          )}
          {!isLoading && !error && !viewingFile && contents.length === 0 && currentPath && (
             <p className="text-center text-muted-foreground py-8">This directory is empty.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


export default function GitHubFilesPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <FileExplorerContent />
        </Suspense>
    )
}
