
'use client';
import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getTeamData, startConversationAction, searchTeam } from './actions';
import { useToast } from '@/hooks/use-toast';
import type { Project, User } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Users, MessageSquare, AlertTriangle, Hash, Loader2 } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

export default function TeamPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, startSearchTransition] = useTransition();

    const [groups, setGroups] = useState<Array<Project & { memberCount: number }>>([]);
    const [teamMembers, setTeamMembers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const loadInitialData = async () => {
        setIsLoading(true);
        const result = await getTeamData();
        if ('error' in result) {
            toast({ variant: 'destructive', title: "Error", description: result.error });
        } else {
            setGroups(result.groups);
            setTeamMembers(result.teamMembers);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadInitialData();
    }, []);

     useEffect(() => {
        if (debouncedSearchTerm.trim()) {
            startSearchTransition(async () => {
                const results = await searchTeam(debouncedSearchTerm);
                 if ('error' in results) {
                    toast({ variant: 'destructive', title: "Search Error", description: results.error });
                } else {
                    setGroups(results.groups);
                    setTeamMembers(results.teamMembers);
                }
            });
        } else if (debouncedSearchTerm.trim().length === 0) {
             startSearchTransition(async () => {
                await loadInitialData();
             });
        }
    }, [debouncedSearchTerm, toast]);
    
    const handleStartConversation = async (payload: { projectUuid?: string; otherUserUuid?: string }) => {
        const result = await startConversationAction(payload);
        if (result.error) {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        } else if (result.conversationUuid) {
            router.push(`/chat/${result.conversationUuid}`);
        }
    };
    
    const getInitials = (name?: string) => {
        if (!name) return '??';
        const names = name.split(' ');
        return (names[0][0] + (names.length > 1 ? names[names.length - 1][0] : '')).toUpperCase();
    };


    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-headline font-semibold">Team</h1>
                <p className="text-muted-foreground">Find your collaborators and start conversations.</p>
            </div>
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    placeholder="Search for projects or team members..."
                    className="pl-10 text-base"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {(isLoading || isSearching) && (
                 <div className="space-y-6">
                    <Skeleton className="h-8 w-1/4" />
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                         {[...Array(3)].map((_, i) => <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-8 w-full"/></CardContent></Card>)}
                    </div>
                    <Skeleton className="h-8 w-1/4" />
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                         {[...Array(3)].map((_, i) => <Card key={i}><CardHeader><Skeleton className="h-12 w-12 rounded-full" /><Skeleton className="h-5 w-3/4 mt-2" /></CardHeader><CardContent><Skeleton className="h-8 w-full"/></CardContent></Card>)}
                    </div>
                </div>
            )}
            
            {!isLoading && !isSearching && (
                 <div className="space-y-8">
                    <div>
                        <h2 className="text-xl font-semibold flex items-center mb-4"><Hash className="mr-2 h-5 w-5 text-primary"/> Project Groups</h2>
                         {groups.length > 0 ? (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {groups.map(p => (
                                    <Card key={p.uuid}>
                                        <CardHeader>
                                            <CardTitle>{p.name}</CardTitle>
                                            <CardDescription>{p.memberCount} members</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <Button className="w-full" onClick={() => handleStartConversation({ projectUuid: p.uuid })}>
                                                <MessageSquare className="mr-2 h-4 w-4"/> Open Chat
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                             <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                <Users className="mx-auto h-10 w-10 mb-2"/>
                                <p>No project groups found.</p>
                            </div>
                        )}
                    </div>

                    <div>
                        <h2 className="text-xl font-semibold flex items-center mb-4"><Users className="mr-2 h-5 w-5 text-primary"/> Team Members</h2>
                        {teamMembers.length > 0 ? (
                             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {teamMembers.map(u => (
                                    <Card key={u.uuid}>
                                        <CardHeader className="items-center text-center">
                                            <Avatar className="h-16 w-16">
                                                <AvatarImage src={u.avatar} alt={u.name} />
                                                <AvatarFallback className="text-xl">{getInitials(u.name)}</AvatarFallback>
                                            </Avatar>
                                            <CardTitle className="text-lg pt-2">{u.name}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex flex-col gap-2">
                                            <Button className="w-full" variant="outline" onClick={() => handleStartConversation({ otherUserUuid: u.uuid })}>
                                                <MessageSquare className="mr-2 h-4 w-4"/> Direct Message
                                            </Button>
                                             <Button className="w-full" variant="secondary" asChild>
                                                <Link href={`/profile/${u.uuid}`}>View Profile</Link>
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                <Users className="mx-auto h-10 w-10 mb-2"/>
                                <p>No other team members found.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

