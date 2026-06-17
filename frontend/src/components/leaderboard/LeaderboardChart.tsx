'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';
import {
  FiChevronDown,
  FiTrendingUp,
  FiTrendingDown,
  FiType,
  FiBarChart2,
  FiActivity,
  FiAward,
  FiZap,
  FiLayers
} from 'react-icons/fi';

interface LeaderboardChartProps {
  users: any[];
}

import { useLang } from '@/context/LangContext';

interface LeaderboardChartProps {
  users: any[];
}

// Custom Animated Dropdown Selector Component
function CustomDropdown({
  options,
  selectedValue,
  onChange,
  labelPrefix = ''
}: {
  options: { value: string; label: string; icon: React.ReactNode }[];
  selectedValue: string;
  onChange: (val: string) => void;
  labelPrefix?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === selectedValue) || options[0];

  return (
    <div className="relative z-30" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="custom-chart-dropdown-btn flex items-center gap-2 rounded-xl bg-[#01030b] border border-[#ffba08]/10 px-3.5 py-2 text-xs font-black text-[#fff1ce] transition-all duration-300 hover:border-[#e85d04]/40 hover:bg-[#370617]/20 outline-none select-none shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
      >
        <span className="flex items-center gap-1.5">
          {selectedOption.icon}
          <span>{labelPrefix}{selectedOption.label}</span>
        </span>
        <FiChevronDown className={`w-3.5 h-3.5 text-[#fff1ce]/50 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#e85d04]' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="custom-chart-dropdown-menu absolute right-0 mt-1.5 w-48 origin-top-right rounded-xl border border-[#e85d04]/20 bg-[#010106] p-1.5 shadow-[0_15px_40px_rgba(0,0,0,0.85)] focus:outline-none backdrop-blur-md"
          >
            <div className="space-y-1">
              {options.map((opt) => {
                const isSelected = opt.value === selectedValue;
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`custom-chart-dropdown-item flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold transition-all duration-200 ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#6a040f] to-[#e85d04] text-white shadow-[0_4px_12px_rgba(232,93,4,0.3)]'
                        : 'text-[#fff1ce]/70 hover:bg-[#370617]/20 hover:text-[#fff1ce]'
                    }`}
                  >
                    <span className="flex-shrink-0">{opt.icon}</span>
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LeaderboardChart({ users }: LeaderboardChartProps) {
  const { t } = useLang();
  const [chartType, setChartType] = useState<'bar' | 'area' | 'line'>('bar');
  const [sortBy, setSortBy] = useState<'top10' | 'bottom10' | 'level' | 'streak' | 'alphabetical'>('top10');

  const SORT_OPTIONS = [
    { value: 'top10', label: t('lb.chart.top10'), icon: <FiTrendingUp className="text-emerald-400" /> },
    { value: 'bottom10', label: t('lb.chart.bottom10'), icon: <FiTrendingDown className="text-rose-400" /> },
    { value: 'level', label: t('lb.chart.level10'), icon: <FiAward className="text-yellow-400" /> },
    { value: 'streak', label: t('lb.chart.streak10'), icon: <FiZap className="text-orange-400" /> },
    { value: 'alphabetical', label: t('lb.chart.alphabetical'), icon: <FiType className="text-blue-400" /> },
  ];

  const CHART_TYPES = [
    { value: 'bar', label: t('lb.chart.bar'), icon: <FiBarChart2 className="text-sky-400" /> },
    { value: 'area', label: t('lb.chart.area'), icon: <FiLayers className="text-[#e85d04]" /> },
    { value: 'line', label: t('lb.chart.line'), icon: <FiActivity className="text-[#ffba08]" /> },
  ];

  if (!users || !users.length) return null;

  // Helper to extract clean display name
  const getDisplayName = (u: any) => {
    const userObj = u.user || u;
    const fullName = [userObj?.firstName, userObj?.lastName].map(s => s?.trim()).filter(Boolean).join(' ');
    return fullName || userObj?.username || 'Foydalanuvchi';
  };

  // Clone and sort the users dataset based on current dropdown selection
  const dataCopy = [...users];
  let sortedUsers = [];

  if (sortBy === 'top10') {
    sortedUsers = dataCopy.sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 10);
  } else if (sortBy === 'bottom10') {
    sortedUsers = dataCopy.sort((a, b) => (a.xp || 0) - (b.xp || 0)).slice(0, 10);
  } else if (sortBy === 'level') {
    sortedUsers = dataCopy.sort((a, b) => (b.level || 0) - (a.level || 0)).slice(0, 10);
  } else if (sortBy === 'streak') {
    sortedUsers = dataCopy.sort((a, b) => (b.streak || 0) - (a.streak || 0)).slice(0, 10);
  } else if (sortBy === 'alphabetical') {
    sortedUsers = dataCopy.slice(0, 10).sort((a, b) => {
      return getDisplayName(a).localeCompare(getDisplayName(b));
    });
  }

  // Format into chart payload
  const chartData = sortedUsers.map((u, index) => {
    let val = 0;
    let label = 'XP';

    if (sortBy === 'level') {
      val = u.level || 1;
      label = t('profile.stat.level');
    } else if (sortBy === 'streak') {
      val = u.streak || 0;
      label = t('general.streak');
    } else {
      val = u.xp || 0;
      label = 'XP';
    }

    return {
      name: getDisplayName(u),
      value: val,
      label: label,
      rank: u.rank || index + 1
    };
  });

  // Custom premium dark tooltip card matching platform aesthetics
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#010106]/95 border border-[#ffba08]/10 px-3.5 py-2.5 rounded-xl shadow-[0_15px_50px_rgba(0,0,0,0.8)] backdrop-blur-md">
          <p className="text-xs font-black text-white">{data.name}</p>
          <p className="text-[11px] text-[#ffba08] font-semibold mt-1">{t('lb.rating')}: #{data.rank}</p>
          <p className="text-xs font-black text-[#e85d04] mt-0.5">{data.value.toLocaleString()} {data.label}</p>
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const axisColor = 'var(--recharts-axis-color, #ffba08)';
    
    // Performance optimization: Render only the chosen chart DOM nodes
    switch (chartType) {
      case 'area':
        return (
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#e85d04" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#370617" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="name"
              stroke={axisColor}
              strokeOpacity={0.4}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              dy={10}
              tickFormatter={(val) => (val.length > 10 ? `${val.substring(0, 10)}...` : val)}
            />
            <YAxis
              stroke={axisColor}
              strokeOpacity={0.4}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              dx={-5}
              tickFormatter={(val) => {
                if (sortBy === 'level' || sortBy === 'streak') return val;
                return val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val;
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e85d04', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#e85d04"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#areaGradient)"
            />
          </AreaChart>
        );
      case 'line':
        return (
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
            <XAxis
              dataKey="name"
              stroke={axisColor}
              strokeOpacity={0.4}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              dy={10}
              tickFormatter={(val) => (val.length > 10 ? `${val.substring(0, 10)}...` : val)}
            />
            <YAxis
              stroke={axisColor}
              strokeOpacity={0.4}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              dx={-5}
              tickFormatter={(val) => {
                if (sortBy === 'level' || sortBy === 'streak') return val;
                return val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val;
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e85d04', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#e85d04"
              strokeWidth={3}
              dot={{ r: 4, fill: '#ffba08', stroke: '#01030b', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#faa307', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </LineChart>
        );
      case 'bar':
      default:
        return (
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e85d04" stopOpacity={1} />
                <stop offset="100%" stopColor="#370617" stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="name"
              stroke={axisColor}
              strokeOpacity={0.4}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              dy={10}
              tickFormatter={(val) => (val.length > 10 ? `${val.substring(0, 10)}...` : val)}
            />
            <YAxis
              stroke={axisColor}
              strokeOpacity={0.4}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              dx={-5}
              tickFormatter={(val) => {
                if (sortBy === 'level' || sortBy === 'streak') return val;
                return val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val;
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(232, 93, 4, 0.03)' }} />
            <Bar
              dataKey="value"
              fill="url(#barGradient)"
              radius={[6, 6, 0, 0]}
              maxBarSize={32}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  className="transition-all duration-300 hover:opacity-80" 
                />
              ))}
            </Bar>
          </BarChart>
        );
    }
  };

  return (
    <div className="relative w-full rounded-2xl bg-[#01030b] p-4 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8),0_20px_80px_-20px_rgba(55,6,23,0.25)] mb-6 border border-[#ffba08]/5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h3 className="text-xs font-black tracking-wider uppercase text-[#fff1ce]/50 flex items-center gap-2">
          <FiBarChart2 className="text-[#e85d04] text-base" /> {t('lb.chart.title')}
        </h3>
        
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Custom Sorting Dropdown */}
          <CustomDropdown 
            options={SORT_OPTIONS} 
            selectedValue={sortBy} 
            onChange={(val) => setSortBy(val as any)}
          />

          {/* Custom Chart Type Dropdown */}
          <CustomDropdown 
            options={CHART_TYPES} 
            selectedValue={chartType} 
            onChange={(val) => setChartType(val as any)}
          />
        </div>
      </div>

      <div className="w-full" style={{ height: '300px' }}>
        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
