
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, PlusCircle, BookOpen, User, Trash2, Edit, Tag, Pin, PinOff } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, startTransition } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { GlobalDocument } from "@/types";
import { getGlobalDocumentsAction, deleteGlobalDocumentAction, toggleGlobalDocumentPinAction } from "./actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DocumentationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<GlobalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [documentToDelete, setDocumentToDelete] = useState<GlobalDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const loadDocs = async () => {
    setIsLoading(true);
    try {
      const data = await getGlobalDocumentsAction();
      setDocuments(data);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load documents.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocs();
  }, [toast]);

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
    if (!documentToDelete || !user) return;
    if (user.uuid !== documentToDelete.authorUuid && user.role !== 'admin') {
      toast({ variant: 'destructive', title: 'Error', description: "You don't have permission to delete this document." });
      return;
    }
    
    setIsDeleting(true);
    const result = await deleteGlobalDocumentAction(documentToDelete.uuid);
    setIsDeleting(false);

    if (result.success) {
      toast({ title: 'Success', description: 'Document deleted.' });
      setDocuments(prev => prev.filter(d => d.uuid !== documentToDelete.uuid));
      setDocumentToDelete(null);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
  };
  
  const handleTogglePin = (doc: GlobalDocument) => {
    startTransition(async () => {
      const result = await toggleGlobalDocumentPinAction(doc.uuid, !!doc.isPinned);
      if (result.success) {
        toast({ title: "Success", description: `Document ${result.document?.isPinned ? 'pinned' : 'unpinned'}.` });
        loadDocs();
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
      }
    });
  }

  const filteredDocuments = documents.filter(doc => {
    const term = searchTerm.toLowerCase();
    return (
        doc.title.toLowerCase().includes(term) ||
        doc.authorName?.toLowerCase().includes(term) ||
        doc.tags?.some(tag => tag.name.toLowerCase().includes(term))
    )
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-semibold">Documentation</h1>
          <p className="text-muted-foreground">Find guides, tutorials, and references shared by the community.</p>
        </div>
        <Button asChild>
          <Link href="/documentation/new">
            <PlusCircle className="mr-2 h-5 w-5" /> Create Document
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
            <CardTitle>All Documents</CardTitle>
            <div className="relative w-full sm:w-auto sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search docs or tags..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <CardDescription>Browse all available documentation. Album functionality coming soon!</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No documents yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Start by creating a new document or guide.
              </p>
              <Button className="mt-6" asChild>
                <Link href="/documentation/new">
                  <PlusCircle className="mr-2 h-4 w-4" /> Create Document
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredDocuments.map((doc) => (
                <Card key={doc.uuid} className={cn("hover:shadow-md transition-shadow", doc.isPinned && "bg-primary/5")}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <FileText className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                      <div className="flex-grow">
                        <div className="flex items-center gap-2">
                          {doc.isPinned && <Pin className="h-4 w-4 text-primary" />}
                          <h3 className="font-semibold hover:text-primary">
                            <Link href={`/documentation/${doc.uuid}`}>{doc.title}</Link>
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                           <Avatar className="h-4 w-4">
                              <AvatarImage src={doc.authorAvatar} alt={doc.authorName} />
                              <AvatarFallback className="text-xs">{getInitials(doc.authorName)}</AvatarFallback>
                           </Avatar>
                          <span>{doc.authorName}</span>
                          <span>•</span>
                          <span>Last updated: {new Date(doc.updatedAt).toLocaleDateString()}</span>
                        </p>
                        {doc.tags && doc.tags.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                                {doc.tags.map(tag => (
                                    <Badge key={tag.uuid} variant="secondary" className="text-xs">{tag.name}</Badge>
                                ))}
                            </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {user?.role === 'admin' && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title={doc.isPinned ? "Unpin" : "Pin"} onClick={() => handleTogglePin(doc)}>
                          {doc.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                        </Button>
                      )}
                      {(user?.uuid === doc.authorUuid || user?.role === 'admin') && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link href={`/documentation/${doc.uuid}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDocumentToDelete(doc)}>
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
                                <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                  {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                            )}
                          </AlertDialog>
                        </>
                      )}
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/documentation/${doc.uuid}`}>Read More</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
