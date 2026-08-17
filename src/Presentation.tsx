import React, { useMemo, useState } from "react";
import { SubmittalRow, ProjectSettings } from "./types";
import { calculateStats, calculateNCRStats, calculateSORStats, calculateLTRStats, resolveRowDiscipline } from "./utils/calculations";
import { processNCRData } from "./analytics/ncr/ncrEngine";
import { useLanguage } from "./utils/i18n";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Printer,
  ChevronRight,
  ChevronLeft,
  Compass,
  FileText,
  AlertCircle,
  CheckCircle,
  Settings,
  X,
  Plus,
  Minus,
  Sliders,
  Award,
  AlertTriangle,
  Lightbulb,
  FileSpreadsheet,
  TrendingUp,
  Clock,
  Layers,
  List,
} from "lucide-react";
import {
  PRIMARY_BLUE,
  ACCENT_GOLD,
  getDiscName,
  getPieLabelTranslator,
  getColLabel,
  getChartTitle,
  CompanyLogo,
  getMonthlySummary,
  getCumulativeSummary,
  getMonthlyRecommendations,
} from "./components/presentation/PresHelpers";

interface PresentationProps {
  data: SubmittalRow[];
  filterMonthly: (row: SubmittalRow) => boolean;
  filterCumulative: (row: SubmittalRow) => boolean;
  projectInfo: ProjectSettings | null;
  startDate?: string;
}

