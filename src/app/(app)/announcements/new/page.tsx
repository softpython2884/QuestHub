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
import { ArrowLeft, Loader2, Megaphone } from 'lucide-react';
import React, { useActionState, useEffect } from 'react';
import { createGlobalAnnouncementAction } from '../actions';

const announcementFormSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters.' }).max(255),
  content: z.string().min(10, { message: 'Content must be at least 10 characters.' }),
});

type AnnouncementFormValues = z.infer<typeof announcementFormSchema>;

export default function NewAnnouncementPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [formState, formAction, isPending] = useActionState(createGlobalAnnouncementAction, { success: false, error: null, fieldErrors: {} });

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementFormSchema),
    defaultValues: { title: '', content: '' },
  });

  useEffect(() => {
    if (!authLoading && user?.role !== 'admin') {
      toast({ variant: 'destructive', title: 'Access Denied', description: 'You do not have permission to create announcements.' });
      router.push('/announcements');
    }
  }, [authLoading, user, router, toast]);

  useEffect(() => {
    if (formState.success) {
      toast({ title: 'Success!', description: 'Announcement has been published.' });
      router.push('/announcements');
    }
    if (formState.error) {
      toast({ variant: 'destructive', title: 'Error Creating Announcement', description: formState.error });
    }
  }, [formState, router, toast]);


  if (authLoading || user?.role !== 'admin') {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <Button variant="outline" onClick={() => router.back()} className="mb-0"> 
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Announcements
      </Button>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center"><Megaphone className="mr-2 h-6 w-6"/>Create New Global Announcement</CardTitle>
          <CardDescription>This announcement will be visible to all users.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form action={formAction} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., System Maintenance Scheduled" {...field} />
                    </FormControl>
                    <FormMessage>{formState.fieldErrors?.title}</FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content (Markdown supported)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Details about the announcement..."
                        className="resize-none"
                        rows={10}
                        {...field}
                      />
                    </FormControl>
                     <FormMessage>{formState.fieldErrors?.content}</FormMessage>
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publishing...</> : 'Publish Announcement'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
