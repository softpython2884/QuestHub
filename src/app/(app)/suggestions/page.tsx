
'use client';

import { useState, useEffect, useActionState, useOptimistic, startTransition } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getSuggestionsAction, createSuggestionAction, voteOnSuggestionAction } from './actions';
import type { Suggestion, SuggestionVote } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThumbsUp, ThumbsDown, PlusCircle, Lightbulb, MessageSquare, Loader2, GitMerge } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type SuggestionWithVote = Suggestion & { userVote: SuggestionVote['voteType'] | null };

const suggestionFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters.").max(150),
  description: z.string().min(10, "Description must be at least 10 characters.").max(2000),
});

type SuggestionFormValues = z.infer<typeof suggestionFormSchema>;

export default function SuggestionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<SuggestionWithVote[]>([]);
  const [optimisticSuggestions, addOptimisticVote] = useOptimistic<SuggestionWithVote[], { suggestionUuid: string; voteType: SuggestionVote['voteType'] }>(
    suggestions,
    (state, { suggestionUuid, voteType }) => {
        return state.map(s => {
            if (s.uuid !== suggestionUuid) return s;

            let newVoteCount = s.voteCount;
            let newUserVote: SuggestionVote['voteType'] | null = voteType;

            if (s.userVote === voteType) { // Undoing a vote
                newVoteCount += (voteType === 'up' ? -1 : 1);
                newUserVote = null;
            } else {
                if (s.userVote) { // Changing a vote
                    newVoteCount += (voteType === 'up' ? 2 : -2);
                } else { // New vote
                    newVoteCount += (voteType === 'up' ? 1 : -1);
                }
            }
            return { ...s, voteCount: newVoteCount, userVote: newUserVote };
        });
    }
  );
  
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const [createState, createFormAction, isCreating] = useActionState(createSuggestionAction, { success: false, error: null });
  const form = useForm<SuggestionFormValues>({ resolver: zodResolver(suggestionFormSchema), defaultValues: { title: '', description: '' } });

  const loadSuggestions = async () => {
      setIsLoading(true);
      const result = await getSuggestionsAction();
      if ('error' in result) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      } else {
        setSuggestions(result);
      }
      setIsLoading(false);
  };
  
  useEffect(() => {
    loadSuggestions();
  }, []);

  useEffect(() => {
    if (createState.success) {
      toast({ title: "Success!", description: "Your suggestion has been submitted." });
      setIsCreateDialogOpen(false);
      form.reset();
      // Re-fetch suggestions to see the new one
      loadSuggestions();
    } else if (createState.error) {
      toast({ variant: 'destructive', title: 'Error', description: createState.error });
    }
  }, [createState, form, toast]);

  const handleVote = async (suggestionUuid: string, voteType: SuggestionVote['voteType']) => {
    startTransition(() => {
        addOptimisticVote({ suggestionUuid, voteType });
    });
    const result = await voteOnSuggestionAction(suggestionUuid, voteType);
    if (result.error) {
        toast({ variant: 'destructive', title: 'Vote Error', description: result.error });
        // Revert optimistic update by re-fetching. Since the action revalidates, this might be redundant but safe.
        loadSuggestions();
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    const names = name.split(' ');
    return (names[0][0] + (names.length > 1 ? names[names.length - 1][0] : '')).toUpperCase();
  };

  const getStatusBadgeVariant = (status: Suggestion['status']): 'default' | 'secondary' | 'outline' => {
      switch (status) {
          case 'planned': return 'default';
          case 'under_review': return 'secondary';
          case 'done': return 'outline';
          default: return 'secondary';
      }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-semibold flex items-center gap-2"><Lightbulb className="text-primary"/>Suggestions</h1>
          <p className="text-muted-foreground">Propose new features and vote on ideas from the community.</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2 h-4 w-4" /> New Suggestion</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Submit a Suggestion</DialogTitle>
                    <DialogDescription>Share your idea with the community. Please be clear and concise.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form action={createFormAction} className="space-y-4">
                        <FormField control={form.control} name="title" render={({ field }) => (
                            <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} placeholder="e.g., Add dark mode for owls" /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} rows={5} placeholder="Explain your idea in more detail. What problem does it solve?" /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="ghost" disabled={isCreating}>Cancel</Button></DialogClose>
                            <Button type="submit" disabled={isCreating}>
                                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Submit
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full"/>)}
        </div>
      ) : optimisticSuggestions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
            <MessageSquare className="mx-auto h-12 w-12 mb-4"/>
            <h3 className="text-lg font-semibold">No Suggestions Yet</h3>
            <p>Be the first to share an idea!</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {optimisticSuggestions.map(s => (
            <Card key={s.uuid} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-xl">{s.title}</CardTitle>
                    <Badge variant={getStatusBadgeVariant(s.status)} className="capitalize shrink-0">{s.status.replace('_', ' ')}</Badge>
                </div>
                <CardDescription className="flex items-center gap-2 text-xs pt-1">
                    <Avatar className="h-5 w-5"><AvatarImage src={s.authorAvatar}/><AvatarFallback>{getInitials(s.authorName)}</AvatarFallback></Avatar>
                    <span>By {s.authorName} on {new Date(s.createdAt).toLocaleDateString()}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                 <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground line-clamp-3">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{s.description}</ReactMarkdown>
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-between bg-muted/50 py-3 px-4 rounded-b-lg">
                 <Button variant="link" size="sm" className="text-muted-foreground">Read More...</Button>
                 <div className="flex items-center gap-2">
                    <Button variant={s.userVote === 'up' ? 'default' : 'outline'} size="sm" className="gap-2" onClick={() => handleVote(s.uuid, 'up')}>
                        <ThumbsUp className="h-4 w-4"/>
                    </Button>
                    <span className="font-bold text-lg min-w-[2rem] text-center">{s.voteCount}</span>
                     <Button variant={s.userVote === 'down' ? 'destructive' : 'outline'} size="sm" className="gap-2" onClick={() => handleVote(s.uuid, 'down')}>
                        <ThumbsDown className="h-4 w-4"/>
                    </Button>
                 </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
