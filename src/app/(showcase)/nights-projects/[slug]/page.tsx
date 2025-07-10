
'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Github, Copy, PlayCircle, ExternalLink, Gamepad2, Video } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { projects } from '../data';
import { Badge } from '@/components/ui/badge';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { slug } = params;
  
  const project = projects.find(p => p.slug === slug);

  if (!project) {
    if (typeof window !== 'undefined') {
        router.push('/nights-projects');
    }
    return null; 
  }

  return (
    <div className="min-h-screen text-white p-4 md:p-8 relative z-10 w-full animate-fade-in">
        <div className="absolute top-4 left-4">
             <Button variant="ghost" asChild>
                <Link href="/nights-projects"><ArrowLeft className="mr-2 h-4 w-4"/> Tous les projets</Link>
             </Button>
        </div>
      <main className="max-w-5xl mx-auto mt-24">
        <div className="relative h-64 md:h-96 w-full rounded-xl overflow-hidden border border-white/10 mb-8">
             <Image 
                src={project.image}
                alt={project.name}
                fill
                style={{objectFit:"cover"}}
                data-ai-hint={project.imageHint}
                className="opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent flex flex-col justify-end p-8">
                 <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white">
                    {project.name}
                </h1>
                <div className="mt-2 flex flex-wrap gap-2">
                    {project.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="backdrop-blur-sm bg-white/10 text-white">{tag}</Badge>
                    ))}
                </div>
            </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                <div>
                    <h2 className="text-2xl font-bold mb-4 border-b border-white/10 pb-2">À propos du projet</h2>
                    <div className="prose prose-invert max-w-none text-muted-foreground leading-relaxed">
                        {project.longDescription}
                    </div>
                </div>
                
                {project.galleryImages && project.galleryImages.length > 0 && (
                    <div>
                         <h2 className="text-2xl font-bold mb-4 border-b border-white/10 pb-2">Galerie</h2>
                         <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {project.galleryImages.map((img, index) => (
                                <div key={index} className="aspect-video relative rounded-lg overflow-hidden border border-white/10">
                                    <Image src={img.src} alt={img.alt} fill style={{objectFit: 'cover'}} data-ai-hint={img.hint} />
                                </div>
                            ))}
                         </div>
                    </div>
                )}
            </div>
            <div className="lg:col-span-1 space-y-4">
                <div className="p-4 bg-black/20 rounded-xl border border-white/10">
                    <h3 className="text-xl font-semibold mb-3">Accès Rapide</h3>
                     <div className="flex flex-col gap-3">
                        {project.githubUrl && (
                            <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" className="w-full bg-transparent text-white border-white/20 hover:bg-white/10 hover:text-white">
                                    <Github className="mr-2 h-4 w-4" /> Voir sur GitHub
                                </Button>
                            </a>
                        )}
                         {project.websiteUrl && (
                            <a href={project.websiteUrl} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" className="w-full bg-transparent text-white border-white/20 hover:bg-white/10 hover:text-white">
                                    <ExternalLink className="mr-2 h-4 w-4" /> Visiter le site
                                </Button>
                            </a>
                        )}
                         {project.discordUrl && (
                            <a href={project.discordUrl} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" className="w-full bg-transparent text-white border-white/20 hover:bg-white/10 hover:text-white">
                                    <Gamepad2 className="mr-2 h-4 w-4" /> Rejoindre le Discord
                                </Button>
                            </a>
                        )}
                        {project.videoUrl && (
                           <a href={project.videoUrl} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" className="w-full bg-transparent text-white border-white/20 hover:bg-white/10 hover:text-white">
                                    <Video className="mr-2 h-4 w-4" /> Voir la Vidéo
                                </Button>
                            </a>
                        )}
                        {project.cloneUrl && (
                            <Link href={project.cloneUrl} passHref>
                                <Button variant="default" className="w-full bg-primary/80 hover:bg-primary text-primary-foreground">
                                    <Copy className="mr-2 h-4 w-4" /> Cloner avec FlowUp
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}
