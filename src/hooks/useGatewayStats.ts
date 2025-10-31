import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/api';

export const useGatewayStats = () => {
  const [stats, setStats] = useState({
    total_requests: 0,
    successful_requests: 0,
    error_requests: 0,
    avg_duration_ms: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(getApiUrl('STATS'));
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  return stats;
};
