import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRailOps } from '../context/RailOpsContext';
import DataSourceBadge from '../components/DataSourceBadge';
import PriorityScoreBar from '../components/PriorityScoreBar';

// Static / fallback corridor block window definition
const DEFAULT_CORRIDOR_WINDOWS = [
  // COR-01: Delhi–Mumbai
  { corridorId: 'COR-01', day: 'Today', windowStart: '00:00', windowEnd: '08:00', trafficLevel: 'LOW', description: 'Primary Overhaul Window (Night Shift)' },
  { corridorId: 'COR-01', day: 'Today', windowStart: '12:30', windowEnd: '17:00', trafficLevel: 'MEDIUM', description: 'Secondary Afternoon Maintenance Window' },
  { corridorId: 'COR-01', day: 'Today', windowStart: '22:00', windowEnd: '24:00', trafficLevel: 'LOW', description: 'Late Night Pre-Block Preparation Window' },
  { corridorId: 'COR-01', day: 'Tomorrow', windowStart: '02:00', windowEnd: '05:30', trafficLevel: 'LOW', description: 'Approved Track Possession Slot' },

  // COR-02: Delhi–Howrah
  { corridorId: 'COR-02', day: 'Today', windowStart: '01:00', windowEnd: '07:30', trafficLevel: 'LOW', description: 'Early Morning Freight/Maintenance Slot' },
  { corridorId: 'COR-02', day: 'Today', windowStart: '13:00', windowEnd: '17:00', trafficLevel: 'MEDIUM', description: 'Midday Inter-Peak Maintenance Slot' },
  { corridorId: 'COR-02', day: 'Tomorrow', windowStart: '14:00', windowEnd: '16:30', trafficLevel: 'MEDIUM', description: 'Traction Inspection Scheduled Slot' },

  // COR-03: Mumbai–Chennai
  { corridorId: 'COR-03', day: 'Today', windowStart: '01:30', windowEnd: '08:00', trafficLevel: 'LOW', description: 'Deep Night Overhaul Possession' },
  { corridorId: 'COR-03', day: 'Today', windowStart: '13:30', windowEnd: '17:30', trafficLevel: 'MEDIUM', description: 'Afternoon Operational Possession' },
  { corridorId: 'COR-03', day: 'Tomorrow', windowStart: '01:30', windowEnd: '06:00', trafficLevel: 'LOW', description: 'Night Maintenance Clearance' },

  // COR-04: Howrah–Chennai
  { corridorId: 'COR-04', day: 'Today', windowStart: '01:00', windowEnd: '07:00', trafficLevel: 'LOW', description: 'Early Morning Heavy Haul Gap' },
  { corridorId: 'COR-04', day: 'Today', windowStart: '12:00', windowEnd: '16:00', trafficLevel: 'MEDIUM', description: 'Midday Track & OHE Maintenance Window' },
  { corridorId: 'COR-04', day: 'Tomorrow', windowStart: '02:00', windowEnd: '06:30', trafficLevel: 'LOW', description: 'Coastal Corridor Pre-Scheduled Gap' },

  // COR-05: Delhi–Chennai
  { corridorId: 'COR-05', day: 'Today', windowStart: '01:00', windowEnd: '08:00', trafficLevel: 'LOW', description: 'Long-haul Night Catenary Maintenance' },
  { corridorId: 'COR-05', day: 'Today', windowStart: '12:30', windowEnd: '15:30', trafficLevel: 'MEDIUM', description: 'Afternoon Traction Possession Slot' },
  { corridorId: 'COR-05', day: 'Tomorrow', windowStart: '01:00', windowEnd: '07:00', trafficLevel: 'LOW', description: 'Trunk Route Overhaul Slot' }
];

const CORRIDOR_METADATA = {
  'COR-01': { name: 'Delhi–Mumbai', fromStation: 'NDLS', toStation: 'CSMT', lengthKm: 1384 },
  'COR-02': { name: 'Delhi–Howrah', fromStation: 'NDLS', toStation: 'HWH', lengthKm: 1441 },
  'COR-03': { name: 'Mumbai–Chennai', fromStation: 'CSMT', toStation: 'MAS', lengthKm: 1279 },
  'COR-04': { name: 'Howrah–Chennai', fromStation: 'HWH', toStation: 'MAS', lengthKm: 1659 },
  'COR-05': { name: 'Delhi–Chennai', fromStation: 'NDLS', toStation: 'MAS', lengthKm: 2175 },
};

