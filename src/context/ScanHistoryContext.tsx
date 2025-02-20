import React, { createContext, useContext, useState, useCallback } from 'react';
import AuthService from '../services/auth'; // Adjust path as needed

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

interface Scan {
  scan_time: string;
  success: boolean;
  scan_type: string;
  proximity_status?: string | null;
  qr_code?: string | null;
  peer_username?: string | null;
}

interface ScanHistoryState {
  scans: Scan[];
  total: number;
  skip: number;
  limit: number;
  loading: boolean;
  fetchScans: (reset?: boolean) => Promise<void>;
}

const ScanHistoryContext = createContext<ScanHistoryState | undefined>(
  undefined
);

export const ScanHistoryProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [scans, setScans] = useState<Scan[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [limit] = useState(10); // Fixed page size
  const [loading, setLoading] = useState(false);

  const fetchScans = useCallback(
    async (reset: boolean = false) => {
      if (loading || (skip >= total && !reset)) return; // No more to fetch unless resetting

      setLoading(true);
      try {
        const token = await AuthService.getToken(); // Assuming this exists
        const response = await fetch(
          `${API_URL}/player/my_history?skip=${
            reset ? 0 : skip
          }&limit=${limit}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!response.ok) throw new Error('Failed to fetch scan history');

        const data = await response.json();
        setTotal(data.total);
        setScans((prev) => (reset ? data.scans : [...prev, ...data.scans]));
        setSkip((prev) => (reset ? limit : prev + limit));
      } catch (error) {
        console.error('Error fetching scans:', error);
      } finally {
        setLoading(false);
      }
    },
    [loading, skip, limit, total]
  );

  return (
    <ScanHistoryContext.Provider
      value={{ scans, total, skip, limit, loading, fetchScans }}
    >
      {children}
    </ScanHistoryContext.Provider>
  );
};

export const useScanHistory = () => {
  const context = useContext(ScanHistoryContext);
  if (!context)
    throw new Error('useScanHistory must be used within a ScanHistoryProvider');
  return context;
};
