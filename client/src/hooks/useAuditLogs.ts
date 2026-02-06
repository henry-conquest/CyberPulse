// components/AuditLogs/useAuditLogs.ts
import { useState, useEffect, useMemo } from 'react';
import { getAuditLogs } from '@/service/Audit';

export function useAuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await getAuditLogs();
      setLogs(data || []);
    } catch (error) {
      setLogs([]);
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    if (!Array.isArray(logs)) {
      return [];
    }
    return logs.filter((log) => {
      // Filter by action
      if (actionFilter !== 'all' && log.action !== actionFilter) {
        return false;
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          log.details?.toLowerCase().includes(query) ||
          log.action?.toLowerCase().includes(query) ||
          log.user?.email?.toLowerCase().includes(query) ||
          log.entityType?.toLowerCase().includes(query) ||
          log.entityId?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [logs, searchQuery, actionFilter]);

  return {
    logs,
    filteredLogs,
    searchQuery,
    setSearchQuery,
    actionFilter,
    setActionFilter,
    isLoading,
    fetchLogs,
  };
}
