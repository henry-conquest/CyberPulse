import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { format } from "date-fns";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Download,
  Send,
  ArrowLeft,
  Edit,
  Plus,
  User,
  CheckCircle2,
  XCircle,
  Trash,
} from "lucide-react";

import RiskGauge from "@/components/dashboard/RiskGauge";
import RiskIndicator from "@/components/dashboard/RiskIndicator";
import SecurityItem from "@/components/dashboard/SecurityItem";
import AnalystComments from "@/components/dashboard/AnalystComments";

// Schemas for the forms
const commentsSchema = z.object({
  analystComments: z.string().min(10, "Comments must be at least 10 characters"),
});

const recipientSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().min(1, "Name is required"),
});

interface ReportViewProps {
  id: string;
}

export default function ReportView({ id }: ReportViewProps) {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const reportId = parseInt(id);

  const [isCommentsDialogOpen, setIsCommentsDialogOpen] = useState(false);
  const [isRecipientsDialogOpen, setIsRecipientsDialogOpen] = useState(false);

  // Setup forms
  const commentsForm = useForm<z.infer<typeof commentsSchema>>({
    resolver: zodResolver(commentsSchema),
    defaultValues: {
      analystComments: "",
    },
  });

  const recipientForm = useForm<z.infer<typeof recipientSchema>>({
    resolver: zodResolver(recipientSchema),
    defaultValues: {
      email: "",
      name: "",
    },
  });

  // Fetch report data
  const { data: report, isLoading } = useQuery({
    queryKey: ['/api/reports', reportId],
    enabled: !!reportId,
  });

  // Update comments form when report data is loaded
  useEffect(() => {
    if (report?.analystComments) {
      commentsForm.reset({
        analystComments: report.analystComments,
      });
    }
  }, [report]);

  // Mutations
  const updateCommentsMutation = useMutation({
    mutationFn: async (data: z.infer<typeof commentsSchema>) => {
      const response = await apiRequest('PATCH', `/api/reports/${reportId}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Comments updated",
        description: "Analyst comments have been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reports', reportId] });
      setIsCommentsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update comments",
        variant: "destructive",
      });
    },
  });

  const addRecipientMutation = useMutation({
    mutationFn: async (data: z.infer<typeof recipientSchema>) => {
      const response = await apiRequest('POST', `/api/reports/${reportId}/recipients`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Recipient added",
        description: "Report recipient has been added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reports', reportId] });
      setIsRecipientsDialogOpen(false);
      recipientForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add recipient",
        variant: "destructive",
      });
    },
  });

  const deleteRecipientMutation = useMutation({
    mutationFn: async (recipientId: number) => {
      await apiRequest('DELETE', `/api/reports/${reportId}/recipients/${recipientId}`);
    },
    onSuccess: () => {
      toast({
        title: "Recipient removed",
        description: "Report recipient has been removed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reports', reportId] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove recipient",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await apiRequest('PATCH', `/api/reports/${reportId}`, { status });
      return response.json();
    },
    onSuccess: (_, status) => {
      const statusMessages = {
        review: "Report has been submitted for review",
        approved: "Report has been approved",
        draft: "Report has been moved back to draft",
      };
      
      toast({
        title: "Status updated",
        description: statusMessages[status as keyof typeof statusMessages] || "Status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reports', reportId] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const sendReportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/reports/${reportId}/send`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Report sent",
        description: "The report has been sent to all recipients",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reports', reportId] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send report",
        variant: "destructive",
      });
    },
  });

  // Handler functions
  const handleUpdateComments = (data: z.infer<typeof commentsSchema>) => {
    updateCommentsMutation.mutate(data);
  };

  const handleAddRecipient = (data: z.infer<typeof recipientSchema>) => {
    addRecipientMutation.mutate(data);
  };

  const handleDeleteRecipient = (recipientId: number) => {
    if (confirm("Are you sure you want to remove this recipient?")) {
      deleteRecipientMutation.mutate(recipientId);
    }
  };

  const handleUpdateStatus = (status: string) => {
    updateStatusMutation.mutate(status);
  };

  const handleSendReport = () => {
    if (!report?.recipients || report.recipients.length === 0) {
      toast({
        title: "No recipients",
        description: "Please add at least one recipient before sending the report",
        variant: "destructive",
      });
      return;
    }

    if (report.status !== "approved") {
      toast({
        title: "Report not approved",
        description: "The report must be approved before it can be sent",
        variant: "destructive",
      });
      return;
    }

    if (confirm("Are you sure you want to send this report to all recipients?")) {
      sendReportMutation.mutate();
    }
  };

  const handleDownloadPdf = () => {
    window.open(`/api/reports/${reportId}/pdf`, '_blank');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          <span className="ml-3">Loading report...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (!report) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <h3 className="text-lg font-semibold mb-4">Report Not Found</h3>
          <p className="text-secondary-600 mb-4">
            The requested report could not be found. It may have been deleted or you don't have access to it.
          </p>
          <Button onClick={() => navigate("/reports")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
        </div>
      </div>
    );
  }

  // Get security data from the report
  const securityData = report.securityData || {};

  // Check permissions
  const isAdmin = user?.role === "admin";
  const isAnalyst = user?.role === "analyst";
  const isAccountManager = user?.role === "account_manager";
  const canEdit = isAdmin || isAnalyst;
  const canApprove = isAdmin;
  const canSend = isAdmin || isAccountManager;
  const canManageRecipients = isAdmin || isAccountManager;

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "review":
        return <Badge variant="secondary">In Review</Badge>;
      case "approved":
        return <Badge variant="default">Approved</Badge>;
      case "sent":
        return <Badge variant="success">Sent</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/reports")}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            {getStatusBadge(report.status)}
          </div>
          <h1 className="text-2xl font-bold mt-2">{report.title}</h1>
          <p className="text-secondary-500">
            {report.month} {report.year} • Created on {format(new Date(report.createdAt), "MMMM d, yyyy")}
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          {report.status === "draft" && canEdit && (
            <Button onClick={() => handleUpdateStatus("review")}>
              Submit for Review
            </Button>
          )}
          
          {report.status === "review" && canApprove && (
            <Button onClick={() => handleUpdateStatus("approved")}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve Report
            </Button>
          )}
          
          {report.status === "review" && canApprove && (
            <Button variant="outline" onClick={() => handleUpdateStatus("draft")}>
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
          )}
          
          {report.status === "approved" && canSend && !report.sentAt && (
            <Button onClick={handleSendReport}>
              <Send className="h-4 w-4 mr-2" />
              Send Report
            </Button>
          )}
          
          <Button variant="outline" onClick={handleDownloadPdf}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>
      
      {/* Report tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="recipients">Recipients</TabsTrigger>
          <TabsTrigger value="details">Report Details</TabsTrigger>
        </TabsList>
        
        {/* Overview tab */}
        <TabsContent value="overview">
          {/* Overall Risk Card */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col items-center justify-center">
                  <RiskGauge 
                    value={report.overallRiskScore} 
                    size="lg" 
                    label="Overall Risk Level" 
                  />
                  <div className="text-center mt-4">
                    <div className="text-sm text-secondary-500">High Likelihood of Breach</div>
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <RiskIndicator 
                      value={report.identityRiskScore} 
                      label="Identity Risk" 
                    />
                    <RiskIndicator 
                      value={report.trainingRiskScore} 
                      label="Training Risk" 
                    />
                    <RiskIndicator 
                      value={report.deviceRiskScore} 
                      label="Device Risk" 
                    />
                    <RiskIndicator 
                      value={report.cloudRiskScore} 
                      label="Cloud Risk" 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Report Summary */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Executive Summary</CardTitle>
                {canEdit && report.status !== "sent" && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setLocation(`/tenants/${tenantId}/reports/${report.id}/edit`)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                {report.summary ? (
                  <div dangerouslySetInnerHTML={{ __html: report.summary.replace(/\n/g, '<br />') }} />
                ) : (
                  <p className="text-secondary-500 italic">No summary available for this report.</p>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Recommendations */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Key Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                {report.recommendations ? (
                  <div dangerouslySetInnerHTML={{ __html: report.recommendations.replace(/\n/g, '<br />') }} />
                ) : (
                  <p className="text-secondary-500 italic">No recommendations available for this report.</p>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Analyst Comments */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Analyst Comments</h3>
              {canEdit && report.status !== "sent" && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsCommentsDialogOpen(true)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit Comments
                </Button>
              )}
            </div>
            
            <AnalystComments 
              comments={report.analystComments || ""} 
              onEdit={() => setIsCommentsDialogOpen(true)} 
              isEditable={canEdit && report.status !== "sent"}
              onDownload={handleDownloadPdf}
              onSend={report.status === "approved" && canSend && !report.sentAt ? handleSendReport : undefined}
            />
            
            {/* Edit comments dialog */}
            <Dialog open={isCommentsDialogOpen} onOpenChange={setIsCommentsDialogOpen}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Edit Analyst Comments</DialogTitle>
                  <DialogDescription>
                    Provide your analysis and recommendations for this report.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...commentsForm}>
                  <form onSubmit={commentsForm.handleSubmit(handleUpdateComments)} className="space-y-4">
                    <FormField
                      control={commentsForm.control}
                      name="analystComments"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Comments</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Add your analysis and recommendations..." 
                              rows={12}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsCommentsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={updateCommentsMutation.isPending}>
                        {updateCommentsMutation.isPending ? "Saving..." : "Save Comments"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </TabsContent>
        
        {/* Recipients tab */}
        <TabsContent value="recipients">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Report Recipients</CardTitle>
                {canManageRecipients && report.status !== "sent" && (
                  <Button 
                    size="sm" 
                    onClick={() => setIsRecipientsDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Recipient
                  </Button>
                )}
              </div>
              <CardDescription>
                People who will receive this report when it's sent
              </CardDescription>
            </CardHeader>
            <CardContent>
              {report.recipients && report.recipients.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      {canManageRecipients && report.status !== "sent" && (
                        <TableHead className="text-right">Actions</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.recipients.map((recipient: any) => (
                      <TableRow key={recipient.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2 text-secondary-400" />
                            {recipient.name || "Unnamed Recipient"}
                          </div>
                        </TableCell>
                        <TableCell>{recipient.email}</TableCell>
                        <TableCell>
                          {recipient.sentAt ? (
                            <div className="flex items-center">
                              <CheckCircle2 className="h-4 w-4 mr-1 text-success" />
                              <span className="text-sm">
                                Sent on {format(new Date(recipient.sentAt), "MMM d, yyyy")}
                              </span>
                            </div>
                          ) : (
                            <Badge variant="outline">Not sent</Badge>
                          )}
                        </TableCell>
                        {canManageRecipients && report.status !== "sent" && (
                          <TableCell className="text-right">
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleDeleteRecipient(recipient.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center">
                  <User className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Recipients Added</h3>
                  <p className="text-secondary-500 mb-4">
                    Add recipients to send this report to when it's ready.
                  </p>
                  {canManageRecipients && report.status !== "sent" && (
                    <Button onClick={() => setIsRecipientsDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Recipient
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Add recipient dialog */}
          <Dialog open={isRecipientsDialogOpen} onOpenChange={setIsRecipientsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Recipient</DialogTitle>
                <DialogDescription>
                  Add a person who will receive this report when it's sent.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...recipientForm}>
                <form onSubmit={recipientForm.handleSubmit(handleAddRecipient)} className="space-y-4">
                  <FormField
                    control={recipientForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="jane.doe@example.com" type="email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={recipientForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Jane Doe" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsRecipientsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={addRecipientMutation.isPending}>
                      {addRecipientMutation.isPending ? "Adding..." : "Add Recipient"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </TabsContent>
        
        {/* Details tab */}
        <TabsContent value="details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Identity & Access Section */}
            <Card>
              <CardHeader>
                <CardTitle>Identity & Access</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <SecurityItem 
                    title="Global Administrators" 
                    status={securityData.identityMetrics?.globalAdmins?.toString() || "0"} 
                  />
                  
                  <SecurityItem 
                    title="MFA Not Enabled" 
                    status={securityData.identityMetrics?.mfaNotEnabled?.toString() || "0"} 
                  />
                  
                  <SecurityItem 
                    title="Phish Resistant MFA" 
                    status={securityData.identityMetrics?.phishResistantMfa ? "inPlace" : "notInPlace"}
                  />
                  
                  <SecurityItem 
                    title="Role Based Access Control" 
                    status={securityData.identityMetrics?.roleBasedAccessControl ? "inPlace" : "notInPlace"}
                  />
                  
                  <SecurityItem 
                    title="Risk Based Sign On" 
                    status={securityData.identityMetrics?.riskBasedSignOn ? "inPlace" : "notInPlace"}
                  />
                  
                  <SecurityItem 
                    title="Single Sign On Utilized" 
                    status={securityData.identityMetrics?.singleSignOn ? "inPlace" : "notInPlace"}
                  />
                  
                  <SecurityItem 
                    title="Managed Identity Protection" 
                    status={securityData.identityMetrics?.managedIdentityProtection ? "inPlace" : "notInPlace"}
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* End User Devices Section */}
            <Card>
              <CardHeader>
                <CardTitle>End User Devices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <SecurityItem 
                    title="Microsoft 365 Device Score" 
                    status={securityData.deviceMetrics?.deviceScore?.toString() + "/100" || "0/100"} 
                  />
                  
                  <SecurityItem 
                    title="Disk Encryption" 
                    status={securityData.deviceMetrics?.diskEncryption ? "inPlace" : "notInPlace"}
                  />
                  
                  <SecurityItem 
                    title="Defender for Endpoint" 
                    status={securityData.deviceMetrics?.defenderForEndpoint ? "inPlace" : "notInPlace"}
                  />
                  
                  <SecurityItem 
                    title="Device Hardening" 
                    status={securityData.deviceMetrics?.deviceHardening ? "inPlace" : "notInPlace"}
                  />
                  
                  <SecurityItem 
                    title="Software Updated" 
                    status={securityData.deviceMetrics?.softwareUpdated ? "inPlace" : "notInPlace"}
                  />
                  
                  <SecurityItem 
                    title="Managed Detection Response" 
                    status={securityData.deviceMetrics?.managedDetectionResponse ? "inPlace" : "notInPlace"}
                  />
                </div>
                
                <div className="mt-6">
                  <div className="text-sm mb-3">Device compliance status:</div>
                  <div className="flex items-center">
                    <div className="flex-1 bg-secondary-200 rounded-full h-2">
                      <div 
                        className="bg-primary-600 h-2 rounded-full" 
                        style={{ width: `${securityData.deviceMetrics?.compliancePercentage || 0}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 text-sm font-medium">
                      {securityData.deviceMetrics?.compliancePercentage || 0}%
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-secondary-500">
                    <span>{securityData.deviceMetrics?.compliantDevices || 0} Compliant</span>
                    <span>{securityData.deviceMetrics?.nonCompliantDevices || 0} Non-compliant</span>
                    <span>{securityData.deviceMetrics?.unknownDevices || 0} Unknown</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Cloud & Infrastructure Section */}
            <Card>
              <CardHeader>
                <CardTitle>Cloud & Infrastructure</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 border border-secondary-200 rounded-md flex flex-col">
                    <span className="text-xs text-secondary-500">Microsoft 365 Secure Score</span>
                    <div className="mt-2 flex items-center">
                      <div className="flex-1 bg-secondary-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${securityData.secureScorePercent > 70 ? 'bg-success' : securityData.secureScorePercent > 30 ? 'bg-warning' : 'bg-danger'}`} 
                          style={{ width: `${securityData.secureScorePercent || 0}%` }}
                        ></div>
                      </div>
                      <span className="ml-2 text-sm font-medium">
                        {securityData.secureScorePercent || 0}%
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <SecurityItem 
                    title="SaaS Protection" 
                    status={securityData.cloudMetrics?.saasProtection ? "inPlace" : "notInPlace"}
                  />
                  
                  <SecurityItem 
                    title="Sensitivity Labelling" 
                    status={securityData.cloudMetrics?.sensitivityLabels ? "inPlace" : "notInPlace"}
                  />
                  
                  <SecurityItem 
                    title="Backup & Archiving" 
                    status={securityData.cloudMetrics?.backupArchiving ? "inPlace" : "notInPlace"}
                  />
                  
                  <SecurityItem 
                    title="Data Loss Prevention" 
                    status={securityData.cloudMetrics?.dataLossPrevention ? "inPlace" : "notInPlace"}
                  />
                  
                  <SecurityItem 
                    title="Defender for 365" 
                    status={securityData.cloudMetrics?.defenderFor365 ? "inPlace" : "notInPlace"}
                  />
                  
                  <SecurityItem 
                    title="Suitable Firewall" 
                    status={securityData.cloudMetrics?.suitableFirewall ? "inPlace" : "notInPlace"}
                  />
                  
                  <SecurityItem 
                    title="DKIM Policies" 
                    status={securityData.cloudMetrics?.dkimPolicies ? "inPlace" : "notInPlace"}
                  />
                  
                  <SecurityItem 
                    title="DMARC Policies" 
                    status={securityData.cloudMetrics?.dmarcPolicies ? "inPlace" : "notInPlace"}
                  />
                  
                  <SecurityItem 
                    title="Conditional Access" 
                    status={securityData.cloudMetrics?.conditionalAccess ? "inPlace" : "notInPlace"}
                  />
                  
                  <SecurityItem 
                    title="Compliance Policies" 
                    status={securityData.cloudMetrics?.compliancePolicies ? "inPlace" : "notInPlace"}
                  />
                  
                  <SecurityItem 
                    title="BYOD Policies" 
                    status={securityData.cloudMetrics?.byodPolicies === true ? "inPlace" : 
                            securityData.cloudMetrics?.byodPolicies === "Partial" ? "partial" : "notInPlace"}
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Threats Section */}
            <Card>
              <CardHeader>
                <CardTitle>Threats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-secondary-50 rounded-lg">
                    <div className="text-xs uppercase text-secondary-500 font-semibold mb-2">Identity Threats</div>
                    <div className="text-3xl font-bold text-danger">
                      {securityData.threatMetrics?.identityThreats || 0}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-secondary-50 rounded-lg">
                    <div className="text-xs uppercase text-secondary-500 font-semibold mb-2">Device Threats</div>
                    <div className="text-3xl font-bold text-warning">
                      {securityData.threatMetrics?.deviceThreats || 0}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-secondary-50 rounded-lg">
                    <div className="text-xs uppercase text-secondary-500 font-semibold mb-2">Other Threats</div>
                    <div className="text-3xl font-bold text-success">
                      {securityData.threatMetrics?.otherThreats || 0}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
