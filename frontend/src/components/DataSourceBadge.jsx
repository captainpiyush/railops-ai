import { useNavigate } from 'react-router-dom';

export default function DataSourceBadge({ source, clickable = false }) {
  const navigate = useNavigate();

  let classes = '';
  let deptKey = 'tms';

  switch(source) {
    case 'TMS':
    case 'TRK':
      classes = 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      deptKey = 'tms';
      break;
    case 'SMMS':
    case 'SIG':
      classes = 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
      deptKey = 'smms';
      break;
    case 'TDMS':
    case 'OHE':
      classes = 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      deptKey = 'tdms';
      break;
    case 'BDMS':
      classes = 'bg-teal-500/20 text-teal-400 border border-teal-500/30';
      deptKey = 'bdms';
      break;
    case 'COA':
      classes = 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
      deptKey = 'coa';
      break;
    default:
      classes = 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
      deptKey = 'tms';
  }

  const handleClick = (e) => {
    if (clickable) {
      e.stopPropagation();
      navigate(`/department/${deptKey}`);
    }
  };

  return (
    <span
      onClick={clickable ? handleClick : undefined}
      className={`font-mono-rail text-[8px] px-2 py-0.5 rounded-full ${classes} ${
        clickable ? 'cursor-pointer hover:opacity-80' : ''
      }`}
    >
      {source}
    </span>
  );
}
