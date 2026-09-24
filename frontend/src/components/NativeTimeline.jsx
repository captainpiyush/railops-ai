import React, { useState, useMemo } from 'react';

export default function NativeTimeline({
  blocks = [],
  schedules = [],
  selectedCorridor = 'COR-01',
  targetDate: propTargetDate,
  selectedDayOffset = 0,
  onBlockClick,
  setActiveConflict,
  nowPct = 0,
}) {
  const [selectedBlock, setSelectedBlock] = useState(null);

  const filterDate = useMemo(() => {
    const d = propTargetDate ? new Date(propTargetDate) : new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, [propTargetDate]);

  const filterDateEnd = useMemo(() => {
    const d = new Date(filterDate);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [filterDate]);

  const ALL_CORRIDORS = [
    { id: 'COR-01', label: 'Delhi – Mumbai', short: 'NDLS→CSMT' },
    { id: 'COR-02', label: 'Delhi – Howrah', short: 'NDLS→HWH' },
    { id: 'COR-03', label: 'Mumbai – Chennai', short: 'CSMT→MAS' },
    { id: 'COR-04', label: 'Howrah – Chennai', short: 'HWH→MAS' },
    { id: 'COR-05', label: 'Delhi – Chennai', short: 'NDLS→MAS' },
  ];

  // Corridors to display based on filter
  const visibleCorridors = useMemo(() => {
    if (selectedCorridor === 'ALL') return ALL_CORRIDORS;
    const found = ALL_CORRIDORS.filter(c => c.id === selectedCorridor);
    return found.length > 0 ? found : ALL_CORRIDORS;
  }, [selectedCorridor]);

  // Filter blocks for date and exclude completed/cancelled on Today
  const dayBlocks = useMemo(() => {
    return blocks.filter((b) => {
      if (!b.startTime) return false;
      const s = new Date(b.startTime);
      const e = new Date(b.endTime);
      const inDay = s <= filterDateEnd && e >= filterDate;
      if (!inDay) return false;

      const status = (b.status || '').toUpperCase();
      if (selectedDayOffset === 0) {
        // Today / Live Schedule: hide completed & cancelled
        return !['COMPLETED', 'CANCELLED'].includes(status);
      }
      return true;
    });
  }, [blocks, filterDate, filterDateEnd, selectedDayOffset]);

  // Identify genuine overlapping conflict blocks based on: Same Corridor + Overlapping Time + Same Operational Track
  const conflictMap = useMemo(() => {
    const map = new Map();
    for (let i = 0; i < dayBlocks.length; i++) {
      for (let j = i + 1; j < dayBlocks.length; j++) {
        const a = dayBlocks[i];
        const b = dayBlocks[j];
        if (a.corridorId === b.corridorId || a.assetId === b.assetId) {
          const aS = new Date(a.startTime).getTime();
          const aE = new Date(a.endTime).getTime();
          const bS = new Date(b.startTime).getTime();
          const bE = new Date(b.endTime).getTime();
          if (aS < bE && bS < aE) {
            // Semantic Track Evaluation
            const aTrack = a.track || 'UP Main';
            const bTrack = b.track || 'UP Main';
            const sameTrack = aTrack === bTrack || aTrack === 'Both Tracks' || bTrack === 'Both Tracks';
            if (sameTrack || a.assetId === b.assetId) {
              const overlapMins = Math.round((Math.min(aE, bE) - Math.max(aS, bS)) / 60000);
              map.set(a._id || a.blockCode, overlapMins);
              map.set(b._id || b.blockCode, overlapMins);
            }
          }
        }
      }
    }
    return map;
  }, [dayBlocks]);

  function getPosition(startTime, endTime) {
    const dayStart = new Date(filterDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(24, 0, 0, 0);

    const s = new Date(startTime);
    const e = new Date(endTime);

    const clampedStart = s < dayStart ? dayStart : s;
    const clampedEnd = e > dayEnd ? dayEnd : e;

    const startMinutes = (clampedStart - dayStart) / 60000;
    const durationMinutes = (clampedEnd - clampedStart) / 60000;

    const leftPct = (startMinutes / (24 * 60)) * 100;
    const widthPct = (durationMinutes / (24 * 60)) * 100;

    return {
      left: Math.max(0, Math.min(100, leftPct)),
      width: Math.max(2, Math.min(100 - leftPct, widthPct)),
    };
  }

  function getDeptBadge(dept) {
    const d = {
      Track: { label: 'Track', bg: 'bg-amber-500/20 border-amber-400/50 text-amber-300' },
      Signalling: { label: 'Signal', bg: 'bg-blue-500/20 border-blue-400/50 text-blue-300' },
      Traction: { label: 'Traction', bg: 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300' },
      'Rolling Stock': { label: 'R-Stock', bg: 'bg-violet-500/20 border-violet-400/50 text-violet-300' },
      Electrical: { label: 'Elect', bg: 'bg-teal-500/20 border-teal-400/50 text-teal-300' },
    };
    return d[dept] || { label: dept || 'Maint', bg: 'bg-slate-600/30 border-slate-500 text-slate-300' };
  }

  // AI Block Golden Demo visibility
  const showAiBlockOnCor01 = selectedDayOffset === 0;

  return (
    <div className="flex flex-col gap-2 bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 shadow-md">
      {/* Subheader */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          <span className="font-mono-rail text-[11px] font-bold text-slate-200 uppercase tracking-wider">
            MAINTENANCE BLOCK POSSESSION SCHEDULE
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono-rail text-[9px] text-slate-400">
          <span>
            Corridor: <strong className="text-slate-200">{selectedCorridor === 'ALL' ? 'All Trunks' : selectedCorridor}</strong>
          </span>
          <span>
            Showing: <strong className="text-emerald-400">
              {selectedCorridor === 'ALL'
                ? `${dayBlocks.length + (showAiBlockOnCor01 ? 1 : 0)} relevant maintenance blocks`
                : `${dayBlocks.filter(b => b.corridorId === selectedCorridor).length + (showAiBlockOnCor01 ? 1 : 0)} relevant maintenance blocks`}
            </strong>
          </span>
        </div>
      </div>

      {/* Corridor Track Rows */}
      <div className="flex flex-col gap-1.5">
        {visibleCorridors.map((corridor) => {
          const corridorBlocks = dayBlocks.filter((b) => b.corridorId === corridor.id);
          const isCor01 = corridor.id === 'COR-01';

          return (
            <div key={corridor.id} className="flex items-center gap-0">
              {/* Corridor Label Box (Synchronized w-36 width) */}
              <div className="w-36 flex-shrink-0 pr-2">
                <div className="font-mono-rail text-[9px] text-slate-200 font-bold truncate">
                  {corridor.label}
                </div>
                <div className="font-mono-rail text-[8px] text-slate-500 flex items-center gap-1">
                  <span>{corridor.short}</span>
                  {isCor01 && (
                    <span className="text-[7px] text-emerald-400 bg-emerald-500/10 px-1 rounded">
                      Demo Trunk
                    </span>
                  )}
                </div>
              </div>

              {/* 24-Hour Track Timeline Lane (Normal dark styling - NEVER turn whole row red!) */}
              <div className="flex-1 relative bg-slate-950/90 border border-slate-800 rounded overflow-hidden h-9">
                {/* 2-Hour Grid Intervals */}
                {[2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22].map((h) => (
                  <div
                    key={h}
                    className="absolute top-0 bottom-0 border-l border-slate-800/60"
                    style={{ left: `${(h / 24) * 100}%` }}
                  />
                ))}

                {/* Dynamic NOW Marker Line */}
                {selectedDayOffset === 0 && (
                  <div
                    className="absolute top-0 bottom-0 border-l border-emerald-400/90 z-20 pointer-events-none"
                    style={{ left: `${nowPct}%` }}
                  />
                )}

                {/* 1. AI RECOMMENDED BUNDLED BLOCK ON COR-01 */}
                {isCor01 && showAiBlockOnCor01 && (
                  <div
                    onClick={() =>
                      setSelectedBlock({
                        isAi: true,
                        blockCode: 'CAND-02 (AI RECOMMENDED)',
                        corridorId: 'COR-01',
                        department: 'Track + Signalling + Traction',
                        timeLabel: '02:00 – 08:00',
                        startTimeStr: '02:00',
                        endTimeStr: '08:00',
                        durationHrs: '6.0h',
                        score: 78,
                        status: 'AI_RECOMMENDED',
                        linkedDefects: ['DEF-0101 (Track 4h)', 'DEF-0102 (Signalling 2h)', 'DEF-0103 (Traction 2h)'],
                        timeSaved: '5.0h Saved',
                        hasConflict: false,
                      })
                    }
                    className="absolute top-1 bottom-1 rounded border-2 border-emerald-400 bg-emerald-500/25 text-emerald-200 flex items-center px-1.5 overflow-hidden cursor-pointer shadow-md shadow-emerald-950/50 hover:scale-[1.02] hover:z-30 transition-all animate-pulse group"
                    style={{
                      left: `${(2 / 24) * 100}%`,
                      width: `${(6 / 24) * 100}%`,
                      zIndex: 25,
                    }}
                    title="AI RECOMMENDED: 02:00–08:00 | Track + Signalling + Traction (6h, Score 78, Feasible)"
                  >
                    <span className="font-mono-rail text-[8px] font-extrabold truncate leading-none flex items-center gap-1">
                      <span className="bg-emerald-500 text-slate-950 px-1 py-0.2 rounded text-[7px] font-black">
                        AI BLOCK
                      </span>
                      <span>02:00–08:00 (Track+Sig+Trac · 6h)</span>
                    </span>
                  </div>
                )}

                {/* 2. REGULAR OPERATIONAL MAINTENANCE BLOCKS */}
                {corridorBlocks.length === 0 && (!isCor01 || !showAiBlockOnCor01) ? (
                  <div className="absolute inset-0 flex items-center px-2 font-mono-rail text-[8px] text-slate-700">
                    NO MAINTENANCE SCHEDULED
                  </div>
                ) : (
                  corridorBlocks.map((block, idx) => {
                    const { left, width } = getPosition(block.startTime, block.endTime);
                    const overlapMins = conflictMap.get(block._id || block.blockCode);
                    const hasConflict = Boolean(overlapMins);

                    const sH = new Date(block.startTime).getHours();
                    const sM = new Date(block.startTime).getMinutes();
                    const eH = new Date(block.endTime).getHours();
                    const eM = new Date(block.endTime).getMinutes();
                    const timeLabel = `${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}–${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}`;

                    const deptInfo = getDeptBadge(block.department);

                    // Block coloring: Conflict = RED BORDER on this block only!
                    let blockStyle = 'bg-slate-800/90 border border-slate-600 text-slate-200';
                    if (hasConflict) {
                      blockStyle = 'bg-red-500/25 border-2 border-red-500 text-red-300 ring-1 ring-red-400';
                    } else if (block.status === 'ACTIVE') {
                      blockStyle = 'bg-emerald-600/30 border border-emerald-400/80 text-emerald-200';
                    } else if (block.status === 'APPROVED') {
                      blockStyle = 'bg-cyan-600/30 border border-cyan-400/80 text-cyan-200';
                    }

                    return (
                      <div
                        key={block._id || idx}
                        onClick={() => {
                          if (hasConflict && setActiveConflict) {
                            setActiveConflict(block);
                          }
                          const sTime = new Date(block.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                          const eTime = new Date(block.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                          const durHrs = ((new Date(block.endTime) - new Date(block.startTime)) / 3600000).toFixed(1);

                          const bTrack = block.track || (block.department === 'Traction' ? 'DN Main' : 'UP Main');
                          const bStart = new Date(block.startTime).getTime();
                          const bEnd = new Date(block.endTime).getTime();

                          // Find any train overlapping in time on same corridor
                          const overlappingTrains = schedules.filter((t) => {
                            if (t.corridorId !== block.corridorId) return false;
                            const tDep = new Date(t.departureTime).getTime();
                            const tArr = new Date(t.arrivalTime).getTime();
                            return bStart < tArr && bEnd > tDep;
                          });

                          let isSeparated = false;
                          let conflictReason = 'No overlapping operational movements on corridor.';

                          if (hasConflict) {
                            conflictReason = `Same operational resource (${bTrack}) + overlapping time (${overlapMins}m overlap). Simultaneous track possession fouls line.`;
                          } else if (overlappingTrains.length > 0) {
                            const firstTrain = overlappingTrains[0];
                            const tTrack = firstTrain.track || (firstTrain.trainType === 'Goods' ? 'DN Main' : 'UP Main');
                            if (tTrack !== bTrack) {
                              isSeparated = true;
                              conflictReason = `Separated operational resource / track. Maintenance block is isolated on ${bTrack} while Train ${firstTrain.trainNumber} operates on parallel ${tTrack}. Double-line bi-directional signalling allows safe passage without catenary de-energization or fouling conflict.`;
                            } else {
                              conflictReason = `Same operational resource (${bTrack}) + overlapping time with Train ${firstTrain.trainNumber}.`;
                            }
                          }

                          setSelectedBlock({
                            isAi: false,
                            blockCode: block.blockCode || block._id?.substring(0, 8),
                            department: block.department,
                            corridorId: block.corridorId,
                            track: bTrack,
                            timeLabel,
                            startTimeStr: sTime,
                            endTimeStr: eTime,
                            durationHrs: `${durHrs}h`,
                            status: block.status || 'SCHEDULED',
                            assetId: block.assetId,
                            linkedDefects: block.linkedDefectId ? [block.linkedDefectId] : ['ROUTINE-MAINT-01'],
                            hasConflict,
                            overlapMins,
                            isSeparated,
                            conflictReason,
                          });
                        }}
                        className={`absolute top-1 bottom-1 rounded ${blockStyle} flex items-center px-1.5 overflow-hidden cursor-pointer shadow-sm hover:scale-105 hover:z-30 transition-all group`}
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          zIndex: hasConflict ? 22 : 12 + idx,
                        }}
                        title={`${block.blockCode || 'Block'} | ${block.department} | ${timeLabel}${hasConflict ? ` [CONFLICT: ${overlapMins}m]` : ''}`}
                      >
                        <span className="font-mono-rail text-[8px] font-bold truncate leading-none flex items-center gap-1">
                          {hasConflict && (
                            <span className="text-red-400 font-extrabold animate-pulse">!</span>
                          )}
                          <span>{block.blockCode || 'BLK'}</span>
                          <span className="opacity-80">({deptInfo.label})</span>
                          {width > 8 && <span className="opacity-70 text-[7px]">{timeLabel}</span>}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Block Detail Modal */}
      {selectedBlock && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full p-4 shadow-2xl flex flex-col gap-3 font-mono-rail">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-100">
                  {selectedBlock.isAi ? 'AI RECOMMENDED BLOCK' : `MAINTENANCE: ${selectedBlock.blockCode}`}
                </span>
              </div>
              <button
                onClick={() => setSelectedBlock(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold cursor-pointer"
              >
                X
              </button>
            </div>

            <div className="flex flex-col gap-2 text-[10px]">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Block Code:</span>
                <span className="font-bold text-slate-100">{selectedBlock.blockCode}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Department:</span>
                <span className="font-bold text-cyan-300">{selectedBlock.department}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Corridor Route:</span>
                <span className="text-slate-200 font-bold">{selectedBlock.corridorId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Operational Track:</span>
                <span className="text-amber-300 font-bold">{selectedBlock.track || 'UP Main'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Scheduled Start / End:</span>
                <span className="text-emerald-400 font-bold">{selectedBlock.startTimeStr} → {selectedBlock.endTimeStr}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Duration:</span>
                <span className="text-slate-200 font-bold">{selectedBlock.durationHrs || selectedBlock.timeLabel}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Operational Status:</span>
                <span className="text-emerald-400 font-bold uppercase">{selectedBlock.status || 'SCHEDULED'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Linked Defects:</span>
                <span className="text-slate-300 font-bold">
                  {selectedBlock.linkedDefects ? selectedBlock.linkedDefects.join(', ') : 'DEF-ROUTINE-01'}
                </span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[9px]">Conflict Evaluation:</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                    selectedBlock.hasConflict
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {selectedBlock.hasConflict
                      ? `CONFLICT (${selectedBlock.track || 'UP Main'})`
                      : selectedBlock.isSeparated
                      ? 'CLEAR (Separated Track)'
                      : 'CLEAR'}
                  </span>
                </div>
                <div className={`p-2 rounded border text-[9px] leading-relaxed ${
                  selectedBlock.hasConflict
                    ? 'bg-red-950/40 border-red-500/40 text-red-200'
                    : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}>
                  {selectedBlock.conflictReason || 'No concurrent movements or possessions scheduled on this track.'}
                </div>
              </div>
              {selectedBlock.isAi && (
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-300 text-[9px] flex flex-col gap-1">
                  <div className="font-bold">Validated Constraint Engine Score: {selectedBlock.score}/100</div>
                  <div className="text-amber-300 font-bold">{selectedBlock.timeSaved} vs separate uncoordinated blocks</div>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedBlock(null)}
              className="mt-1 w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
