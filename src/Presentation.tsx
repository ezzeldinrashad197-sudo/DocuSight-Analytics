import React, { useMemo, useState } from "react";
import { SubmittalRow, ProjectSettings } from "./types";
import { calculateStats, calculateNCRStats, calculateSORStats, calculateLTRStats } from "./utils/calculations";
import { processNCRData } from "./analytics/ncr/ncrEngine";
import { useLanguage, parseMixedText } from "./utils/i18n";
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
} from "recharts";
import Logo from "./Logo";

interface PresentationProps {
  data: SubmittalRow[];
  filterMonthly: (row: SubmittalRow) => boolean;
  filterCumulative: (row: SubmittalRow) => boolean;
  projectInfo: ProjectSettings | null;
  startDate?: string;
}

const PRIMARY_BLUE = "#203864";
const ACCENT_GOLD = "#eab308"; 

export default function Presentation({
  data,
  filterMonthly,
  filterCumulative,
  projectInfo,
  startDate,
}: PresentationProps) {
  const { language, t, isRtl } = useLanguage();
  
  const getDiscName = (d: string) => {
    if (language !== 'ar') return d;
    const lower = d.toUpperCase().trim();
    if (lower === 'TOTAL' || lower === 'GRAND TOTAL') return 'الإجمالي';
    if (lower === 'STR' || lower === 'STRUCTURAL') return 'إنشائي';
    if (lower === 'ARCH' || lower === 'ARCHITECTURAL') return 'معماري';
    if (lower === 'MECH' || lower === 'MECHANICAL') return 'ميكانيك';
    if (lower === 'ELEC' || lower === 'ELECTRICAL') return 'كهرباء';
    if (lower === 'INFRA' || lower === 'INFRASTRUCTURE' || lower === 'INF') return 'طرق / بنية تحتية';
    if (lower === 'LANDSCAPE' || lower === 'LND') return 'لاندسكيب';
    if (lower === 'NCR-HSE' || lower === 'HSE') return 'السلامة والبيئة (HSE)';
    if (lower === 'SURVEY' || lower === 'SUR') return 'المساحة';
    return d;
  };

  const getPieLabelTranslator = (name: string) => {
    if (language !== 'ar') return name;
    const lower = name.toUpperCase().trim();
    if (lower === 'APPROVED') return 'معتمد';
    if (lower === 'REJECTED') return 'مرفوض';
    if (lower === 'PENDING') return 'معلق';
    if (lower === 'CLOSED') return 'مغلق';
    if (lower === 'OPEN') return 'مفتوح';
    if (lower === 'SENT') return 'الصادر';
    if (lower === 'RECEIVED') return 'الوارد';
    return name;
  };

  const getColLabel = (label: string) => {
    if (language !== 'ar') return label;
    const lower = label.toUpperCase().trim();
    if (lower === 'ITEMS') return 'البنود';
    if (lower === 'TOTAL REV.00' || lower === 'TOTAL REV00') return 'إجمالي مراجعة 00';
    if (lower === 'TOTAL FURTHER REV.') return 'إجمالي مراجعات لاحقة';
    if (lower === 'TOTAL') return 'الإجمالي';
    if (lower === 'APPROVED') return 'معتمد';
    if (lower === 'REJECTED') return 'مرفوض';
    if (lower === 'PENDING') return 'معلق';
    if (lower === 'CLOSED') return 'مغلق';
    if (lower === 'OPEN') return 'مفتوح';
    if (lower === 'STAKEHOLDER') return 'الجهة المعنية / الأطراف';
    if (lower === 'SENT') return 'الصادر';
    if (lower === 'RECEIVED') return 'الوارد';
    return label;
  };

  const getChartTitle = (title: string) => {
    if (language !== 'ar') return title;
    const parts = title.split(' ');
    const bt = parts[0];
    const period = parts.slice(1, -1).join(' ').trim();
    const isMonthly = period.toLowerCase().includes('period');
    const periodAr = isMonthly ? 'لهذه الفترة' : 'تراكمي';
    return `تحليل حالة تقديمات ${bt} (${periodAr})`;
  };
  
  const pInfo = projectInfo || {
    projectName: "NO PROJECT CONFIGURED",
    projectCode: "N/A",
    clientName: "N/A",
    consultantName: "N/A",
    contractorName: "N/A",
    projectManager: "N/A",
    documentControlManager: "N/A",
    logoUrl: undefined,
  };

  const renderCompanyLogo = (
    sizeClass: string = "h-8",
    inlineTextClass: string = "text-sm",
    extraPositionClass: string = ""
  ) => {
    const logoUrl = projectInfo?.logoUrl;
    // Consistently styled container for a premium, unified brand presence across all slides
    const containerClasses = `bg-white rounded-lg border border-slate-100 shadow-sm px-6 py-2.5 flex items-center justify-center shrink-0 ${extraPositionClass}`;
    
    if (logoUrl) {
      return (
        <div className={containerClasses} id="presentation-logo-container">
          <img src={logoUrl} alt="Company Logo" className={`${sizeClass} w-auto max-h-full object-contain`} />
        </div>
      );
    }
    const cName = pInfo.contractorName !== "N/A" ? pInfo.contractorName : (pInfo.projectName !== "NO PROJECT CONFIGURED" ? pInfo.projectName : "COMPANY");
    return (
      <div className={containerClasses} id="presentation-logo-fallback-container">
        <div className={`font-sans font-bold tracking-wider text-[#203864] ${inlineTextClass} select-none uppercase truncate max-w-[220px]`}>
          {cName}
        </div>
      </div>
    );
  };

  const monthlyData = useMemo(
    () => data.filter(filterMonthly),
    [data, filterMonthly],
  );
  const cumulativeData = useMemo(
    () => data.filter(filterCumulative),
    [data, filterCumulative],
  );

  const renderContentSlide = (content: React.ReactNode, titleStr: string, key?: React.Key) => (
    <div key={key} className="presentation-slide bg-white relative mb-8 overflow-hidden break-after-page page-break-after-always print:mb-0 border border-[#e2e8f0] print:border-none flex flex-col" style={{ width: '1500px', height: '843px' }}>
      <div className="w-full text-white shrink-0" style={{ backgroundColor: PRIMARY_BLUE, height: '120px' }}>
         <div className="flex items-center justify-between h-full px-12">
            <h1 className="text-4xl font-bold">{titleStr}</h1>
            {renderCompanyLogo("h-8", "text-sm")}
         </div>
      </div>
      <div className="w-full h-3 shrink-0" style={{ backgroundColor: ACCENT_GOLD }}></div>
      <div className="flex-1 w-full bg-white relative">
        {content}
      </div>
      <div className="w-full h-10 flex items-center justify-between px-12 shrink-0" style={{ backgroundColor: PRIMARY_BLUE, color: 'white', fontSize: '11px' }}>
         <div>[{pInfo.projectName}]  |  {language === 'ar' ? 'تقرير التحكم بالمستندات الشهري' : 'Document Control Monthly Report'}  |  [{new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' })}]</div>
         <div>{language === 'ar' ? 'سري وخاص' : 'CONFIDENTIAL'}</div>
      </div>
    </div>
  );

  const renderDividerSlide = (titleStr: string, subtitleStr?: string, key?: React.Key) => (
    <div key={key} className="presentation-slide text-white relative mb-8 overflow-hidden break-after-page page-break-after-always print:mb-0 border border-[#e2e8f0] print:border-none flex" style={{ width: '1500px', height: '843px', backgroundColor: PRIMARY_BLUE }}>
       <div className="flex-1 px-24 flex flex-col justify-center relative border-l-[12px] border-l-[#eab308]">
          {subtitleStr && <h1 className="text-5xl font-bold mb-8">{subtitleStr}</h1>}
          <h2 className="text-2xl text-[#94a3b8]">{titleStr}</h2>
       </div>
       {renderCompanyLogo("h-10", "text-base", "absolute top-16 right-16")}
       <div className="absolute bottom-16 left-28 right-16">
          <div className="w-full h-[3px] mb-4" style={{ backgroundColor: ACCENT_GOLD }}></div>
          <div className="text-sm">[{pInfo.projectName}]  |  Document Control</div>
       </div>
    </div>
  );

  const orderedPredefinedBaseTypes = ['SHD', 'SDW', 'MAR', 'QS', 'DOC', 'RFI', 'LTR', 'WIR', 'MIR', 'NCR', 'SOR'];
  
  const baseTypes = Array.from(new Set(data.map(d => {
      let dt = d.documentType || "GENERAL";
      if (dt === 'NCR') dt = 'NCR-HSE'; 
      return dt.split('-')[0].trim().toUpperCase();
  }))).filter(Boolean)
      .filter(t => !['CORRESPONDENCE', 'LETTERS'].includes(t))
      .sort((a, b) => {
          let ai = orderedPredefinedBaseTypes.indexOf(a);
          let bi = orderedPredefinedBaseTypes.indexOf(b);
          if (ai === -1) ai = 999;
          if (bi === -1) bi = 999;
          if (ai === bi) return a.localeCompare(b);
          return ai - bi;
      });

  const compileStatsForBaseType = (dataset: SubmittalRow[], bt: string, monthlyStart?: string, fullDataset?: SubmittalRow[]) => {
    if (bt === 'NCR') {
        const sourceData = fullDataset && fullDataset.length > 0 ? fullDataset : dataset;
        const ncrResult = processNCRData(sourceData, monthlyStart);
        const disciplines = ['STR', 'Arch', 'Mech', 'Elec', 'Infra', 'Landscape', 'NCR-HSE'];
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
                   if (disc === 'NCR-HSE') {
                       return mClass === 'NCR-HSE' || mClass === 'NCR-NCR-HSE' || mClass.includes('HSE');
                   }
                   return normDisc(mClass.replace(/^NCR-/, '')) === targetNorm;
               }) || {
                   rev0: 0,
                   revHigh: 0,
                   totalSubs: 0,
                   approved: 0,
                   rejectedOpen: 0,
                   rejectedClosed: 0,
                   pending: 0,
                   overdue: 0
               };
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
               const sub = ncrResult.cumulative.find(c => {
                   return normDisc(c.discipline) === targetNorm;
               }) || {
                   totalUnique: 0,
                   open: 0,
                   closed: 0,
                   underReview: 0,
                   approved: 0,
                   rejected: 0,
                   rev0: 0,
                   revHigh: 0
               };
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

        return { stats, totalRow, hasData: stats.reduce((acc, curr) => acc + Number(curr.Total), 0) > 0 };
    }

    const typeData = dataset.filter(d => {
        const docT = (d.documentType || 'GENERAL').toUpperCase();
        return docT.startsWith(`${bt}-`) || docT === bt || (bt==='NCR' && docT.includes('NCR')) || (bt==='SOR' && docT.includes('SOR')) || (bt==='RFI' && docT.includes('RFI')) || (bt==='LTR' && (docT.includes('LTR') || docT.includes('CORRES')));
    });

    let disciplinesInThisType: string[] = [];
    if (bt === 'LTR') {
       disciplinesInThisType = Array.from(new Set(typeData.map(d => d.stakeholder || 'GENERAL')));
    } else {
      const predefinedDisciplines = bt === 'NCR' ? ['STR', 'Arch', 'Mech', 'Elec', 'Infra', 'Landscape', 'NCR-HSE'] : ['STR', 'Arch', 'Mech', 'Elec', 'Infra', 'Landscape', 'SURVEY'];
      const hasGeneralData = typeData.some(d => {
          const docT = d.documentType || 'GENERAL';
          let disc = docT;
          if (docT.includes('-')) {
              disc = docT.substring(docT.indexOf('-') + 1).trim();
          } else {
              disc = (d.discipline || d.trade || 'GENERAL').toUpperCase().trim();
          }
          const isStandard = (
              disc === 'ARC' || disc === 'ARCH' || disc.includes('ARCHITECT') ||
              disc === 'MEC' || disc === 'MECH' || disc.includes('MECHANIC') ||
              disc === 'ELE' || disc === 'ELEC' || disc.includes('ELECTRIC') ||
              disc === 'INF' || disc === 'INFR' || disc === 'INFRA' || disc.includes('INFRASTRUCT') ||
              disc === 'LND' || disc === 'LAND' || disc.includes('LANDSCAP') ||
              disc === 'STR' || disc.includes('STRUCT')
          );
          return !isStandard;
      });
      disciplinesInThisType = [...predefinedDisciplines];
    }

    const stats = disciplinesInThisType.map((disc) => {
      const dData = typeData.filter((d) => {
          if (bt === 'LTR') return (d.stakeholder || 'GENERAL') === disc;
          
          const docT = d.documentType || 'GENERAL';
          let rDisc = docT.includes('-') ? docT.substring(docT.indexOf('-') + 1).trim() : (d.discipline || d.trade || 'GENERAL').toUpperCase().trim();
          if (rDisc === 'ARC' || rDisc === 'ARCH' || rDisc.includes('ARCHITECT')) rDisc = 'Arch';
          else if (rDisc === 'MEC' || rDisc === 'MECH' || rDisc.includes('MECHANIC')) rDisc = 'Mech';
          else if (rDisc === 'ELE' || rDisc === 'ELEC' || rDisc.includes('ELECTRIC')) rDisc = 'Elec';
          else if (rDisc === 'INF' || rDisc === 'INFR' || rDisc === 'INFRA' || rDisc.includes('INFRASTRUCT')) rDisc = 'Infra';
          else if (rDisc === 'LND' || rDisc === 'LAND' || rDisc.includes('LANDSCAP')) rDisc = 'Landscape';
          else if (rDisc === 'STR' || rDisc.includes('STRUCT')) rDisc = 'STR';
          else if (rDisc === 'HSE' || rDisc === 'NCR-HSE' || rDisc.includes('HSE') || rDisc.includes('SAFETY')) rDisc = 'NCR-HSE';
          else rDisc = bt === 'NCR' ? 'NCR-HSE' : 'SURVEY';
          
          return rDisc === disc;
      });
      const s = bt === 'NCR' ? calculateNCRStats(dData, false) : (bt === 'SOR' ? calculateSORStats(dData, false) : (bt === 'LTR' ? calculateLTRStats(dData, false) : calculateStats(dData)));
      
      return {
        discipline: disc,
        Rev00: s.totalSheetsRev0 || 0,
        FurtherRev: s.totalSheetsFurtherRev || 0,
        Approved: s.approved,
        RejectedOpen: s.rejectedOpen,
        RejectedClosed: s.rejectedClosed,
        Pending: s.pending,
        Total: s.totalSubmittedSheets,
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

    return { stats, totalRow, hasData: stats.reduce((acc, curr) => acc + Number(curr.Total), 0) > 0 };
  };

  const renderStandardTable = (statsData: Record<string, any>, cols: Record<string, any>[]) => {
    return (
      <table className="w-[48%] text-sm text-center border-collapse shrink-0" style={{ border: '2px solid #203864' }}>
        <thead>
          <tr style={{ backgroundColor: PRIMARY_BLUE, color: 'white' }}>
            <th className="p-2 border border-[#4472c4] font-bold" colSpan={1}>{language === 'ar' ? 'الحالة' : 'STATUS'}</th>
            <th className="p-2 border border-[#4472c4]" colSpan={cols.length - 1}></th>
          </tr>
          <tr style={{ backgroundColor: '#2f75b5', color: 'white', fontSize: '13px' }}>
            {cols.map((c, i) => (
              <th key={i} className="p-2 border border-[#4472c4] font-bold">
                {getColLabel(c.label)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white text-[#333]">
          {statsData.stats.map((s: Record<string, any>, index: number) => (
            <tr key={`${s.discipline}-${index}`} className="even:bg-[#f2f2f2] h-[36px]">
              <td className="p-2 border border-[#cbd5e1] font-medium text-xs">
                {getDiscName(s.discipline)}
              </td>
              {cols.slice(1).map((c, i) => (
                <td key={i} className={`p-2 border border-[#cbd5e1] text-xs ${c.key === "Total" ? "font-bold" : ""}`}>
                  {s[c.key] !== undefined && s[c.key] !== null ? s[c.key] : ''}
                </td>
              ))}
            </tr>
          ))}
          <tr className="bg-[#ddebf7] h-[45px] font-bold text-xs" style={{ color: PRIMARY_BLUE }}>
            <td className="p-2 border border-[#cbd5e1]">{getDiscName(statsData.totalRow.discipline)}</td>
            {cols.slice(1).map((c, i) => (
               <td key={i} className="p-2 border border-[#cbd5e1]">
                  {statsData.totalRow[c.key]}
               </td>
            ))}
          </tr>
        </tbody>
      </table>
    );
  };

  const renderStandardBar = (statsData: Record<string, any>, titleStr: string) => (
    <div className="w-[48%] h-[350px] flex flex-col justify-center items-center">
      <h3 className="text-center font-bold mb-4 text-[#203864] text-lg">{getChartTitle(titleStr)}</h3>
      <div className="w-[680px] h-[290px] flex items-center justify-center">
        <BarChart width={680} height={290} data={statsData.stats} margin={{top: 20, right: 10, left: 10, bottom: 5}}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="discipline" tickFormatter={getDiscName} tick={{ fontSize: 13, fill: '#333' }} />
          <YAxis tick={{ fontSize: 13, fill: '#333' }} />
          <RechartsTooltip cursor={{fill: '#F8FAFC'}} />
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
      {titleStr && (
        <h3 className="w-full text-center font-bold text-sm mb-6 text-[#1E3A5F]">{titleStr}</h3>
      )}
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
          const finalData = total === 0 ? pieData.map(p => ({...p, value: 1.0001, actualValue: 0, totalAmount: 1})) : pieData.map(p => ({...p, totalAmount: total})); // Use actualValue for tooltip if needed, but Recharts tooltip formatter is not set.

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
                {getDiscName(s.discipline)}
              </div>
              <div className="w-48 h-48 flex items-center justify-center">
                <PieChart width={192} height={192}>
                  <Pie data={finalData} cx="50%" cy="50%" outerRadius={80} dataKey="value" isAnimationActive={false} stroke="none" labelLine={false} label={renderCustomizedLabel}>
                    {finalData.map((e, index) => <Cell key={`cell-${index}`} fill={e.fill} />)}
                  </Pie>
                  <RechartsTooltip formatter={(value, name, props) => {
                    const actual = props.payload.actualValue !== undefined ? props.payload.actualValue : value;
                    const percent = ((actual as number / props.payload.totalAmount) * 100).toFixed(1);
                    return [`${actual} (${percent}%)`, getPieLabelTranslator(String(name))];
                  }} />
                </PieChart>
              </div>
              <div className="flex items-center justify-center gap-4 mt-6 w-full">
                  {pieData.map(p => (
                      <div key={p.name} className="flex items-center gap-2">
                          <div className="w-3 h-3" style={{ backgroundColor: p.fill }}></div>
                          <span className="text-[12px] text-[#333] font-medium">{getPieLabelTranslator(p.name)}</span>
                      </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderSlidesForBaseType = (bt: string, sectionIndex: number) => {
    const monthlyStats = compileStatsForBaseType(monthlyData, bt, startDate, data);
    const cumulativeStats = compileStatsForBaseType(cumulativeData, bt, undefined, data);
    
    if (!monthlyStats.hasData && !cumulativeStats.hasData) return null;
    
    const typeMap: Record<string, string> = {
      'SHD': 'SHOP DRAWINGS',
      'SDW': 'SHOP DRAWINGS',
      'MAR': 'MATERIAL SUBMITTALS',
      'MIR': 'MATERIAL INSPECTION REQUEST',
      'WIR': 'INSPECTION REQUEST',
      'RFI': 'REQUEST FOR INFORMATION',
      'NCR': 'NON-CONFORMANCE REPORT',
      'QS': 'QUANTITY SURVEY SUBMITTALS',
      'DOC': 'DOCUMENT CONTROL SUBMITTALS',
      'PQ': 'PRE-QUALIFICATIONS',
      'PRQ': 'PRE-QUALIFICATIONS',
      'TRS': 'TRANSMITTALS',
      'SNA': 'SNA',
      'SOR': 'SOR',
      'LTR': 'LETTERS IN & OUT'
    };

    const typeMapAr: Record<string, string> = {
      'SHD': 'المخططات التنفيذية',
      'SDW': 'المخططات التنفيذية',
      'MAR': 'تقديمات المواد',
      'MIR': 'طلب معاينة المواد',
      'WIR': 'طلبات استلام الأعمال',
      'RFI': 'طلبات الاستفسارات الفنية',
      'NCR': 'تقارير عدم المطابقة',
      'QS': 'تقديمات حصر الكميات والمساحة',
      'DOC': 'تقديمات إدارة الوثائق',
      'PQ': 'تأهيل المقاولين والموردين',
      'PRQ': 'تأهيل المقاولين والموردين',
      'TRS': 'كتب الإرساليات والخطابات الصادرة',
      'SNA': 'SNA',
      'SOR': 'تقرير ملاحظات الموقع',
      'LTR': 'المراسلات والخطابات'
    };
    
    let longName = language === 'ar' ? (typeMapAr[bt] || bt) : (typeMap[bt] || bt);
    let sectionTitle = `${String(sectionIndex).padStart(2, '0')} ${longName} (${bt})`;
    if (bt === 'MIR') sectionTitle = `${String(sectionIndex).padStart(2, '0')} ${language === 'ar' ? 'طلب معاينة المواد (MIR)' : 'MATERIAL INSPECTION REQUEST (MIR)'}`;
    if (bt === 'WIR') sectionTitle = `${String(sectionIndex).padStart(2, '0')} ${language === 'ar' ? 'طلبات استلام الأعمال (WIR)' : 'INSPECTION REQUEST (WIR)'}`;
    if (bt === 'NCR') sectionTitle = `${String(sectionIndex).padStart(2, '0')} ${language === 'ar' ? 'تقارير عدم المطابقة (NCR)' : 'NON-CONFORMANCE REPORT (NCR)'}`;
    if (bt === 'SOR') sectionTitle = `${String(sectionIndex).padStart(2, '0')} ${language === 'ar' ? 'تقرير ملاحظات الموقع (SOR)' : 'SITE OBSERVATION REPORT (SOR)'}`;
    if (bt === 'LTR') sectionTitle = `${String(sectionIndex).padStart(2, '0')} ${language === 'ar' ? 'المراسلات والخطابات (Letters In & Out)' : 'LETTERS IN & OUT'}`;

    let cols = [
       { label: "Items", key: "discipline" },
       { label: "Total Rev.00", key: "Rev00" },
       { label: "Total Further Rev.", key: "FurtherRev" },
       { label: "Total", key: "Total" },
       { label: "Approved", key: "Approved" },
       { label: "Rejected", key: "RejectedOpen" },
       { label: "Pending", key: "Pending" },
    ];
    let pieLabels = ["Approved", "Rejected", "Pending"];

    if (bt !== 'RFI' && bt !== 'NCR' && bt !== 'SOR' && bt !== 'LTR') {
        monthlyStats.stats.forEach(s => { s.RejectedOpen = Number(s.RejectedOpen) + Number(s.RejectedClosed); });
        cumulativeStats.stats.forEach(s => { s.RejectedOpen = Number(s.RejectedOpen) + Number(s.RejectedClosed); });
    }

    if (bt === 'RFI') {
       cols = [
          { label: "Items", key: "discipline" },
          { label: "Total Rev.00", key: "Rev00" },
          { label: "Total Further Rev.", key: "FurtherRev" },
          { label: "Total", key: "Total" },
          { label: "Pending", key: "Pending" },
          { label: "Closed", key: "Closed" },
       ];
       pieLabels = ["Closed", "Pending"];
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
       pieLabels = ["Closed", "Open", "Pending"];
    } else if (bt === 'LTR') {
       cols = [
          { label: "Stakeholder", key: "discipline" },
          { label: "Sent", key: "Rev00" }, 
          { label: "Received", key: "FurtherRev" }, 
          { label: "Total", key: "Total" },
       ];
       pieLabels = ["Sent", "Received"];
    }

    const renderPeriodSlides = (statsData: Record<string, any>, isMonthly: boolean) => {
        if (!statsData.hasData) return null;
        const periodStr = isMonthly ? (language === 'ar' ? 'لهذه الفترة' : 'This Period') : (language === 'ar' ? 'تراكمي' : 'Cumulative');
        
        return (
          <React.Fragment key={`${bt}-${isMonthly}`}>
            {renderContentSlide(
               <div className="flex w-full items-start justify-between mt-12 px-6">
                  {renderStandardTable(statsData, cols)}
                  {renderStandardBar(statsData, `${bt} ${isMonthly ? 'This Period' : 'Cumulative'} Status`)}
               </div>,
               `${longName} (${bt}) ${periodStr}`
            )}
            
            {renderContentSlide(
               renderPieGrid(statsData, bt === 'LTR' ? "" : (language === 'ar' ? `اعتمادات الجودة لـ (${bt})` : `${bt} Quality Approval`), pieLabels),
               `${longName} (${bt}) ${periodStr}`
            )}
            
          </React.Fragment>
        );
    };

    return (
      <React.Fragment key={bt}>
        {renderDividerSlide(bt, sectionTitle)}
        {renderPeriodSlides(monthlyStats, true)}
        {renderPeriodSlides(cumulativeStats, false)}
      </React.Fragment>
    );
  };

  const [pendingPageSize, setPendingPageSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('docuCtrl_pres_pendingPageSize');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val)) return val;
      }
    } catch { /* Safe default fallback */ }
    return 15;
  });

  const [rejectedPageSize, setRejectedPageSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('docuCtrl_pres_rejectedPageSize');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val)) return val;
      }
    } catch { /* Safe default fallback */ }
    return 15;
  });

  const [showTradeCol, setShowTradeCol] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('docuCtrl_pres_showTradeCol');
      return saved === null ? true : saved === 'true';
    } catch { return true; }
  });

  const [showRefCol, setShowRefCol] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('docuCtrl_pres_showRefCol');
      return saved === null ? true : saved === 'true';
    } catch { return true; }
  });

  const [showRemarksCol, setShowRemarksCol] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('docuCtrl_pres_showRemarksCol');
      return saved === null ? true : saved === 'true';
    } catch { return true; }
  });

  const [saveFeedback, setSaveFeedback] = useState<boolean>(false);

  const saveAllSettings = (pSize: number, rSize: number, trade: boolean, ref: boolean, remarks: boolean) => {
    localStorage.setItem('docuCtrl_pres_pendingPageSize', String(pSize));
    localStorage.setItem('docuCtrl_pres_rejectedPageSize', String(rSize));
    localStorage.setItem('docuCtrl_pres_showTradeCol', String(trade));
    localStorage.setItem('docuCtrl_pres_showRefCol', String(ref));
    localStorage.setItem('docuCtrl_pres_showRemarksCol', String(remarks));
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2500);
  };

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

  return (
    <div
      id="presentation-container"
      className="max-w-[1250px] mx-auto pb-20 print:p-0 print:m-0 print:max-w-none font-sans"
      style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
    >
      {/* Settings Customizer - Web Presentation Options */}
      <div className="mb-8 p-6 bg-white border border-slate-200 rounded-xl shadow-lg print:hidden font-sans">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#203864] flex items-center gap-2">
              <span className="p-1.5 bg-[#ddebf7] text-[#203864] rounded text-sm">💡</span>
              {t('presentation_settings_title')}
            </h2>
            <p className="text-xs text-slate-500 mt-1">{language === 'ar' ? 'تخصيص حجم الصفحات والأعمدة وحفظ الإعدادات تلقائياً' : 'Configure page size, columns and auto-save'}</p>
          </div>
          {saveFeedback && (
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded border border-emerald-200 animate-pulse flex items-center gap-1.5">
              <span>✓</span> {language === 'ar' ? 'تم حفظ الإعدادات بنجاح' : 'Settings Saved successfully'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Rejected Page Size */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">{t('presentation_settings_rejected_rows')}</label>
            <select
              value={rejectedPageSize}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setRejectedPageSize(val);
                saveAllSettings(pendingPageSize, val, showTradeCol, showRefCol, showRemarksCol);
              }}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white outline-none focus:border-blue-500 font-medium"
            >
              <option value={5}>5 lines</option>
              <option value={10}>10 lines</option>
              <option value={15}>15 lines (Default)</option>
              <option value={20}>20 lines</option>
              <option value={30}>30 lines</option>
            </select>
          </div>

          {/* Pending Page Size */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">{t('presentation_settings_pending_rows')}</label>
            <select
              value={pendingPageSize}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setPendingPageSize(val);
                saveAllSettings(val, rejectedPageSize, showTradeCol, showRefCol, showRemarksCol);
              }}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white outline-none focus:border-blue-500 font-medium"
            >
              <option value={5}>5 lines</option>
              <option value={10}>10 lines</option>
              <option value={15}>15 lines (Default)</option>
              <option value={20}>20 lines</option>
              <option value={30}>30 lines</option>
            </select>
          </div>

          {/* Column Toggle - Ref */}
          <div className="flex items-center gap-2 mt-6">
            <input
              type="checkbox"
              id="toggle-ref"
              checked={showRefCol}
              onChange={(e) => {
                const checked = e.target.checked;
                setShowRefCol(checked);
                saveAllSettings(pendingPageSize, rejectedPageSize, showTradeCol, checked, showRemarksCol);
              }}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="toggle-ref" className="text-xs font-medium text-slate-700 cursor-pointer">
              {t('presentation_settings_ref_col')}
            </label>
          </div>

          {/* Column Toggle - Trade */}
          <div className="flex items-center gap-2 mt-6">
            <input
              type="checkbox"
              id="toggle-trade"
              checked={showTradeCol}
              onChange={(e) => {
                const checked = e.target.checked;
                setShowTradeCol(checked);
                saveAllSettings(pendingPageSize, rejectedPageSize, checked, showRefCol, showRemarksCol);
              }}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="toggle-trade" className="text-xs font-medium text-slate-700 cursor-pointer">
              {language === 'ar' ? 'عمود التخصص' : 'Trade Column'}
            </label>
          </div>

          {/* Column Toggle - Remarks */}
          <div className="flex items-center gap-2 mt-6">
            <input
              type="checkbox"
              id="toggle-remarks"
              checked={showRemarksCol}
              onChange={(e) => {
                const checked = e.target.checked;
                setShowRemarksCol(checked);
                saveAllSettings(pendingPageSize, rejectedPageSize, showTradeCol, showRefCol, checked);
              }}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="toggle-remarks" className="text-xs font-medium text-slate-700 cursor-pointer">
              {t('presentation_settings_remarks_col')}
            </label>
          </div>
        </div>
      </div>
      {/* 0. Cover Page */}
      <div className="presentation-slide text-white relative mb-8 overflow-hidden break-after-page page-break-after-always print:mb-0 border border-[#e2e8f0] print:border-none flex" style={{ width: '1500px', height: '843px', backgroundColor: PRIMARY_BLUE }}>
         <div className="h-full w-6" style={{ backgroundColor: ACCENT_GOLD }}></div>
         
         <div className="flex-1 px-32 flex flex-col justify-center relative">
            <h1 className="text-[72px] font-bold mb-4 tracking-wide" style={{ letterSpacing: '2px' }}>DOCUMENT CONTROL</h1>
            <h2 className="text-[64px] font-bold tracking-wide" style={{ color: ACCENT_GOLD }}>MONTHLY REPORT</h2>

            <div className="w-full max-w-[800px] h-[3px] mt-24 mb-4" style={{ backgroundColor: ACCENT_GOLD }}></div>
            <div className="w-full max-w-[800px] border border-[#cbd5e1] px-6 py-4 text-xl">
               [{pInfo.projectName}]
            </div>

            <div className="w-full max-w-[800px] h-[3px] mt-28 mb-4" style={{ backgroundColor: ACCENT_GOLD }}></div>
            <div className="w-full max-w-[800px] border border-[#cbd5e1] px-6 py-4 text-xl mb-4">
               [Report Date: {new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric'})}]
            </div>
            <div className="w-full max-w-[800px] border border-[#cbd5e1] px-6 py-4 text-xl">
               [{pInfo.contractorName}]
            </div>
         </div>

         {renderCompanyLogo("h-14", "text-xl", "absolute top-16 right-16 px-8 py-4")}
      </div>

      {/* Index Page */}
      <div className="presentation-slide mb-8 overflow-hidden break-after-page page-break-after-always print:mb-0 border border-[#e2e8f0] print:border-none flex" style={{ width: '1500px', height: '843px', backgroundColor: 'white' }}>
         <div className="w-[30%] h-full text-white pt-32 px-16 relative flex flex-col shrink-0" style={{ backgroundColor: PRIMARY_BLUE }}>
            <h1 className="text-[64px] font-bold mb-6">{language === 'ar' ? 'الفهرس' : 'INDEX'}</h1>
            <h3 className="text-xl text-[#cbd5e1] mb-6">{language === 'ar' ? 'جدول المحتويات' : 'Table of Contents'}</h3>
            <div className="w-[80%] h-[3px]" style={{ backgroundColor: ACCENT_GOLD }}></div>
         </div>

         <div className="w-[70%] h-full pt-44 px-32 bg-white flex flex-col justify-start relative">
             {renderCompanyLogo("h-8", "text-sm", "absolute top-16 right-16")}
             <div className="flex flex-col gap-8 text-xl text-[#333] font-medium w-full max-w-[700px]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-8">
                       <div className="w-12 py-2 text-center text-white" style={{ backgroundColor: '#2f75b5' }}>01</div>
                       <span>{language === 'ar' ? 'بيانات وممثلو المشروع' : 'Project Information & Team'}</span>
                    </div>
                </div>
                {baseTypes.map((bt, i) => {
                    const typeMap: Record<string, string> = language === 'ar' ? {
                        'SHD': 'المخططات التنفيذية (SHD)',
                        'SDW': 'المخططات التنفيذية (SDW)',
                        'MAR': 'تقديمات المواد (MAR)',
                        'MIR': 'طلب معاينة المواد (MIR)',
                        'WIR': 'طلبات استلام الأعمال (WIR)',
                        'RFI': 'طلب استفسارات فنية (RFI)',
                        'NCR': 'تقارير عدم المطابقة (NCR)',
                        'QS': 'تقديمات حصر الكميات والمساحة (QS)',
                        'DOC': 'تقديمات إدارة الوثائق (DOC)',
                        'PQ': 'تأهيل المقاولين والموردين (PQ)',
                        'PRQ': 'تأهيل المقاولين والموردين (PRQ)',
                        'TRS': 'كتب الإرساليات والخطابات الصادرة (TRS)',
                        'LTR': 'المراسلات والخطابات (LTR)'
                    } : {
                        'SHD': 'Shop Drawings (SHD)',
                        'SDW': 'Shop Drawings (SHD)',
                        'MAR': 'Material Submittals (MAR)',
                        'MIR': 'Material Inspection Request (MIR)',
                        'WIR': 'Inspection Request (WIR)',
                        'RFI': 'Request for Information (RFI)',
                        'NCR': 'Non-Conformance Report (NCR)',
                        'QS': 'Quantity Survey Submittals (QS)',
                        'DOC': 'Document Control Submittals (DOC)',
                        'PQ': 'Pre-qualifications (PQ)',
                        'PRQ': 'Pre-qualifications (PQ)',
                        'TRS': 'Transmittals (TRS)',
                        'LTR': 'Letters (LTR)'
                    };
                    return (
                        <div key={bt} className="flex items-center justify-between">
                           <div className="flex items-center gap-8">
                               <div className="w-12 py-2 text-center text-white" style={{ backgroundColor: '#2f75b5' }}>{String(i + 2).padStart(2, '0')}</div>
                               <span>{typeMap[bt] || bt}</span>
                           </div>
                        </div>
                    );
                })}
                 <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-8">
                       <div className="w-12 py-2 text-center text-white font-mono" style={{ backgroundColor: '#c00000' }}>{String(baseTypes.length + 2).padStart(2, '0')}</div>
                       <span>{language === 'ar' ? 'الوثائق المرفوضة معلقة إجراء' : 'Rejected Items (Action Required)'}</span>
                    </div>
                 </div>
                 <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-8">
                       <div className="w-12 py-2 text-center text-white font-mono" style={{ backgroundColor: '#2f75b5' }}>{String(baseTypes.length + 3).padStart(2, '0')}</div>
                       <span>{language === 'ar' ? 'الوثائق المعلقة المتأخرة بالرد' : 'Pending Items (Overdue)'}</span>
                    </div>
                 </div>
             </div>
         </div>

         <div className="absolute bottom-8 left-16 right-16 text-xs text-[#cbd5e1] flex justify-between z-10 w-full px-16">
             <div className="flex gap-2">
                 <span>[{pInfo.projectName}]</span>
                 <span>|</span>
                 <span>{language === 'ar' ? 'تقرير التحكم بالمستندات الشهري' : 'Document Control Monthly Report'}</span>
                 <span>|</span>
                 <span>[{new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { day: '2-digit', month: 'long', year: 'numeric' })}]</span>
             </div>
         </div>
      </div>

      {/* 1. PROJECT INFO */}
      {renderDividerSlide(language === 'ar' ? 'ممثلو المشروع وتفاصيل العقد' : 'Team Members & Project Details', language === 'ar' ? '01 معلومات المشروع' : '01 PROJECT INFORMATION')}
      
      {renderContentSlide(
         <div className="flex flex-col gap-6 pt-10">
             <div className="grid grid-cols-3 gap-8">
                 <div className="border border-[#cbd5e1] h-32 flex flex-col justify-between">
                     <div className="w-full text-white p-2 font-bold text-sm" style={{ backgroundColor: '#2f75b5' }}>{language === 'ar' ? 'المالك / صاحب العمل' : 'Employer'}</div>
                     <div className="p-4 text-xl font-medium">{pInfo.clientName}</div>
                 </div>
                 <div className="border border-[#cbd5e1] h-32 flex flex-col justify-between">
                     <div className="w-full text-white p-2 font-bold text-sm" style={{ backgroundColor: '#2f75b5' }}>{language === 'ar' ? 'الاستشاري الرئيسي' : 'Consultant'}</div>
                     <div className="p-4 text-xl font-medium">{pInfo.consultantName}</div>
                 </div>
                 <div className="border border-[#cbd5e1] h-32 flex flex-col justify-between">
                     <div className="w-full text-white p-2 font-bold text-sm" style={{ backgroundColor: '#2f75b5' }}>{language === 'ar' ? 'مدير المشروع' : 'CA / PM'}</div>
                     <div className="p-4 text-xl font-medium">{pInfo.projectManager}</div>
                 </div>
                 <div className="border border-[#cbd5e1] h-32 flex flex-col justify-between mt-4">
                     <div className="w-full text-white p-2 font-bold text-sm" style={{ backgroundColor: '#5b9bd5' }}>{language === 'ar' ? 'المقاول الرئيسي' : 'Contractor'}</div>
                     <div className="p-4 text-xl font-medium">{pInfo.contractorName}</div>
                 </div>
             </div>
         </div>,
         language === 'ar' ? 'معلومات المشروع' : 'PROJECT INFORMATION'
      )}

      {/* RENDER EACH SECTION BASED ON BASE TYPES */}
      {baseTypes.map((bt, index) => renderSlidesForBaseType(bt, index + 2))}

      {/* REJECTED ITEMS */}
      {renderDividerSlide(language === 'ar' ? 'الوثائق التي تتطلب إعادة تقديم' : 'Items Requiring Resubmission', language === 'ar' ? `${String(baseTypes.length + 2).padStart(2, '0')} الوثائق المرفوضة` : `${String(baseTypes.length + 2).padStart(2, '0')} REJECTED ITEMS`)}
      
      {rejectedPages.length === 0 ? (
          renderContentSlide(
             <div className="flex flex-col h-full items-center justify-center text-[#64748b]">
                <p className="text-3xl font-bold mb-4 text-[#7a1515]">{language === 'ar' ? 'لا توجد وثائق مرفوضة معلقة' : 'No Rejected Items'}</p>
                <p className="text-xl">{language === 'ar' ? 'تمت تسوية جميع التقديمات المرفوضة أو إعادة تقديمها بنجاح.' : 'All rejected submittals are resolved or resubmitted.'}</p>
             </div>,
             language === 'ar' ? 'الوثائق المرفوضة' : 'REJECTED ITEMS'
          )
      ) : (
          rejectedPages.map((pageData, pageIdx) => renderContentSlide(
            <div className="flex flex-col h-full">
              <h3 className="font-bold mb-4 text-2xl text-[#7a1515] flex items-center gap-2">
                <span>{language === 'ar' ? 'الوثائق المرفوضة (تتطلب اتخاذ إجراء فوري)' : 'Rejected Items (Action Required)'}</span>
                <span className="text-sm font-medium bg-red-100 text-[#7a1515] px-2 py-0.5 rounded">{language === 'ar' ? `صفحة ${pageIdx + 1} من ${rejectedPages.length}` : `Page ${pageIdx + 1} of ${rejectedPages.length}`}</span>
              </h3>
              <table className="w-full text-sm text-center border-collapse border border-[#cbd5e1]">
                <thead>
                  <tr style={{ backgroundColor: '#7a1515', color: 'white' }}>
                    <th className="p-3 border border-[#cbd5e1] w-16">{language === 'ar' ? 'م' : 'No.'}</th>
                    <th className="p-3 border border-[#cbd5e1]">{language === 'ar' ? 'نوع المستند / المعاملة' : 'Type of Documents'}</th>
                    {showRefCol && <th className="p-3 border border-[#cbd5e1]">{language === 'ar' ? 'الرقم المرجعي' : 'Ref / Link'}</th>}
                    {showTradeCol && <th className="p-3 border border-[#cbd5e1]">{language === 'ar' ? 'التخصص' : 'Trade'}</th>}
                    {showRemarksCol && <th className="p-3 border border-[#cbd5e1]">{language === 'ar' ? 'الملاحظات' : 'Remarks'}</th>}
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((row, i) => (
                      <tr key={i} className="even:bg-[#fff5f5] hover:bg-red-50/55 min-h-[48px] h-12 transition-colors">
                        <td className="border border-[#cbd5e1] px-3 font-mono">{pageIdx * rejectedPageSize + i + 1}</td>
                        <td className="border border-[#cbd5e1] px-3 font-bold text-[#7a1515]">{row.documentType}</td>
                        {showRefCol && <td className="border border-[#cbd5e1] px-3 font-mono text-xs">{row.docNo || '-'}</td>}
                        {showTradeCol && <td className="border border-[#cbd5e1] px-3 text-xs">{getDiscName(row.trade) || '-'}</td>}
                        {showRemarksCol && <td className="border border-[#cbd5e1] px-3 text-red-600 font-medium">{language === 'ar' ? `متأخر لـ ${row.delayDays} يوم` : `Overdue by ${row.delayDays} days`}</td>}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>,
            language === 'ar' ? 'الوثائق المرفوضة' : 'REJECTED ITEMS',
            `rejected-page-${pageIdx}`
          ))
      )}

      {/* PENDING ITEMS */}
      {renderDividerSlide(language === 'ar' ? 'الوثائق المعلقة التي تتطلب رداً' : 'Items Requiring Response', language === 'ar' ? `${String(baseTypes.length + 3).padStart(2, '0')} الوثائق المعلقة` : `${String(baseTypes.length + 3).padStart(2, '0')} PENDING ITEMS`)}
      
      {pendingPages.length === 0 ? (
          renderContentSlide(
             <div className="flex flex-col h-full items-center justify-center text-[#64748b]">
                <p className="text-3xl font-bold mb-4 text-[#203864]">{language === 'ar' ? 'لا توجد وثائق معلقة متأخرة' : 'No Pending Items'}</p>
                <p className="text-xl">{language === 'ar' ? 'تم الرد على جميع الوثائق وإغلاقها بالكامل.' : 'All pending documents are closed.'}</p>
             </div>,
             language === 'ar' ? 'الوثائق المعلقة' : 'PENDING ITEMS'
          )
      ) : (
          pendingPages.map((pageData, pageIdx) => renderContentSlide(
            <div className="flex flex-col h-full">
              <h3 className="font-bold mb-4 text-2xl text-[#203864] flex items-center gap-2">
                <span>{language === 'ar' ? 'الوثائق المعلقة المتأخرة بالرد' : 'Pending Items (Overdue)'}</span>
                <span className="text-sm font-medium bg-blue-100 text-[#203864] px-2 py-0.5 rounded">{language === 'ar' ? `صفحة ${pageIdx + 1} من ${pendingPages.length}` : `Page ${pageIdx + 1} of ${pendingPages.length}`}</span>
              </h3>
              <table className="w-full text-sm text-center border-collapse border border-[#cbd5e1]">
                <thead>
                  <tr style={{ backgroundColor: PRIMARY_BLUE, color: 'white' }}>
                    <th className="p-3 border border-[#cbd5e1] w-16">{language === 'ar' ? 'م' : 'No.'}</th>
                    <th className="p-3 border border-[#cbd5e1]">{language === 'ar' ? 'نوع المستند / المعاملة' : 'Type of Documents'}</th>
                    {showRefCol && <th className="p-3 border border-[#cbd5e1]">{language === 'ar' ? 'الرقم المرجعي' : 'Ref / Link'}</th>}
                    {showTradeCol && <th className="p-3 border border-[#cbd5e1]">{language === 'ar' ? 'التخصص' : 'Trade'}</th>}
                    {showRemarksCol && <th className="p-3 border border-[#cbd5e1]">{language === 'ar' ? 'الملاحظات' : 'Remarks'}</th>}
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((row, i) => (
                      <tr key={i} className="even:bg-[#f8fafc] hover:bg-slate-50 min-h-[48px] h-12 transition-colors">
                        <td className="border border-[#cbd5e1] px-3 font-mono">{pageIdx * pendingPageSize + i + 1}</td>
                        <td className="border border-[#cbd5e1] px-3 font-bold text-[#203864]">{row.documentType}</td>
                        {showRefCol && <td className="border border-[#cbd5e1] px-3 font-mono text-xs">{row.docNo || '-'}</td>}
                        {showTradeCol && <td className="border border-[#cbd5e1] px-3 text-xs">{getDiscName(row.trade) || '-'}</td>}
                        {showRemarksCol && <td className="border border-[#cbd5e1] px-3 text-red-600 font-medium">{language === 'ar' ? `متأخر لـ ${row.delayDays} يوم` : `Overdue by ${row.delayDays} days`}</td>}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>,
            language === 'ar' ? 'الوثائق المعلقة' : 'PENDING ITEMS',
            `pending-page-${pageIdx}`
          ))
      )}

      {renderDividerSlide(language === 'ar' ? 'فريق التحكم في الوثائق' : 'Document Control Team', language === 'ar' ? 'شكراً لكم' : 'Thanks')}
    </div>
  );
}
