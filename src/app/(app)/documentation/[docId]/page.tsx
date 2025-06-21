
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Loader2, AlertTriangle, FileText, Edit, Trash2, Tag, Link2 as LinkIcon } from 'lucide-react';
import { getGlobalDocumentAction, deleteGlobalDocumentAction } from '../actions';
import type { GlobalDocument } from '@/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function ViewDocumentPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const documentUuid = params.docId as string;

  const [document, setDocument] = useState<GlobalDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function loadDocument() {
      if (!documentUuid) return;
      setIsLoading(true);
      try {
        const doc = await getGlobalDocumentAction(documentUuid);
        if (doc) {
          setDocument(doc);
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Document not found.' });
          router.push('/documentation');
        }
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load document.' });
      } finally {
        setIsLoading(false);
      }
    }
    loadDocument();
  }, [documentUuid, router, toast]);

  const getInitials = (name?: string) => {
    if (!name) return '?';
    const names = name.split(' ');
    let initials = names[0].substring(0, 1).toUpperCase();
    if (names.length > 1) {
      initials += names[names.length - 1].substring(0, 1).toUpperCase();
    }
    return initials;
  };

  const handleDelete = async () => {
    if (!document) return;
    setIsDeleting(true);
    const result = await deleteGlobalDocumentAction(document.uuid);
    setIsDeleting(false);

    if (result.success) {
      toast({ title: "Success", description: "Document deleted." });
      router.push('/documentation');
    } else {
      toast({ variant: "destructive", title: "Error", description: result.error });
    }
  };

  const canModify = user && document && (user.uuid === document.authorUuid || user.role === 'admin');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <Card>
          <CardHeader><Skeleton className="h-8 w-3/4 mb-2" /><Skeleton className="h-5 w-1/2" /></CardHeader>
          <CardContent><Skeleton className="h-96 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="mt-4 text-xl font-semibold">Document Not Found</h2>
        <p className="text-muted-foreground">The document you are looking for does not exist.</p>
        <Button asChild className="mt-4"><Link href="/documentation">Back to Documentation</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <Button variant="outline" onClick={() => router.push('/documentation')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Documentation
        </Button>
        {canModify && (
          <div className="flex gap-2">
            <Button asChild>
              <Link href={`/documentation/${document.uuid}/edit`}><Edit className="mr-2 h-4 w-4"/> Edit</Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4"/> Delete</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Document: "{document.title}"?</AlertDialogTitle>
                  <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-headline">{document.title}</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
            <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                <AvatarImage src={document.authorAvatar} alt={document.authorName} />
                <AvatarFallback>{getInitials(document.authorName)}</AvatarFallback>
                </Avatar>
                <span>Authored by {document.authorName}</span>
            </div>
            <span>·</span>
            <span>Last updated on {new Date(document.updatedAt).toLocaleDateString()}</span>
            {document.linkedProject && (
                <>
                <span>·</span>
                <div className="flex items-center gap-1.5">
                    <LinkIcon className="h-4 w-4 text-muted-foreground" />
                    <span>Linked to project:</span>
                    <Button variant="link" className="p-0 h-auto" asChild>
                        <Link href={`/projects/${document.linkedProject.uuid}`}>{document.linkedProject.name}</Link>
                    </Button>
                </div>
                </>
            )}
          </CardDescription>
          {document.tags && document.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-3">
                 <Tag className="h-4 w-4 text-muted-foreground"/>
                 {document.tags.map(tag => (
                    <Badge key={tag.uuid} variant="secondary">{tag.name}</Badge>
                 ))}
            </div>
           )}
        </CardHeader>
        <CardContent>
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{document.content}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
