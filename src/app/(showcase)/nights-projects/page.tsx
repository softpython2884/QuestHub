
'use client';

import { Button } from '@/components/ui/button';
import { Github, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { projects } from './data';

const ProjectCard = ({ project, index }: { project: (typeof projects)[0], index: number }) => (
    <Link href={`/nights-projects/${project.slug}`} className="block group">
        <div className={cn("relative rounded-xl border border-white/10 bg-black/30 backdrop-blur-md overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 h-full flex flex-col")}>
            <div className="relative h-48 w-full overflow-hidden">
                <Image 
                    src={project.image}
                    alt={project.name}
                    width={600}
                    height={400}
                    data-ai-hint={project.imageHint}
                    className="absolute inset-0 h-full w-full object-cover opacity-10 transition-all duration-500 group-hover:opacity-20 group-hover:scale-105"
                />
            </div>
            <div className="relative p-6 md:p-8 flex flex-col h-full flex-grow">
                <h3 className="text-2xl font-bold text-white mb-2">{project.name}</h3>
                <p className="text-muted-foreground text-sm mb-6 flex-grow">{project.shortDescription}</p>
                <div className="mt-auto">
                     <Button variant="default" className="w-full bg-primary/80 hover:bg-primary text-primary-foreground">
                        Voir les détails
                    </Button>
                </div>
            </div>
        </div>
    </Link>
)

export default function NightsProjectsPage() {
  return (
    <div className="min-h-screen text-white p-4 md:p-8 relative z-10 w-full">
        <div className="absolute top-4 left-4">
             <Button variant="ghost" asChild>
                <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4"/> Retour</Link>
             </Button>
        </div>
      <header className="text-center py-16 md:py-24">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-neutral-400">
          NightsDevs Projects
        </h1>
        <p className="max-w-3xl mx-auto mt-4 text-lg text-muted-foreground">
          Une collection de mes projets les plus ambitieux, développés en solo.
          Chaque projet est une exploration de nouvelles technologies et de concepts innovants.
        </p>
         <div className="mt-8">
            <a href="https://github.com/SoftWare-Enzo-P" target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="bg-white text-black hover:bg-neutral-200">
                    <Github className="mr-2 h-5 w-5"/> Visiter mon GitHub
                </Button>
            </a>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <ProjectCard key={project.name} project={project} index={index} />
          ))}
        </div>
      </main>
    </div>
  );
}
