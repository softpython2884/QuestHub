
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone, PlusCircle, Trash2, Loader2, AlertTriangle, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { GlobalAnnouncement } from "@/types";
import { useEffect, useState, useActionState } from "react";
import { getGlobalAnnouncementsAction, deleteGlobalAnnouncementAction } from "./actions";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<GlobalAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [announcementToDelete, setAnnouncementToDelete] = useState<GlobalAnnouncement | null>(null);

  const [deleteState, deleteAction, isDeleting] = useActionState(deleteGlobalAnnouncementAction, { success: false, error: null });

  useEffect(() => {
    async function loadAnnouncements() {
      setIsLoading(true);
      try {
        const data = await getGlobalAnnouncementsAction();
        setAnnouncements(data);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load announcements.' });
      } finally {
        setIsLoading(false);
      }
    }
    loadAnnouncements();
  }, [toast]);
  
  useEffect(() => {
    if (deleteState.success) {
      toast({ title: "Success", description: "Announcement deleted." });
      setAnnouncements(prev => prev.filter(a => a.uuid !== announcementToDelete?.uuid));
      setAnnouncementToDelete(null);
    }
    if (deleteState.error) {
      toast({ variant: 'destructive', title: "Error", description: deleteState.error });
    }
  }, [deleteState, announcementToDelete, toast]);

  const getInitials = (name?: string) => {
    if (!name) return '?';
    const names = name.split(' ');
    let initials = names[0].substring(0, 1).toUpperCase();
    if (names.length > 1) {
      initials += names[names.length - 1].substring(0, 1).toUpperCase();
    }
    return initials;
  };

  const handleDeleteConfirm = () => {
    if (!announcementToDelete) return;
    const formData = new FormData();
    formData.append('announcementUuid', announcementToDelete.uuid);
    deleteAction(formData);
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-semibold">Announcements</h1>
          <p className="text-muted-foreground">Stay updated with the latest global news and updates.</p>
        </div>
        {user?.role === 'admin' && (
          <Button asChild>
            <Link href="/announcements/new">
              <PlusCircle className="mr-2 h-5 w-5" /> Create Announcement
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest Announcements</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="p-4"><Skeleton className="h-24 w-full" /></Card>
              ))}
            </div>
          ) : announcements.length === 0 ? (
             <div className="text-center py-12">
              <Megaphone className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No announcements yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Check back later for updates.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <Card key={announcement.uuid} className="shadow-sm">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{announcement.title}</CardTitle>
                      {user?.role === 'admin' && (
                         <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" title="Delete Announcement" onClick={() => setAnnouncementToDelete(announcement)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          {announcementToDelete?.uuid === announcement.uuid && (
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Announcement: "{announcementToDelete.title}"?</AlertDialogTitle>
                                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setAnnouncementToDelete(null)}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          )}
                        </AlertDialog>
                      )}
                    </div>
                    <CardDescription className="flex items-center gap-2 text-xs">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={announcement.authorAvatar} alt={announcement.authorName} data-ai-hint="user avatar" />
                          <AvatarFallback className="text-xs">{getInitials(announcement.authorName)}</AvatarFallback>
                        </Avatar>
                        By {announcement.authorName} on {new Date(announcement.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="prose dark:prose-invert max-w-none text-sm">
                     <ReactMarkdown remarkPlugins={[remarkGfm]}>{announcement.content}</ReactMarkdown>
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
