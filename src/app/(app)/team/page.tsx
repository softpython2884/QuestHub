
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { Project, User } from "@/types";
import { useEffect, useState, useTransition } from "react";
import { getTeamData, searchTeam, startConversationAction } from "./actions";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, MessageSquare, FolderKanban, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";

type ProjectWithMemberCount = Project & { memberCount: number };

export default function TeamPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isSearching, startSearchTransition] = useTransition();
    const [isStartingChat, setIsStartingChat] = useState<string | null>(null);

    const [projects, setProjects] = useState<ProjectWithMemberCount[]>([]);
    const [teamMembers, setTeamMembers] = useState<User[]>([]);
    
    const loadInitialData = async () => {
        setIsLoading(true);
        try {
            const teamData = await getTeamData();
            setProjects(teamData.projects);
            setTeamMembers(teamData.users);
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not load team data." });
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        if (user) {
            loadInitialData();
        }
    }, [user]);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (searchTerm.trim().length > 1) {
                startSearchTransition(async () => {
                    const results = await searchTeam(searchTerm);
                    setProjects(results.projects);
                    setTeamMembers(results.users);
                });
            } else if (searchTerm.trim().length === 0) {
                 startSearchTransition(async () => {
                    if (user) {
                        await loadInitialData();
                    }
                 });
            }
        }, 300);

        return () => clearTimeout(handler);
    }, [searchTerm, user]);
    
    const getInitials = (name?: string) => {
        if (!name) return '??';
        const names = name.split(' ');
        let initials = names[0].substring(0, 1).toUpperCase();
        if (names.length > 1) {
            initials += names[names.length - 1].substring(0, 1).toUpperCase();
        }
        return initials;
    };

    const handleStartChat = async (params: { projectUuid?: string, otherUserUuid?: string }) => {
        const id = params.projectUuid || params.otherUserUuid;
        if (!id) return;
        
        setIsStartingChat(id);
        const result = await startConversationAction(params);
        setIsStartingChat(null);

        if (result.error) {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        } else if (result.conversationId) {
            router.push(`/chat/${result.conversationId}`);
        }
    };


    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-headline font-semibold">Team</h1>
                <p className="text-muted-foreground">Find team members and project groups to start a conversation.</p>
            </div>
            
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    placeholder="Search for team members or project groups..."
                    className="pl-10 text-base"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            {(isLoading || isSearching) && (
                <div className="space-y-8">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {[...Array(3)].map((_, i) => (
                            <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /><Skeleton className="h-10 w-full mt-2" /></CardHeader><CardContent><Skeleton className="h-8 w-full"/></CardContent></Card>
                        ))}
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                         {[...Array(3)].map((_, i) => (
                            <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full"/></CardContent></Card>
                        ))}
                    </div>
                </div>
            )}

            {!isLoading && !isSearching && searchTerm && (
                <h2 className="text-xl font-semibold">Search Results for "{searchTerm}"</h2>
            )}
            
            {!isLoading && !isSearching && projects.length > 0 && (
                 <div className="space-y-4">
                     <h3 className="text-lg font-semibold flex items-center"><FolderKanban className="mr-2 h-5 w-5 text-primary"/> Project Groups</h3>
                     <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {projects.map((p) => (
                            <Card key={p.uuid} className="flex flex-col hover:shadow-md transition-shadow">
                                <CardHeader className="flex-grow">
                                    <CardTitle className="hover:text-primary"><Link href={`/projects/${p.uuid}`}>{p.name}</Link></CardTitle>
                                    <CardDescription className="h-10 overflow-hidden text-ellipsis line-clamp-2">{p.description || "No description."}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                     <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        <span>{p.memberCount} members</span>
                                    </div>
                                    <Button variant="outline" className="w-full" onClick={() => handleStartChat({ projectUuid: p.uuid })} disabled={isStartingChat === p.uuid}>
                                        {isStartingChat === p.uuid ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <MessageSquare className="mr-2 h-4 w-4" />}
                                        Open Chat
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                     </div>
                 </div>
            )}

             {!isLoading && !isSearching && teamMembers.length > 0 && (
                <div className="space-y-4">
                     <h3 className="text-lg font-semibold flex items-center"><Users className="mr-2 h-5 w-5 text-primary"/> Team Members</h3>
                     <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {teamMembers.map(u => (
                            <Card key={u.uuid} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-4 flex items-center justify-between gap-4">
                                    <Link href={`/profile/${u.uuid}`} className="flex items-center gap-3 group">
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage src={u.avatar} alt={u.name} />
                                            <AvatarFallback>{getInitials(u.name)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold group-hover:text-primary">{u.name}</p>
                                            <p className="text-xs text-muted-foreground">@{u.name.toLowerCase().replace(/\s+/g, '')}</p>
                                        </div>
                                    </Link>
                                    <Button variant="outline" size="icon" title="Direct Message" onClick={() => handleStartChat({ otherUserUuid: u.uuid })} disabled={isStartingChat === u.uuid}>
                                        {isStartingChat === u.uuid ? <Loader2 className="h-5 w-5 animate-spin"/> : <MessageSquare className="h-5 w-5" />}
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
            
            {!isLoading && !isSearching && projects.length === 0 && teamMembers.length === 0 && (
                 <div className="text-center py-16 text-muted-foreground">
                    <Search className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p className="font-medium">No Results Found</p>
                    <p className="text-sm">
                        {searchTerm ? "Try a different search term." : "You haven't joined any team projects yet."}
                    </p>
                </div>
            )}
            
        </div>
    );
}
