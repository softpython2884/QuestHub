
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
// import { flagApiKeyRisks } from '@/ai/flows/flag-api-key-risks'; // Removed
import { ShieldCheck, PlusCircle, KeyRound, Eye, EyeOff, Copy, Trash2, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface SecretItem {
  id: string;
  name: string;
  value: string;
  type: 'API Key' | 'Password' | 'Note';
  lastUpdated: string;
  showValue?: boolean;
}

const mockSecrets: SecretItem[] = [
  { id: 'secret-1', name: 'OpenAI API Key', value: 'sk-***************************************1234', type: 'API Key', lastUpdated: '2023-10-01' },
  { id: 'secret-2', name: 'Database Password (Dev)', value: 'S3cureP@$$wOrd!', type: 'Password', lastUpdated: '2023-09-15' },
  { id: 'secret-3', name: 'Server SSH Key Notes', value: 'Private key stored in LastPass, use with user@server.com', type: 'Note', lastUpdated: '2023-08-20' },
];


export default function SecureVaultPage() {
  const [secrets, setSecrets] = useState<SecretItem[]>(mockSecrets);
  const [newSecretName, setNewSecretName] = useState('');
  const [newSecretValue, setNewSecretValue] = useState('');
  const [newSecretType, setNewSecretType] = useState<'API Key' | 'Password' | 'Note'>('API Key');
  const { toast } = useToast();

  const toggleShowValue = (id: string) => {
    setSecrets(prevSecrets => 
      prevSecrets.map(s => s.id === id ? { ...s, showValue: !s.showValue } : s)
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Secret value copied to clipboard." });
  };
  
  const handleAddSecret = () => {
    if(!newSecretName || !newSecretValue) {
        toast({ variant: "destructive", title: "Error", description: "Secret name and value cannot be empty." });
        return;
    }
    const newSecret: SecretItem = {
        id: `secret-${Date.now()}`,
        name: newSecretName,
        value: newSecretValue,
        type: newSecretType,
        lastUpdated: new Date().toISOString().split('T')[0]
    };
    setSecrets(prev => [newSecret, ...prev]);
    setNewSecretName('');
    setNewSecretValue('');
    toast({ title: "Success", description: "New secret added to the vault." });
  };

  const handleDeleteSecret = (id: string) => {
    setSecrets(prev => prev.filter(s => s.id !== id));
    toast({ title: "Deleted", description: "Secret removed from the vault." });
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-semibold">Secure Vault</h1>
          <p className="text-muted-foreground">Manage your team's sensitive credentials and API keys securely.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><PlusCircle className="mr-2 h-5 w-5 text-primary"/>Add New Secret</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="secret-name">Secret Name</Label>
            <Input id="secret-name" placeholder="e.g., AWS S3 Bucket Key" value={newSecretName} onChange={e => setNewSecretName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="secret-value">Secret Value</Label>
            <Textarea 
              id="secret-value" 
              placeholder="Enter the secret key, password, or note" 
              value={newSecretValue}
              onChange={(e) => setNewSecretValue(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="secret-type">Type</Label>
            <Select value={newSecretType} onValueChange={(value: SecretItem['type']) => setNewSecretType(value)}>
              <SelectTrigger id="secret-type" className="w-full">
                <SelectValue placeholder="Select secret type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="API Key">API Key</SelectItem>
                <SelectItem value="Password">Password</SelectItem>
                <SelectItem value="Note">Note</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAddSecret} className="w-full sm:w-auto">Add to Vault</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><KeyRound className="mr-2 h-5 w-5 text-primary"/>Stored Secrets</CardTitle>
          <CardDescription>Manage existing secrets. Values are masked by default.</CardDescription>
        </CardHeader>
        <CardContent>
          {secrets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShieldCheck className="mx-auto h-12 w-12 mb-4" />
              <p>Your vault is empty. Add some secrets to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {secrets.map((secret) => (
                <Card key={secret.id} className="p-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex-grow">
                      <h4 className="font-semibold">{secret.name} <Badge variant="outline" className="ml-2 text-xs">{secret.type}</Badge></h4>
                      <p className="text-xs text-muted-foreground font-mono">
                        {secret.showValue ? secret.value : '••••••••••••••••••••'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Last updated: {secret.lastUpdated}</p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0 mt-2 sm:mt-0">
                      <Button variant="ghost" size="icon" onClick={() => toggleShowValue(secret.id)} title={secret.showValue ? "Hide" : "Show"}>
                        {secret.showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                       <Button variant="ghost" size="icon" onClick={() => copyToClipboard(secret.value)} title="Copy">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" title="Delete" onClick={() => handleDeleteSecret(secret.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

