'use client';

import { useEffect } from 'react';
import { initialize, scheduleProactiveRefresh } from '@/utils/tokenManager';
import { initializeCrossTabSync, cleanupCrossTabSync } from '@/utils/crossTabSync';
import { initializeBackgroundOptimization, cleanupBackgroundOptimization } from '@/utils/backgroundTabOptimization';

export const TokenRefreshProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Initialize Token Manager on mount
    initialize();

    // Start proactive refresh scheduling
    scheduleProactiveRefresh();

    // Initialize cross-tab synchronization
    initializeCrossTabSync();

    // Initialize background tab optimization
    initializeBackgroundOptimization();

    // Cleanup on unmount
    return () => {
      cleanupCrossTabSync();
      cleanupBackgroundOptimization();
    };
  }, []);

  return <>{children}</>;
};
