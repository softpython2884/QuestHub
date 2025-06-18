
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { ProjectDocumentType } from '@/types';
import { flagApiKeyRisks } from '@/ai/flows/flag-api-key-risks';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createDocumentAction, updateDocumentAction } from '@/app/(app)/projects/[id]/actions'; // Assuming actions are here


const documentEditorFormSchema = z.object({
  title: z.string().min(1, 'Title is required.').max(255),
  content: z.string().optional(),
});

type DocumentEditorFormValues = z.infer<typeof documentEditorFormSchema>;

interface DocumentEditorProps {
  projectUuid: string;
  document?: ProjectDocumentType | null; // For editing
  onSaveSuccess: (documentUuid: string) => void;
  onCancel: () => void;
}

export function DocumentEditor({
  projectUuid,
  document,
  onSaveSuccess,
  onCancel,
}: DocumentEditorProps) {
  const { toast } = useToast();
  const [apiKeyRisk, setApiKeyRisk] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<DocumentEditorFormValues>({
    resolver: zodResolver(documentEditorFormSchema),
    defaultValues: {
      title: document?.title || '',
      content: document?.content || '',
    },
  });

  const contentValue = form.watch('content');

  useEffect(() => {
    if (document) {
      form.reset({
        title: document.title,
        content: document.content || '',
      });
    }
  }, [document, form]);

  const handleContentChange = async (newContent: string) => {
    form.setValue('content', newContent); // Update RHF state
    if (newContent.trim().length > 10) {
      try {
        const riskResult = await flagApiKeyRisks({ text: newContent });
        if (riskResult.flagged) {
          setApiKeyRisk(riskResult.reason || "Potential API key or secret detected.");
          toast({
            variant: "destructive",
            title: "Security Alert",
            description: riskResult.reason || "Potential API key or secret detected in the content. Please use the Secure Vault.",
          });
        } else {
          setApiKeyRisk(null);
        }
      } catch (error) {
        console.error("Error flagging API key risks:", error);
        setApiKeyRisk(null);
      }
    } else {
      setApiKeyRisk(null);
    }
  };

  const onSubmit = async (data: DocumentEditorFormValues) => {
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('projectUuid', projectUuid);
    formData.append('title', data.title);
    formData.append('content', data.content || '');

    let result;
    if (document?.uuid) { // Editing existing document
      formData.append('documentUuid', document.uuid);
      // @ts-ignore
      result = await updateDocumentAction(null, formData);
    } else { // Creating new document
      // @ts-ignore
      result = await createDocumentAction(null, formData);
    }

    setIsSubmitting(false);

    if (result.error) {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    } else if (result.createdDocument || result.updatedDocument) {
      const savedDoc = result.createdDocument || result.updatedDocument;
      toast({ title: 'Success', description: `Document "${savedDoc.title}" ${document?.uuid ? 'updated' : 'created'}.` });
      onSaveSuccess(savedDoc.uuid);
    } else {
        toast({ variant: 'destructive', title: 'Error', description: 'An unknown error occurred.' });
    }
  };


  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">
          {document ? 'Edit Document' : 'Create New Markdown Document'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="title" className="text-lg">Title</Label>
            <Input
              id="title"
              {...form.register('title')}
              className="mt-1 text-base"
              placeholder="Enter document title"
            />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[500px]">
            <div>
              <Label htmlFor="content" className="text-lg">Markdown Content</Label>
              <Textarea
                id="content"
                value={form.getValues('content')} // Controlled by RHF
                onChange={(e) => handleContentChange(e.target.value)} // Custom handler for AI check + RHF update
                rows={20}
                className={cn("mt-1 font-mono text-sm min-h-[450px] h-full resize-none", apiKeyRisk && "border-destructive ring-2 ring-destructive")}
                placeholder="Write your Markdown here..."
              />
              {apiKeyRisk && <p className="text-sm text-destructive mt-1 flex items-center"><AlertTriangle className="h-4 w-4 mr-1"/>{apiKeyRisk}</p>}
               {form.formState.errors.content && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.content.message}</p>
              )}
            </div>
            <div className="border rounded-md p-4 bg-muted/30 min-h-[450px] h-full overflow-y-auto">
              <Label className="text-lg block mb-2">Live Preview</Label>
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {contentValue || '*Preview will appear here*'}
                </ReactMarkdown>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {document ? 'Save Changes' : 'Create Document'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
