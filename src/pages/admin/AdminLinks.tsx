import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminLinks() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Admin Bypass Links</h1>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Generate time-limited bypass links for testing and customer support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
