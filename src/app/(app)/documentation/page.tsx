
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, PlusCircle, BookOpen, User, Trash2, Edit, Tag, Pin, PinOff, Folder, Copy, BookCopy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useActionState, startTransition } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { GlobalDocument, DocAlbum } from "@/types";
import { getGlobalDocumentsAction, deleteGlobalDocumentAction, toggleGlobalDocumentPinAction, createAlbumAction } from "./actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as UIDialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";


const albumFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters.").max(100),
  description: z.string().max(255).optional(),
});
type AlbumFormValues = z.infer<typeof albumFormSchema>;

export default function DocumentationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<GlobalDocument[]>([]);
  const [albums, setAlbums] = useState<DocAlbum[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [documentToDelete, setDocumentToDelete] = useState<GlobalDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateAlbumOpen, setIsCreateAlbumOpen] = useState(false);

  const albumForm = useForm<AlbumFormValues>({ resolver: zodResolver(albumFormSchema) });
  const [createAlbumState, createAlbumFormAction, isCreatingAlbum] = useActionState(async (prevState: any, formData: FormData) => {
      const title = formData.get('title') as string;
      const description = formData.get('description') as string | undefined;
      const result = await createAlbumAction(title, description);
      if (result.error) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      } else {
        toast({ title: 'Success', description: `Album "${result.album?.title}" created.` });
        setIsCreateAlbumOpen(false);
        albumForm.reset();
        loadDocsAndAlbums();
      }
      return result;
  }, { error: null });

  const loadDocsAndAlbums = async () => {
    setIsLoading(true);
    try {
      const { docs, albums } = await getGlobalDocumentsAction();
      setDocuments(docs);
      setAlbums(albums);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load documents and albums.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocsAndAlbums();
  }, []);

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
        loadDocsAndAlbums();
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
          <h1 className="text-3xl font-headline font-semibold">Knowledge Base</h1>
          <p className="text-muted-foreground">Find guides, tutorials, and references shared by the community.</p>
        </div>
        <div className="flex gap-2">
            <Dialog open={isCreateAlbumOpen} onOpenChange={setIsCreateAlbumOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline"><BookCopy className="mr-2 h-5 w-5" /> Create Album</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Album</DialogTitle>
                        <UIDialogDescription>Albums help you organize your documents into collections.</UIDialogDescription>
                    </DialogHeader>
                     <Form {...albumForm}>
                        <form action={createAlbumFormAction} className="space-y-4">
                            <FormField control={albumForm.control} name="title" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Album Title</FormLabel>
                                    <FormControl><Input {...field} placeholder="e.g., API Documentation, Project Phoenix Notes"/></FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}/>
                             <FormField control={albumForm.control} name="description" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description (Optional)</FormLabel>
                                    <FormControl><Textarea {...field} rows={3} placeholder="A short description of what this album contains."/></FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}/>
                            <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="ghost" disabled={isCreatingAlbum}>Cancel</Button></DialogClose>
                                <Button type="submit" disabled={isCreatingAlbum}>
                                    {isCreatingAlbum && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Create Album
                                </Button>
                            </DialogFooter>
                        </form>
                     </Form>
                </DialogContent>
            </Dialog>
            <Button asChild>
              <Link href="/documentation/new">
                <PlusCircle className="mr-2 h-5 w-5" /> Create Document
              </Link>
            </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
            <CardTitle>Browse Knowledge Base</CardTitle>
            <div className="relative w-full sm:w-auto sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search docs or tags..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="space-y-8">
                {/* Albums Section */}
                <div>
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-primary"><BookCopy /> Albums</h3>
                    {albums.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                           <p>No albums created yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {albums.map(album => (
                                <Card key={album.uuid} className="hover:shadow-md transition-shadow">
                                    <CardHeader>
                                        <CardTitle className="text-lg">{album.title}</CardTitle>
                                        <CardDescription>{album.description || "No description"}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">{album.documentCount || 0} documents</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Uncategorized Documents Section */}
                 <div>
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-primary"><FileText /> Documents</h3>
                      {filteredDocuments.length === 0 ? (
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
                 </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
