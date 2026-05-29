import React, { useState } from 'react';
import { SubmittalRow, ProjectSettings } from './types';
import { calculateStats } from './utils/calculations';
import { Sparkles, Loader2, Bot, AlertTriangle, TrendingUp, Lightbulb } from 'lucide-react';
import Markdown from 'react-markdown';

interface AIInsightsProps {
  data: SubmittalRow[];
  projectInfo: ProjectSettings | null;
}

export default function AIInsights({ data, projectInfo }: AIInsightsProps) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<string>('');
  const [error, setError] = useState<string>('');

  const stats = calculateStats(data);

  const generateInsights = async () => {
    setLoading(true);
    setError('');
    
    try {
      // The backend uses process.env.GEMINI_API_KEY securely.
      const response = await fetch('/api/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stats, totalRecords: data.length, projectName: projectInfo?.projectName })
      });

      if (!response.ok) {
          throw new Error('Failed to fetch insights from server.');
      }

      const result = await response.json();
      setInsights(result.insights);
    } catch (err: any) {
      setError(err.message || 'An error occurred while generating insights.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      
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
                className="bg-white text-slate-900 bg-opacity-100 hover:bg-slate-100 font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bot className="w-5 h-5" />}
                {insights ? 'Regenerate Insights' : 'Generate Full Analysis'}
            </button>
        </div>

        <div className="p-6 bg-slate-50">
            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex items-start gap-3 border border-red-200">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold">Error generating insights</h4>
                        <p className="text-sm mt-1">{error}</p>
                    </div>
                </div>
            )}

            {!insights && !loading && !error && (
                <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
                    <Lightbulb className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p className="text-lg font-medium text-slate-600">No Insights Generated Yet</p>
                    <p className="text-sm mt-1">Click the button above to let AI analyze {data.length} document records.</p>
                </div>
            )}

            {loading && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <Loader2 className="w-12 h-12 mb-4 animate-spin text-amber-500" />
                    <p className="font-medium">Analyzing engineering data and extracting patterns...</p>
                </div>
            )}

            {insights && !loading && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm markdown-body prose max-w-none prose-slate">
                    <Markdown>{insights}</Markdown>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
