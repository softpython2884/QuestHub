
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { Project } from '@/types';
import { ArrowLeft, Loader2 } from 'lucide-react';
import React from 'react'; 
import { createProjectAction } from './actions';

const projectFormSchema = z.object({
  name: z.string().min(3, { message: 'Project name must be at least 3 characters.' }).max(100),
  description: z.string().max(500, {message: "Description cannot exceed 500 characters."}).optional().or(z.literal('')),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

export default function NewProjectPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  async function onSubmit(values: ProjectFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to create a project.' });
      return;
    }
    setIsSubmitting(true);
    const result = await createProjectAction(values.name, values.description, user.uuid);
    setIsSubmitting(false);

    if ('error' in result) {
      toast({ variant: 'destructive', title: 'Error Creating Project', description: result.error });
    } else {
      toast({ title: 'Success!', description: `Project "${result.name}" created.` });
      router.push(`/projects/${result.uuid}`);
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <Button variant="outline" onClick={() => router.back()} className="mb-0"> 
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
      </Button>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Create New Project</CardTitle>
          <CardDescription>Start a new project and invite your team to collaborate.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., My Awesome App, Q3 Marketing Campaign" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Briefly describe your project, its goals, and scope."
                        className="resize-none"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : 'Create Project'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
