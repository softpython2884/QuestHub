
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { ProjectDocumentType } from '@/types';
import { flagApiKeyRisks } from '@/ai/flows/flag-api-key-risks';
import { AlertTriangle, Loader2, Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, Link as LinkIcon, ImageIcon, Code2, Quote, Minus, Strikethrough, SquareCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createDocumentAction, updateDocumentAction } from '@/app/(app)/projects/[id]/actions';

const documentEditorFormSchema = z.object({
  title: z.string().min(1, 'Title is required.').max(255),
  content: z.string().optional(),
});

type DocumentEditorFormValues = z.infer<typeof documentEditorFormSchema>;

interface DocumentEditorProps {
  projectUuid: string;
  document?: ProjectDocumentType | null;
  onSaveSuccess: (documentUuid: string) => void;
  onCancel: () => void;
}

interface MarkdownTool {
  label: string;
  icon: React.ElementType;
  action: (textarea: HTMLTextAreaElement, currentContent: string, setContent: (newContent: string) => void) => void;
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const form = useForm<DocumentEditorFormValues>({
    resolver: zodResolver(documentEditorFormSchema),
    defaultValues: {
      title: document?.title || '',
      content: document?.content || '',
    },
  });

  const contentValue = form.watch('content');
  const contentField = form.register('content');

  useEffect(() => {
    if (document) {
      form.reset({
        title: document.title,
        content: document.content || '',
      });
    }
  }, [document, form]);

  const handleContentChangeForAI = async (newContent: string) => {
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

  const applyMarkdownSyntax = (
    syntaxStart: string,
    syntaxEnd: string = '',
    isBlock: boolean = false,
    prefixEachLine: boolean = false
  ) => {
    if (!textareaRef.current) return;
    const { selectionStart, selectionEnd, value } = textareaRef.current;
    const selectedText = value.substring(selectionStart, selectionEnd);
    let newText = '';

    if (prefixEachLine && selectedText) {
      const lines = selectedText.split('\n');
      newText = lines.map(line => `${syntaxStart}${line}`).join('\n');
    } else if (selectedText) {
      newText = `${syntaxStart}${selectedText}${syntaxEnd}`;
    } else {
      newText = `${syntaxStart}${syntaxEnd}`;
    }
    
    const newValue = value.substring(0, selectionStart) + newText + value.substring(selectionEnd);
    form.setValue('content', newValue);
    handleContentChangeForAI(newValue);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        if (selectedText) {
          if (prefixEachLine) {
             textareaRef.current.selectionStart = selectionStart;
             textareaRef.current.selectionEnd = selectionEnd + (syntaxStart.length * selectedText.split('\n').length) ;
          } else {
            textareaRef.current.selectionStart = selectionStart + syntaxStart.length;
            textareaRef.current.selectionEnd = selectionEnd + syntaxStart.length;
          }
        } else {
          textareaRef.current.selectionStart = selectionStart + syntaxStart.length;
          textareaRef.current.selectionEnd = selectionStart + syntaxStart.length;
        }
      }
    }, 0);
  };
  
  const markdownTools: MarkdownTool[] = [
    { label: 'H1', icon: Heading1, action: () => applyMarkdownSyntax('# ', '', false, true) },
    { label: 'H2', icon: Heading2, action: () => applyMarkdownSyntax('## ', '', false, true) },
    { label: 'H3', icon: Heading3, action: () => applyMarkdownSyntax('### ', '', false, true) },
    { label: 'Bold', icon: Bold, action: () => applyMarkdownSyntax('**', '**') },
    { label: 'Italic', icon: Italic, action: () => applyMarkdownSyntax('*', '*') },
    { label: 'Strikethrough', icon: Strikethrough, action: () => applyMarkdownSyntax('~~', '~~') },
    { label: 'Unordered List', icon: List, action: () => applyMarkdownSyntax('- ', '', false, true) },
    { label: 'Ordered List', icon: ListOrdered, action: () => applyMarkdownSyntax('1. ', '', false, true) },
    { label: 'Link', icon: LinkIcon, action: () => applyMarkdownSyntax('[', '](url)') },
    { label: 'Image', icon: ImageIcon, action: () => applyMarkdownSyntax('![alt text](', 'image_url)') },
    { label: 'Code Block', icon: SquareCode, action: () => applyMarkdownSyntax('\n```\n', '\n```\n', true) },
    { label: 'Inline Code', icon: Code2, action: () => applyMarkdownSyntax('`', '`') },
    { label: 'Quote', icon: Quote, action: () => applyMarkdownSyntax('> ', '', false, true) },
    { label: 'Horizontal Line', icon: Minus, action: () => applyMarkdownSyntax('\n---\n', '', true) },
  ];

  const onSubmit = async (data: DocumentEditorFormValues) => {
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('projectUuid', projectUuid);
    formData.append('title', data.title);
    formData.append('content', data.content || '');

    let result;
    if (document?.uuid) {
      formData.append('documentUuid', document.uuid);
      // @ts-ignore
      result = await updateDocumentAction(null, formData);
    } else {
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
        <CardDescription>Use Markdown to format your content. A live preview is available on the right.</CardDescription>
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

          <div className="space-y-2">
            <Label htmlFor="content" className="text-lg">Markdown Content</Label>
            <div className="flex flex-wrap gap-1 border p-2 rounded-md bg-muted/50">
              {markdownTools.map((tool) => (
                <Button
                  key={tool.label}
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={tool.action}
                  title={tool.label}
                  className="h-8 w-8"
                >
                  <tool.icon className="h-4 w-4" />
                </Button>
              ))}
            </div>
            <Textarea
              id="content"
              {...contentField}
               ref={(e) => {
                contentField.ref(e); 
                textareaRef.current = e; 
              }}
              onChange={(e) => {
                contentField.onChange(e); // Call original RHF onChange
                handleContentChangeForAI(e.target.value); // Then custom AI check
              }}
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
