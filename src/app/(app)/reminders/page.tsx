
'use client';

import { useState, useEffect, useActionState, useTransition } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getRemindersAction, createReminderAction, deleteReminderAction } from './actions';
import type { Reminder } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, CalendarCheck, Loader2, Trash2, Bell, XCircle } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';


const reminderFormSchema = z.object({
  content: z.string().min(3, "Reminder content must be at least 3 characters.").max(500),
  remindAtDate: z.date({ required_error: "A date is required."}),
  remindAtTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)."),
});

type ReminderFormValues = z.infer<typeof reminderFormSchema>;

export default function RemindersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState<Reminder | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const [createState, createFormAction, isCreating] = useActionState(createReminderAction, { success: false, error: null });
  const form = useForm<ReminderFormValues>({ resolver: zodResolver(reminderFormSchema) });

  const loadReminders = async () => {
    setIsLoading(true);
    const result = await getRemindersAction();
    if ('error' in result) {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    } else {
      setReminders(result);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadReminders();
  }, []);

  useEffect(() => {
    if (createState.success) {
      toast({ title: "Success!", description: "Your reminder has been set." });
      setIsCreateDialogOpen(false);
      form.reset();
      loadReminders();
    } else if (createState.error) {
      toast({ variant: 'destructive', title: 'Error', description: createState.error });
    }
  }, [createState, form, toast]);

  const handleCreateSubmit = (data: ReminderFormValues) => {
    const [hours, minutes] = data.remindAtTime.split(':').map(Number);
    const combinedDate = new Date(data.remindAtDate);
    combinedDate.setHours(hours, minutes, 0, 0);

    const formData = new FormData();
    formData.append('content', data.content);
    formData.append('remindAt', combinedDate.toISOString());
    
    createFormAction(formData);
  };
  
  const handleDeleteReminder = (uuid: string) => {
      startDeleteTransition(async () => {
          const result = await deleteReminderAction(uuid);
           if (result.success) {
              toast({ title: "Reminder Deleted", description: "The reminder has been removed." });
              setReminderToDelete(null);
              loadReminders();
          } else {
              toast({ variant: 'destructive', title: 'Error', description: result.error });
          }
      });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-semibold flex items-center gap-2">
            <CalendarCheck className="text-primary"/>Reminders
          </h1>
          <p className="text-muted-foreground">Manage your personal reminders and notifications.</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4"/> New Reminder</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set a New Reminder</DialogTitle>
              <DialogDescription>Describe what you want to be reminded of and when.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateSubmit)} className="space-y-4">
                <FormField control={form.control} name="content" render={({ field }) => (
                  <FormItem><FormLabel>Remind me to...</FormLabel><FormControl><Textarea {...field} placeholder="e.g., Follow up with the design team about mockups" /></FormControl><FormMessage /></FormItem>
                )}/>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="remindAtDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Date</FormLabel>
                      <Popover><PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}/>
                  <FormField control={form.control} name="remindAtTime" render={({ field }) => (
                    <FormItem><FormLabel>Time (HH:mm)</FormLabel><FormControl><Input {...field} type="time" /></FormControl><FormMessage /></FormItem>
                  )}/>
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="ghost" disabled={isCreating}>Cancel</Button></DialogClose>
                  <Button type="submit" disabled={isCreating}>{isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Set Reminder</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Upcoming Reminders</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full"/>)}
            </div>
          ) : reminders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              <Bell className="mx-auto h-12 w-12 mb-4"/>
              <h3 className="text-lg font-medium">No Reminders Set</h3>
              <p>Click "New Reminder" to create one.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reminders.map(r => (
                <Card key={r.uuid} className={cn("p-3 flex justify-between items-center gap-4", isPast(new Date(r.remindAt)) && "opacity-50 bg-muted/50")}>
                  <div className="flex-grow">
                    <p className="font-medium">{r.content}</p>
                    <p className={cn("text-sm", isPast(new Date(r.remindAt)) ? "text-muted-foreground" : "text-primary")}>
                      {isPast(new Date(r.remindAt)) ? 'Due ' : 'Due in '} 
                      {formatDistanceToNow(new Date(r.remindAt), { addSuffix: true })}
                      <span className="text-muted-foreground text-xs"> ({format(new Date(r.remindAt), 'PPp')})</span>
                    </p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setReminderToDelete(r)}>
                            <Trash2 className="h-4 w-4"/>
                        </Button>
                    </DialogTrigger>
                    {reminderToDelete?.uuid === r.uuid && (
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Reminder?</DialogTitle>
                            <DialogDescription>This action cannot be undone. Are you sure you want to delete this reminder?</DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                            <Button variant="destructive" onClick={() => handleDeleteReminder(r.uuid)} disabled={isDeleting}>
                                {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2"/>} Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                    )}
                  </Dialog>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
