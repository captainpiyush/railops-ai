import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/axios';

const RailOpsContext = createContext(null);

export function RailOpsProvider({ children }) {
  const [defects, setDefects] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [pipelineStats, setPipelineStats] = useState(null);
  const [activeRecommendation, setActiveRecommendation] = useState(null);
  const [recommendationHistory, setRecommendationHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activityFeed, setActivityFeed] = useState([]);
  const [demoClock, setDemoClock] = useState({
    isDemoMode: true,
    effectiveDate: '2026-09-09',
    effectiveTime: '10:00:00',
    effectiveNow: new Date('2026-09-09T10:00:00').toISOString()
  });

  const effectiveNow = useMemo(() => {
    return demoClock.effectiveNow ? new Date(demoClock.effectiveNow) : new Date();
  }, [demoClock.effectiveNow]);

  // Fetch all core datasets including active recommendation and system clock
  const refreshData = useCallback(async () => {
    try {
      const [defRes, blockRes, confRes, metricsRes, schedRes, recRes, histRes, clockRes] = await Promise.all([
        api.get('/defects'),
        api.get('/blocks'),
        api.get('/optimization/conflicts'),
        api.get('/integration/metrics').catch(() => ({ data: null })),
        api.get('/schedules').catch(() => ({ data: [] })),
        api.get('/recommendations/active').catch(() => ({ data: { recommendation: null } })),
        api.get('/recommendations/history').catch(() => ({ data: [] })),
        api.get('/system/clock').catch(() => ({ data: null }))
      ]);

      if (defRes.data) setDefects(defRes.data);
      if (blockRes.data) setBlocks(blockRes.data);
      if (confRes.data) setConflicts(confRes.data);
      if (metricsRes.data) setPipelineStats(metricsRes.data);
      if (schedRes.data) setSchedules(schedRes.data);
      if (recRes.data) setActiveRecommendation(recRes.data.recommendation || null);
      if (histRes.data) setRecommendationHistory(histRes.data);
      if (clockRes.data && clockRes.data.success) {
        setDemoClock(clockRes.data);
      }
    } catch (err) {
      console.error('RailOpsContext: Error refreshing data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // System presentation reset: calls /api/system/reset and restores clean dataset
  const handleResetDemo = useCallback(async () => {
    try {
      setIsLoading(true);
      await api.post('/system/reset');
      await refreshData();
      return { success: true, message: 'Deterministic presentation state restored.' };
    } catch (err) {
      console.error('Failed to reset presentation dataset:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshData]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Accept an AI recommendation with fresh backend constraint validation
  const handleAcceptRecommendation = useCallback(async (recId) => {
    try {
      const res = await api.post(`/recommendations/${recId}/accept`);
      const data = res.data;

      if (data.success && data.status === 'SCHEDULED') {
        // Optimistically add newly committed block
        if (data.block) {
          setBlocks(prev => [data.block, ...prev]);
        }
        // Active recommendation is now scheduled, remove from card
        setActiveRecommendation(null);

        // Add to shared activity feed
        setActivityFeed(prev => [{
          id: Date.now(),
          action: 'APPROVED',
          defectCode: 'COORDINATED-PKG',
          assetId: data.block?.assetId || 'CORRIDOR-BLOCK',
          blockCode: data.block?.blockCode || 'BLK-COORD',
          timestamp: new Date()
        }, ...prev].slice(0, 15));

        await refreshData();
        return { success: true, status: 'SCHEDULED', message: data.message, block: data.block };
      } else if (data.status === 'REPLANNED') {
        // Stale window detected: update with auto-replanned proposal
        if (data.newRecommendation) {
          setActiveRecommendation(data.newRecommendation);
        }
        await refreshData();
        return {
          success: false,
          status: 'REPLANNED',
          message: data.message || 'Window no longer available; auto-replanned to next safe window.',
          reason: data.reason,
          newRecommendation: data.newRecommendation
        };
      }
      return data;
    } catch (err) {
      console.error('RailOpsContext: handleAcceptRecommendation failed:', err);
      throw err;
    }
  }, [refreshData]);

  // Reject an AI recommendation
  const handleRejectRecommendation = useCallback(async (recId, reason = 'Operator rejected proposal') => {
    try {
      const res = await api.post(`/recommendations/${recId}/reject`, { reason });
      setActiveRecommendation(null);

      setActivityFeed(prev => [{
        id: Date.now(),
        action: 'REJECTED',
        defectCode: 'COORDINATED-PKG',
        assetId: 'RECOMMENDATION',
        blockCode: null,
        timestamp: new Date()
      }, ...prev].slice(0, 15));

      await refreshData();
      return res.data;
    } catch (err) {
      console.error('RailOpsContext: handleRejectRecommendation failed:', err);
      throw err;
    }
  }, [refreshData]);

  // Apply a re-optimized plan from What-If simulation with fresh validateBeforeCommit() revalidation
  const handleApplyReoptimizedPlan = useCallback(async (planPayload) => {
    try {
      const res = await api.post('/simulation/apply', planPayload);
      const data = res.data;

      if (data.success && data.status === 'COMMITTED') {
        setActivityFeed(prev => [{
          id: Date.now(),
          action: 'APPROVED',
          defectCode: 'RE-OPT COMMITTED',
          assetId: data.updatedBlock?.assetId || 'CORRIDOR-BLOCK',
          blockCode: data.updatedBlock?.blockCode || 'BLK-REOPT',
          timestamp: new Date()
        }, ...prev].slice(0, 15));

        await refreshData();
        return { success: true, status: 'COMMITTED', ...data };
      }
      return data;
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.status === 'STALE') {
        return {
          success: false,
          status: 'STALE',
          message: err.response.data.message || 'Re-optimized window is no longer available. AI has calculated the next safe alternative.',
          newAlternative: err.response.data.newAlternative,
          violations: err.response.data.violations
        };
      }
      console.error('RailOpsContext: handleApplyReoptimizedPlan failed:', err);
      throw err;
    }
  }, [refreshData]);

  // Approve a defect: sends PUT /api/defects/:id with status EXECUTED, adds generated block, mutates state instantly
  const handleApproveDefect = useCallback(async (defectId) => {
    try {
      const res = await api.put(`/defects/${defectId}`, { status: 'EXECUTED' });
      const { defect: updatedDefect, block: newBlock } = res.data;

      setDefects(prev => prev.map(d => (d._id === defectId ? (updatedDefect || { ...d, status: 'EXECUTED' }) : d)));

      if (newBlock) {
        setBlocks(prev => [newBlock, ...prev]);
      }

      setActivityFeed(prev => [{
        id: Date.now(),
        action: 'APPROVED',
        defectCode: updatedDefect?.defectCode || defectId.slice(-8).toUpperCase(),
        assetId: updatedDefect?.assetId,
        blockCode: newBlock?.blockCode || 'BLK-AUTO',
        timestamp: new Date()
      }, ...prev].slice(0, 15));

      return { success: true, defect: updatedDefect, block: newBlock };
    } catch (err) {
      console.error('RailOpsContext: handleApproveDefect failed:', err);
      throw err;
    }
  }, []);

  // Reject a defect: sends PUT /api/defects/:id with status REJECTED, mutates state instantly
  const handleRejectDefect = useCallback(async (defectId) => {
    try {
      const res = await api.put(`/defects/${defectId}`, { status: 'REJECTED' });
      const { defect: updatedDefect } = res.data;

      setDefects(prev => prev.map(d => (d._id === defectId ? (updatedDefect || { ...d, status: 'REJECTED' }) : d)));

      setActivityFeed(prev => [{
        id: Date.now(),
        action: 'REJECTED',
        defectCode: updatedDefect?.defectCode || defectId.slice(-8).toUpperCase(),
        assetId: updatedDefect?.assetId,
        blockCode: null,
        timestamp: new Date()
      }, ...prev].slice(0, 15));

      return { success: true, defect: updatedDefect };
    } catch (err) {
      console.error('RailOpsContext: handleRejectDefect failed:', err);
      throw err;
    }
  }, []);

  // Bundle a defect: sends PUT /api/defects/:id with status BUNDLED, mutates state instantly
  const handleBundleDefect = useCallback(async (defectId) => {
    try {
      const res = await api.put(`/defects/${defectId}`, { status: 'BUNDLED' });
      const { defect: updatedDefect } = res.data;

      setDefects(prev => prev.map(d => (d._id === defectId ? (updatedDefect || { ...d, status: 'BUNDLED' }) : d)));

      return { success: true, defect: updatedDefect };
    } catch (err) {
      console.error('RailOpsContext: handleBundleDefect failed:', err);
      throw err;
    }
  }, []);

  // Reschedule a block: updates scheduled window and updates block in place
  const handleRescheduleBlock = useCallback(async (blockId, newStartTime, newEndTime) => {
    try {
      const res = await api.put(`/blocks/${blockId}`, {
        startTime: typeof newStartTime === 'string' ? newStartTime : newStartTime.toISOString(),
        endTime: typeof newEndTime === 'string' ? newEndTime : newEndTime.toISOString()
      });
      const updatedBlock = res.data;

      setBlocks(prev => prev.map(b => (b._id === blockId ? updatedBlock : b)));

      return { success: true, block: updatedBlock };
    } catch (err) {
      console.error('RailOpsContext: handleRescheduleBlock failed:', err);
      throw err;
    }
  }, []);

  const value = {
    defects,
    blocks,
    conflicts,
    schedules,
    pipelineStats,
    activeRecommendation,
    recommendationHistory,
    isLoading,
    activityFeed,
    setActivityFeed,
    refreshData,
    handleAcceptRecommendation,
    handleRejectRecommendation,
    handleApplyReoptimizedPlan,
    handleApproveDefect,
    handleRejectDefect,
    handleBundleDefect,
    handleRescheduleBlock,
    demoClock,
    effectiveNow,
    handleResetDemo,
  };

  return (
    <RailOpsContext.Provider value={value}>
      {children}
    </RailOpsContext.Provider>
  );
}

export function useRailOps() {
  const context = useContext(RailOpsContext);
  if (!context) {
    throw new Error('useRailOps must be used within a RailOpsProvider');
  }
  return context;
}
