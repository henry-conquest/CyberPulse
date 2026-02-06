// components/AuditLogs/AuditLogsTable.tsx
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, FileText } from 'lucide-react';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { useState } from 'react';

export default function AuditLogsTable() {
  const { filteredLogs, searchQuery, setSearchQuery, actionFilter, setActionFilter, isLoading, logs } = useAuditLogs();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (logId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  // Helper to get action badge with proper styling
  const getActionBadge = (action: string) => {
    const badgeConfig: Record<string, { label: string; className: string }> = {
      // Tenant actions
      create_tenant: {
        label: 'Tenant Created',
        className: 'bg-green-50 text-green-700 border-green-200',
      },
      delete_tenant: {
        label: 'Tenant Deleted',
        className: 'bg-red-50 text-red-700 border-red-200',
      },

      // Microsoft 365 Connection actions
      create_microsoft365_connection: {
        label: 'M365 Connected',
        className: 'bg-blue-50 text-blue-700 border-blue-200',
      },
      update_microsoft365_connection: {
        label: 'M365 Updated',
        className: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      },
      delete_microsoft365_connection: {
        label: 'M365 Disconnected',
        className: 'bg-red-50 text-red-700 border-red-200',
      },

      // User actions
      create_user: {
        label: 'User Created',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      },
      invite_user: {
        label: 'User Invited',
        className: 'bg-teal-50 text-teal-700 border-teal-200',
      },
      update_user_role: {
        label: 'Role Updated',
        className: 'bg-purple-50 text-purple-700 border-purple-200',
      },
      update_user_tenants: {
        label: 'Access Updated',
        className: 'bg-orange-50 text-orange-700 border-orange-200',
      },
      delete_user: {
        label: 'User Deleted',
        className: 'bg-red-50 text-red-700 border-red-200',
      },

      // Widget actions
      update_widget: {
        label: 'Widget Updated',
        className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      },

      // Auth actions
      logout: {
        label: 'Logout',
        className: 'bg-gray-50 text-gray-700 border-gray-200',
      },
      login: {
        label: 'Login',
        className: 'bg-gray-50 text-gray-700 border-gray-200',
      },
    };

    const config = badgeConfig[action];

    if (config) {
      return (
        <Badge variant="outline" className={config.className} style={{ textWrap: 'nowrap' }}>
          {config.label}
        </Badge>
      );
    }

    // Default badge for unknown actions
    return (
      <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200" style={{ textWrap: 'nowrap' }}>
        {action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
      </Badge>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <p className="text-secondary-500">Track all system activities and changes</p>
      </div>

      {/* Filters and search */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-grow">
          <Input
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
            // @ts-ignore
            prefix={<Search className="h-4 w-4 text-secondary-500" />}
          />
        </div>
        <div className="flex items-center">
          <Filter className="h-4 w-4 mr-2 text-secondary-500" />
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="update_widget">Widget Updates</SelectItem>
              <SelectItem value="create_user">User Created</SelectItem>
              <SelectItem value="delete_user">User Deleted</SelectItem>
              <SelectItem value="update_role">Role Updates</SelectItem>
              <SelectItem value="update_tenant_access">Access Updates</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Audit logs table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit logs</CardTitle>
          <CardDescription>Complete history of system changes and user actions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-secondary-500">Loading audit logs...</p>
            </div>
          ) : filteredLogs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log: any) => {
                  const isExpanded = expandedRows.has(log.id);

                  return (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm">{format(new Date(log.timestamp), 'MMM d, yyyy')}</div>
                        <div className="text-xs text-secondary-500">{format(new Date(log.timestamp), 'HH:mm:ss')}</div>
                      </TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell>
                        <div className="text-sm">{log?.email || log.userId || 'System'}</div>
                        {log.tenantId && (
                          <div className="text-xs text-secondary-500">Tenant: {log.tenant?.name || log.tenantId}</div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div
                          className={`text-sm text-secondary-700 cursor-pointer hover:text-secondary-900 transition-colors ${
                            isExpanded ? '' : 'truncate'
                          }`}
                          onClick={() => toggleRowExpansion(log.id)}
                          title={isExpanded ? 'Click to collapse' : 'Click to expand'}
                        >
                          {log.details}
                        </div>
                        {log.details && log.details.length > 80 && (
                          <button
                            onClick={() => toggleRowExpansion(log.id)}
                            className="text-xs text-brand-teal hover:text-brand-teal/80 mt-1"
                          >
                            {isExpanded ? 'Show less' : 'Show more'}
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center">
              <FileText className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Audit Logs Found</h3>
              <p className="text-secondary-500 mb-4">
                {logs?.length === 0 ? 'No activity has been logged yet.' : 'No logs match your search criteria.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
