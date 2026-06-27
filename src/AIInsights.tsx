import React, { useState, useMemo } from 'react';
import { SubmittalRow, ProjectSettings } from './types';
import { calculateStats, getStatusCodeCategory } from './utils/calculations';
import { Sparkles, Loader2, Bot, AlertTriangle, TrendingUp, Lightbulb, TrendingDown, Target, Clock, Users, Flame } from 'lucide-react';
import Markdown from 'react-markdown';

import { runEnterpriseEngine } from './utils/enterpriseEngine';

interface AIInsightsProps {
  data: SubmittalRow[];
  projectInfo: ProjectSettings | null;
}

export default function AIInsights({ data, projectInfo }: AIInsightsProps) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<string>('');
  const [error, setError] = useState<string>('');

  const stats = calculateStats(data);
  const enterpriseData = useMemo(() => runEnterpriseEngine(data), [data]);

  const localInsights = useMemo(() => {
      if (!data || data.length === 0) return null;

      const typeMap: Record<string, SubmittalRow[]> = {};
      const discMap: Record<string, number> = {};
      const delayM: Record<string, number> = {};

      data.forEach(d => {
          const type = (d.documentType || 'DOC').trim();
          if (!typeMap[type]) typeMap[type] = [];
          typeMap[type].push(d);

          const disc = (d.discipline || 'Unknown').trim();
          // Delay by discipline
          if (d.submissionDate && !d.responseDate) {
              const subD = new Date(d.submissionDate).getTime();
              const days = (Date.now() - subD) / (1000*3600*24);
              if (days > 14) { // Assume 14 overdue
                  discMap[disc] = (discMap[disc] || 0) + 1;
              }
          }
      });

      const typesStats = Object.entries(typeMap).map(([type, rows]) => {
          const s = calculateStats(rows);
          return { type, stats: s };
      }).filter(t => t.stats.totalSubmittedSheets > 5);

      if (typesStats.length === 0) return null;

      typesStats.sort((a,b) => b.stats.approvalRate - a.stats.approvalRate);
      const topPerforming = typesStats[0];
      const worstPerforming = typesStats[typesStats.length-1];

      const highestRejection = [...typesStats].sort((a,b) => {
          const rA = a.stats.totalSubmittedSheets ? (a.stats.rejectedOpen + a.stats.rejectedClosed) / a.stats.totalSubmittedSheets : 0;
          const rB = b.stats.totalSubmittedSheets ? (b.stats.rejectedOpen + b.stats.rejectedClosed) / b.stats.totalSubmittedSheets : 0;
          return rB - rA;
      })[0];

      const discEntries = Object.entries(discMap).sort((a,b) => b[1] - a[1]);
      const mostDelayedDisc = discEntries.length > 0 ? discEntries[0][0] : 'None';

      return {
          topPerforming,
          worstPerforming,
          highestRejection,
          mostDelayedDisc
      };

  }, [data]);

  const generateInsights = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
              stats, 
              totalRecords: data.length, 
              projectName: projectInfo?.projectName,
              healthScore: enterpriseData.health.score,
              consultantAnalytics: enterpriseData.consultantAnalytics,
              contractorAnalytics: enterpriseData.contractorAnalytics,
              disciplineAnalytics: enterpriseData.disciplineAnalytics,
              overdueAnalytics: enterpriseData.overdueAnalytics,
              reworkAnalytics: enterpriseData.reworkAnalytics,
              rootCauseAnalytics: enterpriseData.rootCauseAnalytics,
              forecastAnalytics: enterpriseData.forecast,
              auditAnalytics: "Not Implemented"
          })
      });

      if (!response.ok) {
          throw new Error('Failed to fetch insights from server.');
      }

      const result = await response.json();
      setInsights(result.insights);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'An error occurred while generating insights.');
      } else {
        setError('An error occurred while generating insights.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300 max-w-[1600px] mx-auto">
      
      {localInsights && (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl shadow-sm">
                <div className="flex justify-between items-start mb-2">
                    <h4 className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Top Perf. Register</h4>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-xl font-bold text-emerald-900">{localInsights.topPerforming.type}</p>
                <p className="text-xs text-emerald-600 mt-1">{localInsights.topPerforming.stats.approvalRate.toFixed(1)}% Approval Rate</p>
           </div>
           
           <div className="bg-red-50 border border-red-200 p-4 rounded-xl shadow-sm">
                <div className="flex justify-between items-start mb-2">
                    <h4 className="text-[10px] font-bold text-red-700 uppercase tracking-widest">Worst Perf. Register</h4>
                    <TrendingDown className="w-4 h-4 text-red-600" />
                </div>
                <p className="text-xl font-bold text-red-900">{localInsights.worstPerforming.type}</p>
                <p className="text-xs text-red-600 mt-1">{localInsights.worstPerforming.stats.approvalRate.toFixed(1)}% Approval Rate</p>
           </div>

           <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl shadow-sm">
                <div className="flex justify-between items-start mb-2">
                    <h4 className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Highest Rejections</h4>
                    <Flame className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-xl font-bold text-amber-900">{localInsights.highestRejection.type}</p>
                <p className="text-xs text-amber-600 mt-1">{localInsights.highestRejection.stats.rejectedOpen + localInsights.highestRejection.stats.rejectedClosed} Total Rejections</p>
           </div>

           <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl shadow-sm">
                <div className="flex justify-between items-start mb-2">
                    <h4 className="text-[10px] font-bold text-purple-700 uppercase tracking-widest">Delayed Discipline</h4>
                    <Clock className="w-4 h-4 text-purple-600" />
                </div>
                <p className="text-xl font-bold text-purple-900">{localInsights.mostDelayedDisc}</p>
                <p className="text-xs text-purple-600 mt-1">Most overdue pending items</p>
           </div>
      </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 flex justify-between items-center text-white">
            <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Sparkles className="text-amber-400" /> AI Executive Analytics
                </h2>
                <p className="text-slate-300 mt-1">Smart anomaly detection, delay prediction, and automated reporting summaries.</p>
            </div>
            <button 
                onClick={generateInsights}
                disabled={loading || data.length === 0}
                className="bg-white text-slate-900 bg-opacity-100 hover:bg-slate-100 font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bot className="w-5 h-5 text-[#D4AF37]" />}
                {insights ? 'Regenerate Analysis' : 'Generate Narrative'}
            </button>
        </div>

        <div className="p-6 bg-slate-50 min-h-[400px]">
            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex items-start gap-3 border border-red-200 shadow-sm">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold">Error generating insights</h4>
                        <p className="text-sm mt-1">{error}</p>
                    </div>
                </div>
            )}

            {!insights && !loading && !error && (
                <div className="text-center py-20 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl bg-white shadow-sm">
                    <Bot className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p className="text-lg font-bold text-slate-600">No Narrative Generated</p>
                    <p className="text-sm mt-2 max-w-md mx-auto">Generate a complete AI-driven Executive Summary including achievement highlights, risk identification, and prescriptive action plans.</p>
                </div>
            )}

            {loading && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <Sparkles className="w-12 h-12 mb-4 animate-pulse text-amber-500" />
                    <p className="font-bold text-slate-700">Synthesizing Enterprise Data...</p>
                    <p className="text-sm mt-1">Identifying risks and generating management action plans.</p>
                </div>
            )}

            {insights && !loading && (
                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm markdown-body prose max-w-none prose-slate prose-headings:font-bold prose-h3:text-[#0A192F] prose-h4:text-[#0A192F]">
                    <div className="mb-6 p-4 bg-amber-50 border-l-4 border-[#D4AF37] rounded-r-lg">
                        <p className="text-xs font-bold text-amber-900 uppercase tracking-widest m-0">AI-Generated Content Warning</p>
                        <p className="text-sm text-amber-800 m-0 mt-1">This narrative is generated by Gemini AI based on your data metrics. Always verify critical findings.</p>
                    </div>
                    <Markdown>{insights}</Markdown>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
