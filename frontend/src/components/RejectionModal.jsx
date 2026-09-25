import React, { useState } from 'react';

const PRESET_REASONS = [
  'Priority Freight Rake Transit (Bulk Cargo/Coal dispatch)',
  'Track Maintenance Gang / Crew Mobilization Delay',
  'Adverse Weather Condition / Speed Restriction Active',
  'Inter-Zonal Timetable Adjustment Requested by Division',
  'Rolling Stock Depot Inspection Conflict'
];

export default function RejectionModal({
  isOpen,
  onClose,
  onSubmit,
  title = 'Reject AI Recommended Package',
  targetName = 'CAND-02 (COR-01 Coordinated Block 02:00–08:00)',
  isLoading = false
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason for rejecting this maintenance package.');
      return;
    }
    setError('');
    onSubmit(reason.trim());
  };

  const handleSelectPreset = (preset) => {
    setReason(preset);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg p-6 flex flex-col gap-4 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center font-mono-rail font-bold text-xs">
              REJ
            </div>
            <div>
              <h3 className="font-mono-rail text-sm font-bold text-slate-100">
                {title}
              </h3>
              <p className="font-mono-rail text-[10px] text-slate-400 mt-0.5">
                Target: <span className="text-amber-400 font-bold">{targetName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 font-mono-rail text-sm p-1 rounded-md hover:bg-slate-800 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Preset Chips */}
        <div className="flex flex-col gap-1.5">
          <label className="font-mono-rail text-[10px] text-slate-400 uppercase tracking-wider font-bold">
            Select Quick Reason / Preset:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_REASONS.map((pr, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(pr)}
                className={`font-mono-rail text-[9px] px-2.5 py-1 rounded-lg border transition-all text-left cursor-pointer ${
                  reason === pr
                    ? 'bg-red-500/20 text-red-300 border-red-500/50 font-bold'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                {pr}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Textarea */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="font-mono-rail text-[10px] text-slate-400 uppercase tracking-wider font-bold">
              Operator Justification / Rejection Notes:
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              rows={4}
              placeholder="Enter detailed operational reason for rejecting this block proposal..."
              className="w-full bg-slate-950 border border-slate-700 focus:border-red-500 text-slate-100 rounded-xl p-3 font-mono-rail text-xs focus:outline-none transition-colors resize-none placeholder:text-slate-600"
            />
            {error && (
              <span className="font-mono-rail text-[10px] text-red-400">
                {error}
              </span>
            )}
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-[9px] font-mono-rail text-slate-400">
            Audit Notice: This rejection will be permanently stamped in the Operations Audit Ledger with your Operator ID and timestamp.
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg font-mono-rail text-xs text-slate-300 hover:bg-slate-800 border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !reason.trim()}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono-rail text-xs font-bold uppercase tracking-wider transition-colors shadow-md cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'Recording Rejection...' : 'Confirm & Record Rejection'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
