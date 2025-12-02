'use client';

import { useEffect } from 'react';
import { initializeTokenRefresh, stopTokenRefresh } from '@/utils/tokenRefresh';

export const TokenRefreshProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Initialize token refresh when component mounts
    initializeTokenRefresh();

    // Cleanup on unmount
    return () => {
      stopTokenRefresh();
    };
  }, []);

  return <>{children}</>;
};
