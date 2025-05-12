import { useEffect, useState } from "react";
import { useLocation, useParams, useRoute, useRouter } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { UserRoles } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// Form schema
const formSchema = z.object({
  summary: z.string().min(1, "Summary is required"),
  recommendations: z.string().min(1, "Recommendations are required"),
  analystComments: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditReport() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ tenantId: string, reportId: string }>("/tenants/:tenantId/reports/:reportId/edit");
  const tenantId = params ? parseInt(params.tenantId) : 0;
  const reportId = params ? parseInt(params.reportId) : 0;
  
  // Check if user is authorized (admin or analyst)
  const isAuthorized = user?.role === UserRoles.ADMIN || user?.role === UserRoles.ANALYST;
  
  // Fetch report data
  const { data: report, isLoading, error } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/reports/${reportId}`],
    enabled: !!tenantId && !!reportId
  });
  
  // Setup form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      summary: "",
      recommendations: "",
      analystComments: "",
    },
  });
  
  // Update form values when data is loaded
  useEffect(() => {
    if (report) {
      form.reset({
        summary: report.summary || "",
        recommendations: report.recommendations || "",
        analystComments: report.analystComments || "",
      });
    }
  }, [report, form]);
  
  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    try {
      await fetch(`/api/tenants/${tenantId}/reports/${reportId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(values)
      });
      
      // Invalidate report queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/reports/${reportId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/by-tenant"] });
      
      toast({
        title: "Report updated",
        description: "The report has been successfully updated.",
      });
      
      // Redirect back to report page
      setLocation(`/tenants/${tenantId}/reports`);
    } catch (error) {
      console.error("Error updating report:", error);
      toast({
        title: "Error",
        description: "Failed to update the report. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Redirect if not authorized
  if (!isLoading && !isAuthorized) {
    toast({
      title: "Access denied",
      description: "You don't have permission to edit this report.",
      variant: "destructive",
    });
    setLocation(`/tenants/${tenantId}/reports`);
    return null;
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading report...</span>
      </div>
    );
  }
  
  if (error || !report) {
    return (
      <Alert variant="destructive" className="max-w-3xl mx-auto mt-8">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load report details. Please try again.</AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="container max-w-4xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Edit Report</CardTitle>
          <CardDescription>
            Update summary and recommendations for {report.title} - Q{report.quarter} {report.year}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Summary</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter a summary of the security assessment..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide a concise summary of the security assessment and its findings.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="recommendations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recommendations</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter recommendations based on the findings..."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide detailed recommendations to address the security concerns found in the assessment.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="analystComments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Analyst Comments</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional comments for this report..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional comments from the analyst reviewing this report.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setLocation(`/tenants/${tenantId}/reports`)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}