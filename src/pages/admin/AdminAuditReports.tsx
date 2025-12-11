import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Search, FileText, ExternalLink, RefreshCw, Filter, Download } from "lucide-react";
import { CharisLoader } from "@/components/ui/charis-loader";
import { useToast } from "@/hooks/use-toast";

import type { Json } from "@/integrations/supabase/types";

interface AuditReport {
  id: string;
  brand_name: string;
  user_id: string;
  session_id: string | null;
  report_url: string | null;
  report_data: Json;
  status: string | null;
  created_at: string | null;
  completed_at: string | null;
}

export default function AdminAuditReports() {
  const [reports, setReports] = useState<AuditReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [exportingId, setExportingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchReports = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("ad_audit_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (searchQuery) {
        query = query.ilike("brand_name", `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast({
        title: "Error",
        description: "Failed to fetch audit reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter, searchQuery]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin-audit-reports-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ad_audit_reports",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setReports((prev) => [payload.new as AuditReport, ...prev]);
            toast({
              title: "New Report",
              description: `New audit report for ${(payload.new as AuditReport).brand_name}`,
            });
          } else if (payload.eventType === "UPDATE") {
            setReports((prev) =>
              prev.map((report) =>
                report.id === (payload.new as AuditReport).id
                  ? (payload.new as AuditReport)
                  : report
              )
            );
          } else if (payload.eventType === "DELETE") {
            setReports((prev) =>
              prev.filter((report) => report.id !== (payload.old as AuditReport).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Completed</Badge>;
      case "processing":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Processing</Badge>;
      case "failed":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Failed</Badge>;
      default:
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending</Badge>;
    }
  };

  const getReportDataSummary = (data: Json) => {
    if (!data || typeof data !== "object" || Array.isArray(data)) return "No data";
    const keys = Object.keys(data);
    if (keys.length === 0) return "No data";
    return `${keys.length} sections`;
  };

  const handleExportPdf = async (report: AuditReport) => {
    setExportingId(report.id);
    try {
      // If report already has a URL, download it directly
      if (report.report_url) {
        window.open(report.report_url, "_blank");
        toast({
          title: "Opening Report",
          description: "The report is opening in a new tab",
        });
        setExportingId(null);
        return;
      }

      // Generate PDF using edge function
      const { data, error } = await supabase.functions.invoke("pdf-generator", {
        body: {
          auditData: report.report_data,
          brandName: report.brand_name,
          sessionId: report.session_id || report.id,
          userId: report.user_id,
        },
      });

      if (error) throw error;

      if (data?.reportUrl) {
        window.open(data.reportUrl, "_blank");
        toast({
          title: "PDF Generated",
          description: "Your report is ready and opening in a new tab",
        });
        
        // Refresh reports to get updated URL
        fetchReports();
      } else {
        throw new Error("No report URL returned");
      }
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF report",
        variant: "destructive",
      });
    } finally {
      setExportingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Audit Reports</h1>
          <p className="text-muted-foreground mt-1">
            View and manage ad audit reports generated by the AI agent
          </p>
        </div>
        <Button onClick={fetchReports} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by brand name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Reports ({reports.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <CharisLoader size="lg" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audit reports found</p>
              {(searchQuery || statusFilter !== "all") && (
                <p className="text-sm mt-2">Try adjusting your filters</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">
                        {report.brand_name}
                      </TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {getReportDataSummary(report.report_data)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {report.created_at
                          ? format(new Date(report.created_at), "MMM d, yyyy HH:mm")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {report.completed_at
                          ? format(new Date(report.completed_at), "MMM d, yyyy HH:mm")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {report.report_url ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <a
                                href={report.report_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                View
                              </a>
                            </Button>
                          ) : null}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExportPdf(report)}
                            disabled={exportingId === report.id}
                          >
                            {exportingId === report.id ? (
                              <CharisLoader size="xs" />
                            ) : (
                              <>
                                <Download className="h-4 w-4 mr-1" />
                                PDF
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
