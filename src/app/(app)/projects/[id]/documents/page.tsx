
'use client';

import { useState, useEffect, useCallback, startTransition as ReactStartTransition } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FileText, PlusCircle, Edit3, Trash2, Loader2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { Project, Document as ProjectDocumentType, ProjectMemberRole, User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { fetchDocumentsAction, deleteDocumentAction, type DeleteDocumentFormState } from '../actions';
import { useActionState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Badge } from '@/components/ui/badge';

interface ProjectDocumentsPageProps {
  project: Project;
  currentUserRole: ProjectMemberRole | null;
  projectUuid: string;
  user: User;
}

export default function ProjectDocumentsPage({ project, currentUserRole, projectUuid }: ProjectDocumentsPageProps) {
  const { toast } = useToast();
  const [projectDocuments, setProjectDocuments] = useState<ProjectDocumentType[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);

  const [documentToView, setDocumentToView] = useState<ProjectDocumentType | null>(null);
  const [isViewDocumentDialogOpen, setIsViewDocumentDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<ProjectDocumentType | null>(null);

  const [deleteDocumentState, deleteDocumentFormAction, isDeleteDocumentPending] = useActionState(deleteDocumentAction, { message: "", error: "" });

  const loadProjectDocuments = useCallback(async () => {
    if (projectUuid) {
      setIsLoadingDocuments(true);
      try {
        const docs = await fetchDocumentsAction(projectUuid);
        setProjectDocuments(docs || []);
      } catch (error) {
        console.error("Failed to load documents:", error);
        setProjectDocuments([]);
        toast({ variant: "destructive", title: "Error", description: "Could not load documents." });
      } finally {
        setIsLoadingDocuments(false);
      }
    }
  }, [projectUuid, toast]);

  useEffect(() => {
    loadProjectDocuments();
  }, [loadProjectDocuments]);

  useEffect(() => {
    if (!isDeleteDocumentPending && deleteDocumentState) {
        if (deleteDocumentState.message && !deleteDocumentState.error) {
            toast({ title: "Success", description: deleteDocumentState.message });
            setDocumentToDelete(null);
            loadProjectDocuments();
        }
        if (deleteDocumentState.error) {
            toast({ variant: "destructive", title: "Document Deletion Error", description: deleteDocumentState.error });
        }
    }
  }, [deleteDocumentState, isDeleteDocumentPending, toast, loadProjectDocuments]);

  const openViewDocumentDialog = (doc: ProjectDocumentType) => {
    setDocumentToView(doc);
    setIsViewDocumentDialogOpen(true);
  };

  const handleDeleteDocumentConfirm = () => {
    if (!documentToDelete || !project) return;
    const formData = new FormData();
    formData.append('documentUuid', documentToDelete.uuid);
    formData.append('projectUuid', project.uuid);
    ReactStartTransition(() => {
      deleteDocumentFormAction(formData);
    });
  };

  const canManageDocuments = currentUserRole === 'owner' || currentUserRole === 'co-owner' || currentUserRole === 'editor';

  if (!project) {
    return <div className="flex items-center justify-center min-h-[300px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading project data...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Documents ({projectDocuments.length})</CardTitle>
           {canManageDocuments && (
            <Button size="sm" asChild>
              <Link href={`/projects/${projectUuid}/documents/new`}>
                <PlusCircle className="mr-2 h-4 w-4"/> Add Document
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoadingDocuments ? (
            <div className="flex justify-center items-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
          ) : projectDocuments.length === 0 ? (
             <div className="text-center py-12 text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-4" />
                <p>No documents in this project yet.</p>
                {canManageDocuments &&
                    <Button size="sm" className="mt-4" asChild>
                       <Link href={`/projects/${projectUuid}/documents/new`}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Add your first document
                      </Link>
                    </Button>
                }
            </div>
          ) : (
            <div className="space-y-3">
              {projectDocuments.map(doc => (
                <Card key={doc.uuid} className="p-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex-grow">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                        <h4 className="font-semibold cursor-pointer hover:underline" onClick={() => openViewDocumentDialog(doc)}>
                          {doc.title}
                        </h4>
                        <Badge variant="outline" className="text-xs capitalize">{doc.fileType}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Created: {new Date(doc.createdAt).toLocaleDateString()} | Updated: {new Date(doc.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0 self-end sm:self-center">
                       {canManageDocuments && (doc.fileType === 'markdown') && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit Document" asChild>
                          <Link href={`/projects/${projectUuid}/documents/${doc.uuid}/edit`}>
                            <Edit3 className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                       {canManageDocuments && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" title="Delete Document" onClick={() => setDocumentToDelete(doc)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            {documentToDelete?.uuid === doc.uuid && (
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Document: "{documentToDelete.title}"?</AlertDialogTitle>
                                    <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setDocumentToDelete(null)}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteDocumentConfirm} disabled={isDeleteDocumentPending}>
                                        {isDeleteDocumentPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                            )}
                        </AlertDialog>
                      )}
                      <Button variant="outline" size="sm" className="h-8 px-3" onClick={() => openViewDocumentDialog(doc)}>
                        View
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewDocumentDialogOpen} onOpenChange={setIsViewDocumentDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>{documentToView?.title}</DialogTitle>
                <DialogDescription>Type: <Badge variant="outline" className="capitalize text-xs">{documentToView?.fileType}</Badge> | Last updated: {documentToView ? new Date(documentToView.updatedAt).toLocaleString() : 'N/A'}</DialogDescription>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto pr-2">
                {documentToView?.fileType === 'markdown' && (
                    <div className="prose dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{documentToView?.content || ''}</ReactMarkdown>
                    </div>
                )}
                {(documentToView?.fileType === 'txt' || documentToView?.fileType === 'html') && (
                     <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md">{documentToView?.content || 'No content.'}</pre>
                )}
                {documentToView?.fileType === 'pdf' && (
                    <div className="text-center p-6">
                        <ExternalLink className="h-10 w-10 mx-auto text-primary mb-3" />
                        <p>This is a PDF document named: <strong>{documentToView?.filePath || documentToView?.title}</strong>.</p>
                        <Button asChild className="mt-3">
                            <a href={documentToView?.filePath || "#"} target="_blank" rel="noopener noreferrer" download={documentToView?.filePath || documentToView?.title}>
                                Download/Open PDF (Simulated)
                            </a>
                        </Button>
                         <p className="text-xs text-muted-foreground mt-2">(Actual file download/storage not implemented in this prototype)</p>
                    </div>
                )}
                {documentToView?.fileType === 'other' && (
                     <p className="text-muted-foreground">Cannot display this file type directly. File name: {documentToView?.filePath || documentToView?.title}</p>
                )}
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
