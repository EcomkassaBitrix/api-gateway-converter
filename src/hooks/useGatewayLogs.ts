import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/api';

export const useGatewayLogs = () => {
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch(`${getApiUrl('LOGS')}?limit=10`);
        if (response.ok) {
          const data = await response.json();
          setRecentLogs(data.logs || []);
        }
      } catch (error) {
        console.error('Failed to fetch logs:', error);
      }
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  return recentLogs;
};
