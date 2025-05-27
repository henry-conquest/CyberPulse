import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowUpDown,
  Calendar,
  Check,
  ChevronDown,
  Download,
  Eye,
  FileEdit,
  FileText,
  FilePlus,
  PlusCircle,
  Search,
  Send,
  Trash,
  Trash2,
} from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// Schema for creating a report
const createReportSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  month: z.string().min(3, 'Month is required'),
  year: z
    .number()
    .min(2000)
    .max(new Date().getFullYear() + 1),
  analystComments: z.string().optional(),
});

type Report = {
  id: number;
  tenantId: number;
  title: string;
  month: string;
  year: number;
  status: 'new' | 'reviewed' | 'analyst_ready' | 'manager_ready' | 'sent';
  overallRiskScore: number;
  analystComments?: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'new':
      return <Badge variant="outline">New</Badge>;
    case 'reviewed':
      return <Badge variant="secondary">Reviewed</Badge>;
    case 'analyst_ready':
      return <Badge variant="secondary">Analyst Ready</Badge>;
    case 'manager_ready':
      return <Badge variant="default">Manager Ready</Badge>;
    case 'sent':
      return <Badge>Sent</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function Reports() {
  const { user } = useAuth();
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(user?.tenants?.[0]?.id || null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Get current month and year
  const now = new Date();
  const currentMonth = now.toLocaleString('default', { month: 'long' });
  const currentYear = now.getFullYear();

  // Setup form for creating a new report
  const form = useForm<z.infer<typeof createReportSchema>>({
    resolver: zodResolver(createReportSchema),
    defaultValues: {
      title: `Cyber Risk Report - ${currentMonth} ${currentYear}`,
      month: currentMonth,
      year: currentYear,
      analystComments: '',
    },
  });

  // Fetch reports for the selected tenant
  const { data: reports, isLoading } = useQuery({
    queryKey: ['/api/tenants', selectedTenantId, 'reports'],
    enabled: !!selectedTenantId,
  });

  // Mutation for creating a new report
  const createReportMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createReportSchema>) => {
      if (!selectedTenantId) {
        throw new Error('No tenant selected');
      }
      const response = await apiRequest('POST', `/api/tenants/${selectedTenantId}/reports`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Report created',
        description: 'The report has been created successfully',
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/tenants', selectedTenantId, 'reports'],
      });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create report',
        variant: 'destructive',
      });
    },
  });

  // Mutation for deleting a report
  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: number) => {
      await apiRequest('DELETE', `/api/reports/${reportId}`);
    },
    onSuccess: () => {
      toast({
        title: 'Report deleted',
        description: 'The report has been deleted successfully',
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/tenants', selectedTenantId, 'reports'],
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete report',
        variant: 'destructive',
      });
    },
  });

  const handleCreateReport = (data: z.infer<typeof createReportSchema>) => {
    createReportMutation.mutate(data);
  };

  const handleDeleteReport = (reportId: number) => {
    if (confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      deleteReportMutation.mutate(reportId);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-secondary-500">Generate, review, and send cyber risk reports to clients</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                New Report
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Report</DialogTitle>
                <DialogDescription>Generate a new cyber risk report for the selected tenant.</DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateReport)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Report Title</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Cyber Risk Report - January 2023" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="month"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Month</FormLabel>
                          <FormControl>
                            <Select defaultValue={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select month" />
                              </SelectTrigger>
                              <SelectContent>
                                {[
                                  'January',
                                  'February',
                                  'March',
                                  'April',
                                  'May',
                                  'June',
                                  'July',
                                  'August',
                                  'September',
                                  'October',
                                  'November',
                                  'December',
                                ].map((month) => (
                                  <SelectItem key={month} value={month}>
                                    {month}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              value={field.value}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="analystComments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Initial Analyst Comments (Optional)</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Add initial comments or recommendations..." rows={5} />
                        </FormControl>
                        <FormDescription>You can add or edit comments later.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createReportMutation.isPending}>
                      {createReportMutation.isPending ? 'Creating...' : 'Create Report'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter controls */}
      {/* Add Report Periods button when tenant is selected */}
      {selectedTenantId && (
        <div className="mb-6">
          <Link href={`/report-periods?tenantId=${selectedTenantId}`}>
            <Button variant="outline" className="w-full md:w-auto">
              <Calendar className="h-4 w-4 mr-2" />
              View Report Periods
            </Button>
          </Link>
          <p className="text-sm text-secondary-500 mt-2">
            View quarterly reporting periods and risk management statistics
          </p>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-grow">
          <Input
            placeholder="Search reports..."
            className="w-full"
            prefix={<Search className="h-4 w-4 text-secondary-500" />}
          />
        </div>
        <div className="flex gap-2">
          <Select defaultValue="all">
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="review">In Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="all">
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Reports list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>All Reports</CardTitle>
          {selectedTenantId && (
            <Button variant="outline" asChild>
              <Link href={`/report-periods?tenantId=${selectedTenantId}`}>
                <Calendar className="h-4 w-4 mr-2" />
                View Report Periods
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-secondary-500">Loading reports...</p>
            </div>
          ) : reports && reports.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Report Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report: Report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.title}</TableCell>
                    <TableCell>
                      {report.month} {report.year}
                      <div className="text-xs text-secondary-500">
                        Created: {format(new Date(report.createdAt), 'MMM d, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          report.overallRiskScore > 70
                            ? 'text-danger'
                            : report.overallRiskScore > 30
                              ? 'text-warning'
                              : 'text-success'
                        }
                      >
                        {report.overallRiskScore}%
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/reports/${report.id}`}>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>

                        {report.status === 'approved' && (
                          <Link href={`/reports/${report.id}`}>
                            <Button size="sm">
                              <Send className="h-4 w-4 mr-1" />
                              Send
                            </Button>
                          </Link>
                        )}

                        {user?.role === 'admin' && report.status !== 'sent' && (
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteReport(report.id)}>
                            <Trash className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center">
              <FileText className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Reports Found</h3>
              <p className="text-secondary-500 mb-4">
                {selectedTenantId
                  ? 'No reports have been created for this tenant yet.'
                  : 'Please select a tenant to view reports.'}
              </p>
              {selectedTenantId && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create your first report
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