const DEPARTMENTS = [
  {
    code: 'TMS',
    key: 'tms',
    title: 'TMS — Track Management System',
    shortName: 'Track (TMS)',
    subtext: 'Permanent Way, Rail Integrity, Sleepers, Ballast & Track Geometry',
    deptFilter: ['Track', 'Permanent Way'],
    source: 'TMS',
    color: 'blue',
    badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30'
  },
  {
    code: 'SMMS',
    key: 'smms',
    title: 'SMMS — Signal Maintenance Management System',
    shortName: 'Signalling (SMMS)',
    subtext: 'Electronic Interlocking, Point Machines, Signal Relays & Axle Counters',
    deptFilter: ['Signalling', 'Signal', 'Interlocking'],
    source: 'SMMS',
    color: 'purple',
    badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30'
  },
  {
    code: 'TDMS',
    key: 'tdms',
    title: 'TDMS — Traction Distribution Management System',
    shortName: 'Traction / OHE (TDMS)',
    subtext: '25kV Catenary, Overhead Equipment, Droppers, Insulators & Substation',
    deptFilter: ['Traction', 'Electrical', 'OHE'],
    source: 'TDMS',
    color: 'amber',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
  },
  {
    code: 'BDMS',
    key: 'bdms',
    title: 'BDMS — Block Disconnection Management System',
    shortName: 'Rolling Stock & Depots (BDMS)',
    subtext: 'Locomotives, Coaches, Wagons & Depot Possession Coordination',
    deptFilter: ['Rolling Stock', 'Infrastructure', 'BDMS'],
    source: 'BDMS',
    color: 'teal',
    badgeClass: 'bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30'
  },
  {
    code: 'COA',
    key: 'coa',
    title: 'COA — Control Office Application Operations',
    shortName: 'Control Office (COA)',
    subtext: 'Line Clear, Train Paths, Corridor Timetables & Inter-Division Traffic',
    deptFilter: ['Track', 'Signalling', 'Traction', 'Rolling Stock', 'Operations'],
    source: 'COA',
    color: 'rose',
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
  }
];

