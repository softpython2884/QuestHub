'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { getPublicProfileAction } from '../actions';
import type { User, Project } from '@/types';
import { Loader2, ArrowLeft, Building, Mail, Globe, Github, MessageSquare, Pin } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Badge } from '@/components/ui/badge';
import { fetchDiscordUserDetailsAction, fetchGithubUserDetailsAction } from '../../projects/[id]/actions';

interface ProfileData extends User {
    projects: Project[];
    pinnedProjects: Project[];
}

interface SocialDetails {
    github: { login: string; html_url: string } | null;
    discord: { username: string; discriminator: string } | null;
}

export default function PublicProfilePage() {
    const { user: currentUser } = useAuth();
    const params = useParams();
    const router = useRouter();
    const userUuid = params.uuid as string;

    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [socials, setSocials] = useState<SocialDetails>({ github: null, discord: null });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (userUuid) {
            setIsLoading(true);
            getPublicProfileAction(userUuid)
                .then(async (data) => {
                    if (data) {
                        setProfile(data);
                        
                        let socialDetails: SocialDetails = { github: null, discord: null };
                        if (data.showGithubOnProfile) {
                            const github = await fetchGithubUserDetailsAction(userUuid);
                            socialDetails.github = github ? { login: github.login, html_url: github.html_url } : null;
                        }
                        if (data.showDiscordOnProfile) {
                            const discord = await fetchDiscordUserDetailsAction(userUuid);
                            socialDetails.discord = discord ? { username: discord.username, discriminator: discord.discriminator } : null;
                        }
                        setSocials(socialDetails);

                    } else {
                        // Handle user not found
                        router.push('/discover');
                    }
                })
                .finally(() => setIsLoading(false));
        }
    }, [userUuid, router]);

    const getInitials = (name?: string) => {
        if (!name) return '?';
        const names = name.split(' ');
        let initials = names[0].substring(0, 1).toUpperCase();
        if (names.length > 1) {
            initials += names[names.length - 1].substring(0, 1).toUpperCase();
        }
        return initials;
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-24 w-24 rounded-full" />
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-5 w-64" />
                <div className="grid md:grid-cols-2 gap-6 mt-6">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div>
                <Button variant="outline" onClick={() => router.back()} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <p>User not found.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-start justify-between">
                 <Button variant="outline" onClick={() => router.back()} className="mb-0"> 
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                {currentUser?.uuid === profile.uuid && (
                     <Button asChild>
                        <Link href="/profile">Edit My Profile</Link>
                    </Button>
                )}
            </div>
            
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                <div className="flex-shrink-0 flex flex-col items-center">
                    <Avatar className="h-32 w-32 mb-4 ring-2 ring-primary ring-offset-4 ring-offset-background">
                        <AvatarImage src={profile.avatar} alt={profile.name} />
                        <AvatarFallback className="text-5xl">{getInitials(profile.name)}</AvatarFallback>
                    </Avatar>
                    <h1 className="text-3xl font-bold text-center">{profile.name}</h1>
                    <p className="text-muted-foreground">@{profile.name.toLowerCase().replace(/\s+/g, '')}</p>
                    <div className="flex items-center gap-4 mt-4">
                        {!!profile.showGithubOnProfile && socials.github && (
                            <a href={socials.github.html_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                                <Github className="h-6 w-6" />
                            </a>
                        )}
                        {!!profile.showDiscordOnProfile && socials.discord && (
                             <span className="text-muted-foreground flex items-center gap-1" title={`${socials.discord.username}#${socials.discord.discriminator}`}>
                                <MessageSquare className="h-6 w-6" />
                            </span>
                        )}
                         {profile.websiteUrl && (
                             <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                                <Globe className="h-6 w-6" />
                            </a>
                        )}
                    </div>
                </div>

                <div className="w-full">
                    {profile.bio && (
                        <Card>
                            <CardHeader><CardTitle>Bio</CardTitle></CardHeader>
                            <CardContent><p className="text-muted-foreground italic">"{profile.bio}"</p></CardContent>
                        </Card>
                    )}

                    {profile.pinnedProjects.length > 0 && (
                        <div className="mt-6">
                            <h2 className="text-xl font-semibold mb-3 flex items-center"><Pin className="mr-2 h-5 w-5 text-primary"/>Pinned Projects</h2>
                             <div className="grid md:grid-cols-2 gap-4">
                                {profile.pinnedProjects.map(project => (
                                    <Card key={project.uuid} className="hover:shadow-lg transition-shadow">
                                        <CardHeader>
                                            <CardTitle className="text-lg"><Link href={`/projects/${project.uuid}`}>{project.name}</Link></CardTitle>
                                            <CardDescription className="line-clamp-2 h-10">{project.description}</CardDescription>
                                        </CardHeader>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div className="mt-6">
                        <h2 className="text-xl font-semibold mb-3">Public Projects ({profile.projects.length})</h2>
                        {profile.projects.length > 0 ? (
                            <div className="grid md:grid-cols-2 gap-4">
                                {profile.projects.map(project => (
                                    <Card key={project.uuid} className="hover:shadow-lg transition-shadow">
                                        <CardHeader>
                                            <CardTitle className="text-lg"><Link href={`/projects/${project.uuid}`}>{project.name}</Link></CardTitle>
                                            <CardDescription className="line-clamp-2 h-10">{project.description}</CardDescription>
                                        </CardHeader>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground">This user has no public projects.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
