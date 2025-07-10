
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Github, Rocket, Copy, Video, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const projects = [
  {
    name: "FlowUp",
    description: "La plateforme tout-en-un pour les équipes de développement modernes, combinant gestion de projet, collaboration sur le code, documentation et assistance par IA pour un flux de travail sans friction.",
    image: "https://placehold.co/600x400.png",
    imageHint: "abstract tech code",
    githubUrl: "https://github.com/SoftWare-Enzo-P",
    cloneUrl: "/projects/d1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
  },
  {
    name: "Macro",
    description: "Un sub-system super simple à utiliser et à installer. C'est un système cumulant un PC, une box (film/séries) et surtout un hub de console de jeu, avec ses hubs sociaux et sa boutique.",
    image: "https://placehold.co/600x400.png",
    imageHint: "gaming console controller",
    githubUrl: "https://github.com/SoftWare-Enzo-P",
    cloneUrl: "#",
  },
  {
    name: "SimuBourse",
    description: "Un jeu web et une application PWA de simulation de business et de bourse à grand réalisme. Créez des entreprises, investissez, minez de la cryptomonnaie et entrez en bourse.",
    image: "https://placehold.co/600x400.png",
    imageHint: "stock market chart",
    githubUrl: "https://github.com/SoftWare-Enzo-P",
    cloneUrl: "#",
  },
  {
    name: "Space",
    description: "Un jeu .io solo et multijoueur de gestion et de stratégie. Chaque joueur doit défendre sa base, miner des ressources, gérer ses flottes et explorer la carte pour détruire les autres.",
    image: "https://placehold.co/600x400.png",
    imageHint: "space battle spaceship",
    githubUrl: "https://github.com/SoftWare-Enzo-P",
    cloneUrl: "#",
  },
  {
    name: "Panda",
    description: "Un écosystème complexe pour obtenir des domaines gratuits, créer des tunnels, des proxies, des VM, et bien plus encore pour les développeurs et les administrateurs système.",
    image: "https://placehold.co/600x400.png",
    imageHint: "server network datacenter",
    githubUrl: "https://github.com/SoftWare-Enzo-P",
    cloneUrl: "#",
  },
  {
    name: "Nation Quest",
    description: "Un grand projet de serveur Minecraft moddé en 1.20.1, axé sur la construction de nations, la diplomatie, l'économie et l'aventure communautaire.",
    image: "https://placehold.co/600x400.png",
    imageHint: "fantasy world castle",
    githubUrl: "https://github.com/SoftWare-Enzo-P",
    cloneUrl: "#",
  },
];


const ProjectCard = ({ project, index }: { project: typeof projects[0], index: number }) => (
    <div className={cn("group relative rounded-xl border border-white/10 bg-black/30 backdrop-blur-md overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10")}>
        <Image 
            src={project.image}
            alt={project.name}
            width={600}
            height={400}
            data-ai-hint={project.imageHint}
            className="absolute inset-0 h-full w-full object-cover opacity-10 transition-all duration-500 group-hover:opacity-20 group-hover:scale-105"
        />
        <div className="relative p-6 md:p-8 flex flex-col h-full">
            <h3 className="text-2xl font-bold text-white mb-2">{project.name}</h3>
            <p className="text-muted-foreground text-sm mb-6 flex-grow">{project.description}</p>
            <div className="flex flex-col sm:flex-row gap-3">
                <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button variant="outline" className="w-full bg-transparent text-white border-white/20 hover:bg-white/10 hover:text-white">
                        <Github className="mr-2 h-4 w-4" /> GitHub
                    </Button>
                </a>
                <Link href={project.cloneUrl} passHref className="flex-1">
                     <Button variant="default" className="w-full bg-primary/80 hover:bg-primary text-primary-foreground">
                        <Copy className="mr-2 h-4 w-4" /> Cloner avec FlowUp
                    </Button>
                </Link>
            </div>
        </div>
    </div>
)

export default function NightsProjectsPage() {
  return (
    <div className="min-h-screen text-white p-4 md:p-8 relative z-10">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {projects.map((project, index) => (
            <ProjectCard key={project.name} project={project} index={index} />
          ))}
        </div>
      </main>
    </div>
  );
}
