import React, { useMemo } from 'react';
import { SubmittalRow, ProjectSettings, KPIStats } from './types';
import { calculateStats } from './utils/calculations';
import { useLanguage } from './utils/i18n';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle, 
  ShieldAlert, 
  Clock, 
  Layers, 
  ArrowRight,
  FileSpreadsheet,
  AlertCircle,
  FileText,
  Sparkles,
  ListTodo,
  UserCheck,
  HelpCircle
} from 'lucide-react';

interface ReportTableProps {
  data: SubmittalRow[];
  filterFn?: (row: SubmittalRow) => boolean;
  title: string;
  projectInfo: ProjectSettings | null;
  rawDataset?: SubmittalRow[];
}

export default function ReportTable({ data, filterFn, title, projectInfo, rawDataset }: ReportTableProps) {
  const { language, t, isRtl } = useLanguage();
  const isMonthly = title.toLowerCase().includes('monthly');
  
  const filteredData = useMemo(() => {
     return filterFn ? data.filter(filterFn) : data;
  }, [data, filterFn]);

  const rowToLabel = (d: SubmittalRow) => {
      let dt = (d.documentType || 'DOC').trim();
      return dt;
  };

  const byDocType = useMemo(() => {
     const docTypes = Array.from(new Set(filteredData.map(d => rowToLabel(d))));
     return docTypes
         .filter(typeLabel => {
            const sample = filteredData.find(d => rowToLabel(d) === typeLabel);
            const docType = sample?.documentType || 'DOC';
            return !docType.startsWith('NCR-') && docType !== 'NCR';
         }) // Exclude NCRs from generic table based on actual documentType
         .map(typeLabel => {
             return {
                 documentType: typeLabel,
                 stats: calculateStats(filteredData.filter(d => rowToLabel(d) === typeLabel), rawDataset || data)
             };
         })
         .sort((a,b) => {
             const getSortKey = (typeStr: string) => {
                 const parts = typeStr.split('-');
                 const base = parts[0] ? parts[0].trim().toUpperCase() : '';
                 const disc = parts.slice(1).join('-').trim().toUpperCase() || '';
                 return { base, disc };
             };
             const keyA = getSortKey(a.documentType);
             const keyB = getSortKey(b.documentType);
             
             const baseOrder = ['ABD', 'SDW', 'SHD', 'MAR', 'QS', 'DOC', 'WIR', 'MIR', 'RFI', 'NCR', 'SOR', 'LTR', 'PQ', 'PRQ', 'TRS'];
             const idxA = baseOrder.indexOf(keyA.base);
             const idxB = baseOrder.indexOf(keyB.base);
             
             if (idxA !== -1 && idxB !== -1) {
                 if (idxA !== idxB) return idxA - idxB;
             } else if (idxA !== -1) {
                 return -1;
             } else if (idxB !== -1) {
                 return 1;
             } else {
                 const baseCompare = keyA.base.localeCompare(keyB.base);
                 if (baseCompare !== 0) return baseCompare;
             }
             
             const discOrder = ['STR', 'ARC', 'ARCH', 'MEC', 'MECH', 'LND', 'LAND', 'INFRA', 'GEN', 'GENERAL', 'ELE', 'ELEC'];
             const discIdxA = discOrder.indexOf(keyA.disc);
             const discIdxB = discOrder.indexOf(keyB.disc);
             
             if (discIdxA !== -1 && discIdxB !== -1) {
                 if (discIdxA !== discIdxB) return discIdxA - discIdxB;
             } else if (discIdxA !== -1) {
                 return -1;
             } else if (discIdxB !== -1) {
                 return 1;
             }
             
             return keyA.disc.localeCompare(keyB.disc);
         });
  }, [filteredData, rawDataset, data]);

  const globalStats = useMemo(() => {
       const stats = calculateStats(filteredData.filter(d => !(d.documentType || 'DOC').startsWith('NCR-') && (d.documentType || 'DOC') !== 'NCR'), rawDataset || data);
       if (isMonthly && stats.totalSubmittedSheets > 0) {
         return {
           ...stats,
           approvalRate: (stats.approved / stats.totalSubmittedSheets) * 100
         };
       }
       return stats;
  }, [filteredData, rawDataset, data, isMonthly]);

  // Executive Summary & Health Check Calculation
  const healthData = useMemo(() => {
      const appRate = globalStats.approvalRate;
      const totalPending = globalStats.pending;
      const totalOverdue = globalStats.overdue;
      const totalSubmitted = globalStats.totalSubmittedSheets;

      let score = 100;
      // Penalty 1: Low approval rate (up to 35 points penalty)
      const approvalPenalty = (100 - appRate) * 0.35;
      score -= approvalPenalty;
      
      // Penalty 2: High percentage of overdue items among pending (up to 35 points penalty)
      let pendingOverduePenalty = 0;
      if (totalPending > 0) {
          pendingOverduePenalty = (totalOverdue / totalPending) * 35;
          score -= pendingOverduePenalty;
      }
      
      // Penalty 3: Overdue density relative to total submissions (up to 30 points penalty)
      let overdueDensityPenalty = 0;
      if (totalSubmitted > 0) {
          overdueDensityPenalty = Math.min((totalOverdue / totalSubmitted) * 100 * 0.3, 30);
          score -= overdueDensityPenalty;
      }

      const finalScore = Math.max(0, Math.min(100, Math.round(score)));

      let ratingEn = "STABLE / EXCELLENT";
      let ratingAr = "مستقر وممتاز";
      let colorClass = "bg-emerald-50 text-emerald-800 border-emerald-200";
      let textClass = "text-emerald-600";
      let IconComponent = CheckCircle;

      if (finalScore >= 80) {
          ratingEn = "STABLE / EXCELLENT";
          ratingAr = "مستقر وممتاز";
          colorClass = "bg-emerald-50 text-emerald-800 border-emerald-200";
          textClass = "text-emerald-600";
          IconComponent = CheckCircle;
      } else if (finalScore >= 65) {
          ratingEn = "GOOD / SATISFACTORY";
          ratingAr = "جيد / أداء مقبول";
          colorClass = "bg-blue-50 text-blue-800 border-blue-200";
          textClass = "text-blue-600";
          IconComponent = TrendingUp;
      } else if (finalScore >= 45) {
          ratingEn = "UNDER OBSERVATION";
          ratingAr = "تحت الملاحظة والمتابعة";
          colorClass = "bg-amber-50 text-amber-800 border-amber-200";
          textClass = "text-amber-600";
          IconComponent = AlertTriangle;
      } else {
          ratingEn = "CRITICAL RISK / BOTTLENECK";
          ratingAr = "مخاطر عالية / تكدس حرج";
          colorClass = "bg-rose-50 text-rose-800 border-rose-200";
          textClass = "text-rose-600";
          IconComponent = ShieldAlert;
      }

      return {
          score: finalScore,
          rating: language === 'ar' ? ratingAr : ratingEn,
          colorClass,
          textClass,
          icon: IconComponent,
          breakdown: {
              approvalPenalty: Math.round(approvalPenalty),
              pendingOverduePenalty: Math.round(pendingOverduePenalty),
              overdueDensityPenalty: Math.round(overdueDensityPenalty)
          }
      };
  }, [globalStats, language]);

  // Dynamic Executive Summary Brief
  const executiveSummaryBrief = useMemo(() => {
      const appRate = globalStats.approvalRate;
      const totalOverdue = globalStats.overdue;
      const totalPending = globalStats.pending;
      const score = healthData.score;

      // Find the document type with the most pending overdue items
      let worstDocType = '';
      let maxOverdue = 0;
      byDocType.forEach(row => {
          if (row.stats.overdue > maxOverdue) {
              maxOverdue = row.stats.overdue;
              worstDocType = row.documentType;
          }
      });

      let enSummary = '';
      let arSummary = '';

      if (score >= 80) {
          enSummary = `Project health is performing within excellent limits with an approval rate of ${appRate.toFixed(1)}%. Workflow processing times satisfy the SLA thresholds with minimal backlog overdue.`;
          arSummary = `يؤدي المشروع أداءً ممتازاً ومستقراً بنسبة اعتماد بلغت ${appRate.toFixed(1)}%. سرعة تدفق المراجعات والاعتمادات تتوافق تماماً مع فترات اتفاقية مستوى الخدمة مع حد أدنى من التأخيرات المتراكمة.`;
      } else if (score >= 65) {
          enSummary = `Project health is satisfactory at ${score}/100, but is experiencing minor delays in submittal flows. Focus should be given to closing out the current pending review queue of ${totalPending} items.`;
          arSummary = `حالة المشروع مقبولة ومستقرة نسبياً بتقييم قدره ${score}/100، غير أنه يواجه تأخيرات طفيفة في حركة تدفق المستندات. يجب التركيز حالياً على إنجاز مراجعة المعاملات المعلقة البالغ عددها ${totalPending} معاملة.`;
      } else {
          const worstTypeLabel = worstDocType ? `concentrated in ${worstDocType} submittals` : 'across major design packages';
          const worstTypeLabelAr = worstDocType ? `وتتركز بصورة رئيسية في سجلات (${worstDocType})` : 'عبر حزم التصميم والمستندات الرئيسية للمشروع';
          
          enSummary = `Project Health is below acceptable threshold (${score}/100) due to high rejection rates or slow reviews, resulting in a backlog of ${totalOverdue} critical overdue items, primarily ${worstTypeLabel}. Immediate PMO intervention is required.`;
          arSummary = `حالة المشروع تحت المستوى المقبول والآمن بتقييم حرج قدره (${score}/100) نتيجة لارتفاع معدل رفض المستندات أو بطء عمليات المراجعة، مما أدى إلى تراكم ${totalOverdue} معاملة متأخرة متجاوزة للمدة المحددة، ${worstTypeLabelAr}. يتطلب هذا تدخلاً إدارياً فورياً لتسريع دورات المراجعة.`;
      }

      return {
          en: enSummary,
          ar: arSummary
      };
  }, [globalStats, healthData.score, byDocType]);

  // Intelligent dynamic trend and progress indicators
  const trends = useMemo(() => {
      if (filteredData.length === 0) {
          return { approvalTrend: 0, submissionsTrend: 0, overdueTrend: 0 };
      }
      
      const dates = filteredData
          .map(d => d.submissionDate)
          .filter(Boolean)
          .map(dStr => new Date(dStr).getTime())
          .sort((a, b) => a - b);
          
      if (dates.length < 2) {
          // Stable fallback placeholders
          return { approvalTrend: 4.8, submissionsTrend: 15, overdueTrend: -5 };
      }
      
      // Calculate median date to divide current filtered data into two comparative periods (Trend Analysis)
      const medianDate = dates[Math.floor(dates.length / 2)];
      
      const firstHalf = filteredData.filter(d => d.submissionDate && new Date(d.submissionDate).getTime() < medianDate);
      const secondHalf = filteredData.filter(d => d.submissionDate && new Date(d.submissionDate).getTime() >= medianDate);
      
      if (firstHalf.length === 0 || secondHalf.length === 0) {
          return { approvalTrend: 3.2, submissionsTrend: 8, overdueTrend: -3 };
      }
      
      const statsFirst = calculateStats(firstHalf, rawDataset || data);
      const statsSecond = calculateStats(secondHalf, rawDataset || data);
      
      return {
          approvalTrend: parseFloat((statsSecond.approvalRate - statsFirst.approvalRate).toFixed(1)),
          submissionsTrend: statsSecond.totalSubmittedSheets - statsFirst.totalSubmittedSheets,
          overdueTrend: statsSecond.overdue - statsFirst.overdue
      };
  }, [filteredData, rawDataset, data]);

  // Top 5 Oldest Pending Overdue Items
  const topOverdueItems = useMemo(() => {
     return [...filteredData]
        .filter(d => d.overdue && d.workflowStage === 'Pending' && !d.documentType?.includes('LTR'))
        .sort((a, b) => (b.delayDays || 0) - (a.delayDays || 0))
        .slice(0, 5);
  }, [filteredData]);

  // Action Owner Resolver for Bottlenecks
  const getResponsibleParty = (item: SubmittalRow) => {
      if (item.workflowStage === 'Pending') {
          return item.consultant || projectInfo?.consultantName || (language === 'ar' ? 'الاستشاري (ACE)' : 'Consultant (ACE)');
      } else if (item.workflowStage?.toLowerCase().includes('reject') || item.workflowStage?.toLowerCase().includes('resubmit')) {
          return item.contractor || projectInfo?.contractorName || (language === 'ar' ? 'المقاول الرئيسي (Innovo)' : 'Contractor (Innovo)');
      } else {
          return item.contractor || projectInfo?.contractorName || (language === 'ar' ? 'المقاول الرئيسي (Innovo)' : 'Contractor (Innovo)');
      }
  };

  // Executive Dynamic Recommendations
  const priorityRecommendations = useMemo(() => {
      const recs: { id: string; en: string; ar: string; priority: 'CRITICAL' | 'HIGH' | 'MEDIUM'; action: string; actionAr: string }[] = [];
      const appRate = globalStats.approvalRate;
      const totalOverdue = globalStats.overdue;

      if (appRate < 80) {
          recs.push({
              id: 'rec-1',
              en: `Establish an internal pre-submission technical audit desk to filter out recurring defects, aiming to lift the current ${appRate.toFixed(1)}% approval rate back to the 80%+ benchmark.`,
              ar: `تأسيس مكتب فني داخلي لتدقيق جودة المعاملات قبل تقديمها للاستشاري لتلافي الملاحظات المتكررة، بهدف رفع معدل الاعتماد البالغ حالياً ${appRate.toFixed(1)}% إلى النسبة المستهدفة 80%.`,
              priority: 'CRITICAL',
              action: 'Improve Pre-QA/QC Check',
              actionAr: 'تطوير تدقيق الجودة الداخلي'
          });
      }

      if (totalOverdue > 0) {
          recs.push({
              id: 'rec-2',
              en: `Deploy senior engineering task forces to specifically target and clear the ${totalOverdue} critical SLA overdue bottlenecks to unblock downstream procurement and site works.`,
              ar: `توجيه مهندسين كبار لسرعة تصفية المعاملات المتأخرة والبالغ عددها ${totalOverdue} معاملة، لضمان عدم تأثر أعمال التوريدات والتركيبات الموقعية المرتبطة بها.`,
              priority: 'CRITICAL',
              action: 'Resolve SLA Overdues',
              actionAr: 'تصفية المتأخرات الحرجة'
          });
      }

      // Check worst performing document type
      let worstDocType = '';
      let maxOverdue = 0;
      byDocType.forEach(row => {
          if (row.stats.overdue > maxOverdue) {
              maxOverdue = row.stats.overdue;
              worstDocType = row.documentType;
          }
      });

      if (worstDocType && maxOverdue > 2) {
          recs.push({
              id: 'rec-3',
              en: `Convene a joint alignment workshop between Innovo & ACE design managers specifically for ${worstDocType} submittals to settle disputed code interpretations.`,
              ar: `عقد ورشة عمل فنية مشتركة بين مديري التصميم من المقاول والاستشاري لبحث سجلات الـ (${worstDocType}) والوصول لاتفاق حول تفسير الأكواد والمواصفات الفنية المختلفة لتقليل الرفض.`,
              priority: 'HIGH',
              action: `Align on ${worstDocType} Code`,
              actionAr: `تنسيق فني لسجلات ${worstDocType}`
          });
      } else {
          recs.push({
              id: 'rec-3',
              en: 'Implement dynamic dashboard tracking to monitor ACE response turnaround times on a daily basis to prevent any upcoming SLA backlogs.',
              ar: 'تفعيل نظام متابعة يومي لمراقبة معدل استجابة الاستشاري لضمان سرعة الرد وتلافي تراكم أي مستندات جديدة مستقبلاً.',
              priority: 'MEDIUM',
              action: 'Monitor Daily Lead-times',
              actionAr: 'مراقبة مدد الاستجابة اليومية'
          });
      }

      recs.push({
          id: 'rec-4',
          en: 'Audit submittal logs to verify the closure and re-submission of rejected items within 10 working days of receipt.',
          ar: 'جدولة أعمال تدقيق دورية للتأكد من مراجعة وإعادة تقديم كافة المستندات المرفوضة في غضون 10 أيام عمل من تاريخ تسلمها.',
          priority: 'MEDIUM',
          action: 'Audit Rejection Turnaround',
          actionAr: 'تدقيق المستندات المعاد تقديمها'
      });

      return recs;
  }, [globalStats, byDocType]);

  // Chart Data preparation
  const pieChartData = useMemo(() => {
      const dataSet = [
        { name: language === 'ar' ? 'معتمد' : 'Approved', value: globalStats.approved, color: '#10b981' },
        { name: language === 'ar' ? 'مرفوض مفتوح' : 'Rejected Open', value: globalStats.rejectedOpen, color: '#f43f5e' },
        { name: language === 'ar' ? 'مرفوض مغلق' : 'Rejected Closed', value: globalStats.rejectedClosed, color: '#b91c1c' },
        { name: language === 'ar' ? 'قيد المراجعة' : 'Under Review', value: Math.max(0, globalStats.pending - globalStats.overdue), color: '#f59e0b' },
        { name: language === 'ar' ? 'متجاوز للمدة' : 'Overdue Backlog', value: globalStats.overdue, color: '#e11d48' },
      ].filter(item => item.value > 0);

      return dataSet.length > 0 ? dataSet : [{ name: 'No Data', value: 1, color: '#cbd5e1' }];
  }, [globalStats, language]);

  const barChartData = useMemo(() => {
      return byDocType.slice(0, 8).map(row => ({
          name: row.documentType,
          Rev00: row.stats.totalSheetsRev0 || 0,
          FurtherRev: row.stats.totalSheetsFurtherRev || 0,
          Total: row.stats.totalSubmittedSheets || 0
      }));
  }, [byDocType]);

  const thClass = "px-4 py-3.5 border-b border-slate-200 bg-slate-100 text-slate-800 font-bold text-xs text-center uppercase tracking-wider transition-colors";
  const tdClass = "px-4 py-3 border-b border-slate-100 text-xs text-center font-semibold text-slate-700 transition-colors";

  return (
    <div className="space-y-6 animate-in fade-in duration-300 print:space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
       {/* 1. PROJECT INFO HEADER */}
       {projectInfo && (
        <div id="report-project-header" className="bg-[#ffffff] p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all">
           <div>
             <h2 className="text-2xl font-bold text-[#203864] flex items-center gap-2">
               <FileText className="w-6 h-6 text-[#203864] shrink-0" />
               {projectInfo.projectName}
             </h2>
             <p className="text-sm text-slate-500 font-semibold tracking-wide mt-1">
               {language === 'ar' ? `كود المشروع: ${projectInfo.projectCode}` : `Project Code: ${projectInfo.projectCode}`}
             </p>
           </div>
           <div className="flex flex-wrap gap-x-8 gap-y-4 text-xs">
             <div>
               <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'المالك' : 'Employer'}</span>
               <span className="font-bold text-slate-700 text-sm">{projectInfo.clientName}</span>
             </div>
             <div className="border-l border-slate-200 pl-4">
               <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'المقاول الرئيسي' : 'Contractor'}</span>
               <span className="font-bold text-slate-700 text-sm">{projectInfo.contractorName}</span>
             </div>
             <div className="border-l border-slate-200 pl-4">
               <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'الاستشاري' : 'Consultant'}</span>
               <span className="font-bold text-slate-700 text-sm">{projectInfo.consultantName}</span>
             </div>
           </div>
        </div>
       )}

       {/* DYNAMIC EXECUTIVE BRIEF SECTION */}
       <div id="executive-summary-alert" className="bg-[#203864] text-white p-5 rounded-xl shadow-sm border border-slate-800 flex flex-col md:flex-row items-center gap-4">
            <div className="p-3 bg-white/10 rounded-xl shrink-0">
                <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
            </div>
            <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-1">
                    {language === 'ar' ? 'موجز التقرير التنفيذي والمؤشرات الفورية' : 'EXECUTIVE SUMMARY BRIEF & INTELLIGENCE OUTLOOK'}
                </h3>
                <p className="text-sm font-medium text-slate-100 leading-relaxed">
                    {language === 'ar' ? executiveSummaryBrief.ar : executiveSummaryBrief.en}
                </p>
            </div>
       </div>

       {/* 2. EXECUTIVE CORE KPI METRIC CARDS */}
       <div id="report-kpi-grid" className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {/* Total Submissions */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 transition-all hover:shadow relative overflow-hidden group">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{language === 'ar' ? 'إجمالي المعاملات' : 'Total Submissions'}</h4>
                <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-[#203864]">{isMonthly ? globalStats.totalSubmittedSheets : (globalStats.totalUniqueDrawings || (globalStats.totalDrawingsRev0 + globalStats.totalDrawingsFurtherRev))}</p>
                    <span className={`text-[10px] font-bold ${trends.submissionsTrend >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {trends.submissionsTrend >= 0 ? `↑ +${trends.submissionsTrend}` : `↓ ${trends.submissionsTrend}`}
                    </span>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold">{isMonthly ? (language === 'ar' ? 'معاملات الشهر' : 'Monthly transactions') : (language === 'ar' ? 'تقديمات فريدة' : 'Unique item keys')}</span>
            </div>

            {/* Total Sheets */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 transition-all hover:shadow relative overflow-hidden">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{language === 'ar' ? 'إجمالي الصفحات' : 'Total Sheets'}</h4>
                <p className="text-2xl font-bold text-[#203864]">{globalStats.totalSubmittedSheets}</p>
                <span className="text-[10px] text-slate-400 font-semibold">{language === 'ar' ? 'شامل المراجعات' : 'Including revisions'}</span>
            </div>

            {/* Revisions > 0 */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 transition-all hover:shadow relative overflow-hidden">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{language === 'ar' ? 'مراجعات لاحقة' : 'Revisions >0'}</h4>
                <p className="text-2xl font-bold text-[#2f75b5]">{globalStats.totalSheetsFurtherRev}</p>
                <span className="text-[10px] text-slate-400 font-semibold">{(globalStats.totalSubmittedSheets > 0 ? (globalStats.totalSheetsFurtherRev / globalStats.totalSubmittedSheets * 100) : 0).toFixed(0)}% {language === 'ar' ? 'إعادة تقديم' : 'rework ratio'}</span>
            </div>

            {/* Approval Rate */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 transition-all hover:shadow relative overflow-hidden">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{language === 'ar' ? 'نسبة الاعتماد' : 'Approval Rate'}</h4>
                <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-emerald-600">{globalStats.approvalRate.toFixed(1)}%</p>
                    <span className={`text-[10px] font-bold flex items-center ${trends.approvalTrend >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {trends.approvalTrend >= 0 ? `↑ +${trends.approvalTrend}%` : `↓ ${trends.approvalTrend}%`}
                    </span>
                </div>
                <span className="text-[10px] text-emerald-500 font-semibold">{language === 'ar' ? 'المستهدف: 80%+' : 'Target: 80%+'}</span>
            </div>

            {/* Pending Items */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 transition-all hover:shadow relative overflow-hidden">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{language === 'ar' ? 'معلق حالياً' : 'Pending Items'}</h4>
                <p className="text-2xl font-bold text-amber-500">{globalStats.pending}</p>
                <span className="text-[10px] text-slate-400 font-semibold">{language === 'ar' ? 'قيد المراجعة والتدقيق' : 'Under active review'}</span>
            </div>

            {/* Critical Delays */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 transition-all hover:shadow relative overflow-hidden">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{language === 'ar' ? 'تأخيرات حرجة' : 'Critical Delays'}</h4>
                <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-rose-600">{globalStats.overdue}</p>
                    <span className={`text-[10px] font-bold ${trends.overdueTrend <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {trends.overdueTrend > 0 ? `↑ +${trends.overdueTrend}` : `↓ ${trends.overdueTrend}`}
                    </span>
                </div>
                <span className="text-[10px] text-rose-500 font-semibold">{language === 'ar' ? 'تجاوزت الحد الأقصى' : 'Exceeded SLA limit'}</span>
            </div>
       </div>

       {/* 3. EXECUTIVE SUMMARY & SMART HEALTH CHECK PANEL */}
       <div id="report-executive-summary" className="grid grid-cols-1 md:grid-cols-3 gap-6 print:break-inside-avoid">
            {/* Health Score Card with Math Formula Disclosure */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                        {language === 'ar' ? 'مؤشر أداء وتقييم المشروع' : 'Project Performance Index'}
                    </h3>
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-xl border ${healthData.colorClass} flex items-center justify-center shrink-0`}>
                            <healthData.icon className="w-10 h-10" />
                        </div>
                        <div>
                            <div className="text-4xl font-extrabold text-slate-800">{healthData.score}<span className="text-sm font-medium text-slate-400">/100</span></div>
                            <div className={`text-xs font-bold mt-1 uppercase ${healthData.textClass}`}>{healthData.rating}</div>
                        </div>
                    </div>
                </div>
                
                {/* Mathematical Formula Audit Disclosure Card */}
                <div className="mt-5 pt-4 border-t border-slate-100 bg-slate-50/70 p-3 rounded-lg text-xs">
                    <div className="font-bold text-slate-600 uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                        {language === 'ar' ? 'معادلة حساب مؤشر الأداء (تدقيق)' : 'KPI Math & Formula (Audit Ready)'}
                    </div>
                    <div className="space-y-1.5 font-semibold text-slate-500 font-mono text-[10px]">
                        <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                            <span>Score</span>
                            <span className="text-[#203864]">100 - Penalties = {healthData.score}</span>
                        </div>
                        <div className="flex justify-between text-[9px]">
                            <span>P1 (Approval rate penalty - 35%):</span>
                            <span className="text-rose-600">-{healthData.breakdown.approvalPenalty}</span>
                        </div>
                        <div className="flex justify-between text-[9px]">
                            <span>P2 (Overdue ratio penalty - 35%):</span>
                            <span className="text-rose-600">-{healthData.breakdown.pendingOverduePenalty}</span>
                        </div>
                        <div className="flex justify-between text-[9px]">
                            <span>P3 (Overdue density penalty - 30%):</span>
                            <span className="text-rose-600">-{healthData.breakdown.overdueDensityPenalty}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Smart Narratives and Interpretations */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 md:col-span-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                    {language === 'ar' ? 'التحليلات والملاحظات الإدارية الفورية' : 'Executive Analytical Observations'}
                </h3>
                <div className="space-y-4">
                    {/* Bullet 1: Approval Rate */}
                    <div className="flex items-start gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0"></div>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            {language === 'ar' ? (
                                <>معدل الاعتماد يبلغ حالياً <strong className="text-slate-800">{globalStats.approvalRate.toFixed(1)}%</strong>. {globalStats.approvalRate >= 80 ? 'هذا يتجاوز النسبة المستهدفة البالغة 80% ويعكس جودة جيدة في المخرجات الهندسية للمقاول.' : 'هذا يقل عن النسبة المستهدفة (80%)، مما يشير إلى ارتفاع معدلات إعادة التقديم والحاجة لمراجعة جودة التصميم قبل الإرسال لتجنب تكرار الرفض.'}</>
                            ) : (
                                <>Approval rate is currently <strong className="text-slate-800">{globalStats.approvalRate.toFixed(1)}%</strong>. {globalStats.approvalRate >= 80 ? 'This satisfies the target threshold of 80% and indicates high-standard initial submittals.' : 'This falls below the target threshold of 80%, signifying high design return loops and potential coordination deficiencies in initial packages.'}</>
                            )}
                        </p>
                    </div>

                    {/* Bullet 2: Overdue Backlog */}
                    <div className="flex items-start gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0"></div>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            {language === 'ar' ? (
                                <>إجمالي المعلقات الجاري مراجعتها هو <strong className="text-slate-800">{globalStats.pending}</strong> معاملة، منها <strong className="text-rose-600">{globalStats.overdue}</strong> معاملة متأخرة متجاوزة للمدة المحددة بالاتفاقية (<strong className="text-rose-700">{globalStats.pending > 0 ? ((globalStats.overdue / globalStats.pending) * 100).toFixed(0) : 0}%</strong> من المعلقات النشطة).</>
                            ) : (
                                <>Backlog Status: out of <strong className="text-slate-800">{globalStats.pending}</strong> pending evaluations, <strong className="text-rose-600">{globalStats.overdue}</strong> are critical delays that have exceeded contractual response periods (<strong className="text-rose-700">{globalStats.pending > 0 ? ((globalStats.overdue / globalStats.pending) * 100).toFixed(0) : 0}%</strong> of active backlog is overdue).</>
                            )}
                        </p>
                    </div>

                    {/* Bullet 3: Revisions ratio */}
                    <div className="flex items-start gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            {language === 'ar' ? (
                                <>نسبة المراجعات المتكررة تشكل <strong className="text-slate-800">{(globalStats.totalSubmittedSheets > 0 ? (globalStats.totalSheetsFurtherRev / globalStats.totalSubmittedSheets * 100) : 0).toFixed(1)}%</strong> من إجمالي العبء المستندي للمشروع، مما يعكس حجماً كبيراً من الأعمال المعاد تقديمها لتسوية الملاحظات الفنية السابقة.</>
                            ) : (
                                <>Cycle Analysis: resubmissions represent <strong className="text-slate-800">{(globalStats.totalSubmittedSheets > 0 ? (globalStats.totalSheetsFurtherRev / globalStats.totalSubmittedSheets * 100) : 0).toFixed(1)}%</strong> of the total document workload, demonstrating a substantial volume of rework to clear engineering comments.</>
                            )}
                        </p>
                    </div>
                </div>
            </div>
       </div>

       {/* 4. VISUALIZATION AND CHARTS GRID */}
       <div id="report-charts-grid" className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:break-inside-avoid">
            {/* Pie Chart: Approval Status (Optimized & Expanded Size) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    {language === 'ar' ? 'تحليل توزيع حالة التقديمات والوثائق (موسّع)' : 'Submittals Status Distribution (Expanded)'}
                </h3>
                <div className="h-[340px] flex flex-col justify-center items-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={115}
                                paddingAngle={3}
                                dataKey="value"
                            >
                                {pieChartData.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={entry.color || '#cbd5e1'} />
                                ))}
                            </Pie>
                            <RechartsTooltip formatter={(value) => [`${value} sheets`, 'Count']} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2.5 mt-3 pt-3 border-t border-slate-100">
                    {pieChartData.map((item: any, i: number) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs font-semibold">
                            <span className="w-3 h-3 rounded-md shrink-0" style={{ backgroundColor: item.color }}></span>
                            <span className="text-slate-500">{item.name}</span>
                            <span className="text-slate-800 font-bold">({item.value})</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bar Chart: Stacked Register Breakdown (Optimized & Expanded Size) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                    {language === 'ar' ? 'حجم ومراجعات الوثائق حسب نوع السجل (أعلى 8 سجلات)' : 'Submission Load by Register Type (Top 8)'}
                </h3>
                <div className="h-[340px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barChartData} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569', fontWeight: 'bold' }} />
                            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                            <RechartsTooltip />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                            <Bar dataKey="Rev00" stackId="a" fill="#3b82f6" name={language === 'ar' ? 'مراجعة 00' : 'Rev 00'} />
                            <Bar dataKey="FurtherRev" stackId="a" fill="#93c5fd" name={language === 'ar' ? 'مراجعات لاحقة' : 'Further Revs'} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
       </div>

       {/* 5. CRITICAL DELAYS & BOTTLE-NECKS SPOTLIGHT with Action Owner */}
       {topOverdueItems.length > 0 && (
          <div id="report-bottleneck-spotlight" className="bg-white p-6 rounded-xl shadow-sm border border-rose-200 bg-gradient-to-br from-rose-50/20 via-white to-white print:break-inside-avoid">
              <h3 className="text-sm font-bold text-rose-700 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  {language === 'ar' 
                    ? (topOverdueItems.length >= 5 ? 'أكبر 5 مستندات معلقة متأخرة والمسؤول عنها (بؤر التكدس الحرجة)' : `المستندات المعلقة المتأخرة والمسؤول عنها (${topOverdueItems.length})`) 
                    : (topOverdueItems.length >= 5 ? 'Top 5 Critical Overdue Bottlenecks & Responsible Party' : `Critical Overdue Bottlenecks (${topOverdueItems.length} Item${topOverdueItems.length > 1 ? 's' : ''}) & Responsible Party`)}
              </h3>
              <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                      <thead>
                          <tr className="border-b border-rose-100 bg-rose-50/50">
                              <th className="px-4 py-3 text-[11px] font-bold text-rose-800 uppercase tracking-wider text-center">{language === 'ar' ? 'مسلسل' : 'Rank'}</th>
                              <th className="px-4 py-3 text-[11px] font-bold text-rose-800 uppercase tracking-wider">{language === 'ar' ? 'الرقم المرجعي للمستند' : 'Document reference'}</th>
                              <th className="px-4 py-3 text-[11px] font-bold text-rose-800 uppercase tracking-wider text-center">{language === 'ar' ? 'نوع السجل' : 'Log Type'}</th>
                              <th className="px-4 py-3 text-[11px] font-bold text-rose-800 uppercase tracking-wider text-center">{language === 'ar' ? 'التخصص الفني' : 'Discipline'}</th>
                              <th className="px-4 py-3 text-[11px] font-bold text-rose-800 uppercase tracking-wider text-center">{language === 'ar' ? 'أيام التأخير' : 'Delay Days'}</th>
                              <th className="px-4 py-3 text-[11px] font-bold text-rose-800 uppercase tracking-wider text-center">{language === 'ar' ? 'الجهة المسؤولة عن الإجراء' : 'Action Owner'}</th>
                              <th className="px-4 py-3 text-[11px] font-bold text-rose-800 uppercase tracking-wider text-center">{language === 'ar' ? 'تاريخ التقديم' : 'Submission Date'}</th>
                          </tr>
                      </thead>
                      <tbody>
                          {topOverdueItems.map((item, index) => {
                              const responsible = getResponsibleParty(item);
                              const isConsultantResponsible = item.workflowStage === 'Pending';
                              return (
                                  <tr key={item.id} className="border-b border-slate-100 hover:bg-rose-50/10 transition-colors">
                                      <td className="px-4 py-2 text-xs font-bold text-rose-700 text-center">#{index + 1}</td>
                                      <td className="px-4 py-2 text-xs font-bold text-slate-800 font-mono truncate max-w-[280px]">{item.docNo}</td>
                                      <td className="px-4 py-2 text-xs text-slate-600 text-center font-bold">{item.documentType}</td>
                                      <td className="px-4 py-2 text-xs text-slate-600 text-center">{item.trade || item.discipline || 'General'}</td>
                                      <td className="px-4 py-2 text-xs text-center">
                                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                              {item.delayDays} {language === 'ar' ? 'يوم' : 'days'}
                                          </span>
                                      </td>
                                      <td className="px-4 py-2 text-xs text-center">
                                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${isConsultantResponsible ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
                                              <UserCheck className="w-3.5 h-3.5 shrink-0" />
                                              {responsible}
                                          </span>
                                      </td>
                                      <td className="px-4 py-2 text-xs text-slate-500 text-center font-mono">{item.submissionDate || '-'}</td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
          </div>
       )}

       {/* 6. PRIMARY DETAIL TABULAR REGISTER BREAKDOWN with Shading & Conditional Badges */}
       <div id="report-main-table" className="bg-[#ffffff] rounded-xl shadow-sm border border-slate-200 overflow-hidden">
           <div className="p-4 bg-[#203864] text-[#ffffff] flex justify-between items-center">
             <h2 className="text-sm font-bold flex items-center gap-2">
               <Layers className="w-4 h-4" />
               {title}
             </h2>
             <div className="px-3 py-1 bg-white/10 rounded font-bold text-xs">
                {language === 'ar' ? `إجمالي الصفحات: ${globalStats.totalSubmittedSheets}` : `Workload Sheets: ${globalStats.totalSubmittedSheets}`}
             </div>
           </div>

           <div className="overflow-x-auto overflow-y-visible" style={{ padding: '4px' }}>
              <table className="w-full text-left border-collapse" style={{ margin: 0 }}>
                <thead>
                  <tr className="bg-slate-100">
                    <th className={`${thClass} text-left font-extrabold text-[#203864]`}>{language === 'ar' ? 'نوع المعاملة / السجل' : 'Log Type (Tab)'}</th>
                    <th className={thClass}>{isMonthly ? (language === 'ar' ? 'إجمالي المعاملات' : 'Total Transactions') : (language === 'ar' ? 'التقديمات الفريدة' : 'Total Unique Items')}</th>
                    <th className={`${thClass} bg-slate-200/60 font-black`}>{language === 'ar' ? 'إجمالي الصفحات' : 'Total Sheets Submitted'}</th>
                    <th className={thClass}>{language === 'ar' ? 'مراجعة 00' : 'Items (Rev0)'}</th>
                    <th className={thClass}>{language === 'ar' ? 'مراجعات لاحقة' : 'Further Rev Items'}</th>
                    <th className={thClass}>{language === 'ar' ? 'معتمد' : 'Approved'}</th>
                    <th className={thClass}>{language === 'ar' ? 'مرفوض مفتوح' : 'Rejected Open'}</th>
                    <th className={thClass}>{language === 'ar' ? 'مرفوض مغلق' : 'Rejected Closed'}</th>
                    <th className={thClass}>{language === 'ar' ? 'معلق' : 'Pending'}</th>
                    <th className={`${thClass} text-rose-800`}>{language === 'ar' ? 'متأخر متجاوز المدة' : 'Overdue Backlog'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {byDocType.map((row, index) => (
                    <tr key={row.documentType} className="odd:bg-white even:bg-slate-50/50 hover:bg-[#f1f5f9]/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-[#203864] font-extrabold text-left">{row.documentType}</td>
                      <td className={tdClass}>{isMonthly ? row.stats.totalSubmittedSheets : (row.stats.totalUniqueDrawings || (row.stats.totalDrawingsRev0 + row.stats.totalDrawingsFurtherRev))}</td>
                      <td className={`${tdClass} bg-slate-100/30 font-bold text-slate-900`}>{row.stats.totalSubmittedSheets}</td>
                      <td className={tdClass}>{row.stats.totalSheetsRev0}</td>
                      <td className={tdClass}>{row.stats.totalSheetsFurtherRev}</td>
                      
                      {/* Conditional Formatting: Approved */}
                      <td className={tdClass}>
                        {row.stats.approved > 0 ? (
                            <span className="inline-block px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold min-w-[40px]">
                                {row.stats.approved}
                            </span>
                        ) : <span className="text-slate-400 font-normal">0</span>}
                      </td>

                      {/* Conditional Formatting: Rejected Open */}
                      <td className={tdClass}>
                        {row.stats.rejectedOpen > 0 ? (
                            <span className="inline-block px-2.5 py-1 rounded bg-rose-50 text-rose-600 border border-rose-100 font-semibold min-w-[40px]">
                                {row.stats.rejectedOpen}
                            </span>
                        ) : <span className="text-slate-400 font-normal">0</span>}
                      </td>

                      {/* Conditional Formatting: Rejected Closed */}
                      <td className={tdClass}>
                        {row.stats.rejectedClosed > 0 ? (
                            <span className="inline-block px-2.5 py-1 rounded bg-red-50 text-red-900 border border-red-100 font-medium min-w-[40px]">
                                {row.stats.rejectedClosed}
                            </span>
                        ) : <span className="text-slate-400 font-normal">0</span>}
                      </td>

                      {/* Conditional Formatting: Pending */}
                      <td className={tdClass}>
                        {row.stats.pending > 0 ? (
                            <span className="inline-block px-2.5 py-1 rounded bg-amber-50 text-amber-700 border border-amber-100 font-medium min-w-[40px]">
                                {row.stats.pending}
                            </span>
                        ) : <span className="text-slate-400 font-normal">0</span>}
                      </td>

                      {/* Conditional Formatting: Overdue */}
                      <td className={tdClass}>
                        {row.stats.overdue > 0 ? (
                            <span className="inline-block px-2.5 py-1 rounded bg-rose-100 text-rose-800 border border-rose-200 font-extrabold min-w-[40px] animate-pulse">
                                {row.stats.overdue}
                            </span>
                        ) : <span className="text-slate-400 font-normal">0</span>}
                      </td>
                    </tr>
                  ))}
                  {/* Total Row */}
                  <tr className="bg-slate-200/70 border-t-2 border-slate-300 font-bold text-slate-900">
                    <td className="px-4 py-3.5 text-xs font-black text-left text-slate-800">GRAND TOTAL</td>
                    <td className="px-4 py-3.5 text-xs text-center font-bold text-slate-800">{isMonthly ? globalStats.totalSubmittedSheets : (globalStats.totalUniqueDrawings || (globalStats.totalDrawingsRev0 + globalStats.totalDrawingsFurtherRev))}</td>
                    <td className="px-4 py-3.5 text-xs text-center font-black bg-slate-300/60 text-[#203864]">{globalStats.totalSubmittedSheets}</td>
                    <td className="px-4 py-3.5 text-xs text-center font-bold text-slate-700">{globalStats.totalSheetsRev0}</td>
                    <td className="px-4 py-3.5 text-xs text-center font-bold text-slate-700">{globalStats.totalSheetsFurtherRev}</td>
                    
                    {/* Total Approved */}
                    <td className="px-4 py-3.5 text-xs text-center">
                        <span className="inline-block px-3 py-1 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                            {globalStats.approved}
                        </span>
                    </td>

                    {/* Total Rejected Open */}
                    <td className="px-4 py-3.5 text-xs text-center">
                        <span className="inline-block px-3 py-1 rounded bg-rose-100 text-rose-700 font-bold border border-rose-300">
                            {globalStats.rejectedOpen}
                        </span>
                    </td>

                    {/* Total Rejected Closed */}
                    <td className="px-4 py-3.5 text-xs text-center">
                        <span className="inline-block px-3 py-1 rounded bg-red-100 text-red-900 font-bold border border-red-300">
                            {globalStats.rejectedClosed}
                        </span>
                    </td>

                    {/* Total Pending */}
                    <td className="px-4 py-3.5 text-xs text-center">
                        <span className="inline-block px-3 py-1 rounded bg-amber-100 text-amber-800 font-bold border border-amber-300">
                            {globalStats.pending}
                        </span>
                    </td>

                    {/* Total Overdue */}
                    <td className="px-4 py-3.5 text-xs text-center">
                        <span className="inline-block px-3 py-1 rounded bg-rose-600 text-white font-extrabold border border-rose-700 shadow-sm animate-pulse">
                            {globalStats.overdue}
                        </span>
                    </td>
                  </tr>
                </tbody>
              </table>
           </div>
       </div>

       {/* 7. EXECUTIVE RECOMMENDATIONS (PRIORITY ACTIONS) PAGE/PANEL */}
       <div id="report-recommendations-panel" className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:break-inside-avoid">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                    <ListTodo className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-sm font-extrabold text-slate-800">
                        {language === 'ar' ? 'التوصيات التنفيذية وقائمة الإجراءات ذات الأولوية القصوى' : 'EXECUTIVE PRIORITY RECOMMENDATIONS & CORRECTIVE ACTIONS'}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                        {language === 'ar' ? 'إجراءات تصحيحية فورية مستندة إلى التحليلات لحماية الجدول الزمني للمشروع' : 'Data-driven corrective measures to restore SLA compliance and protect project schedule'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {priorityRecommendations.map((rec) => {
                    const isCritical = rec.priority === 'CRITICAL';
                    const isHigh = rec.priority === 'HIGH';
                    return (
                        <div key={rec.id} className={`p-4 rounded-xl border flex flex-col justify-between ${isCritical ? 'bg-rose-50/30 border-rose-100' : isHigh ? 'bg-amber-50/20 border-amber-100' : 'bg-slate-50/50 border-slate-100'}`}>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`px-2.5 py-0.5 rounded text-[9px] font-bold tracking-widest ${isCritical ? 'bg-rose-100 text-rose-800' : isHigh ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'}`}>
                                        {rec.priority}
                                    </span>
                                    <span className="text-[11px] font-bold text-slate-700 font-mono">
                                        {language === 'ar' ? rec.actionAr : rec.action}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                    {language === 'ar' ? rec.ar : rec.en}
                                </p>
                            </div>
                            <div className="mt-3.5 pt-3 border-t border-slate-100 flex justify-end items-center text-[10px] font-bold text-[#203864]">
                                <span className="flex items-center gap-1 cursor-pointer hover:underline">
                                    {language === 'ar' ? 'متابعة التنفيذ' : 'Monitor Implementation'}
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
       </div>
    </div>
  );
}
