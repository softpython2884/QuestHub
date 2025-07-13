
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, PlusCircle, BookOpen, User, Trash2, Edit, Tag, Pin, PinOff, Folder, Copy, BookCopy, ChevronRight, GripVertical, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useActionState, startTransition, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { GlobalDocument, DocAlbum } from "@/types";
import { getKnowledgeBaseData, deleteGlobalDocumentAction, toggleGlobalDocumentPinAction, createAlbumAction } from "./actions";
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
import { useSearchParams, useRouter } from 'next/navigation';


const albumFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters.").max(100),
  description: z.string().max(255).optional(),
});
type AlbumFormValues = z.infer<typeof albumFormSchema>;

function KnowledgeBaseContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [documents, setDocuments] = useState<GlobalDocument[]>([]);
  const [albums, setAlbums] = useState<DocAlbum[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [documentToDelete, setDocumentToDelete] = useState<GlobalDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateAlbumOpen, setIsCreateAlbumOpen] = useState(false);
  const [activeAlbumId, setActiveAlbumId] = useState<string | 'all' | 'unassigned'>('all');

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
        loadData();
      }
      return result;
  }, { error: null });
  
  const loadData = async () => {
    setIsLoading(true);
    try {
      const { docs, albums } = await getKnowledgeBaseData();
      setDocuments(docs);
      setAlbums(albums);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load documents and albums.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const albumIdFromUrl = searchParams.get('album');
    if (albumIdFromUrl) {
      setActiveAlbumId(albumIdFromUrl);
    } else {
      setActiveAlbumId('all');
    }
  }, [searchParams]);

  const handleAlbumSelect = (albumId: string) => {
    setActiveAlbumId(albumId);
    router.push(albumId === 'all' ? '/documentation' : `/documentation?album=${albumId}`, { scroll: false });
  };

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
        loadData();
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
      }
    });
  }

  const filteredDocuments = useMemo(() => {
    let docs = documents;
    if (activeAlbumId === 'unassigned') {
        docs = documents.filter(doc => !doc.albums || doc.albums.length === 0);
    } else if (activeAlbumId !== 'all') {
        docs = documents.filter(doc => doc.albums?.some(album => album.uuid === activeAlbumId));
    }

    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        docs = docs.filter(doc => 
            doc.title.toLowerCase().includes(term) ||
            doc.authorName?.toLowerCase().includes(term) ||
            doc.tags?.some(tag => tag.name.toLowerCase().includes(term))
        );
    }

    // Pinned documents always on top
    docs.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return docs;
  }, [documents, searchTerm, activeAlbumId]);
  
  const activeAlbumTitle = useMemo(() => {
    if (activeAlbumId === 'all') return 'All Documents';
    if (activeAlbumId === 'unassigned') return 'Unassigned';
    return albums.find(a => a.uuid === activeAlbumId)?.title || 'Knowledge Base';
  }, [activeAlbumId, albums]);

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-semibold">Knowledge Base</h1>
          <p className="text-muted-foreground">Find guides, tutorials, and references shared by the community.</p>
        </div>
        <div className="flex gap-2">
            <Button asChild>
              <Link href="/documentation/new">
                <PlusCircle className="mr-2 h-5 w-5" /> Create Document
              </Link>
            </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
        <aside className="hidden md:flex flex-col gap-4">
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
            <Card className="p-2">
                <nav className="flex flex-col gap-1">
                    <Button variant={activeAlbumId === 'all' ? 'secondary' : 'ghost'} className="justify-start gap-2" onClick={() => handleAlbumSelect('all')}>
                        <BookOpen className="h-4 w-4" /> All Documents
                    </Button>
                    <hr className="my-1" />
                    {isLoading ? (
                         <div className="space-y-2 p-2">
                           {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full"/>)}
                         </div>
                    ) : albums.map(album => (
                        <Button key={album.uuid} variant={activeAlbumId === album.uuid ? 'secondary' : 'ghost'} className="justify-start gap-2" onClick={() => handleAlbumSelect(album.uuid)}>
                            <Folder className="h-4 w-4" />
                            <span className="truncate flex-1 text-left">{album.title}</span>
                            <Badge variant="outline" className="text-xs">{album.documentCount}</Badge>
                        </Button>
                    ))}
                     <hr className="my-1" />
                     <Button variant={activeAlbumId === 'unassigned' ? 'secondary' : 'ghost'} className="justify-start gap-2" onClick={() => handleAlbumSelect('unassigned')}>
                        <FileText className="h-4 w-4" /> Unassigned
                    </Button>
                </nav>
            </Card>
        </aside>

        <main>
           <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
                <CardTitle>{activeAlbumTitle}</CardTitle>
                <div className="relative w-full sm:w-auto sm:max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search docs or tags..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
                </div>
              ) : filteredDocuments.length === 0 ? (
                 <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                    <BookOpen className="mx-auto h-12 w-12 mb-4" />
                    <h3 className="text-lg font-medium">{searchTerm ? "No Results" : "No Documents"}</h3>
                    <p className="mt-1 text-sm">
                        {searchTerm ? "Try a different search term." : "This album is empty."}
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
                        <div className="flex items-start gap-3 flex-grow min-w-0">
                          <FileText className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                          <div className="flex-grow">
                            <div className="flex items-center gap-2">
                              {doc.isPinned && <Pin className="h-4 w-4 text-primary" />}
                              <h3 className="font-semibold hover:text-primary truncate">
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
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
           </Card>
        </main>
      </div>
    </div>
  );
}


export default function DocumentationPage() {
    return <KnowledgeBaseContent />
}
