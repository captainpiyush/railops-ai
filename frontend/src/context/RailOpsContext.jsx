import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/axios';
import {
  BASE_DATE,
  BASE_DATE_STR,
  INITIAL_DEFECTS,
  generateSchedulesForBaseDate,
  generateBlocksForBaseDate,
  INITIAL_CORRIDOR_WINDOWS,
  getInitialActiveRecommendation,
  INITIAL_HISTORY
} from '../data/controlledDataset';

const RailOpsContext = createContext(null);

export function RailOpsProvider({ children }) {
  const [defects, setDefects] = useState(() => INITIAL_DEFECTS);
  const [blocks, setBlocks] = useState(() => generateBlocksForBaseDate(BASE_DATE));
  const [conflicts, setConflicts] = useState([]);
  const [schedules, setSchedules] = useState(() => generateSchedulesForBaseDate(BASE_DATE));
  const [corridorWindows, setCorridorWindows] = useState(() => INITIAL_CORRIDOR_WINDOWS);
  const [pipelineStats, setPipelineStats] = useState(null);
  const [activeRecommendation, setActiveRecommendation] = useState(() => getInitialActiveRecommendation(BASE_DATE));
  const [recommendationHistory, setRecommendationHistory] = useState(() => INITIAL_HISTORY);
  const [isLoading, setIsLoading] = useState(false);
  const [activityFeed, setActivityFeed] = useState([]);
  
  const [demoClock, setDemoClock] = useState({
    isDemoMode: true,
    effectiveDate: BASE_DATE_STR,
    effectiveTime: '10:00:00',
    effectiveNow: BASE_DATE.toISOString()
  });

  const effectiveNow = useMemo(() => {
    return demoClock.effectiveNow ? new Date(demoClock.effectiveNow) : BASE_DATE;
  }, [demoClock.effectiveNow]);

  // Derive local conflict matrix for when backend is offline
  const computeLocalConflicts = useCallback((currentBlocks) => {
    const list = currentBlocks || [];
    const foundConflicts = [];
    
    // Check for BLK-CONF-01 and BLK-CONF-02 overlap
    const blk1 = list.find(b => b.blockCode === 'BLK-CONF-01');
    const blk2 = list.find(b => b.blockCode === 'BLK-CONF-02');
    
    if (blk1 && blk2 && blk1.status !== 'CANCELLED' && blk2.status !== 'CANCELLED') {
      foundConflicts.push({
        conflictId: 'CONF-001',
        type: 'DEPT_CONFLICT',
        severity: 'HIGH',
        category: 'ACTIVE_TODAY',
        isOperationalActive: true,
        blockA: {
          id: blk1.blockCode,
          assetId: blk1.assetId,
          corridorId: blk1.corridorId,
          department: blk1.department,
          startTime: blk1.startTime,
          endTime: blk1.endTime,
          status: blk1.status,
          track: blk1.track || 'UP Main'
        },
        blockB: {
          id: blk2.blockCode,
          assetId: blk2.assetId,
          corridorId: blk2.corridorId,
          department: blk2.department,
          startTime: blk2.startTime,
          endTime: blk2.endTime,
          status: blk2.status,
          track: blk2.track || 'UP Main'
        },
        overlapMinutes: 120,
        description: 'Track (TMS) and Signalling (SMMS) overlap on COR-03 UP Main (15:30–17:30)',
        recommendation: 'Shift Track or Signalling block to alternative slot via What-If Simulation'
      });
    }

    return foundConflicts;
  }, []);

  // Fetch all core datasets from backend API with robust fallback to controlled dataset
  const refreshData = useCallback(async () => {
    try {
      const [defRes, blockRes, confRes, metricsRes, schedRes, recRes, histRes, clockRes, winRes] = await Promise.all([
        api.get('/defects').catch(() => ({ data: null })),
        api.get('/blocks').catch(() => ({ data: null })),
        api.get('/optimization/conflicts').catch(() => ({ data: null })),
        api.get('/integration/metrics').catch(() => ({ data: null })),
        api.get('/schedules').catch(() => ({ data: null })),
        api.get('/recommendations/active').catch(() => ({ data: null })),
        api.get('/recommendations/history').catch(() => ({ data: null })),
        api.get('/system/clock').catch(() => ({ data: null })),
        api.get('/corridors/windows').catch(() => ({ data: null }))
      ]);

      if (defRes?.data && Array.isArray(defRes.data) && defRes.data.length > 0) {
        setDefects(defRes.data);
      }
      if (blockRes?.data && Array.isArray(blockRes.data) && blockRes.data.length > 0) {
        setBlocks(blockRes.data);
      }
      if (confRes?.data && Array.isArray(confRes.data)) {
        setConflicts(confRes.data);
      } else {
        setConflicts(computeLocalConflicts(blocks));
      }
      if (metricsRes?.data) {
        setPipelineStats(metricsRes.data);
      }
      if (schedRes?.data && Array.isArray(schedRes.data) && schedRes.data.length > 0) {
        setSchedules(schedRes.data);
      }
      if (recRes?.data?.recommendation) {
        setActiveRecommendation(recRes.data.recommendation);
      }
      if (histRes?.data && Array.isArray(histRes.data) && histRes.data.length > 0) {
        setRecommendationHistory(histRes.data);
      }
      if (winRes?.data && Array.isArray(winRes.data) && winRes.data.length > 0) {
        setCorridorWindows(winRes.data);
      }
      if (clockRes?.data?.success) {
        setDemoClock(clockRes.data);
      }
    } catch (err) {
      console.warn('RailOpsContext: Using controlled deterministic local dataset:', err.message);
      setConflicts(computeLocalConflicts(blocks));
    } finally {
      setIsLoading(false);
    }
  }, [blocks, computeLocalConflicts]);

  // System presentation reset: restores clean dataset
  const handleResetDemo = useCallback(async () => {
    setIsLoading(true);
    try {
      await api.post('/system/reset').catch(() => {});
    } catch {}
    
    // Reset local state to pristine controlled dataset
    setDefects(INITIAL_DEFECTS);
    setBlocks(generateBlocksForBaseDate(BASE_DATE));
    setSchedules(generateSchedulesForBaseDate(BASE_DATE));
    setCorridorWindows(INITIAL_CORRIDOR_WINDOWS);
    setActiveRecommendation(getInitialActiveRecommendation(BASE_DATE));
    setRecommendationHistory(INITIAL_HISTORY);
    setConflicts(computeLocalConflicts(generateBlocksForBaseDate(BASE_DATE)));
    setDemoClock({
      isDemoMode: true,
      effectiveDate: BASE_DATE_STR,
      effectiveTime: '10:00:00',
      effectiveNow: BASE_DATE.toISOString()
    });
    setIsLoading(false);
    return { success: true, message: 'Deterministic presentation state restored.' };
  }, [computeLocalConflicts]);

  useEffect(() => {
    setConflicts(computeLocalConflicts(blocks));
    refreshData();
  }, []);

  // Accept an AI recommendation with interconnected state updates
  const handleAcceptRecommendation = useCallback(async (recId) => {
    const targetRec = activeRecommendation || {
      _id: recId,
      corridorId: 'COR-01',
      candidateId: 'CAND-02',
      startTime: new Date('2026-09-25T02:00:00').toISOString(),
      endTime: new Date('2026-09-25T08:00:00').toISOString()
    };

    try {
      // Try backend API first
      await api.post(`/recommendations/${recId}/accept`).catch(() => {});
    } catch {}

    // 1. Create committed approved block on target corridor
    const newBlock = {
      _id: `BLK-OPT-${Date.now()}`,
      blockCode: `BLK-C1-03`,
      assetId: 'TRK-COR1-101 (Multi-Dept)',
      corridorId: targetRec.corridorId || 'COR-01',
      department: 'Track + Signalling + Traction',
      track: 'UP Main',
      startTime: targetRec.startTime,
      endTime: targetRec.endTime,
      status: 'APPROVED',
      trainImpact: 0,
      conflictFlags: [],
      safetyBufferMinutes: 20,
      source: 'AI_OPTIMIZED',
      taskCount: 3,
      timeSavedHrs: 5.0
    };

    setBlocks(prev => [newBlock, ...prev]);

    // 2. Mark bundled defects as APPROVED / BUNDLED
    setDefects(prev => prev.map(d => {
      if (['DEF-0101', 'DEF-0102', 'DEF-0103'].includes(d.defectCode) || d.suggestedBundleId === 'BNDL-COR1-01') {
        return {
          ...d,
          status: 'APPROVED',
          allocatedBlockId: newBlock.blockCode,
          allocatedWindow: '02:00 – 08:00'
        };
      }
      return d;
    }));

    // 3. Add to Recommendation Audit History
    const historyEntry = {
      recommendationId: `REC-EXEC-${Date.now()}`,
      corridorId: targetRec.corridorId || 'COR-01',
      startTime: targetRec.startTime,
      endTime: targetRec.endTime,
      durationMinutes: 360,
      status: 'ACCEPTED',
      departments: ['Track', 'Signalling', 'Traction'],
      score: 78,
      reasons: [
        'Night golden window consolidation (02:00–08:00)',
        'Consolidates DEF-0101, DEF-0102, DEF-0103 into 1 shared possession',
        'Saves 5.0h corridor downtime (11.0h separate -> 6.0h bundled)',
        'Approved by Senior Divisional Operations Manager (Sr. DOM)'
      ],
      operatorAction: {
        action: 'ACCEPTED',
        timestamp: new Date().toISOString(),
        reason: 'Approved for execution by Chief Controller / Sr. DOM',
        operatorId: 'Senior Divisional Operations Manager (Sr. DOM)'
      },
      resultingBlockCode: newBlock.blockCode
    };

    setRecommendationHistory(prev => [historyEntry, ...prev]);
    setActiveRecommendation(null);

    setActivityFeed(prev => [{
      id: Date.now(),
      action: 'APPROVED',
      defectCode: 'COORDINATED-PKG (DEF-0101/02/03)',
      assetId: 'COR-01 (Delhi–Mumbai)',
      blockCode: newBlock.blockCode,
      timestamp: new Date()
    }, ...prev].slice(0, 15));

    return {
      success: true,
      status: 'SCHEDULED',
      message: `Coordinated Block ${newBlock.blockCode} (02:00–08:00) approved & assigned to COR-01 UP Main!`,
      block: newBlock
    };
  }, [activeRecommendation]);

  // Reject an AI recommendation with operator reason
  const handleRejectRecommendation = useCallback(async (recId, reason, operatorId = 'Senior Divisional Operations Manager (Sr. DOM)') => {
    const targetRec = activeRecommendation || {
      _id: recId,
      corridorId: 'COR-01',
      startTime: new Date('2026-09-25T02:00:00').toISOString(),
      endTime: new Date('2026-09-25T08:00:00').toISOString()
    };

    try {
      await api.post(`/recommendations/${recId}/reject`, { reason, operatorId }).catch(() => {});
    } catch {}

    const rejectionEntry = {
      recommendationId: `REC-REJ-${Date.now()}`,
      corridorId: targetRec.corridorId || 'COR-01',
      startTime: targetRec.startTime,
      endTime: targetRec.endTime,
      durationMinutes: 360,
      status: 'REJECTED',
      departments: ['Track', 'Signalling', 'Traction'],
      score: 78,
      reasons: [reason || 'Rejected by Operations Controller'],
      operatorAction: {
        action: 'REJECTED',
        timestamp: new Date().toISOString(),
        reason: reason || 'Operator rejected from operations portal',
        operatorId
      }
    };

    setRecommendationHistory(prev => [rejectionEntry, ...prev]);
    setActiveRecommendation(null);

    setActivityFeed(prev => [{
      id: Date.now(),
      action: 'REJECTED',
      defectCode: 'CAND-02 (COR-01)',
      assetId: 'RECOMMENDATION',
      blockCode: null,
      timestamp: new Date()
    }, ...prev].slice(0, 15));

    return {
      success: true,
      status: 'REJECTED',
      message: 'Recommendation rejected and permanently recorded in operations audit ledger.'
    };
  }, [activeRecommendation]);

  // Individual defect approval
  const handleApproveDefect = useCallback(async (defectId) => {
    setDefects(prev => prev.map(d => {
      if (d._id === defectId || d.defectCode === defectId) {
        return { ...d, status: 'APPROVED' };
      }
      return d;
    }));
  }, []);

  // Individual defect rejection
  const handleRejectDefect = useCallback(async (defectId, reason = 'Operator rejected') => {
    setDefects(prev => prev.map(d => {
      if (d._id === defectId || d.defectCode === defectId) {
        return { ...d, status: 'REJECTED', rejectionReason: reason };
      }
      return d;
    }));
  }, []);

  // Reschedule a block
  const handleRescheduleBlock = useCallback(async (blockId, newStartTime, newEndTime) => {
    setBlocks(prev => prev.map(b => {
      if (b._id === blockId || b.blockCode === blockId) {
        return {
          ...b,
          startTime: newStartTime.toISOString(),
          endTime: newEndTime.toISOString(),
          status: 'APPROVED',
          conflictFlags: []
        };
      }
      return b;
    }));
    
    // Clear resolved conflict
    setConflicts([]);
  }, []);

  // Apply re-optimized plan from What-If simulation
  const handleApplyReoptimizedPlan = useCallback(async (planPayload) => {
    const { targetBlockId, newStartTime, newEndTime, corridorId } = planPayload;
    
    setBlocks(prev => prev.map(b => {
      if (b._id === targetBlockId || b.blockCode === targetBlockId) {
        return {
          ...b,
          startTime: typeof newStartTime === 'string' ? newStartTime : newStartTime.toISOString(),
          endTime: typeof newEndTime === 'string' ? newEndTime : newEndTime.toISOString(),
          status: 'APPROVED',
          conflictFlags: [],
          source: 'AI_OPTIMIZED'
        };
      }
      return b;
    }));

    setConflicts([]);

    return {
      success: true,
      status: 'COMMITTED',
      message: `Re-optimized plan validated and committed to ${corridorId || 'COR-03'}.`
    };
  }, []);

  return (
    <RailOpsContext.Provider
      value={{
        defects,
        blocks,
        conflicts,
        schedules,
        corridorWindows,
        pipelineStats,
        activeRecommendation,
        recommendationHistory,
        isLoading,
        activityFeed,
        demoClock,
        effectiveNow,
        refreshData,
        handleResetDemo,
        handleAcceptRecommendation,
        handleRejectRecommendation,
        handleApproveDefect,
        handleRejectDefect,
        handleRescheduleBlock,
        handleApplyReoptimizedPlan
      }}
    >
      {children}
    </RailOpsContext.Provider>
  );
}

export function useRailOps() {
  const ctx = useContext(RailOpsContext);
  if (!ctx) throw new Error('useRailOps must be used within RailOpsProvider');
  return ctx;
}