export default function DepartmentDashboard() {
  const { dept: routeDept } = useParams();
  const navigate = useNavigate();
  const {
    defects = [],
    blocks = [],
    corridorWindows = [],
    activeRecommendation,
    recommendationHistory = [],
    effectiveNow,
    demoClock
  } = useRailOps();

  // Active department selection
  const activeDeptObj = useMemo(() => {
    const cleanParam = (routeDept || 'tms').toLowerCase();
    const found = DEPARTMENTS.find(d => d.key === cleanParam || d.code.toLowerCase() === cleanParam);
    return found || DEPARTMENTS[0];
  }, [routeDept]);

  const [selectedCorridorFilter, setSelectedCorridorFilter] = useState('ALL');
  const [selectedDayFilter, setSelectedDayFilter] = useState('ALL');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');

  // ──────────────────────────────────────────────────────────────────────────
  // 1. TABLE 1: TASK PLAN RECOMMENDED BY AI
  // Columns required: Block ID, Window Time, Task, Corridor No.
  // ──────────────────────────────────────────────────────────────────────────
  const recommendedPlans = useMemo(() => {
    const plans = [];

    // Helper to format start and end dates
    const formatTimeWindow = (s, e) => {
      if (!s || !e) return 'Pending Allocation';
      const startDate = new Date(s);
      const endDate = new Date(e);
      const isToday = startDate.toDateString() === (effectiveNow || new Date()).toDateString();
      const dayLabel = isToday ? 'Today' : startDate.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
      const startTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const endTime = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const durationHours = ((endDate - startDate) / (1000 * 60 * 60)).toFixed(1);
      return {
        formatted: `${dayLabel}, ${startTime} – ${endTime} (${durationHours}h)`,
        durationHours,
        dayLabel,
        startTime,
        endTime
      };
    };

    // A. Extract from active AI recommendation
    if (activeRecommendation && activeRecommendation.taskSummary?.length > 0) {
      const activeWindow = formatTimeWindow(activeRecommendation.startTime, activeRecommendation.endTime);
      activeRecommendation.taskSummary.forEach(task => {
        const matchesDept =
          activeDeptObj.code === 'COA' ||
          activeDeptObj.deptFilter.some(df => task.department?.toLowerCase()?.includes(df.toLowerCase())) ||
          (task.defectCode && defects.some(d => d.defectCode === task.defectCode && (d.source === activeDeptObj.source || activeDeptObj.deptFilter.includes(d.department))));

        if (matchesDept) {
          plans.push({
            id: `rec-${task.defectCode || Math.random()}`,
            blockId: activeRecommendation.resultingBlockId ? `BLK-${activeRecommendation.resultingBlockId.toString().slice(-6).toUpperCase()}` : (activeRecommendation.recommendationId || 'BLK-COORD-AUTO'),
            windowTime: activeWindow.formatted,
            task: task.faultDescription || `${task.department} Maintenance Possession`,
            taskCode: task.defectCode || 'TASK-AI',
            assetId: task.assetId || 'CORRIDOR-ASSET',
            corridorNo: activeRecommendation.corridorId || 'COR-01',
            corridorName: CORRIDOR_METADATA[activeRecommendation.corridorId]?.name || 'Trunk Corridor',
            status: 'RECOMMENDED_ACTIVE',
            statusLabel: 'AI Recommendation (Active)',
            department: task.department || activeDeptObj.shortName,
            isSplittable: task.isSplittable,
            priority: task.priority || 'HIGH'
          });
        }
      });
    }

    // B. Extract from Blocks that were generated by AI (or linked to recommendation/approved)
    blocks.forEach(b => {
      const matchesDept =
        activeDeptObj.code === 'COA' ||
        activeDeptObj.deptFilter.some(df => b.department?.toLowerCase()?.includes(df.toLowerCase())) ||
        (b.bundledDefects?.length > 0 && defects.some(d => b.bundledDefects.includes(d._id) && activeDeptObj.deptFilter.includes(d.department)));

      if (matchesDept) {
        // Find matching defect description if available
        const linkedDefect = defects.find(d => d._id === b.linkedDefectId || (b.bundledDefects && b.bundledDefects.includes(d._id)));
        const taskDescription = linkedDefect?.faultDescription || `${b.department} corridor possession & routine maintenance for ${b.assetId}`;
        const wInfo = formatTimeWindow(b.startTime, b.endTime);

        plans.push({
          id: b._id || b.blockCode,
          blockId: b.blockCode || `BLK-${String(b._id).slice(-6).toUpperCase()}`,
          windowTime: wInfo.formatted,
          task: taskDescription,
          taskCode: linkedDefect?.defectCode || b.assetId,
          assetId: b.assetId,
          corridorNo: b.corridorId,
          corridorName: CORRIDOR_METADATA[b.corridorId]?.name || 'Trunk Corridor',
          status: b.status || 'APPROVED',
          statusLabel: b.source === 'AI_OPTIMIZED' ? 'AI Optimized (Approved)' : `${b.status} Possession`,
          department: b.department,
          isSplittable: linkedDefect?.isSplittable || false,
          priority: linkedDefect?.priority || 'MEDIUM'
        });
      }
    });

    // Filter by corridor if selected
    return plans.filter(p => {
      if (selectedCorridorFilter !== 'ALL' && p.corridorNo !== selectedCorridorFilter) return false;
      if (taskSearchQuery && !p.task.toLowerCase().includes(taskSearchQuery.toLowerCase()) && !p.blockId.toLowerCase().includes(taskSearchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [activeRecommendation, blocks, defects, activeDeptObj, effectiveNow, selectedCorridorFilter, taskSearchQuery]);

  // ──────────────────────────────────────────────────────────────────────────
  // 2. TABLE 2: TASKS WHICH NEED TO BE ALLOCATED BLOCK WINDOW
  // Columns: Task/Defect ID, Task Description, Corridor No., Work Zone, Duration, Priority, Status
  // ──────────────────────────────────────────────────────────────────────────
  const unallocatedTasks = useMemo(() => {
    return defects.filter(d => {
      // Must be pending or awaiting allocation
      const isPending = d.status === 'PENDING';
      if (!isPending) return false;

      // Department filter
      const matchesDept =
        activeDeptObj.code === 'COA' ||
        d.source === activeDeptObj.source ||
        activeDeptObj.deptFilter.some(df => d.department?.toLowerCase()?.includes(df.toLowerCase()));

      if (!matchesDept) return false;

      if (selectedCorridorFilter !== 'ALL' && d.corridorId !== selectedCorridorFilter) return false;

      if (taskSearchQuery && !d.faultDescription.toLowerCase().includes(taskSearchQuery.toLowerCase()) && !d.defectCode.toLowerCase().includes(taskSearchQuery.toLowerCase())) {
        return false;
      }

      return true;
    }).sort((a, b) => (b.priorityScore || 50) - (a.priorityScore || 50));
  }, [defects, activeDeptObj, selectedCorridorFilter, taskSearchQuery]);

  // ──────────────────────────────────────────────────────────────────────────
  // 3. TABLE 3: CORRIDOR TIME
  // Columns required: Corridor No., Window Time with Day, Block ID
  // ──────────────────────────────────────────────────────────────────────────
  const corridorTimeRows = useMemo(() => {
    // Base window definitions from server or fallback
    const rawWindows = (corridorWindows && corridorWindows.length > 0) ? corridorWindows : DEFAULT_CORRIDOR_WINDOWS;

    // Expand windows for Today and Tomorrow
    const rows = [];
    const days = ['Today', 'Tomorrow'];

    days.forEach(dayName => {
      // Collect matching windows for this day
      rawWindows.forEach(w => {
        // If window has explicit day, match it; otherwise consider for today/tomorrow
        if (w.day && w.day !== dayName) return;

        // Check if there is an allocated block matching this corridor and window slot
        const matchingBlock = blocks.find(b => {
          if (b.corridorId !== w.corridorId) return false;
          if (!b.startTime) return false;
          const bDate = new Date(b.startTime);
          const isToday = dayName === 'Today';
          // Check day offset
          const todayDate = effectiveNow ? new Date(effectiveNow) : new Date();
          const isSameDay = isToday
            ? bDate.toDateString() === todayDate.toDateString()
            : bDate.getDate() === todayDate.getDate() + 1;

          if (!isSameDay) return false;

          // Check hour proximity
          const [wSHour] = (w.windowStart || '00:00').split(':').map(Number);
          const [wEHour] = (w.windowEnd || '24:00').split(':').map(Number);
          const bStartHour = bDate.getHours();

          return bStartHour >= wSHour - 1 && bStartHour < wEHour;
        });

        // Date string label
        const base = effectiveNow ? new Date(effectiveNow) : new Date();
        if (dayName === 'Tomorrow') base.setDate(base.getDate() + 1);
        const dayFormatted = `${dayName} (${base.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })})`;

        rows.push({
          id: `${w.corridorId}-${dayName}-${w.windowStart}-${w.windowEnd}`,
          corridorNo: w.corridorId,
          corridorName: CORRIDOR_METADATA[w.corridorId]?.name || 'Trunk Route',
          fromStation: CORRIDOR_METADATA[w.corridorId]?.fromStation || '',
          toStation: CORRIDOR_METADATA[w.corridorId]?.toStation || '',
          windowTimeWithDay: `${dayFormatted}, ${w.windowStart} – ${w.windowEnd}`,
          rawDay: dayName,
          blockId: matchingBlock ? matchingBlock.blockCode : null,
          allocatedBlock: matchingBlock || null,
          trafficLevel: w.trafficLevel || 'LOW',
          description: w.description || 'Corridor Maintenance Possession Slot'
        });
      });
    });

    // Also include any Blocks directly scheduled on corridors that might not match standard windows
    blocks.forEach(b => {
      if (!b.startTime || !b.endTime) return;
      const bDate = new Date(b.startTime);
      const todayDate = effectiveNow ? new Date(effectiveNow) : new Date();
      const isToday = bDate.toDateString() === todayDate.toDateString();
      const isTomorrow = bDate.getDate() === todayDate.getDate() + 1;
      const dayName = isToday ? 'Today' : (isTomorrow ? 'Tomorrow' : 'Scheduled Date');

      const alreadyCovered = rows.some(r => r.allocatedBlock?.blockCode === b.blockCode);
      if (!alreadyCovered && (isToday || isTomorrow)) {
        const sTime = bDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const eTime = new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const dayFormatted = `${dayName} (${bDate.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })})`;

        rows.unshift({
          id: `block-${b._id || b.blockCode}`,
          corridorNo: b.corridorId,
          corridorName: CORRIDOR_METADATA[b.corridorId]?.name || 'Trunk Route',
          fromStation: CORRIDOR_METADATA[b.corridorId]?.fromStation || '',
          toStation: CORRIDOR_METADATA[b.corridorId]?.toStation || '',
          windowTimeWithDay: `${dayFormatted}, ${sTime} – ${eTime}`,
          rawDay: dayName,
          blockId: b.blockCode,
          allocatedBlock: b,
          trafficLevel: 'MEDIUM',
          description: `${b.department} Dedicated Block Possession`
        });
      }
    });

    // Apply corridor and day filters
    return rows.filter(r => {
      if (selectedCorridorFilter !== 'ALL' && r.corridorNo !== selectedCorridorFilter) return false;
      if (selectedDayFilter !== 'ALL' && r.rawDay !== selectedDayFilter) return false;
      return true;
    });
  // ──────────────────────────────────────────────────────────────────────────
  // 4. TABLE 4: DEPARTMENT HISTORY & AUDIT TRAIL
  // ──────────────────────────────────────────────────────────────────────────
  const departmentHistoryRows = useMemo(() => {
    const baselineHistory = [
      {
        planVersion: 'PLAN-2026-09-03-01',
        blockCode: 'BLK-COORD-01',
        corridorId: 'COR-01',
        departments: 'Track + Signalling + Traction',
        optimizedWindow: '02:00 - 08:00 (Night Shift)',
        timeSaved: '5.0 Hours Saved',
        status: 'SCHEDULED',
        approvalState: 'APPROVED (Sr. DOM)'
      },
      {
        planVersion: 'PLAN-2026-09-02-04',
        blockCode: 'BLK-COORD-04',
        corridorId: 'COR-02',
        departments: 'Track + Signalling',
        optimizedWindow: '01:30 - 05:30 (Early Night)',
        timeSaved: '3.5 Hours Saved',
        status: 'COMPLETED',
        approvalState: 'APPROVED (Dy. COM)'
      },
      {
        planVersion: 'PLAN-2026-09-01-02',
        blockCode: 'BLK-COORD-02',
        corridorId: 'COR-03',
        departments: 'Traction + Track',
        optimizedWindow: '02:00 - 06:30 (Off-Peak Night)',
        timeSaved: '3.5 Hours Saved',
        status: 'COMPLETED',
        approvalState: 'APPROVED (Sr. DOM)'
      }
    ];

    const dynamicHistory = recommendationHistory.map(r => ({
      planVersion: r.recommendationId,
      blockCode: r.resultingBlockId?.blockCode || 'BLK-HIST',
      corridorId: r.corridorId,
      departments: r.departments?.join(' + ') || 'Track',
      optimizedWindow: `${new Date(r.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} - ${new Date(r.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`,
      timeSaved: r.departments?.length >= 3 ? '5.0 Hours Saved' : '3.0 Hours Saved',
      status: r.status,
      approvalState: r.status === 'ACCEPTED' || r.status === 'SCHEDULED' ? 'APPROVED' : r.status
    }));

    const combined = dynamicHistory.length > 0 ? dynamicHistory : baselineHistory;
    return combined.filter(h => {
      if (activeDeptObj.code === 'COA') return true;
      return activeDeptObj.deptFilter.some(df => h.departments.toLowerCase().includes(df.toLowerCase()));
    });
  }, [recommendationHistory, activeDeptObj]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 text-slate-100 transition-colors">
      
      {/* ── HEADER ── */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className={`font-mono-rail text-xs font-bold px-2.5 py-1 rounded-md border ${activeDeptObj.badgeClass}`}>
                {activeDeptObj.code}
              </span>
              <h1 className="text-lg font-bold font-mono-rail text-slate-100">
                {activeDeptObj.title}
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeDeptObj.subtext}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/optimization')}
              className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-mono-rail font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>Optimization Engine</span>
            </button>
            <button
              onClick={() => navigate('/history')}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono-rail font-bold text-xs border border-slate-700 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>History</span>
            </button>
          </div>
        </div>

        {/* Global Toolbar: Filters & Quick Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-2.5 border-t border-slate-800/60 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono-rail text-slate-400 text-[11px]">CORRIDOR:</span>
            <select
              value={selectedCorridorFilter}
              onChange={e => setSelectedCorridorFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2.5 py-1 text-xs font-mono-rail focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Trunk Corridors (5)</option>
              <option value="COR-01">COR-01: Delhi - Mumbai</option>
              <option value="COR-02">COR-02: Delhi - Howrah</option>
              <option value="COR-03">COR-03: Mumbai - Chennai</option>
              <option value="COR-04">COR-04: Howrah - Chennai</option>
              <option value="COR-05">COR-05: Delhi - Chennai</option>
            </select>

            <span className="font-mono-rail text-slate-400 text-[11px] ml-2">DAY:</span>
            <select
              value={selectedDayFilter}
              onChange={e => setSelectedDayFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs font-mono-rail focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Days (Today & Tomorrow)</option>
              <option value="Today">Today Only</option>
              <option value="Tomorrow">Tomorrow Only</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search by block ID, task, defect..."
              value={taskSearchQuery}
              onChange={e => setTaskSearchQuery(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-3 py-1 text-xs font-mono-rail focus:outline-none focus:border-blue-500 w-56 sm:w-64 placeholder-slate-500"
            />
          </div>
        </div>
      </div>

      {/* ── MAIN SCROLLABLE CONTENT AREA ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Department KPI Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg shadow-xs">
            <span className="font-mono-rail text-[10px] text-slate-400 uppercase tracking-wider">AI Recommended Plans</span>
            <div className="text-xl font-bold font-mono-rail text-blue-400 mt-0.5">
              {recommendedPlans.length}
            </div>
            <span className="text-[10px] text-slate-500">Conflict-free window allocations</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg shadow-xs">
            <span className="font-mono-rail text-[10px] text-slate-400 uppercase tracking-wider">Tasks Awaiting Window</span>
            <div className="text-xl font-bold font-mono-rail text-amber-400 mt-0.5">
              {unallocatedTasks.length}
            </div>
            <span className="text-[10px] text-slate-500">Pending department requests</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg shadow-xs">
            <span className="font-mono-rail text-[10px] text-slate-400 uppercase tracking-wider">Corridor Time Slots</span>
            <div className="text-xl font-bold font-mono-rail text-emerald-400 mt-0.5">
              {corridorTimeRows.length}
            </div>
            <span className="text-[10px] text-slate-500">Evaluated trunk maintenance windows</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg shadow-xs">
            <span className="font-mono-rail text-[10px] text-slate-400 uppercase tracking-wider">Assigned Blocks</span>
            <div className="text-xl font-bold font-mono-rail text-purple-400 mt-0.5">
              {corridorTimeRows.filter(r => r.blockId).length}
            </div>
            <span className="text-[10px] text-slate-500">Occupied safe window possessions</span>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* 1. TABLE 1: TASK PLAN RECOMMENDED BY AI                              */}
        {/* Columns: block id, window time, task, corridor no.                   */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xs">
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
              <h2 className="font-mono-rail font-bold text-sm text-slate-100 tracking-wide uppercase">
                Task Plan Recommended by AI
              </h2>
              <span className="font-mono-rail text-[11px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                {recommendedPlans.length} Recommended Plans
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono-rail">
              Safety Buffer: ±20 min • Punctuality Protected
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 font-mono-rail uppercase text-[10px] tracking-wider border-b border-slate-700">
                  <th className="py-2.5 px-4 font-semibold">Block ID</th>
                  <th className="py-2.5 px-4 font-semibold">Window Time</th>
                  <th className="py-2.5 px-4 font-semibold">Task</th>
                  <th className="py-2.5 px-4 font-semibold">Corridor No.</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono-rail">
                {recommendedPlans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                      No AI recommended plans found for the current department filter.
                      <div className="mt-2">
                        <button
                          onClick={() => navigate('/optimization')}
                          className="text-blue-400 hover:text-blue-300 underline text-xs"
                        >
                          Run Optimization Engine to generate new coordinated windows →
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  recommendedPlans.map((plan, idx) => (
                    <tr key={plan.id || idx} className="hover:bg-slate-800/50 transition-colors">
                      {/* Column 1: Block ID */}
                      <td className="py-3 px-4 font-bold text-blue-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/30">
                            {plan.blockId}
                          </span>
                        </div>
                      </td>

                      {/* Column 2: Window Time */}
                      <td className="py-3 px-4 text-emerald-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium">
                          <span>{plan.windowTime}</span>
                        </div>
                      </td>

                      {/* Column 3: Task */}
                      <td className="py-3 px-4 text-slate-200">
                        <div className="max-w-md">
                          <div className="font-semibold text-slate-100 flex items-center gap-2">
                            <span>{plan.task}</span>
                            {plan.isSplittable && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                SPLITTABLE
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>Defect: {plan.taskCode}</span>
                            <span>•</span>
                            <span>Asset: {plan.assetId}</span>
                            <span>•</span>
                            <span className="text-amber-400 font-bold">{plan.priority} Priority</span>
                          </div>
                        </div>
                      </td>

                      {/* Column 4: Corridor No. */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-200">
                          {plan.corridorNo}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {plan.corridorName}
                        </div>
                      </td>

                      {/* Status / Tag */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          plan.status === 'APPROVED' || plan.status === 'SCHEDULED'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                        }`}>
                          {plan.statusLabel}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* 2. TABLE 2: LIST OF TASKS WHICH NEED TO BE ALLOCATED BLOCK WINDOW   */}
        {/* Placed below Table 1, as explicitly requested                        */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xs">
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
              <h2 className="font-mono-rail font-bold text-sm text-slate-100 tracking-wide uppercase">
                List of Tasks Which Need to be Allocated Block Window
              </h2>
              <span className="font-mono-rail text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                {unallocatedTasks.length} Pending Tasks
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono-rail">
              Ranked by Explainable Multi-Factor Priority Score
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 font-mono-rail uppercase text-[10px] tracking-wider border-b border-slate-700">
                  <th className="py-2.5 px-4 font-semibold">Task ID</th>
                  <th className="py-2.5 px-4 font-semibold">Task Description</th>
                  <th className="py-2.5 px-4 font-semibold">Corridor No.</th>
                  <th className="py-2.5 px-4 font-semibold">Work Zone / Asset</th>
                  <th className="py-2.5 px-4 font-semibold">Required Duration</th>
                  <th className="py-2.5 px-4 font-semibold">Priority & Score</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono-rail">
                {unallocatedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                      All maintenance tasks for this department are allocated or resolved. No pending block requests.
                    </td>
                  </tr>
                ) : (
                  unallocatedTasks.map((task, idx) => (
                    <tr key={task._id || idx} className="hover:bg-slate-800/50 transition-colors">
                      {/* Task ID */}
                      <td className="py-3 px-4 font-bold text-amber-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                            {task.defectCode}
                          </span>
                        </div>
                      </td>

                      {/* Task Description */}
                      <td className="py-3 px-4 text-slate-200">
                        <div className="max-w-md">
                          <span className="font-semibold text-slate-100">{task.faultDescription}</span>
                          {task.preferredStartHour != null && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Preferred window hour: {String(task.preferredStartHour).padStart(2, '0')}:00 hrs
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Corridor No. */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-200">
                          {task.corridorId || 'COR-01'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {CORRIDOR_METADATA[task.corridorId]?.name || 'Trunk Corridor'}
                        </div>
                      </td>

                      {/* Work Zone / Asset */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                        <div className="font-medium text-slate-200">{task.workZone || 'Zone-A'}</div>
                        <div className="text-[10px] text-slate-400">{task.assetId}</div>
                      </td>

                      {/* Required Duration */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-100">
                          {task.estimatedDurationHrs || 2.0} hrs
                        </div>
                        {task.isSplittable && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Splittable
                          </span>
                        )}
                      </td>

                      {/* Priority & Score */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            task.priority === 'CRITICAL'
                              ? 'bg-red-500/20 text-red-400 border-red-500/30'
                              : task.priority === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                              : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          }`}>
                            {task.priority}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            ({task.priorityScore || 50}/100)
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          Awaiting Block Window
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => navigate('/optimization')}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 border border-slate-700 text-[10px] font-bold transition-all cursor-pointer"
                        >
                          Allocate Window →
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* 3. TABLE 3: CORRIDOR TIME                                            */}
        {/* Columns: corridor no., window time with day, block id                 */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xs">
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
              <h2 className="font-mono-rail font-bold text-sm text-slate-100 tracking-wide uppercase">
                Corridor Time
              </h2>
              <span className="font-mono-rail text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {corridorTimeRows.length} Window Slots Evaluated
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono-rail text-slate-400">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Allocated Block</span>
              <span className="inline-block w-2 h-2 rounded-full bg-slate-600 ml-2"></span>
              <span>Available Window</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 font-mono-rail uppercase text-[10px] tracking-wider border-b border-slate-700">
                  <th className="py-2.5 px-4 font-semibold">Corridor No.</th>
                  <th className="py-2.5 px-4 font-semibold">Window Time with Day</th>
                  <th className="py-2.5 px-4 font-semibold">Block ID</th>
                  <th className="py-2.5 px-4 font-semibold">Traffic Condition</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Window Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono-rail">
                {corridorTimeRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                      No corridor windows match the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  corridorTimeRows.map((row, idx) => (
                    <tr key={row.id || idx} className="hover:bg-slate-800/50 transition-colors">
                      {/* Column 1: Corridor No. */}
                      <td className="py-3 px-4 font-bold whitespace-nowrap">
                        <div className="text-slate-100 font-mono-rail text-xs">
                          {row.corridorNo}
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans">
                          {row.corridorName} ({row.fromStation} → {row.toStation})
                        </div>
                      </td>

                      {/* Column 2: Window Time with Day */}
                      <td className="py-3 px-4 text-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium text-emerald-400">
                          <span>{row.windowTimeWithDay}</span>
                        </div>
                      </td>

                      {/* Column 3: Block ID */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {row.blockId ? (
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              {row.blockId}
                            </span>
                            {row.allocatedBlock?.department && (
                              <span className="text-[10px] text-slate-400">
                                ({row.allocatedBlock.department})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                            AVAILABLE (Unallocated)
                          </span>
                        )}
                      </td>

                      {/* Traffic Condition */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${
                          row.trafficLevel === 'LOW'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : row.trafficLevel === 'MEDIUM'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}>
                          {row.trafficLevel} Traffic
                        </span>
                      </td>

                      {/* Window Purpose */}
                      <td className="py-3 px-4 text-right text-slate-400 text-[11px] whitespace-nowrap">
                        {row.description}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* 4. TABLE 4: DEPARTMENT HISTORY TABLE                                  */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xs">
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-500"></div>
              <h2 className="font-mono-rail font-bold text-sm text-slate-100 tracking-wide uppercase">
                {activeDeptObj.code} Execution &amp; Planning History
              </h2>
              <span className="font-mono-rail text-[11px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                {departmentHistoryRows.length} Historical Records
              </span>
            </div>
            <button
              onClick={() => navigate('/history')}
              className="text-xs text-blue-400 hover:text-blue-300 font-mono-rail underline cursor-pointer"
            >
              Open Full Audit Ledger
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 font-mono-rail uppercase text-[10px] tracking-wider border-b border-slate-700">
                  <th className="py-2.5 px-4 font-semibold">Plan Version</th>
                  <th className="py-2.5 px-4 font-semibold">Block ID</th>
                  <th className="py-2.5 px-4 font-semibold">Corridor No.</th>
                  <th className="py-2.5 px-4 font-semibold">Departments Coordinated</th>
                  <th className="py-2.5 px-4 font-semibold">Optimized Window</th>
                  <th className="py-2.5 px-4 font-semibold">Savings</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Approval Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono-rail">
                {departmentHistoryRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                      No past records found for this department.
                    </td>
                  </tr>
                ) : (
                  departmentHistoryRows.map((h, idx) => (
                    <tr key={h.planVersion || idx} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-cyan-400 whitespace-nowrap">
                        {h.planVersion}
                      </td>
                      <td className="py-3 px-4 text-slate-200 font-bold whitespace-nowrap">
                        {h.blockCode}
                      </td>
                      <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                        {h.corridorId}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30 text-[9px]">
                          {h.departments}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-emerald-400 whitespace-nowrap">
                        {h.optimizedWindow}
                      </td>
                      <td className="py-3 px-4 text-amber-400 font-bold whitespace-nowrap">
                        {h.timeSaved}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px]">
                          {h.approvalState}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
