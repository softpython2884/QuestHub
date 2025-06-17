import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone, PlusCircle } from "lucide-react";

// Mock data for announcements
const mockAnnouncements = [
  { id: "ann-1", title: "System Maintenance Scheduled", content: "Please be advised that there will be a system maintenance on Sunday from 2 AM to 4 AM.", author: "Admin Team", date: "2023-10-20", type: "Global" },
  { id: "ann-2", title: "New Feature: Dark Mode", content: "We are excited to announce that Dark Mode is now available for all users!", author: "Dev Team", date: "2023-10-18", type: "Feature Update" },
  { id: "ann-3", title: "Project Alpha Kick-off", content: "Project Alpha is officially starting next Monday. All relevant team members please check your emails for details.", author: "PMO", date: "2023-10-15", type: "Project" },
];


export default function AnnouncementsPage() {
  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-semibold">Announcements</h1>
          <p className="text-muted-foreground">Stay updated with the latest news and updates.</p>
        </div>
        {/* This button should be visible only to admins/managers */}
        <Button>
          <PlusCircle className="mr-2 h-5 w-5" /> Create Announcement
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest Announcements</CardTitle>
        </CardHeader>
        <CardContent>
          {mockAnnouncements.length === 0 ? (
             <div className="text-center py-12">
              <Megaphone className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No announcements yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Check back later for updates.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {mockAnnouncements.map((announcement) => (
                <Card key={announcement.id} className="shadow-sm">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{announcement.title}</CardTitle>
                      <span className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded-full">{announcement.type}</span>
                    </div>
                    <CardDescription>By {announcement.author} on {announcement.date}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>{announcement.content}</p>
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