export default function Presentation({
  data,
  filterMonthly,
  filterCumulative,
  projectInfo,
  startDate,
}: PresentationProps) {
  const { language, t } = useLanguage();

  const pInfo = useMemo(() => {
    return projectInfo || {
      projectName: "StructuSight Project",
      projectCode: "PRJ-STS",
      clientName: "N/A",
      consultantName: "N/A",
      contractorName: "N/A",
      projectManager: "N/A",
      documentControlManager: "N/A",
      logoUrl: undefined,
    };
  }, [projectInfo]);

  // Statistics Compilation
  const monthlyData = useMemo(() => data.filter(filterMonthly), [data, filterMonthly]);
  const cumulativeData = useMemo(() => data.filter(filterCumulative), [data, filterCumulative]);

  const overallMonthlyStats = useMemo(() => {
    const s = calculateStats(monthlyData, data);
    const respondedItems = monthlyData.filter(d => d.responseDate && d.submissionDate);
    const slaMet = respondedItems.filter(d => d.delayDays <= 0).length;
    const slaCompliance = respondedItems.length > 0 ? (slaMet / respondedItems.length) * 100 : null;
    
    const delayedItems = monthlyData.filter(d => d.delayDays > 0);
    const avgDelay = delayedItems.length > 0 ? (delayedItems.reduce((acc, curr) => acc + curr.delayDays, 0) / delayedItems.length).toFixed(1) : "0.0";
    const overdueCount = s.overdue;

    const totalMonthlyVolume = s.totalSubmittedSheets !== undefined ? s.totalSubmittedSheets : monthlyData.length;

    return { 
      total: totalMonthlyVolume, 
      unique: s.totalUniqueDrawings || s.totalSubmittedSheets,
      approved: s.approved, 
      rejectedOpen: s.rejectedOpen, 
      rejectedClosed: s.rejectedClosed, 
      pending: s.pending, 
      approvalRate: s.approvalRate,
      slaCompliance, 
      avgDelay, 
      overdueCount 
    };
  }, [monthlyData, data]);

  const overallCumulativeStats = useMemo(() => {
    const s = calculateStats(cumulativeData, data);
    const respondedItems = cumulativeData.filter(d => d.responseDate && d.submissionDate);
    const slaMet = respondedItems.filter(d => d.delayDays <= 0).length;
    const slaCompliance = respondedItems.length > 0 ? (slaMet / respondedItems.length) * 100 : null;
    
    const delayedItems = cumulativeData.filter(d => d.delayDays > 0);
    const avgDelay = delayedItems.length > 0 ? (delayedItems.reduce((acc, curr) => acc + curr.delayDays, 0) / delayedItems.length).toFixed(1) : "0.0";
    const overdueCount = s.overdue;

    return { 
      total: s.totalUniqueDrawings || s.totalSubmittedSheets, 
      approved: s.approved, 
      rejectedOpen: s.rejectedOpen, 
      rejectedClosed: s.rejectedClosed, 
      pending: s.pending, 
      approvalRate: s.approvalRate,
      slaCompliance, 
      avgDelay, 
      overdueCount 
    };
  }, [cumulativeData, data]);

  // Column Configurations & Setting Management
  const [pendingPageSize, setPendingPageSize] = useState<number>(15);
  const [rejectedPageSize, setRejectedPageSize] = useState<number>(15);
  const [showTradeCol, setShowTradeCol] = useState<boolean>(true);
  const [showRefCol, setShowRefCol] = useState<boolean>(true);
  const [showRemarksCol, setShowRemarksCol] = useState<boolean>(true);

  // Document Composer Customization States
  const [primaryColor, setPrimaryColor] = useState<string>("#203864");
  const [accentColor, setAccentColor] = useState<string>("#eab308");
  const [selectedFont, setSelectedFont] = useState<string>("Inter");
  const [selectedComposerSections, setSelectedComposerSections] = useState<Set<string>>(new Set([
    'cover', 'index', 'info', 
    'monthly_cover', 'monthly_summary', 'monthly_kpis', 'monthly_charts', 'monthly_register_stats', 'monthly_trade_analysis', 'monthly_sla_bottlenecks', 'monthly_recommendations', 'monthly_registers',
    'cumulative_cover', 'cumulative_summary', 'cumulative_kpis', 'cumulative_charts', 'cumulative_register_stats', 'cumulative_trade_analysis', 'cumulative_registers',
    'rejected_items', 'pending_items', 'closing'
  ]));

  // Active Print Filtering System
  const [activePrintIds, setActivePrintIds] = useState<Set<string> | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [printMode, setPrintMode] = useState<'all' | 'current_section' | 'checkboxes' | 'range'>('all');
  const [customRangeStr, setCustomRangeStr] = useState<string>("");
  const [checkedSlideIds, setCheckedSlideIds] = useState<Record<string, boolean>>({});

  // Slide View Filtering Tabs
  const [selectedView, setSelectedView] = useState<'all' | 'monthly' | 'cumulative' | 'registers' | 'appendices'>('all');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  // Helper compiler
  const compileStatsForBaseType = (dataset: SubmittalRow[], bt: string, monthlyStart?: string, fullDataset?: SubmittalRow[]) => {
    if (bt === 'NCR') {
      const sourceData = fullDataset && fullDataset.length > 0 ? fullDataset : dataset;
      const ncrResult = processNCRData(sourceData, monthlyStart);
      const disciplines = ['STR', 'Arch', 'Mech', 'Elec', 'Infra', 'Landscape', 'HSE'];
      const isMon = !!monthlyStart;

      const normDisc = (d: string) => {
        const up = d.toUpperCase().trim();
        if (up === 'ARCH' || up === 'ARC' || up === 'ARCHITECTURAL') return 'ARCH';
        if (up === 'MECH' || up === 'MEC' || up === 'MECHANICAL') return 'MECH';
        if (up === 'ELEC' || up === 'ELE' || up === 'ELECTRICAL') return 'ELEC';
        if (up === 'INFRA' || up === 'INF' || up === 'INFR' || up === 'INFRASTRUCTURE') return 'INFRA';
        if (up === 'LAND' || up === 'LND' || up === 'LANDSCAPE') return 'LANDSCAPE';
        return up;
      };

      const stats = disciplines.map((disc) => {
        const targetNorm = normDisc(disc);
        if (isMon) {
          const sub = ncrResult.monthly.find(m => {
            const mClass = m.classification.toUpperCase().trim();
            if (disc === 'HSE') {
              return mClass === 'HSE' || mClass === 'NCR-HSE' || mClass.includes('HSE');
            }
            return normDisc(mClass.replace(/^NCR-/, '')) === targetNorm;
          }) || { rev0: 0, revHigh: 0, totalSubs: 0, approved: 0, rejectedOpen: 0, rejectedClosed: 0, pending: 0, overdue: 0 };
          
          return {
            discipline: disc,
            Rev00: sub.rev0,
            FurtherRev: sub.revHigh,
            Approved: sub.approved,
            RejectedOpen: sub.rejectedOpen,
            RejectedClosed: sub.rejectedClosed,
            Pending: sub.pending,
            Total: sub.totalSubs,
            Closed: sub.approved,
            Open: sub.rejectedOpen
          };
        } else {
          const sub = ncrResult.cumulative.find(c => normDisc(c.discipline) === targetNorm) || { totalUnique: 0, open: 0, closed: 0, underReview: 0, approved: 0, rejected: 0, rev0: 0, revHigh: 0 };
          return {
            discipline: disc,
            Rev00: sub.rev0 || 0,
            FurtherRev: sub.revHigh || 0,
            Approved: sub.approved,
            RejectedOpen: sub.rejected,
            RejectedClosed: 0,
            Pending: sub.underReview,
            Total: (sub.rev0 || 0) + (sub.revHigh || 0),
            Closed: sub.closed,
            Open: sub.open
          };
        }
      });

      const totalRow = {
        discipline: "TOTAL",
        Rev00: stats.reduce((acc, curr) => acc + Number(curr.Rev00), 0),
        FurtherRev: stats.reduce((acc, curr) => acc + Number(curr.FurtherRev), 0),
        Approved: stats.reduce((acc, curr) => acc + Number(curr.Approved), 0),
        RejectedOpen: stats.reduce((acc, curr) => acc + Number(curr.RejectedOpen), 0),
        RejectedClosed: stats.reduce((acc, curr) => acc + Number(curr.RejectedClosed), 0),
        Pending: stats.reduce((acc, curr) => acc + Number(curr.Pending), 0),
        Total: stats.reduce((acc, curr) => acc + Number(curr.Total), 0),
        Closed: stats.reduce((acc, curr) => acc + Number(curr.Closed), 0),
        Open: stats.reduce((acc, curr) => acc + Number(curr.Open), 0),
      };

      return { stats, totalRow, hasData: totalRow.Total > 0 };
    }

    const typeData = dataset.filter(d => {
      const docT = (d.documentType || 'GENERAL').toUpperCase();
      const wf = (d.workflowFamily || '').toUpperCase();
      const docNo = (d.docNo || '').toUpperCase();
      const lt = (d.logType || '').toUpperCase();
      const sf = (d.sourceFile || '').toUpperCase();

      const isABD = wf === 'ABD' || docT.startsWith('ABD') || docT.includes('AS-BUILT') || docT.includes('AS BUILT') || docNo.startsWith('ABD-') || lt.includes('ABD') || lt.includes('AS-BUILT') || lt.includes('AS BUILT') || sf.includes('ABD') || sf.includes('AS-BUILT');

      if (bt === 'ABD') return isABD;
      if (bt === 'SDW' || bt === 'SHD') return !isABD && (docT.includes('SDW') || wf === 'SDW' || docT.includes('SHD') || wf === 'SHD' || docNo.startsWith('SDW-') || docNo.startsWith('SHD-') || lt.includes('SDW') || lt.includes('SHD') || lt.includes('SHOP'));
      if (wf === bt) return true;
      if (docT.startsWith(`${bt}-`) || docT === bt) return true;
      if (bt === 'NCR' && (docT.includes('NCR') || wf === 'NCR' || docNo.startsWith('NCR-'))) return true;
      if (bt === 'SOR' && (docT.includes('SOR') || wf === 'SOR' || docNo.startsWith('SOR-'))) return true;
      if (bt === 'RFI' && (docT.includes('RFI') || wf === 'RFI' || docNo.startsWith('RFI-'))) return true;
      if (bt === 'QS' && (docT.includes('QS') || wf === 'QS' || docNo.startsWith('QS-'))) return true;
      if (bt === 'LTR' && (docT.includes('LTR') || docT.includes('CORRES') || wf === 'LETTER' || docNo.startsWith('LTR-'))) return true;
      return false;
    });

    let disciplinesInThisType: string[] = [];
    if (bt === 'LTR') {
      disciplinesInThisType = Array.from(new Set(typeData.map(d => d.stakeholder || 'GENERAL')));
    } else {
      const predefinedDisciplines = bt === 'NCR' ? ['STR', 'Arch', 'Mech', 'Elec', 'Infra', 'Landscape', 'HSE'] : ['STR', 'Arch', 'Mech', 'Elec', 'Infra', 'Landscape', 'SURVEY'];
      const parsedDisciplines = typeData.map(d => resolveRowDiscipline(d, bt));
      const activeDisciplinesSet = new Set(parsedDisciplines);

      let list: string[] = [];
      predefinedDisciplines.forEach(b => {
        list.push(b);
        if (b === 'STR' && activeDisciplinesSet.has('STR/SUR')) {
          list.push('STR/SUR');
        }
      });
      parsedDisciplines.forEach(p => {
        if (p && p !== 'GENERAL' && !list.includes(p)) {
          list.push(p);
        }
      });
      disciplinesInThisType = list;
    }

    const stats = disciplinesInThisType.map((disc) => {
      const dData = typeData.filter((d) => {
        const rDisc = resolveRowDiscipline(d, bt);
        return rDisc === disc;
      });

      const s = bt === 'NCR' ? calculateNCRStats(dData, false) : (bt === 'SOR' ? calculateSORStats(dData, false) : (bt === 'LTR' ? calculateLTRStats(dData, false) : calculateStats(dData, dataset)));
      const isMonthlyReport = !!monthlyStart;
      const countForType = isMonthlyReport 
        ? (s.totalSubmittedSheets ?? ((s.totalSheetsRev0 || 0) + (s.totalSheetsFurtherRev || 0)))
        : (s.totalUniqueDrawings !== undefined ? s.totalUniqueDrawings : ((s.totalSheetsRev0 || 0) + (s.totalSheetsFurtherRev || 0)));
      return {
        discipline: disc,
        Rev00: s.totalSheetsRev0 || 0,
        FurtherRev: s.totalSheetsFurtherRev || 0,
        Approved: s.approved,
        RejectedOpen: s.rejectedOpen,
        RejectedClosed: s.rejectedClosed,
        Pending: s.pending,
        Total: countForType,
        Closed: bt === 'NCR' || bt === 'SOR' ? s.approved : s.approved + s.rejectedClosed,
        Open: bt === 'NCR' || bt === 'SOR' ? s.rejectedOpen : s.rejectedOpen + s.pending,
      };
    });

    const totalRow = {
      discipline: "TOTAL",
      Rev00: stats.reduce((acc, curr) => acc + Number(curr.Rev00), 0),
      FurtherRev: stats.reduce((acc, curr) => acc + Number(curr.FurtherRev), 0),
      Approved: stats.reduce((acc, curr) => acc + Number(curr.Approved), 0),
      RejectedOpen: stats.reduce((acc, curr) => acc + Number(curr.RejectedOpen), 0),
      RejectedClosed: stats.reduce((acc, curr) => acc + Number(curr.RejectedClosed), 0),
      Pending: stats.reduce((acc, curr) => acc + Number(curr.Pending), 0),
      Total: stats.reduce((acc, curr) => acc + Number(curr.Total), 0),
      Closed: stats.reduce((acc, curr) => acc + Number(curr.Closed), 0),
      Open: stats.reduce((acc, curr) => acc + Number(curr.Open), 0),
    };

    return { stats, totalRow, hasData: totalRow.Total > 0 };
  };

  const orderedPredefinedBaseTypes = ['ABD', 'SDW', 'SHD', 'MAR', 'QS', 'DOC', 'RFI', 'LTR', 'WIR', 'MIR', 'NCR', 'SOR'];
  const baseTypes = useMemo(() => {
    return Array.from(new Set(data.flatMap(d => {
      const types: string[] = [];
      if (d.workflowFamily && d.workflowFamily !== 'UNKNOWN') {
        const wf = d.workflowFamily.toUpperCase();
        types.push(wf === 'LETTER' ? 'LTR' : wf);
      }
      let dt = d.documentType || "GENERAL";
      if (dt === 'NCR') dt = 'HSE';
      const prefix = dt.split('-')[0].trim().toUpperCase();
      if (prefix) types.push(prefix);
      return types;
    }))).filter(Boolean)
      .filter(t => !['CORRESPONDENCE', 'LETTERS'].includes(t))
      .sort((a, b) => {
        let ai = orderedPredefinedBaseTypes.indexOf(a);
        let bi = orderedPredefinedBaseTypes.indexOf(b);
        if (ai === -1) ai = 999;
        if (bi === -1) bi = 999;
        return ai - bi;
      });
  }, [data]);

  // Standard visual render parts
  const renderStandardTable = (statsData: Record<string, any>, cols: Record<string, any>[]) => (
    <table className="w-[48%] text-sm text-center border-collapse shrink-0" style={{ border: '2px solid #203864' }}>
      <thead>
        <tr style={{ backgroundColor: PRIMARY_BLUE, color: 'white' }}>
          <th className="p-2 border border-[#4472c4] font-bold" colSpan={1}>{language === 'ar' ? 'الحالة' : 'STATUS'}</th>
          <th className="p-2 border border-[#4472c4]" colSpan={cols.length - 1}></th>
        </tr>
        <tr style={{ backgroundColor: '#2f75b5', color: 'white', fontSize: '13px' }}>
          {cols.map((c, i) => (
            <th key={i} className="p-2 border border-[#4472c4] font-bold">
              {getColLabel(c.label, language)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white text-[#333]">
        {statsData.stats.map((s: Record<string, any>, index: number) => (
          <tr key={`${s.discipline}-${index}`} className="even:bg-[#f2f2f2] h-[36px]">
            <td className="p-2 border border-[#cbd5e1] font-medium text-xs">
              {getDiscName(s.discipline, language)}
            </td>
            {cols.slice(1).map((c, i) => (
              <td key={i} className={`p-2 border border-[#cbd5e1] text-xs ${c.key === "Total" ? "font-bold" : ""}`}>
                {s[c.key] !== undefined && s[c.key] !== null ? s[c.key] : ''}
              </td>
            ))}
          </tr>
        ))}
        <tr className="bg-[#ddebf7] h-[45px] font-bold text-xs" style={{ color: PRIMARY_BLUE }}>
          <td className="p-2 border border-[#cbd5e1]">{getDiscName(statsData.totalRow.discipline, language)}</td>
          {cols.slice(1).map((c, i) => (
            <td key={i} className="p-2 border border-[#cbd5e1]">
              {statsData.totalRow[c.key]}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );

  const renderStandardBar = (statsData: Record<string, any>, titleStr: string) => (
    <div className="w-[48%] h-[350px] flex flex-col justify-center items-center">
      <h3 className="text-center font-bold mb-4 text-[#203864] text-lg">{getChartTitle(titleStr, language)}</h3>
      <div className="w-[620px] h-[280px] flex items-center justify-center">
        <BarChart width={620} height={280} data={statsData.stats} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="discipline" tickFormatter={(d) => getDiscName(d, language)} tick={{ fontSize: 13, fill: '#333' }} />
          <YAxis tick={{ fontSize: 13, fill: '#333' }} />
          <RechartsTooltip cursor={{ fill: '#F8FAFC' }} />
          <Legend wrapperStyle={{ fontSize: "12px", marginTop: "10px" }} />
          <Bar dataKey="Rev00" stackId="a" fill="#2f75b5" name={language === "ar" ? "مراجعة 00" : "Rev.00"} isAnimationActive={false} />
          <Bar dataKey="FurtherRev" stackId="a" fill="#bdd7ee" name={language === "ar" ? "مراجعات لاحقة" : "Further Rev."} isAnimationActive={false} />
        </BarChart>
      </div>
    </div>
  );

  const renderPieGrid = (
    statsData: Record<string, any>,
    titleStr: string,
    labels: string[] = ["Approved", "Rejected", "Pending"],
  ) => (
    <div className="flex flex-col h-full items-start px-28 pb-10 pt-4">
      {titleStr && <h3 className="w-full text-center font-bold text-sm mb-6 text-[#1E3A5F]">{titleStr}</h3>}
      <div className="flex flex-wrap gap-x-12 gap-y-12 justify-center items-center w-full">
        {statsData.stats.slice(0, 6).map((s: Record<string, any>, index: number) => {
          let pieData = [];
          const PIE_COLORS: Record<string, string> = {
            "Approved": "#70AD47",
            "Closed": "#70AD47",
            "Rejected": "#C00000",
            "Open": "#C00000",
            "Pending": "#FFC000",
            "Sent": "#5b9bd5",
            "Received": "#ed7d31"
          };

          if (labels.length === 2 && labels[0] === "Closed") {
            pieData = [
              { name: "Closed", value: Number(s.Closed) || 0, fill: PIE_COLORS["Closed"] },
              { name: "Pending", value: Number(s.Pending) || 0, fill: PIE_COLORS["Pending"] },
            ];
          } else if (labels.length === 3 && labels[1] === "Open") {
            pieData = [
              { name: "Closed", value: Number(s.Closed) || 0, fill: PIE_COLORS["Closed"] },
              { name: "Open", value: Number(s.Open) || 0, fill: PIE_COLORS["Open"] },
              { name: "Pending", value: Number(s.Pending) || 0, fill: PIE_COLORS["Pending"] },
            ];
          } else if (labels.length === 2 && labels[0] === "Sent") {
            pieData = [
              { name: "Sent", value: Number(s.Rev00) || 0, fill: PIE_COLORS["Sent"] },
              { name: "Received", value: Number(s.FurtherRev) || 0, fill: PIE_COLORS["Received"] },
            ];
          } else {
            pieData = [
              { name: "Approved", value: Number(s.Approved) || 0, fill: PIE_COLORS["Approved"] },
              { name: "Rejected", value: Number(s.RejectedOpen) + Number(s.RejectedClosed) || 0, fill: PIE_COLORS["Rejected"] },
              { name: "Pending", value: Number(s.Pending) || 0, fill: PIE_COLORS["Pending"] },
            ];
          }

          const total = pieData.reduce((acc, curr) => acc + curr.value, 0);
          const finalData = total === 0 ? pieData.map(p => ({ ...p, value: 1.0001, actualValue: 0, totalAmount: 1 })) : pieData.map(p => ({ ...p, totalAmount: total }));

          const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, payload }: any) => {
            const RADIAN = Math.PI / 180;
            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
            const x = cx + radius * Math.cos(-midAngle * RADIAN);
            const y = cy + radius * Math.sin(-midAngle * RADIAN);
            const val = payload.actualValue !== undefined ? payload.actualValue : payload.value;
            if (val === 0 || payload.value === 1.0001) return null;
            const percent = ((val / payload.totalAmount) * 100).toFixed(0);
            if (percent === "0") return null;
            return (
              <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
                {`${percent}%`}
              </text>
            );
          };

          return (
            <div key={`${s.discipline}-${index}`} className="w-[30%] flex flex-col items-center justify-center">
              <div className="w-full text-center text-[#1E3A5F] text-[13px] font-bold mb-4">
                {getDiscName(s.discipline, language)}
              </div>
              <div className="w-40 h-40 flex items-center justify-center">
                <PieChart width={160} height={160}>
                  <Pie data={finalData} cx="50%" cy="50%" outerRadius={65} dataKey="value" isAnimationActive={false} stroke="none" labelLine={false} label={renderCustomizedLabel}>
                    {finalData.map((e, index) => <Cell key={`cell-${index}`} fill={e.fill} />)}
                  </Pie>
                  <RechartsTooltip formatter={(value, name, props) => {
                    const actual = props.payload.actualValue !== undefined ? props.payload.actualValue : value;
                    const percent = ((actual as number / props.payload.totalAmount) * 100).toFixed(1);
                    return [`${actual} (${percent}%)`, getPieLabelTranslator(String(name), language)];
                  }} />
                </PieChart>
              </div>
              <div className="flex items-center justify-center gap-3 mt-4 w-full flex-wrap">
                {pieData.map(p => (
                  <div key={p.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5" style={{ backgroundColor: p.fill }}></div>
                    <span className="text-[11px] text-[#333] font-medium">{getPieLabelTranslator(p.name, language)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Appendices Data Compilation
  const pendingItems = useMemo(() => {
    return cumulativeData.filter(d => d.overdue && d.workflowStage === 'Pending' && !d.documentType?.includes('LTR')).sort((a, b) => b.delayDays - a.delayDays);
  }, [cumulativeData]);

  const rejectedItems = useMemo(() => {
    return cumulativeData.filter(d => d.overdue && d.workflowStage === 'Rejected' && !d.documentType?.includes('LTR')).sort((a, b) => b.delayDays - a.delayDays);
  }, [cumulativeData]);

  const pendingPages = useMemo(() => {
    const pages = [];
    for (let i = 0; i < pendingItems.length; i += pendingPageSize) {
      pages.push(pendingItems.slice(i, i + pendingPageSize));
    }
    return pages;
  }, [pendingItems, pendingPageSize]);

  const rejectedPages = useMemo(() => {
    const pages = [];
    for (let i = 0; i < rejectedItems.length; i += rejectedPageSize) {
      pages.push(rejectedItems.slice(i, i + rejectedPageSize));
    }
    return pages;
  }, [rejectedItems, rejectedPageSize]);


  // Slide Templates Construction
  const renderContentSlide = (content: React.ReactNode, titleStr: string, keyId: string) => {
    const isHidden = activePrintIds !== null && !activePrintIds.has(keyId);
    return (
      <div
        id={keyId}
        className={`presentation-slide bg-white relative mb-8 print:mb-0 overflow-hidden border border-[#e2e8f0] print:border-none flex flex-col shrink-0 ${isHidden ? 'hidden print:hidden' : 'block print:block'}`}
        style={{ width: '1500px', height: '843px', pageBreakAfter: 'always', breakAfter: 'page' }}
      >
        <div className="w-full text-white shrink-0" style={{ backgroundColor: primaryColor, height: '110px' }}>
          <div className="flex items-center justify-between h-full px-12">
            <h1 className="text-3xl font-bold">{titleStr}</h1>
            <CompanyLogo projectInfo={projectInfo} />
          </div>
        </div>
        <div className="w-full h-2 shrink-0" style={{ backgroundColor: accentColor }}></div>
        <div className="flex-1 w-full bg-white relative">
          {content}
        </div>
        <div className="w-full h-8 flex items-center justify-between px-12 shrink-0" style={{ backgroundColor: primaryColor, color: 'white', fontSize: '10px' }}>
          <div>[{pInfo.projectName}] | {language === 'ar' ? 'التحكم بالمستندات' : 'Document Control'} | [{new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' })}]</div>
          <div className="text-[9px] text-[#cbd5e1]">{language === 'ar' ? 'تدقيق مستقل - دقة تقريبية' : 'INDEPENDENT AUDIT ENGINE - APPROXIMATE ACCURACY'}</div>
          <div>{language === 'ar' ? 'سري وخاص' : 'CONFIDENTIAL'}</div>
        </div>
      </div>
    );
  };

  const renderDividerSlide = (titleStr: string, subtitleStr: string, keyId: string) => {
    const isHidden = activePrintIds !== null && !activePrintIds.has(keyId);
    return (
      <div
        id={keyId}
        className={`presentation-slide text-white relative mb-8 print:mb-0 overflow-hidden border border-[#e2e8f0] print:border-none flex shrink-0 ${isHidden ? 'hidden print:hidden' : 'block print:block'}`}
        style={{ width: '1500px', height: '843px', backgroundColor: primaryColor, pageBreakAfter: 'always', breakAfter: 'page' }}
      >
        <div className="h-full w-5" style={{ backgroundColor: accentColor }}></div>
        <div className="flex-1 px-20 flex flex-col justify-center relative" style={{ borderLeft: `10px solid ${accentColor}` }}>
          <h1 className="text-4xl font-bold mb-6 tracking-wide text-white uppercase">{subtitleStr}</h1>
          <h2 className="text-xl text-[#94a3b8] font-medium">{titleStr}</h2>
        </div>
        <CompanyLogo projectInfo={projectInfo} extraPositionClass="absolute top-12 right-12 py-3" />
        <div className="absolute bottom-12 left-24 right-12">
          <div className="w-full h-[2px] mb-3" style={{ backgroundColor: accentColor }}></div>
          <div className="text-xs text-slate-400">[{pInfo.projectName}] | Document Control Executive Hub</div>
        </div>
      </div>
    );
  };

  // Build the complete list of ALL possible slides dynamically
  const allSlidesList = useMemo(() => {
    const slides: { id: string; view: 'monthly' | 'cumulative' | 'registers' | 'appendices' | 'cover'; title: string; element: React.ReactNode }[] = [];

    // --- MAIN REPORT COVER ---
    if (selectedComposerSections.has('cover')) {
      slides.push({
        id: "main-cover",
        view: "cover",
        title: language === 'ar' ? "صفحة الغلاف الرئيسية للمشروع" : "Main Project Cover",
        element: (
          <div className="w-full h-full text-white relative flex shrink-0" style={{ backgroundColor: primaryColor }}>
            <div className="h-full w-6" style={{ backgroundColor: accentColor }}></div>
            <div className="flex-1 px-28 flex flex-col justify-center relative">
              <span className="text-xs font-bold tracking-widest text-[#94a3b8] uppercase mb-3">EXECUTIVE REPORTING PLATFORM</span>
              <h1 className="text-[64px] font-extrabold mb-2 tracking-wide leading-none">{pInfo.projectName}</h1>
              <h2 className="text-[40px] font-bold tracking-wide mt-2" style={{ color: accentColor }}>EXECUTIVE PERFORMANCE DOSSIER</h2>
              <div className="w-full max-w-[800px] h-[3px] mt-12 mb-8" style={{ backgroundColor: accentColor }}></div>
              <div className="grid grid-cols-2 gap-6 max-w-[800px]">
                <div className="border border-slate-700/60 px-5 py-3 text-sm bg-slate-950/30">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">{language === 'ar' ? 'كود المشروع' : 'PROJECT ID CODE'}</span>
                  <span className="font-mono text-base font-bold text-white mt-1 block">{pInfo.projectCode}</span>
                </div>
                <div className="border border-slate-700/60 px-5 py-3 text-sm bg-slate-950/30">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">{language === 'ar' ? 'فترة التقرير' : 'REPORTING PERIOD'}</span>
                  <span className="text-base font-bold text-white mt-1 block">{language === 'ar' ? 'شامل ومفصل تراكمي/شهري' : 'Comprehensive Monthly & Cumulative'}</span>
                </div>
              </div>
            </div>
            <CompanyLogo projectInfo={projectInfo} extraPositionClass="absolute top-12 right-12 py-3" />
          </div>
        )
      });
    }

    // --- INTERACTIVE INDEX ---
    if (selectedComposerSections.has('index')) {
      slides.push({
        id: "main-index",
        view: "cover",
        title: language === 'ar' ? "فهرس محتويات التقرير" : "Table of Contents Index",
        element: (
          <div className="w-full h-full text-[#1e293b] bg-white relative flex flex-col shrink-0">
            <div className="w-full text-white shrink-0" style={{ backgroundColor: primaryColor, height: '110px' }}>
              <div className="flex items-center justify-between h-full px-12">
                <h1 className="text-3xl font-bold">{language === 'ar' ? "فهرس محتويات التقرير التنفيذي" : "EXECUTIVE DOSSIER INDEX"}</h1>
                <CompanyLogo projectInfo={projectInfo} />
              </div>
            </div>
            <div className="w-full h-2 shrink-0" style={{ backgroundColor: accentColor }}></div>
            <div className="flex-1 p-16 grid grid-cols-2 gap-12">
              <div className="space-y-4">
                <h3 className="text-lg font-bold border-b pb-2 text-[#203864]" style={{ color: primaryColor }}>
                  {language === 'ar' ? "القسم الأول: التقرير الشهري الحالي" : "SECTION I: CURRENT MONTHLY REPORT"}
                </h3>
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between border-b border-dashed pb-1">
                    <span>1. {language === 'ar' ? "الملخص التنفيذي الشهري" : "Monthly Executive Summary"}</span>
                    <span className="font-mono text-slate-400">Page 03</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed pb-1">
                    <span>2. {language === 'ar' ? "لوحة مؤشرات الأداء للشهر" : "Monthly KPI Dashboard"}</span>
                    <span className="font-mono text-slate-400">Page 04</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed pb-1">
                    <span>3. {language === 'ar' ? "الرسوم البيانية والحالة الشهرية" : "Monthly Overall Charts"}</span>
                    <span className="font-mono text-slate-400">Page 05</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed pb-1">
                    <span>4. {language === 'ar' ? "سجلات التخصصات الهندسية للشهر" : "Monthly Trade Commentary"}</span>
                    <span className="font-mono text-slate-400">Page 06</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed pb-1">
                    <span>5. {language === 'ar' ? "التوصيات الإدارية وخطة العمل" : "Monthly Actions & Advice"}</span>
                    <span className="font-mono text-slate-400">Page 07</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-bold border-b pb-2 text-[#203864]" style={{ color: primaryColor }}>
                  {language === 'ar' ? "القسم الثاني: التقرير التراكمي الشامل" : "SECTION II: LIFETIME CUMULATIVE STUDY"}
                </h3>
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between border-b border-dashed pb-1">
                    <span>1. {language === 'ar' ? "الملخص التراكمي للمشروع" : "Cumulative Executive Summary"}</span>
                    <span className="font-mono text-slate-400">Page 09</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed pb-1">
                    <span>2. {language === 'ar' ? "لوحة المؤشرات التراكمية التاريخية" : "Cumulative KPI Dashboard"}</span>
                    <span className="font-mono text-slate-400">Page 10</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed pb-1">
                    <span>3. {language === 'ar' ? "ملاحق البيانات والقوائم التفصيلية" : "Technical Appendices & Overdues"}</span>
                    <span className="font-mono text-slate-400">Page 12</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full h-8 flex items-center justify-between px-12 shrink-0" style={{ backgroundColor: primaryColor, color: 'white', fontSize: '10px' }}>
              <div>[{pInfo.projectName}] | Index</div>
              <div>{language === 'ar' ? 'سري ومطابق للمواصفات' : 'CONFIDENTIAL & COMPLIANT'}</div>
            </div>
          </div>
        )
      });
    }

    // --- PROJECT CHARTER & INFO ---
    if (selectedComposerSections.has('info')) {
      slides.push({
        id: "main-info",
        view: "cover",
        title: language === 'ar' ? "بيانات وبنية أطراف المشروع" : "Project Info & Stakeholders",
        element: renderContentSlide(
          <div className="p-16 flex flex-col h-full gap-8">
            <div className="border-l-4 pl-6" style={{ borderLeftColor: primaryColor }}>
              <h3 className="text-2xl font-bold" style={{ color: primaryColor }}>{language === 'ar' ? 'بيانات أطراف العقد والشركاء الرئيسيين للمشروع' : 'Project Contractual Charter & Key Stakeholders'}</h3>
              <p className="text-sm text-slate-500 mt-1">{language === 'ar' ? 'بنية الأطراف المتعاقدة ومسؤولي إدارة المخططات والتحكم بالمستندات' : 'Formal roles and contact hierarchies representing the contractual stakeholders'}</p>
            </div>
            <div className="grid grid-cols-2 gap-8 mt-4">
              <div className="bg-slate-50/70 border border-slate-100 p-8 rounded-xl space-y-4">
                <h4 className="font-bold text-sm uppercase tracking-wider text-slate-400">{language === 'ar' ? 'بيانات العقد الأساسية' : 'CONTRACT CHARTER'}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400 block text-xs font-bold uppercase">{language === 'ar' ? 'اسم العميل / المالك' : 'CLIENT / OWNER'}</span>
                    <span className="font-semibold text-slate-700 mt-0.5 block">{pInfo.clientName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs font-bold uppercase">{language === 'ar' ? 'الاستشاري المشرف' : 'SUPERVISING CONSULTANT'}</span>
                    <span className="font-semibold text-slate-700 mt-0.5 block">{pInfo.consultantName}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-xs font-bold uppercase">{language === 'ar' ? 'المقاول الرئيسي' : 'MAIN CONTRACTOR'}</span>
                    <span className="font-semibold text-slate-700 mt-0.5 block">{pInfo.contractorName}</span>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50/70 border border-slate-100 p-8 rounded-xl space-y-4">
                <h4 className="font-bold text-sm uppercase tracking-wider text-slate-400">{language === 'ar' ? 'فريق إدارة وضبط جودة المشروع' : 'MANAGEMENT TEAM'}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400 block text-xs font-bold uppercase">{language === 'ar' ? 'مدير المشروع الفني' : 'TECHNICAL PROJECT MANAGER'}</span>
                    <span className="font-semibold text-slate-700 mt-0.5 block">{pInfo.projectManager}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs font-bold uppercase">{language === 'ar' ? 'مدير ضبط الوثائق والمخططات' : 'DOCUMENT CONTROL MANAGER'}</span>
                    <span className="font-semibold text-slate-700 mt-0.5 block">{pInfo.documentControlManager}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          language === 'ar' ? "بيانات وبنية أطراف المشروع" : "PROJECT CONTRACT DETAILS",
          "main-info"
        )
      });
    }

    // --- SECTION 1: MONTHLY EXECUTIVE REPORT ---
    if (selectedComposerSections.has('monthly_cover')) {
      slides.push({
        id: "monthly-cover",
        view: "monthly",
        title: language === 'ar' ? "تقرير الإدارة التنفيذي الشهري" : "Monthly Executive Cover",
        element: (
          <div className="w-full h-full text-white relative flex shrink-0" style={{ backgroundColor: primaryColor }}>
            <div className="h-full w-6" style={{ backgroundColor: accentColor }}></div>
            <div className="flex-1 px-28 flex flex-col justify-center relative">
              <h1 className="text-[64px] font-bold mb-2 tracking-wide">DOCUMENT CONTROL</h1>
              <h2 className="text-[52px] font-bold tracking-wide" style={{ color: accentColor }}>MONTHLY EXECUTIVE REPORT</h2>
              <div className="w-full max-w-[700px] h-[2px] mt-16 mb-4" style={{ backgroundColor: accentColor }}></div>
              <div className="w-full max-w-[700px] border border-[#cbd5e1] px-5 py-3 text-lg bg-slate-900/40">
                [{pInfo.projectName}]
              </div>
              <div className="w-full max-w-[700px] border border-[#cbd5e1] px-5 py-3 text-lg bg-slate-900/40 mt-3">
                {language === 'ar' ? 'فترة التقرير الشهري الحالي' : 'CURRENT MONTHLY REPORTING PERIOD'}
              </div>
            </div>
            <CompanyLogo projectInfo={projectInfo} extraPositionClass="absolute top-12 right-12 py-3" />
          </div>
        )
      });
    }

    if (selectedComposerSections.has('monthly_summary')) {
      slides.push({
        id: "monthly-summary",
        view: "monthly",
        title: language === 'ar' ? "الملخص التنفيذي الشهري" : "Monthly Executive Summary",
        element: renderContentSlide(
          <div className="p-16 flex flex-col h-full gap-8">
            <div className="border-l-4 pl-6" style={{ borderLeftColor: primaryColor }}>
              <h3 className="text-2xl font-bold" style={{ color: primaryColor }}>{language === 'ar' ? 'ملخص الأداء والمؤشرات الرئيسية لشهر المراجعة' : 'Monthly Performance Highlights & Audit Summary'}</h3>
              <p className="text-sm text-slate-500 mt-1">{language === 'ar' ? 'تحليل الأنشطة الهندسية ومعدلات الامتثال للاتفاقيات' : 'Analytical highlights of submittals, response times, and compliance rates'}</p>
            </div>
            <div className="grid grid-cols-2 gap-10 mt-2">
              <div className="bg-slate-50 border border-slate-100 p-8 rounded-xl flex flex-col gap-4">
                {getMonthlySummary(overallMonthlyStats, language).map((line, i) => (
                  <div key={i} className="flex gap-3 text-sm text-[#334155] leading-relaxed">
                    <span style={{ color: primaryColor }} className="font-bold">●</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
              <div className="bg-[#f8fafc] border border-slate-200 p-8 rounded-xl flex flex-col justify-center">
                <h4 className="font-bold mb-3 flex items-center gap-2" style={{ color: primaryColor }}>
                  <Award className="w-5 h-5 text-amber-500" />
                  {language === 'ar' ? 'ملاحظة المدقق والمطابقة الفنية' : 'Technical Compliance Note'}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {language === 'ar' 
                    ? 'تم استنتاج مؤشرات هذا التقرير الفني شهرياً من خلال مطابقة عمليات المعاملات في النظام. يعرض النظام مؤشرات الدقة بناءً على AST المباشر ومقاييس التأخير التقريبية. يتطلب الاعتماد الفني تشغيلاً كاملاً لبيئة التحقق والتدقيق المستقل لضمان المطابقة المطلقة.'
                    : 'All statistical outcomes on this summary page are generated assistively via direct AST structural evaluations of database registers. Actual enterprise certification requires manual verification on independent local configurations.'}
                </p>
              </div>
            </div>
          </div>,
          language === 'ar' ? "الملخص التنفيذي الشهري" : "MONTHLY EXECUTIVE SUMMARY",
          "monthly-summary"
        )
      });
    }

    if (selectedComposerSections.has('monthly_kpis')) {
      slides.push({
        id: "monthly-kpis",
        view: "monthly",
        title: language === 'ar' ? "مؤشرات الأداء الشهرية" : "Monthly KPI Dashboard",
        element: renderContentSlide(
          <div className="p-12 flex flex-col h-full justify-between pb-16">
            <div className="grid grid-cols-4 gap-6">
              <div className="p-6 rounded-xl border flex flex-col justify-between h-36 shadow-sm" style={{ backgroundColor: `${primaryColor}15`, borderColor: `${primaryColor}30` }}>
                <span className="text-xs font-bold tracking-wider uppercase" style={{ color: primaryColor }}>{language === 'ar' ? 'إجمالي المعاملات' : 'Total Processed'}</span>
                <span className="text-4xl font-extrabold" style={{ color: primaryColor }}>{overallMonthlyStats.total}</span>
                <span className="text-[10px] text-slate-500 font-medium">{language === 'ar' ? 'خلال الشهر الجاري' : 'Current month records'}</span>
              </div>
              <div className="bg-[#e2f0d9] p-6 rounded-xl border border-emerald-200 flex flex-col justify-between h-36 shadow-sm">
                <span className="text-xs font-bold text-emerald-800 tracking-wider uppercase">{language === 'ar' ? 'نسبة الموافقات' : 'Quality Approval'}</span>
                <span className="text-4xl font-extrabold text-emerald-700">{overallMonthlyStats.approvalRate.toFixed(1)}%</span>
                <span className="text-[10px] text-slate-500 font-medium">{language === 'ar' ? 'رمز الكود أ و ب' : 'Code A & B status'}</span>
              </div>
              <div className="bg-[#fce4d6] p-6 rounded-xl border border-red-200 flex flex-col justify-between h-36 shadow-sm">
                <span className="text-xs font-bold text-red-800 tracking-wider uppercase">{language === 'ar' ? 'وثائق مرفوضة مفتوحة' : 'Open Rejections'}</span>
                <span className="text-4xl font-extrabold text-red-700">{overallMonthlyStats.rejectedOpen}</span>
                <span className="text-[10px] text-slate-500 font-medium">{language === 'ar' ? 'تتطلب إعادة تقديم فوري' : 'Action required'}</span>
              </div>
              <div className="bg-[#fff2cc] p-6 rounded-xl border border-amber-200 flex flex-col justify-between h-36 shadow-sm">
                <span className="text-xs font-bold text-amber-800 tracking-wider uppercase">{language === 'ar' ? 'الالتزام بـ SLA' : 'SLA Compliance'}</span>
                <span className="text-4xl font-extrabold text-amber-700">
                  {overallMonthlyStats.slaCompliance !== null ? `${overallMonthlyStats.slaCompliance.toFixed(1)}%` : (language === 'ar' ? 'لا توجد بيانات' : 'N/A')}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">{language === 'ar' ? 'في غضون المدة المحددة' : 'Responses met SLA'}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-8 mt-6">
              <div className="border border-slate-200 rounded-xl p-5 flex items-center gap-6 bg-slate-50">
                <Clock className="w-12 h-12" style={{ color: primaryColor }} />
                <div>
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wide block">{language === 'ar' ? 'متوسط مدة الرد (يوم)' : 'Average Response Delay (Days)'}</span>
                  <span className="text-2xl font-bold" style={{ color: primaryColor }}>{overallMonthlyStats.avgDelay} {language === 'ar' ? 'يوم' : 'Days'}</span>
                </div>
              </div>
              <div className="border border-slate-200 rounded-xl p-5 flex items-center gap-6 bg-slate-50">
                <AlertTriangle className="w-12 h-12 text-red-500" />
                <div>
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wide block">{language === 'ar' ? 'الوثائق المتأخرة بالرد' : 'Total Overdue Items'}</span>
                  <span className="text-2xl font-bold text-red-600">{overallMonthlyStats.overdueCount} {language === 'ar' ? 'معاملة معلقة متأخرة' : 'Overdue submittals'}</span>
                </div>
              </div>
            </div>
          </div>,
          language === 'ar' ? "لوحة مؤشرات الأداء الشهرية" : "MONTHLY KPI DASHBOARD",
          "monthly-kpis"
        )
      });
    }

    if (selectedComposerSections.has('monthly_charts')) {
      slides.push({
        id: "monthly-charts",
        view: "monthly",
        title: language === 'ar' ? "الرسوم البيانية لمستندات الشهر" : "Monthly Overall Charts",
        element: renderContentSlide(
          <div className="p-12 flex h-full items-center justify-between">
            <div className="w-[48%] flex flex-col justify-center items-center h-full">
              <h3 className="font-bold text-lg mb-6 text-center" style={{ color: primaryColor }}>{language === 'ar' ? 'توزيع التقديمات حسب نوع السجل (شهري)' : 'Monthly Submittal Volume by Log Type'}</h3>
              <BarChart width={560} height={320} data={baseTypes.map(bt => ({ name: bt, count: monthlyData.filter(d => {
                const docT = (d.documentType || d.logType || 'GENERAL').toUpperCase();
                const wf = (d.workflowFamily || '').toUpperCase();
                return wf === bt || docT.startsWith(`${bt}-`) || docT === bt || docT.includes(bt);
              }).length }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="count" fill={primaryColor} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </div>
            <div className="w-[48%] flex flex-col justify-center items-center h-full">
              <h3 className="font-bold text-lg mb-6 text-center" style={{ color: primaryColor }}>{language === 'ar' ? 'توزيع حالات الجودة العام (شهري)' : 'Overall Monthly Status Ratio'}</h3>
              <PieChart width={320} height={320}>
                <Pie
                  data={[
                    { name: language === 'ar' ? 'معتمد' : 'Approved', value: overallMonthlyStats.approved, fill: '#70AD47' },
                    { name: language === 'ar' ? 'مرفوض' : 'Rejected', value: overallMonthlyStats.rejectedOpen, fill: '#C00000' },
                    { name: language === 'ar' ? 'معلق' : 'Pending', value: overallMonthlyStats.pending, fill: '#FFC000' }
                  ]}
                  cx="50%" cy="50%" outerRadius={100} dataKey="value" isAnimationActive={false} label
                >
                  <Cell fill="#70AD47" />
                  <Cell fill="#C00000" />
                  <Cell fill="#FFC000" />
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </div>
          </div>,
          language === 'ar' ? "الرسوم البيانية لمستندات الشهر" : "MONTHLY STATUS CHARTS",
          "monthly-charts"
        )
      });
    }

    if (selectedComposerSections.has('monthly_register_stats')) {
      slides.push({
        id: "monthly-register-stats",
        view: "monthly",
        title: language === 'ar' ? "جدول سجلات الشهر الحالي" : "Monthly Register Statistics Table",
        element: renderContentSlide(
          <div className="p-12 flex flex-col h-full justify-start gap-6">
            <h3 className="font-bold text-xl border-b pb-2" style={{ color: primaryColor }}>{language === 'ar' ? 'تفصيل السجلات الهندسية لشهر المراجعة الحالي' : 'Register-Level Metrics for Selected Reporting Month'}</h3>
            <table className="w-full text-sm text-center border-collapse border border-slate-200 shadow-sm mt-4">
              <thead>
                <tr style={{ backgroundColor: primaryColor, color: 'white' }}>
                  <th className="p-3 border border-slate-300 font-bold">{language === 'ar' ? 'اسم السجل الهندسي' : 'Register Name'}</th>
                  <th className="p-3 border border-slate-300 font-bold">{language === 'ar' ? 'إجمالي المعاملات' : 'Total Items'}</th>
                  <th className="p-3 border border-slate-300 font-bold">{language === 'ar' ? 'معتمد (أ و ب)' : 'Approved (A/B)'}</th>
                  <th className="p-3 border border-slate-300 font-bold">{language === 'ar' ? 'مرفوض (ج)' : 'Rejected (C)'}</th>
                  <th className="p-3 border border-slate-300 font-bold">{language === 'ar' ? 'معلق (قيد المراجعة)' : 'Pending'}</th>
                </tr>
              </thead>
              <tbody>
                {baseTypes.map(bt => {
                  const bStats = compileStatsForBaseType(monthlyData, bt, startDate, data);
                  return (
                    <tr key={bt} className="even:bg-slate-50 hover:bg-slate-100/70 h-11 transition-colors">
                      <td className="p-3 border border-slate-200 font-bold" style={{ color: primaryColor }}>{bt}</td>
                      <td className="p-3 border border-slate-200 font-medium">{bStats.totalRow.Total}</td>
                      <td className="p-3 border border-slate-200 text-emerald-600 font-semibold">{bStats.totalRow.Approved}</td>
                      <td className="p-3 border border-slate-200 text-red-600 font-semibold">{bStats.totalRow.RejectedOpen}</td>
                      <td className="p-3 border border-slate-200 text-amber-600 font-medium">{bStats.totalRow.Pending}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>,
          language === 'ar' ? "جدول سجلات الشهر الحالي" : "MONTHLY REGISTER METRICS",
          "monthly-register-stats"
        )
      });
    }

    if (selectedComposerSections.has('monthly_trade_analysis')) {
      slides.push({
        id: "monthly-trade-analysis",
        view: "monthly",
        title: language === 'ar' ? "تحليل التخصصات الهندسية للشهر" : "Monthly Trade Analysis",
        element: renderContentSlide(
          <div className="p-12 flex h-full items-center justify-between">
            <div className="w-[48%] flex flex-col justify-center items-center h-full">
              <h3 className="font-bold text-lg mb-6 text-center" style={{ color: primaryColor }}>{language === 'ar' ? 'توزيع حجم التقديمات حسب التخصص' : 'Monthly Submittals by Design Trade'}</h3>
              <BarChart width={560} height={320} layout="vertical" data={['STR', 'Arch', 'Mech', 'Elec', 'HSE', 'Infra'].map(trade => ({ name: trade, count: monthlyData.filter(d => (d.trade || '').toUpperCase().startsWith(trade.toUpperCase())).length }))}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" />
                <RechartsTooltip />
                <Bar dataKey="count" fill={primaryColor} radius={[0, 4, 4, 0]} isAnimationActive={false} />
              </BarChart>
            </div>
            <div className="w-[48%] p-8 bg-slate-50 border border-slate-100 rounded-xl flex flex-col gap-4">
              <h4 className="font-bold border-b pb-2" style={{ color: primaryColor }}>{language === 'ar' ? 'التحليل الهندسي للتخصصات' : 'Engineering Disciplines Commentary'}</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                {language === 'ar'
                  ? 'يوضح التحليل الشهري تباين معدل الإرساليات والتقديمات بين التخصصات الهندسية الرئيسية. يسجل التخصص الإنشائي والمعماري الحصة الكبرى من التقديمات لغايات اعتماد المخططات التنفيذية، في حين تحتل تخصصات الأعمال الميكانيكية والكهربائية (MEP) النسبة الأكبر في تقديمات المواد (MAR) والطلب على استلام الأعمال (WIR).'
                  : 'The structural and architectural disciplines hold the largest volume of submittals, predominantly in Shop Drawings (SHD). Mechanical, Electrical, and Plumbing (MEP) trades exhibit significant material submittal (MAR) activities, requiring synchronized tracking to avoid bottleneck risks.'}
              </p>
            </div>
          </div>,
          language === 'ar' ? "تحليل التخصصات الهندسية للشهر" : "MONTHLY DISCIPLINE ANALYSIS",
          "monthly-trade-analysis"
        )
      });
    }

    if (selectedComposerSections.has('monthly_sla_bottlenecks')) {
      slides.push({
        id: "monthly-sla-bottlenecks",
        view: "monthly",
        title: language === 'ar' ? "تحليل الاختناقات وفترات التأخير للشهر" : "Monthly SLA & Bottleneck Analysis",
        element: renderContentSlide(
          <div className="p-16 flex flex-col h-full gap-8">
            <div className="border-l-4 pl-6" style={{ borderLeftColor: primaryColor }}>
              <h3 className="text-2xl font-bold" style={{ color: primaryColor }}>{language === 'ar' ? 'تحليل الاختناقات وسلسلة التوريد المستندية' : 'Operational Bottleneck & Turnaround Study'}</h3>
              <p className="text-sm text-slate-500 mt-1">{language === 'ar' ? 'تحديد مواطن التأخير وأثر فترات المراجعة على سير المشروع' : 'Pinpointing delay factors and turnaround bottlenecks in monthly workflows'}</p>
            </div>
            <div className="grid grid-cols-2 gap-10 mt-2">
              <div className="bg-amber-50/50 border border-amber-100 p-8 rounded-xl">
                <h4 className="font-bold text-amber-800 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  {language === 'ar' ? 'سجلات فئات الوثائق الأعلى تأخيراً' : 'Top Delay Log Types'}
                </h4>
                <div className="flex flex-col gap-3">
                  {baseTypes.slice(0, 3).map(bt => {
                    const bStats = compileStatsForBaseType(monthlyData, bt, startDate, data);
                    return (
                      <div key={bt} className="flex justify-between items-center text-sm border-b border-amber-100 pb-2">
                        <span className="font-semibold text-slate-700">{bt} - {language === 'ar' ? 'المعاملات' : 'Log Items'}</span>
                        <span className="text-amber-800 font-bold">{bStats.totalRow.Pending} {language === 'ar' ? 'معلق حالياً' : 'pending review'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-8 rounded-xl flex flex-col justify-center">
                <h4 className="font-bold mb-3" style={{ color: primaryColor }}>{language === 'ar' ? 'مؤشرات مستوى استجابة الاستشاري' : 'Consultant Responsiveness Metrics'}</h4>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  {language === 'ar'
                    ? `أظهرت مؤشرات الاستجابة تأخراً في استلام الردود لبعض فئات المخططات الهندسية والمواد بمعدل تأخير عام قدره ${overallMonthlyStats.avgDelay} يوم للأعمال المتأخرة.`
                    : `Review cycle metrics indicate that some material submittals (MAR) exceeded standard response timelines, registering an average delay of ${overallMonthlyStats.avgDelay} days.`}
                </p>
              </div>
            </div>
          </div>,
          language === 'ar' ? "تحليل الاختناقات وفترات التأخير للشهر" : "MONTHLY SLA & BOTTLENECKS",
          "monthly-sla-bottlenecks"
        )
      });
    }

    if (selectedComposerSections.has('monthly_recommendations')) {
      slides.push({
        id: "monthly-recommendations",
        view: "monthly",
        title: language === 'ar' ? "خطة العمل والتوصيات للشهر" : "Monthly Recommendations",
        element: renderContentSlide(
          <div className="p-16 flex flex-col h-full gap-8">
            <div className="border-l-4 pl-6" style={{ borderLeftColor: primaryColor }}>
              <h3 className="text-2xl font-bold" style={{ color: primaryColor }}>{language === 'ar' ? 'التوصيات الإدارية وخطة العمل الفورية' : 'Strategic Action Plan & Engineering Advice'}</h3>
              <p className="text-sm text-slate-500 mt-1">{language === 'ar' ? 'إجراءات تصحيحية فورية ومقترحات لتحسين الأداء العام' : 'Immediate corrective measures to optimize response cycle and prevent site delays'}</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 p-10 rounded-xl flex flex-col gap-5 mt-2">
              {getMonthlyRecommendations(overallMonthlyStats, language).map((rec, i) => (
                <div key={i} className="flex gap-4 text-sm text-[#334155] leading-relaxed">
                  <span className="font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 text-white" style={{ backgroundColor: primaryColor }}>{i+1}</span>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>,
          language === 'ar' ? "خطة العمل والتوصيات للشهر" : "MONTHLY STRATEGIC RECOMMENDATIONS",
          "monthly-recommendations"
        )
      });
    }

    // --- SECTION 2: CUMULATIVE EXECUTIVE REPORT ---
    if (selectedComposerSections.has('cumulative_cover')) {
      slides.push({
        id: "cumulative-cover",
        view: "cumulative",
        title: language === 'ar' ? "التقرير التنفيذي التراكمي الشامل" : "Cumulative Executive Cover",
        element: (
          <div className="w-full h-full text-white relative flex shrink-0" style={{ backgroundColor: primaryColor }}>
            <div className="h-full w-6" style={{ backgroundColor: accentColor }}></div>
            <div className="flex-1 px-28 flex flex-col justify-center relative">
              <h1 className="text-[64px] font-bold mb-2 tracking-wide">DOCUMENT CONTROL</h1>
              <h2 className="text-[52px] font-bold tracking-wide" style={{ color: accentColor }}>LIFETIME CUMULATIVE REPORT</h2>
              <div className="w-full max-w-[700px] h-[2px] mt-16 mb-4" style={{ backgroundColor: accentColor }}></div>
              <div className="w-full max-w-[700px] border border-[#cbd5e1] px-5 py-3 text-lg bg-slate-900/40">
                [{pInfo.projectName}]
              </div>
            <div className="w-full max-w-[700px] border border-[#cbd5e1] px-5 py-3 text-lg bg-slate-900/40 mt-3">
              {language === 'ar' ? 'تاريخ المشروع التراكمي الشامل' : 'OVERALL LIFETIME PROJECT PERFORMANCE DATABASE'}
            </div>
          </div>
          <CompanyLogo projectInfo={projectInfo} extraPositionClass="absolute top-12 right-12 py-3" />
        </div>
      )
    });
    }

    if (selectedComposerSections.has('cumulative_summary')) {
      slides.push({
        id: "cumulative-summary",
        view: "cumulative",
        title: language === 'ar' ? "الملخص التراكمي للمشروع" : "Cumulative Executive Summary",
        element: renderContentSlide(
          <div className="p-16 flex flex-col h-full gap-8">
            <div className="border-l-4 pl-6" style={{ borderLeftColor: primaryColor }}>
              <h3 className="text-2xl font-bold" style={{ color: primaryColor }}>{language === 'ar' ? 'الملخص التنفيذي التراكمي للأداء الهندسي ومراقبة الوثائق' : 'Overall Cumulative Performance & Document Control Status'}</h3>
              <p className="text-sm text-slate-500 mt-1">{language === 'ar' ? 'إجمالي الأنشطة المنجزة وسير أعمال الموافقات وجودة الوثائق التاريخية' : 'Lifetime synthesis of submittals, response turnarounds, and quality achievements'}</p>
            </div>
            <div className="grid grid-cols-2 gap-10 mt-2">
              <div className="bg-slate-50 border border-slate-100 p-8 rounded-xl flex flex-col gap-4">
                {getCumulativeSummary(overallCumulativeStats, language).map((line, i) => (
                  <div key={i} className="flex gap-3 text-sm text-[#334155] leading-relaxed">
                    <span style={{ color: primaryColor }} className="font-bold">●</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
              <div className="bg-[#f8fafc] border border-slate-200 p-8 rounded-xl flex flex-col justify-center">
                <h4 className="font-bold mb-3 flex items-center gap-2" style={{ color: primaryColor }}>
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  {language === 'ar' ? 'التحقق التاريخي لمطابقة النظام' : 'Lifetime Verification Metrics'}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {language === 'ar'
                    ? 'تم فحص جودة البيانات التراكمية في هذا القسم عن طريق فلاتر التحقق الفنية وقاعدة الاستدلال التقريبية للمشروع. يرجى مراجعة ملخص التدقيق النهائي المستقل للحصول على التقارير الفنية الأكثر عمقاً.'
                    : 'Cumulative indicators demonstrate project health across major workflows. Dynamic calculations protect against duplicated revisions, ensuring that only the most updated submittal status counts toward active statistics.'}
                </p>
              </div>
            </div>
          </div>,
          language === 'ar' ? "الملخص التراكمي للمشروع" : "CUMULATIVE PERFORMANCE SUMMARY",
          "cumulative-summary"
        )
      });
    }

    if (selectedComposerSections.has('cumulative_kpis')) {
      slides.push({
        id: "cumulative-kpis",
        view: "cumulative",
        title: language === 'ar' ? "مؤشرات الأداء التراكمية للمشروع" : "Cumulative KPI Dashboard",
        element: renderContentSlide(
          <div className="p-12 flex flex-col h-full justify-between pb-16">
            <div className="grid grid-cols-4 gap-6">
              <div className="p-6 rounded-xl border flex flex-col justify-between h-36 shadow-sm" style={{ backgroundColor: `${primaryColor}15`, borderColor: `${primaryColor}30` }}>
                <span className="text-xs font-bold tracking-wider uppercase" style={{ color: primaryColor }}>{language === 'ar' ? 'إجمالي التقديمات التراكمية' : 'Lifetime Processed'}</span>
                <span className="text-4xl font-extrabold" style={{ color: primaryColor }}>{overallCumulativeStats.total}</span>
                <span className="text-[10px] text-slate-500 font-medium">{language === 'ar' ? 'منذ تاريخ تأسيس المشروع' : 'Total project history'}</span>
              </div>
              <div className="bg-[#e2f0d9] p-6 rounded-xl border border-emerald-200 flex flex-col justify-between h-36 shadow-sm">
                <span className="text-xs font-bold text-emerald-800 tracking-wider uppercase">{language === 'ar' ? 'معدل الموافقات العام' : 'Lifetime Quality Index'}</span>
                <span className="text-4xl font-extrabold text-emerald-700">{overallCumulativeStats.approvalRate.toFixed(1)}%</span>
                <span className="text-[10px] text-slate-500 font-medium">{language === 'ar' ? 'رمز الكود أ و ب تراكمي' : 'Cumulative Code A/B ratio'}</span>
              </div>
              <div className="bg-[#fce4d6] p-6 rounded-xl border border-red-200 flex flex-col justify-between h-36 shadow-sm">
                <span className="text-xs font-bold text-red-800 tracking-wider uppercase">{language === 'ar' ? 'المرفوضات النشطة' : 'Active Rejections'}</span>
                <span className="text-4xl font-extrabold text-red-700">{overallCumulativeStats.rejectedOpen}</span>
                <span className="text-[10px] text-slate-500 font-medium">{language === 'ar' ? 'تنتظر إعادة التقديم' : 'Overdue open rejections'}</span>
              </div>
              <div className="bg-[#fff2cc] p-6 rounded-xl border border-amber-200 flex flex-col justify-between h-36 shadow-sm">
                <span className="text-xs font-bold text-amber-800 tracking-wider uppercase">{language === 'ar' ? 'معدل الالتزام التراكمي' : 'Lifetime SLA Ratio'}</span>
                <span className="text-4xl font-extrabold text-amber-700">
                  {overallCumulativeStats.slaCompliance !== null ? `${overallCumulativeStats.slaCompliance.toFixed(1)}%` : (language === 'ar' ? 'لا توجد بيانات' : 'N/A')}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">{language === 'ar' ? 'في غضون الحدود المعتمدة' : 'Met response deadlines'}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-8 mt-6">
              <div className="border border-slate-200 rounded-xl p-5 flex items-center gap-6 bg-slate-50">
                <Clock className="w-12 h-12" style={{ color: primaryColor }} />
                <div>
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wide block">{language === 'ar' ? 'متوسط مدة الرد التاريخية (يوم)' : 'Lifetime Average response turnaround (Days)'}</span>
                  <span className="text-2xl font-bold" style={{ color: primaryColor }}>{overallCumulativeStats.avgDelay} {language === 'ar' ? 'يوم' : 'Days'}</span>
                </div>
              </div>
              <div className="border border-slate-200 rounded-xl p-5 flex items-center gap-6 bg-slate-50">
                <AlertTriangle className="w-12 h-12 text-red-500" />
                <div>
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wide block">{language === 'ar' ? 'الوثائق المتأخرة بالرد تراكمياً' : 'Total Lifetime Overdue Items'}</span>
                  <span className="text-2xl font-bold text-red-600">{overallCumulativeStats.overdueCount} {language === 'ar' ? 'وثيقة معلقة حالياً' : 'Active overdue items'}</span>
                </div>
              </div>
            </div>
          </div>,
          language === 'ar' ? "مؤشرات الأداء التراكمية للمشروع" : "CUMULATIVE KPI DASHBOARD",
          "cumulative-kpis"
        )
      });
    }

    if (selectedComposerSections.has('cumulative_charts')) {
      slides.push({
        id: "cumulative-charts",
        view: "cumulative",
        title: language === 'ar' ? "الرسوم البيانية التراكمية للمشروع" : "Cumulative Overall Charts",
        element: renderContentSlide(
          <div className="p-12 flex h-full items-center justify-between">
            <div className="w-[48%] flex flex-col justify-center items-center h-full">
              <h3 className="font-bold text-lg mb-6 text-center" style={{ color: primaryColor }}>{language === 'ar' ? 'تراكم إجمالي التقديمات عبر فترات المشروع' : 'Cumulative Submittal Volume by Log Type'}</h3>
              <BarChart width={560} height={320} data={baseTypes.map(bt => ({ name: bt, count: cumulativeData.filter(d => {
                const docT = (d.documentType || d.logType || 'GENERAL').toUpperCase();
                const wf = (d.workflowFamily || '').toUpperCase();
                return wf === bt || docT.startsWith(`${bt}-`) || docT === bt || docT.includes(bt);
              }).length }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="count" fill={primaryColor} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </div>
            <div className="w-[48%] flex flex-col justify-center items-center h-full">
              <h3 className="font-bold text-lg mb-6 text-center" style={{ color: primaryColor }}>{language === 'ar' ? 'توزيع حالات الجودة العام (تراكمي)' : 'Overall Cumulative Status Ratio'}</h3>
              <PieChart width={320} height={320}>
                <Pie
                  data={[
                    { name: language === 'ar' ? 'معتمد' : 'Approved', value: overallCumulativeStats.approved, fill: '#70AD47' },
                    { name: language === 'ar' ? 'مرفوض' : 'Rejected', value: overallCumulativeStats.rejectedOpen, fill: '#C00000' },
                    { name: language === 'ar' ? 'معلق' : 'Pending', value: overallCumulativeStats.pending, fill: '#FFC000' }
                  ]}
                  cx="50%" cy="50%" outerRadius={100} dataKey="value" isAnimationActive={false} label
              >
                <Cell fill="#70AD47" />
                <Cell fill="#C00000" />
                <Cell fill="#FFC000" />
              </Pie>
              <RechartsTooltip />
              <Legend />
            </PieChart>
          </div>
        </div>,
        language === 'ar' ? "الرسوم البيانية التراكمية للمشروع" : "CUMULATIVE STATUS CHARTS",
        "cumulative-charts"
      )
    });
    }

    if (selectedComposerSections.has('cumulative_register_stats')) {
      slides.push({
        id: "cumulative-register-stats",
        view: "cumulative",
        title: language === 'ar' ? "جدول سجلات المشروع التراكمية" : "Cumulative Register Statistics Table",
        element: renderContentSlide(
          <div className="p-12 flex flex-col h-full justify-start gap-6">
            <h3 className="font-bold text-xl border-b pb-2" style={{ color: primaryColor }}>{language === 'ar' ? 'تفصيل السجلات الهندسية التراكمية للمشروع' : 'Register-Level Metrics for Project Lifetime'}</h3>
            <table className="w-full text-sm text-center border-collapse border border-slate-200 shadow-sm mt-4">
              <thead>
                <tr style={{ backgroundColor: primaryColor, color: 'white' }}>
                  <th className="p-3 border border-slate-300 font-bold">{language === 'ar' ? 'اسم السجل الهندي' : 'Register Name'}</th>
                  <th className="p-3 border border-slate-300 font-bold">{language === 'ar' ? 'إجمالي التقديمات' : 'Lifetime Items'}</th>
                  <th className="p-3 border border-slate-300 font-bold">{language === 'ar' ? 'معتمد (أ و ب)' : 'Approved (A/B)'}</th>
                  <th className="p-3 border border-slate-300 font-bold">{language === 'ar' ? 'مرفوض (ج)' : 'Rejected (C)'}</th>
                  <th className="p-3 border border-slate-300 font-bold">{language === 'ar' ? 'معلق (قيد المراجعة)' : 'Pending'}</th>
                </tr>
              </thead>
              <tbody>
                {baseTypes.map(bt => {
                  const bStats = compileStatsForBaseType(cumulativeData, bt, undefined, data);
                  return (
                    <tr key={bt} className="even:bg-slate-50 hover:bg-slate-100/70 h-11 transition-colors">
                      <td className="p-3 border border-slate-200 font-bold" style={{ color: primaryColor }}>{bt}</td>
                      <td className="p-3 border border-slate-200 font-medium">{bStats.totalRow.Total}</td>
                      <td className="p-3 border border-slate-200 text-emerald-600 font-semibold">{bStats.totalRow.Approved}</td>
                      <td className="p-3 border border-slate-200 text-red-600 font-semibold">{bStats.totalRow.RejectedOpen}</td>
                      <td className="p-3 border border-slate-200 text-amber-600 font-medium">{bStats.totalRow.Pending}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>,
          language === 'ar' ? "جدول سجلات المشروع التراكمية" : "CUMULATIVE REGISTER METRICS",
          "cumulative-register-stats"
        )
      });
    }

    if (selectedComposerSections.has('cumulative_trade_analysis')) {
      slides.push({
        id: "cumulative-trade-analysis",
        view: "cumulative",
        title: language === 'ar' ? "التحليل التراكمي للتخصصات الهندسية" : "Cumulative Trade Performance History",
        element: renderContentSlide(
          <div className="p-12 flex h-full items-center justify-between">
            <div className="w-[48%] flex flex-col justify-center items-center h-full">
              <h3 className="font-bold text-lg mb-6 text-center" style={{ color: primaryColor }}>{language === 'ar' ? 'حجم المعاملات التراكمي حسب التخصص' : 'Cumulative Submittals by Design Trade'}</h3>
              <BarChart width={560} height={320} layout="vertical" data={['STR', 'Arch', 'Mech', 'Elec', 'HSE', 'Infra'].map(trade => ({ name: trade, count: cumulativeData.filter(d => (d.trade || '').toUpperCase().startsWith(trade.toUpperCase())).length }))}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" />
                <RechartsTooltip />
                <Bar dataKey="count" fill={primaryColor} radius={[0, 4, 4, 0]} isAnimationActive={false} />
              </BarChart>
            </div>
            <div className="w-[48%] p-8 bg-slate-50 border border-slate-100 rounded-xl flex flex-col gap-4">
              <h4 className="font-bold border-b pb-2" style={{ color: primaryColor }}>{language === 'ar' ? 'التحليل التراكمي الشامل' : 'Lifetime Disciplines Commentary'}</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                {language === 'ar'
                  ? 'يوضح التحليل التاريخي استقرار الهيكل التوزيعي للوثائق الهندسية بالمشروع. تعكس هذه النسب حجم مساهمة المكاتب الاستشارية والمقاولين في مختلف مجالات العمل على مدى فترات التوريد والاعتمادات التاريخية.'
                  : 'The structural and architectural disciplines hold the largest volume of submittals over the project lifespan. MEP trades maintain high density of Material Submittals, necessitating careful scheduling to guarantee on-time material procurement.'}
              </p>
            </div>
          </div>,
          language === 'ar' ? "التحليل التراكمي للتخصصات الهندسية" : "CUMULATIVE DISCIPLINE ANALYSIS",
          "cumulative-trade-analysis"
        )
      });
    }

    // --- SECTION 3: REGISTER BREAKDOWNS ---
    baseTypes.forEach((bt, idx) => {
      const monthlyStats = compileStatsForBaseType(monthlyData, bt, startDate, data);
      const cumulativeStats = compileStatsForBaseType(cumulativeData, bt, undefined, data);

      if (!monthlyStats.hasData && !cumulativeStats.hasData) return;

      const longName = language === 'ar' ? getDiscName(bt, 'ar') : bt;
      const sectionTitle = `${String(idx + 3).padStart(2, '0')} ${longName}`;

      // A: Divider Cover Slide for Register
      slides.push({
        id: `reg-cover-${bt}`,
        view: "registers",
        title: `${bt} - Section Divider`,
        element: renderDividerSlide(bt, sectionTitle, `reg-cover-${bt}`)
      });

      // B: Monthly stats slide for Register
      if (monthlyStats.hasData) {
        let cols = [
          { label: "Items", key: "discipline" },
          { label: "Total Rev.00", key: "Rev00" },
          { label: "Total Further Rev.", key: "FurtherRev" },
          { label: "Total", key: "Total" },
          { label: "Approved", key: "Approved" },
          { label: "Rejected", key: "RejectedOpen" },
          { label: "Pending", key: "Pending" },
        ];
        if (bt === 'RFI') {
          cols = [
            { label: "Items", key: "discipline" },
            { label: "Total Rev.00", key: "Rev00" },
            { label: "Total Further Rev.", key: "FurtherRev" },
            { label: "Total", key: "Total" },
            { label: "Pending", key: "Pending" },
            { label: "Closed", key: "Closed" },
          ];
        } else if (bt === 'NCR' || bt === 'SOR') {
          cols = [
            { label: "Items", key: "discipline" },
            { label: "Total Rev.00", key: "Rev00" },
            { label: "Total Further Rev.", key: "FurtherRev" },
            { label: "Total", key: "Total" },
            { label: "Closed", key: "Closed" },
            { label: "Open", key: "Open" },
            { label: "Pending", key: "Pending" },
          ];
        } else if (bt === 'LTR') {
          cols = [
            { label: "Stakeholder", key: "discipline" },
            { label: "Sent", key: "Rev00" },
            { label: "Received", key: "FurtherRev" },
            { label: "Total", key: "Total" },
          ];
        }

        slides.push({
          id: `reg-monthly-status-${bt}`,
          view: "registers",
          title: `${bt} - Monthly Status`,
          element: renderContentSlide(
            <div className="flex w-full items-start justify-between mt-12 px-6">
              {renderStandardTable(monthlyStats, cols)}
              {renderStandardBar(monthlyStats, `${bt} This Period Status`)}
            </div>,
            `${longName} (${bt}) ${language === 'ar' ? 'لهذه الفترة' : 'This Period'}`,
            `reg-monthly-status-${bt}`
          )
        });

        // Pie Grid for Quality
        const pieLabels = bt === 'RFI' ? ["Closed", "Pending"] : (bt === 'NCR' || bt === 'SOR' ? ["Closed", "Open", "Pending"] : (bt === 'LTR' ? ["Sent", "Received"] : ["Approved", "Rejected", "Pending"]));
        slides.push({
          id: `reg-monthly-pie-${bt}`,
          view: "registers",
          title: `${bt} - Monthly Quality`,
          element: renderContentSlide(
            renderPieGrid(monthlyStats, bt === 'LTR' ? "" : (language === 'ar' ? `اعتمادات الجودة لـ (${bt})` : `${bt} Quality Approval`), pieLabels),
            `${longName} (${bt}) ${language === 'ar' ? 'لهذه الفترة' : 'This Period'}`,
            `reg-monthly-pie-${bt}`
          )
        });
      }

      // C: Cumulative stats slide for Register
      if (cumulativeStats.hasData) {
        let cols = [
          { label: "Items", key: "discipline" },
          { label: "Total Rev.00", key: "Rev00" },
          { label: "Total Further Rev.", key: "FurtherRev" },
          { label: "Total", key: "Total" },
          { label: "Approved", key: "Approved" },
          { label: "Rejected", key: "RejectedOpen" },
          { label: "Pending", key: "Pending" },
        ];
        if (bt === 'RFI') {
          cols = [
            { label: "Items", key: "discipline" },
            { label: "Total Rev.00", key: "Rev00" },
            { label: "Total Further Rev.", key: "FurtherRev" },
            { label: "Total", key: "Total" },
            { label: "Pending", key: "Pending" },
            { label: "Closed", key: "Closed" },
          ];
        } else if (bt === 'NCR' || bt === 'SOR') {
          cols = [
            { label: "Items", key: "discipline" },
            { label: "Total Rev.00", key: "Rev00" },
            { label: "Total Further Rev.", key: "FurtherRev" },
            { label: "Total", key: "Total" },
            { label: "Closed", key: "Closed" },
            { label: "Open", key: "Open" },
            { label: "Pending", key: "Pending" },
          ];
        } else if (bt === 'LTR') {
          cols = [
            { label: "Stakeholder", key: "discipline" },
            { label: "Sent", key: "Rev00" },
            { label: "Received", key: "FurtherRev" },
            { label: "Total", key: "Total" },
          ];
        }

        slides.push({
          id: `reg-cumulative-status-${bt}`,
          view: "registers",
          title: `${bt} - Cumulative Status`,
          element: renderContentSlide(
            <div className="flex w-full items-start justify-between mt-12 px-6">
              {renderStandardTable(cumulativeStats, cols)}
              {renderStandardBar(cumulativeStats, `${bt} Cumulative Status`)}
            </div>,
            `${longName} (${bt}) ${language === 'ar' ? 'تراكمي' : 'Cumulative'}`,
            `reg-cumulative-status-${bt}`
          )
        });

        // Pie Grid for Quality
        const pieLabels = bt === 'RFI' ? ["Closed", "Pending"] : (bt === 'NCR' || bt === 'SOR' ? ["Closed", "Open", "Pending"] : (bt === 'LTR' ? ["Sent", "Received"] : ["Approved", "Rejected", "Pending"]));
        slides.push({
          id: `reg-cumulative-pie-${bt}`,
          view: "registers",
          title: `${bt} - Cumulative Quality`,
          element: renderContentSlide(
            renderPieGrid(cumulativeStats, bt === 'LTR' ? "" : (language === 'ar' ? `اعتمادات الجودة لـ (${bt})` : `${bt} Quality Approval`), pieLabels),
            `${longName} (${bt}) ${language === 'ar' ? 'تراكمي' : 'Cumulative'}`,
            `reg-cumulative-pie-${bt}`
          )
        });
      }
    });

    // --- SECTION 4: APPENDICES ---
    if (selectedComposerSections.has('rejected_items') || selectedComposerSections.has('late_submittals')) {
      // Appendices Divider
      slides.push({
        id: "appendix-cover",
        view: "appendices",
        title: "Appendix Divider Cover",
        element: renderDividerSlide(
          language === 'ar' ? "الملحقات وقوائم البيانات المتأخرة" : "Appendix - Detailed Overdue Lists",
          language === 'ar' ? "المرفقات الفنية" : "APPENDICES",
          "appendix-cover"
        )
      });
    }

    if (selectedComposerSections.has('rejected_items')) {
      // Rejected items pages
      if (rejectedPages.length === 0) {
        slides.push({
          id: "rejected-none",
          view: "appendices",
          title: "Rejected Items (None)",
          element: renderContentSlide(
            <div className="flex flex-col h-full items-center justify-center text-[#64748b]">
              <p className="text-3xl font-bold mb-4 text-[#7a1515]">{language === 'ar' ? 'لا توجد وثائق مرفوضة معلقة' : 'No Rejected Items'}</p>
              <p className="text-xl">{language === 'ar' ? 'تمت تسوية جميع التقديمات المرفوضة أو إعادة تقديمها بنجاح.' : 'All rejected submittals are resolved or resubmitted.'}</p>
            </div>,
            language === 'ar' ? 'الوثائق المرفوضة المعلقة' : 'REJECTED ITEMS (ACTION REQUIRED)',
            "rejected-none"
          )
        });
      } else {
        rejectedPages.forEach((pageData, pageIdx) => {
          slides.push({
            id: `rejected-page-${pageIdx}`,
            view: "appendices",
            title: `Rejected Items (Page ${pageIdx + 1})`,
            element: renderContentSlide(
              <div className="flex flex-col h-full px-12 py-8">
                <h3 className="font-bold mb-4 text-xl text-[#7a1515] flex items-center gap-2">
                  <span>{language === 'ar' ? 'الوثائق المرفوضة (تتطلب اتخاذ إجراء فوري)' : 'Rejected Items (Action Required)'}</span>
                  <span className="text-xs font-semibold bg-red-100 text-[#7a1515] px-2.5 py-0.5 rounded">{language === 'ar' ? `صفحة ${pageIdx + 1} من ${rejectedPages.length}` : `Page ${pageIdx + 1} of ${rejectedPages.length}`}</span>
                </h3>
                <table className="w-full text-[11px] text-center border-collapse border border-[#cbd5e1]">
                  <thead>
                    <tr style={{ backgroundColor: '#7a1515', color: 'white' }}>
                      <th className="p-2 border border-[#cbd5e1] w-12">{language === 'ar' ? 'م' : 'No.'}</th>
                      <th className="p-2 border border-[#cbd5e1]">{language === 'ar' ? 'نوع المستند / المعاملة' : 'Type of Documents'}</th>
                      {showRefCol && <th className="p-2 border border-[#cbd5e1]">{language === 'ar' ? 'الرقم المرجعي' : 'Ref / Link'}</th>}
                      {showTradeCol && <th className="p-2 border border-[#cbd5e1]">{language === 'ar' ? 'التخصص' : 'Trade'}</th>}
                      {showRemarksCol && <th className="p-2 border border-[#cbd5e1]">{language === 'ar' ? 'الملاحظات' : 'Remarks'}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.map((row, i) => (
                      <tr key={i} className="even:bg-[#fff5f5] hover:bg-red-50/55 h-9 transition-colors">
                        <td className="border border-[#cbd5e1] px-2 font-mono">{pageIdx * rejectedPageSize + i + 1}</td>
                        <td className="border border-[#cbd5e1] px-2 font-bold text-[#7a1515]">{row.documentType}</td>
                        {showRefCol && <td className="border border-[#cbd5e1] px-2 font-mono text-[10px] truncate max-w-[150px]">{row.docNo || '-'}</td>}
                        {showTradeCol && <td className="border border-[#cbd5e1] px-2">{getDiscName(row.trade, language) || '-'}</td>}
                        {showRemarksCol && <td className="border border-[#cbd5e1] px-2 text-red-600 font-medium">{language === 'ar' ? `متأخر لـ ${row.delayDays} يوم` : `Overdue by ${row.delayDays} days`}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>,
              language === 'ar' ? 'الوثائق المرفوضة المعلقة' : 'REJECTED ITEMS',
              `rejected-page-${pageIdx}`
            )
          });
        });
      }
    }

    if (selectedComposerSections.has('late_submittals')) {
      // Pending items pages
      if (pendingPages.length === 0) {
        slides.push({
          id: "pending-none",
          view: "appendices",
          title: "Pending Items (None)",
          element: renderContentSlide(
            <div className="flex flex-col h-full items-center justify-center text-[#64748b]">
              <p className="text-3xl font-bold mb-4 text-[#203864]" style={{ color: primaryColor }}>{language === 'ar' ? 'لا توجد وثائق معلقة متأخرة' : 'No Pending Items'}</p>
              <p className="text-xl">{language === 'ar' ? 'تم الرد على جميع الوثائق وإغلاقها بالكامل.' : 'All pending documents are closed.'}</p>
            </div>,
            language === 'ar' ? 'الوثائق المعلقة المتأخرة بالرد' : 'PENDING ITEMS (OVERDUE)',
            "pending-none"
          )
        });
      } else {
        pendingPages.forEach((pageData, pageIdx) => {
          slides.push({
            id: `pending-page-${pageIdx}`,
            view: "appendices",
            title: `Pending Items (Page ${pageIdx + 1})`,
            element: renderContentSlide(
              <div className="flex flex-col h-full px-12 py-8">
                <h3 className="font-bold mb-4 text-xl flex items-center gap-2" style={{ color: primaryColor }}>
                  <span>{language === 'ar' ? 'الوثائق المعلقة المتأخرة بالرد' : 'Pending Items (Overdue)'}</span>
                  <span className="text-xs font-semibold bg-blue-100 px-2.5 py-0.5 rounded" style={{ color: primaryColor }}>{language === 'ar' ? `صفحة ${pageIdx + 1} من ${pendingPages.length}` : `Page ${pageIdx + 1} of ${pendingPages.length}`}</span>
                </h3>
                <table className="w-full text-[11px] text-center border-collapse border border-[#cbd5e1]">
                  <thead>
                    <tr style={{ backgroundColor: primaryColor, color: 'white' }}>
                      <th className="p-2 border border-[#cbd5e1] w-12">{language === 'ar' ? 'م' : 'No.'}</th>
                      <th className="p-2 border border-[#cbd5e1]">{language === 'ar' ? 'نوع المستند / المعاملة' : 'Type of Documents'}</th>
                      {showRefCol && <th className="p-2 border border-[#cbd5e1]">{language === 'ar' ? 'الرقم المرجعي' : 'Ref / Link'}</th>}
                      {showTradeCol && <th className="p-2 border border-[#cbd5e1]">{language === 'ar' ? 'التخصص' : 'Trade'}</th>}
                      {showRemarksCol && <th className="p-2 border border-[#cbd5e1]">{language === 'ar' ? 'الملاحظات' : 'Remarks'}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.map((row, i) => (
                      <tr key={i} className="even:bg-[#f8fafc] hover:bg-slate-50 h-9 transition-colors">
                        <td className="border border-[#cbd5e1] px-2 font-mono">{pageIdx * pendingPageSize + i + 1}</td>
                        <td className="border border-[#cbd5e1] px-2 font-bold text-[#203864]" style={{ color: primaryColor }}>{row.documentType}</td>
                        {showRefCol && <td className="border border-[#cbd5e1] px-2 font-mono text-[10px] truncate max-w-[150px]">{row.docNo || '-'}</td>}
                        {showTradeCol && <td className="border border-[#cbd5e1] px-2">{getDiscName(row.trade, language) || '-'}</td>}
                        {showRemarksCol && <td className="border border-[#cbd5e1] px-2 text-red-600 font-medium">{language === 'ar' ? `متأخر لـ ${row.delayDays} يوم` : `Overdue by ${row.delayDays} days`}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>,
              language === 'ar' ? 'الوثائق المعلقة المتأخرة بالرد' : 'PENDING ITEMS',
              `pending-page-${pageIdx}`
            )
          });
        });
      }
    }

    // --- CLOSING THANKS ---
    slides.push({
      id: "closing-thanks",
      view: "cover",
      title: "Closing Thanks Slide",
      element: renderDividerSlide(
        language === 'ar' ? "فريق عمل التحكم في الوثائق للمشروع" : "Document Control Management Team",
        language === 'ar' ? "نشكركم لحسن متابعتكم" : "THANK YOU",
        "closing-thanks"
      )
    });

    return slides;
  }, [language, pInfo, overallMonthlyStats, overallCumulativeStats, baseTypes, monthlyData, cumulativeData, rejectedPages, pendingPages, showRefCol, showTradeCol, showRemarksCol, rejectedPageSize, pendingPageSize, selectedComposerSections, primaryColor, accentColor, projectInfo]);

  // Handle selective browser printing
  const executePrinting = (slideIdsToPrint: Set<string> | null) => {
    setActivePrintIds(slideIdsToPrint);
    setTimeout(() => {
      window.print();
      setActivePrintIds(null);
    }, 450);
  };

  const handlePrintSubmit = () => {
    setShowPrintModal(false);
    if (printMode === 'all') {
      executePrinting(null);
    } else if (printMode === 'current_section') {
      const activeIds = new Set(allSlidesList.filter(s => s.view === selectedView).map(s => s.id));
      executePrinting(activeIds);
    } else if (printMode === 'checkboxes') {
      const activeIds = new Set(Object.keys(checkedSlideIds).filter(id => checkedSlideIds[id]));
      executePrinting(activeIds.size > 0 ? activeIds : null);
    } else if (printMode === 'range') {
      // Parse custom range, e.g. "1-3, 5"
      const indices = new Set<number>();
      const parts = customRangeStr.split(',');
      parts.forEach(part => {
        if (part.includes('-')) {
          const [startStr, endStr] = part.split('-');
          const start = parseInt(startStr.trim(), 10) - 1;
          const end = parseInt(endStr.trim(), 10) - 1;
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = start; i <= end; i++) {
              if (i >= 0 && i < allSlidesList.length) indices.add(i);
            }
          }
        } else {
          const idx = parseInt(part.trim(), 10) - 1;
          if (!isNaN(idx) && idx >= 0 && idx < allSlidesList.length) {
            indices.add(idx);
          }
        }
      });
      const activeIds = new Set<string>();
      indices.forEach(idx => activeIds.add(allSlidesList[idx].id));
      executePrinting(activeIds.size > 0 ? activeIds : null);
    }
  };

  return (
    <div
      id="presentation-container"
      className="max-w-[1600px] mx-auto pb-20 print:p-0 print:m-0 print:max-w-none flex flex-col font-sans gap-6"
      style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
    >
      {/* Dynamic Settings and Print Controller Panel (Top Toolbar) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-white border border-slate-200 rounded-xl shadow-md gap-4 print:hidden">
        <div>
          <h2 className="text-lg font-bold text-[#203864] flex items-center gap-2">
            <Compass className="w-5 h-5 text-amber-500 animate-spin-slow" />
            {language === 'ar' ? 'مستعرض التقرير التنفيذي RC1' : 'RC1 Executive Report Book & Navigator'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{language === 'ar' ? 'نظام العرض وإدارة فترات الصفحات للمخرجات عالية الدقة والطباعة الذكية' : 'Dual-reporting system, automated page breaks, and customized page range print engines'}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPrintModal(true)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg flex items-center gap-2 text-sm font-bold shadow-sm transition-all"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            {language === 'ar' ? 'طباعة مخصصة' : 'Print Book'}
          </button>
        </div>
      </div>

      {/* Main Layout Area */}
      <div className="flex items-start gap-6 w-full">
        
        {/* Sticky Report Navigator Panel (Left Sidebar) */}
        {sidebarOpen && (
          <div className="w-[300px] sticky top-4 max-h-[calc(100vh-120px)] overflow-y-auto bg-slate-900 text-slate-300 border border-slate-800 rounded-xl p-5 flex flex-col gap-5 shadow-lg print:hidden shrink-0 custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'فهرس المستعرض' : 'Report Navigator'}</span>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Main Tabs Selection */}
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => setSelectedView('all')}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all flex items-center gap-2.5 ${selectedView === 'all' ? 'bg-[#ddebf7] text-[#203864] font-bold shadow-sm' : 'hover:bg-slate-800 text-slate-300'}`}
              >
                <Layers className="w-4 h-4" />
                {language === 'ar' ? 'الكتاب التنفيذي الكامل' : 'All Sections (Full Book)'}
              </button>

              <button
                onClick={() => setSelectedView('monthly')}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all flex items-center gap-2.5 ${selectedView === 'monthly' ? 'bg-[#ddebf7] text-[#203864] font-bold shadow-sm' : 'hover:bg-slate-800 text-slate-300'}`}
              >
                <FileText className="w-4 h-4" />
                {language === 'ar' ? 'التقرير التنفيذي الشهري' : 'A. Monthly Report'}
              </button>

              <button
                onClick={() => setSelectedView('cumulative')}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all flex items-center gap-2.5 ${selectedView === 'cumulative' ? 'bg-[#ddebf7] text-[#203864] font-bold shadow-sm' : 'hover:bg-slate-800 text-slate-300'}`}
              >
                <TrendingUp className="w-4 h-4" />
                {language === 'ar' ? 'التقرير التنفيذي التراكمي' : 'B. Cumulative Report'}
              </button>

              <button
                onClick={() => setSelectedView('registers')}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all flex items-center gap-2.5 ${selectedView === 'registers' ? 'bg-[#ddebf7] text-[#203864] font-bold shadow-sm' : 'hover:bg-slate-800 text-slate-300'}`}
              >
                <Sliders className="w-4 h-4" />
                {language === 'ar' ? 'تفاصيل السجلات' : 'C. Registers Details'}
              </button>

              <button
                onClick={() => setSelectedView('appendices')}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all flex items-center gap-2.5 ${selectedView === 'appendices' ? 'bg-[#ddebf7] text-[#203864] font-bold shadow-sm' : 'hover:bg-slate-800 text-slate-300'}`}
              >
                <AlertCircle className="w-4 h-4" />
                {language === 'ar' ? 'الملاحقات وقوائم البيانات' : 'D. Appendices'}
              </button>
            </div>

            {/* Detailed Slide Links Deep Linking Scroll */}
            <div className="flex flex-col gap-2 mt-4 border-t border-slate-800 pt-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1">{language === 'ar' ? 'روابط التنقل السريع' : 'Slide Jump Links'}</span>
              <div className="flex flex-col gap-1 overflow-y-auto max-h-[300px] custom-scrollbar pr-1">
                {allSlidesList
                  .filter(s => selectedView === 'all' || s.view === selectedView)
                  .map((s, idx) => (
                    <button
                      key={s.id}
                      onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      className="w-full text-left text-xs text-slate-400 hover:text-white hover:bg-slate-800 py-1.5 px-2.5 rounded transition-all truncate text-ellipsis"
                    >
                      <span className="font-mono text-[10px] text-amber-500 inline-block w-5 shrink-0">{String(idx + 1).padStart(2, '0')}</span>
                      <span>{s.title}</span>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Sidebar Mini Restorer Button */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="sticky top-4 bg-slate-900 hover:bg-slate-800 text-white p-3 rounded-lg flex items-center justify-center shadow-lg transition-all print:hidden shrink-0"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Slide Preview Stage Panel */}
        <div className="flex-1 flex flex-col items-center justify-start print:block print:w-full">
          {allSlidesList
            .filter(s => {
              if (activePrintIds) {
                return activePrintIds.has(s.id);
              }
              return selectedView === 'all' || s.view === selectedView;
            })
            .map((slide, idx) => (
              <div key={slide.id} className="relative group">
                {slide.element}
                <div className="absolute top-4 left-4 bg-slate-900/80 text-white font-mono text-[10px] py-1 px-2.5 rounded-md border border-slate-700/50 print:hidden opacity-0 group-hover:opacity-100 transition-opacity">
                  Slide {idx + 1} of {allSlidesList.filter(s => selectedView === 'all' || s.view === selectedView).length} [{slide.view.toUpperCase()}]
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* High-Fidelity Custom Print Selection Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-6 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-400 animate-pulse" />
                <h3 className="font-bold text-lg">{language === 'ar' ? 'خيارات الطباعة وإرسال المخرجات' : 'Print Executive Book'}</h3>
              </div>
              <button onClick={() => setShowPrintModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6 custom-scrollbar">
              {/* Scope selectors */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{language === 'ar' ? 'حدد نطاق الطباعة' : 'Select Print Scope'}</span>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <button
                    onClick={() => setPrintMode('all')}
                    className={`p-3.5 border rounded-lg text-xs font-bold text-left transition-all flex flex-col gap-1 ${printMode === 'all' ? 'border-[#203864] bg-blue-50/50 text-[#203864]' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                  >
                    <span>{language === 'ar' ? 'طباعة كامل الكتاب' : 'Full Executive Book'}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{language === 'ar' ? `كل الصفحات (${allSlidesList.length} صفحة)` : `All pages (${allSlidesList.length} slides)`}</span>
                  </button>
                  <button
                    onClick={() => setPrintMode('current_section')}
                    className={`p-3.5 border rounded-lg text-xs font-bold text-left transition-all flex flex-col gap-1 ${printMode === 'current_section' ? 'border-[#203864] bg-blue-50/50 text-[#203864]' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                  >
                    <span>{language === 'ar' ? 'القسم النشط حالياً فقط' : 'Current Active Section'}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{language === 'ar' ? `المستعرض المفتوح فقط (${selectedView.toUpperCase()})` : `Selected view only (${selectedView.toUpperCase()})`}</span>
                  </button>
                </div>
              </div>

              {/* Range input */}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="print_mode"
                    checked={printMode === 'range'}
                    onChange={() => setPrintMode('range')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{language === 'ar' ? 'تحديد نطاق صفحات مخصص (مثال: 1-5, 8)' : 'Print Custom Page Range'}</span>
                </label>
                {printMode === 'range' && (
                  <input
                    type="text"
                    placeholder="e.g. 1-3, 5, 8-12"
                    value={customRangeStr}
                    onChange={(e) => setCustomRangeStr(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:border-blue-500 outline-none w-full font-mono mt-1"
                  />
                )}
              </div>

              {/* Checklist list */}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="print_mode"
                    checked={printMode === 'checkboxes'}
                    onChange={() => setPrintMode('checkboxes')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{language === 'ar' ? 'اختيار صفحات معينة من القائمة' : 'Select Specific Slides Checklist'}</span>
                </label>
                {printMode === 'checkboxes' && (
                  <div className="border border-slate-200 rounded-lg p-4 max-h-48 overflow-y-auto flex flex-col gap-2 bg-slate-50 custom-scrollbar mt-1">
                    {allSlidesList.map((s, idx) => (
                      <label key={s.id} className="flex items-center gap-2.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer py-1 border-b border-slate-200/50 last:border-0">
                        <input
                          type="checkbox"
                          checked={!!checkedSlideIds[s.id]}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setCheckedSlideIds(prev => ({ ...prev, [s.id]: checked }));
                          }}
                          className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <span className="font-mono text-amber-600">{String(idx+1).padStart(2, '0')}</span>
                        <span className="truncate">{s.title}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 p-5 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-100 rounded-lg text-sm text-slate-700 font-bold transition-all"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handlePrintSubmit}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-md shadow-blue-500/10 transition-all flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                {language === 'ar' ? 'بدء الطباعة' : 'Confirm & Print'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
