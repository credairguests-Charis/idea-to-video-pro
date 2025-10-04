import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminLinks() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Admin Bypass Links</h1>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">
            Generate time-limited bypass links for testing and customer support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
