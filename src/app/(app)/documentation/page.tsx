import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileText, Search, PlusCircle, BookOpen } from "lucide-react";
import Link from "next/link";

// Mock data for documents
const mockDocuments = [
  { id: "doc-1", title: "Getting Started Guide", project: "NationQuest Hub", lastUpdated: "2023-10-20", category: "General" },
  { id: "doc-2", title: "Project Management Best Practices", project: "General", lastUpdated: "2023-10-15", category: "Guides" },
  { id: "doc-3", title: "API Documentation", project: "Project Alpha", lastUpdated: "2023-10-18", category: "Technical" },
  { id: "doc-4", title: "User Roles and Permissions", project: "NationQuest Hub", lastUpdated: "2023-10-12", category: "Security" },
];

export default function DocumentationPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-semibold">Documentation</h1>
          <p className="text-muted-foreground">Find guides, tutorials, and API references.</p>
        </div>
        <Button asChild>
          <Link href="/documentation/new">
            <PlusCircle className="mr-2 h-5 w-5" /> Create Document
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
            <CardTitle>All Documents</CardTitle>
            <div className="relative w-full sm:w-auto sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search documentation..." className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {mockDocuments.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No documents yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Start by creating a new document or guide.
              </p>
              <Button className="mt-6" asChild>
                <Link href="/documentation/new">
                  <PlusCircle className="mr-2 h-4 w-4" /> Create Document
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {mockDocuments.map((doc) => (
                <Card key={doc.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-6 w-6 text-primary flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold hover:text-primary">
                           <Link href={`/documentation/${doc.id}`}>{doc.title}</Link>
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Project: {doc.project} • Category: {doc.category} • Last updated: {doc.lastUpdated}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/documentation/${doc.id}`}>Read More</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
