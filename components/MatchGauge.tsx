
import React from 'react';

interface MatchGaugeProps {
  score: number;
}

export const MatchGauge: React.FC<MatchGaugeProps> = ({ score }) => {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 80) return '#10b981'; // emerald-500
    if (s >= 50) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };

  return (
    <div className="relative flex items-center justify-center">
      <div className="absolute inset-0 bg-white/5 rounded-full blur-2xl opacity-20 scale-75"></div>
      <svg className="w-48 h-48 transform -rotate-90 relative z-10">
        <circle
          cx="96"
          cy="96"
          r={radius}
          stroke="currentColor"
          strokeWidth="10"
          fill="transparent"
          className="text-white/5"
        />
        <circle
          cx="96"
          cy="96"
          r={radius}
          stroke={getColor(score)}
          strokeWidth="10"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out shadow-lg"
          style={{ filter: `drop-shadow(0 0 8px ${getColor(score)}44)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center relative z-20">
        <span className="text-5xl font-black tracking-tighter" style={{ color: getColor(score) }}>
          {score}%
        </span>
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">
          ATS Matching
        </span>
      </div>
    </div>
  );
};