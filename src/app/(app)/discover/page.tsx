
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { Project, User } from "@/types";
import { useEffect, useState, useTransition } from "react";
import { getPublicProjects, searchPublic, toggleStarProject } from "./actions";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, FolderKanban, Star, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";


export default function DiscoverPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isSearching, startSearchTransition] = useTransition();

    const [projects, setProjects] = useState<Array<Project & { starCount: number, isStarred: boolean }>>([]);
    const [users, setUsers] = useState<User[]>([]);
    
    const loadInitialData = async () => {
        setIsLoading(true);
        try {
            const initialProjects = await getPublicProjects();
            setProjects(initialProjects);
            setUsers([]);
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not load public projects." });
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (searchTerm.trim().length > 1) {
                startSearchTransition(async () => {
                    const results = await searchPublic(searchTerm);
                    setProjects(results.projects);
                    setUsers(results.users);
                });
            } else if (searchTerm.trim().length === 0) {
                 startSearchTransition(async () => {
                    await loadInitialData();
                 });
            }
        }, 300);

        return () => clearTimeout(handler);
    }, [searchTerm]);

    const handleStarToggle = async (projectUuid: string, isCurrentlyStarred: boolean) => {
        if (!user) {
            toast({ variant: "destructive", title: "Authentication required", description: "You must be logged in to star projects." });
            return;
        }

        // Optimistic update
        setProjects(currentProjects => 
            currentProjects.map(p => {
                if (p.uuid === projectUuid) {
                    return {
                        ...p,
                        isStarred: !isCurrentlyStarred,
                        starCount: p.starCount + (!isCurrentlyStarred ? 1 : -1)
                    };
                }
                return p;
            })
        );
        
        const result = await toggleStarProject(projectUuid);
        if (result.error) {
            toast({ variant: "destructive", title: "Error", description: result.error });
            // Revert optimistic update
            setProjects(currentProjects => 
                currentProjects.map(p => {
                    if (p.uuid === projectUuid) {
                        return {
                            ...p,
                            isStarred: isCurrentlyStarred,
                            starCount: p.starCount - (!isCurrentlyStarred ? 1 : -1)
                        };
                    }
                    return p;
                })
            );
        }
    };
    
    const getInitials = (name?: string) => {
        if (!name) return '??';
        const names = name.split(' ');
        let initials = names[0].substring(0, 1).toUpperCase();
        if (names.length > 1) {
            initials += names[names.length - 1].substring(0, 1).toUpperCase();
        }
        return initials;
    };


    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-headline font-semibold">Discover</h1>
                <p className="text-muted-foreground">Explore public projects and find talented users in the FlowUp community.</p>
            </div>
            
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    placeholder="Search for public projects or users..."
                    className="pl-10 text-base"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            {(isLoading || isSearching) && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(6)].map((_, i) => (
                        <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /><Skeleton className="h-10 w-full mt-2" /></CardHeader><CardContent><Skeleton className="h-8 w-full"/></CardContent></Card>
                    ))}
                </div>
            )}

            {!isLoading && !isSearching && searchTerm && (
                <h2 className="text-xl font-semibold">Search Results for "{searchTerm}"</h2>
            )}
            
            {!isLoading && !isSearching && users.length > 0 && (
                <div className="space-y-4">
                     <h3 className="text-lg font-semibold flex items-center"><Users className="mr-2 h-5 w-5 text-primary"/> Users</h3>
                     <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {users.map(u => (
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
                                    <Button variant="outline" size="sm" asChild><Link href={`/profile/${u.uuid}`}>View Profile</Link></Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
            
             {!isLoading && !isSearching && projects.length > 0 && (
                 <div className="space-y-4">
                     <h3 className="text-lg font-semibold flex items-center"><FolderKanban className="mr-2 h-5 w-5 text-primary"/> Projects</h3>
                     <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {projects.map((p) => (
                            <Card key={p.uuid} className="flex flex-col hover:shadow-md transition-shadow">
                                <CardHeader className="flex-grow">
                                    <CardTitle className="hover:text-primary"><Link href={`/projects/${p.uuid}`}>{p.name}</Link></CardTitle>
                                    <CardDescription className="h-12 overflow-hidden text-ellipsis line-clamp-2">{p.description || "No description."}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="text-xs text-muted-foreground flex items-center justify-between">
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            <span>Updated: {new Date(p.updatedAt).toLocaleDateString()}</span>
                                        </div>
                                         <div className="flex items-center gap-1">
                                            <Users className="h-3 w-3" />
                                            <span>{p.ownerName || 'Unknown Owner'}</span>
                                        </div>
                                    </div>
                                    <Button variant="outline" className="w-full" onClick={() => handleStarToggle(p.uuid, p.isStarred)}>
                                        <Star className={cn("mr-2 h-4 w-4", p.isStarred && "fill-yellow-400 text-yellow-500")} />
                                        {p.isStarred ? 'Starred' : 'Star'} ({p.starCount})
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                     </div>
                 </div>
            )}
            
            {!isLoading && !isSearching && projects.length === 0 && users.length === 0 && (
                 <div className="text-center py-16 text-muted-foreground">
                    <Search className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p className="font-medium">No Results Found</p>
                    <p className="text-sm">
                        {searchTerm ? "Try a different search term." : "There are no public projects or users to display yet."}
                    </p>
                </div>
            )}
            
        </div>
    );
}

    