import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useCompanies } from '@/hooks/useCompanies';
import CreateCompanyForm from '@/pages/Companies/Forms/CreateCompanyForm';
import { deleteIntegration, getIntegrations } from '@/service/Settings';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Cloud, ExternalLink, Link2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

const IntegrationsTab = () => {
  const [, setLocation] = useLocation();
  const [connections, setConnections] = useState<any>([]);
  const [isLoadingConnections, setIsLoadingConnections] = useState(true);
  const [deletingConnectionId, setDeletingConnectionId] = useState<string | null>(null);
  const { createDialogOpen, setCreateDialogOpen, setM365DialogOpen, form, setLoading } = useCompanies();
  const queryClient = useQueryClient();

  useEffect(() => {
    const getData = async () => {
      try {
        setIsLoadingConnections(true);
        const data = await getIntegrations();
        setConnections(data);
      } catch (error) {
        console.error('Error fetching integrations:', error);
      } finally {
        setIsLoadingConnections(false);
      }
    };
    getData();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
        <CardDescription>Connect external services to enhance security monitoring capabilities</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Microsoft 365 Integration */}
        <div className="rounded-lg border p-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-full mr-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-blue-600"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18" />
                  <path d="M9 21V9" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium">Microsoft 365</h3>
                <p className="text-sm text-secondary-500">
                  Access secure score and security metrics from Microsoft 365 tenant
                </p>
              </div>
            </div>

            {isLoadingConnections ? (
              <Button disabled variant="outline" size="sm">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Loading...
              </Button>
            ) : connections && connections.length > 0 ? (
              <Badge variant="outline" className="bg-success/10 text-success">
                Connected
              </Badge>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  (window.location.href = `${window.location.origin}/integrations?tab=microsoft365&action=connect`)
                }
              >
                <Link2 className="h-4 w-4 mr-2" />
                Connect
              </Button>
            )}
          </div>

          {connections && connections.length > 0 && (
            <div className="mt-4 space-y-4">
              {connections.map((connection: any) => {
                return (
                  <div key={connection.id} className="bg-secondary-50 p-4 rounded-md flex justify-between">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{connection.tenantName || 'Microsoft 365 Tenant'}</h4>
                        <p className="text-xs text-secondary-500 mt-1">
                          Connected on {new Date(connection.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex-col">
                      <div className="text-sm">
                        <span className="text-secondary-500">Tenant ID:</span>
                        <span className="ml-1 font-mono text-xs">{connection.tenantId}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-secondary-500">Status:</span>
                        <Badge variant="outline" className="ml-2 bg-success/10 text-success text-xs">
                          Active
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={deletingConnectionId === connection.id}
                      className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                      onClick={async () => {
                        setDeletingConnectionId(connection.id);
                        await deleteIntegration(connection.id);
                        setConnections((prev: any) => prev.filter((c: any) => c.id !== connection.id));
                        setDeletingConnectionId(null);
                      }}
                    >
                      {deletingConnectionId === connection.id ? (
                        <svg
                          className="animate-spin h-4 w-4 text-destructive"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                      ) : (
                        'Disconnect'
                      )}
                    </Button>
                  </div>
                );
              })}

              <div className="flex items-center justify-between p-3 border border-dashed rounded-md mt-4">
                <p className="text-sm text-secondary-500">
                  <AlertTriangle className="h-4 w-4 inline-block mr-2 text-amber-500" />
                  Disconnecting will remove access to Microsoft 365 security metrics
                </p>
                <CreateCompanyForm
                  isIntegrationTab={true}
                  setM365DialogOpen={setM365DialogOpen}
                  form={form}
                  createDialogOpen={createDialogOpen}
                  setCreateDialogOpen={setCreateDialogOpen}
                  queryClient={queryClient}
                  setLoading={setLoading}
                />
              </div>
            </div>
          )}

          {!isLoadingConnections && (!connections || connections.length === 0) && (
            <Alert className="mt-4">
              <Cloud className="h-4 w-4" />
              <AlertTitle>No connection found</AlertTitle>
              <AlertDescription>
                Connect your Microsoft 365 tenant to enable security insights and monitoring for your organisation. This
                requires administrator permissions for your Microsoft 365 tenant.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Future integrations can be added here */}
        <div className="rounded-lg border border-dashed p-4 bg-secondary-50">
          <div className="flex items-center justify-center py-4">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">More integrations coming soon</h3>
              <p className="text-sm text-secondary-500 max-w-md mx-auto">
                We're working on additional integrations to enhance your security monitoring capabilities. Stay tuned
                for updates!
              </p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Integration Access</AlertTitle>
          <AlertDescription>
            Connecting integrations grants read-only access to security metrics. No data is modified in your tenant.
          </AlertDescription>
        </Alert>
      </CardFooter>
    </Card>
  );
};

export default IntegrationsTab;
