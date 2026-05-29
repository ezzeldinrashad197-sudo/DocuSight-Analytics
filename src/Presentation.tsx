import React, { useMemo } from "react";
import { SubmittalRow, ProjectSettings } from "./types";
import { calculateStats } from "./utils/calculations";
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

interface PresentationProps {
  data: SubmittalRow[];
  filterMonthly: (row: SubmittalRow) => boolean;
  filterCumulative: (row: SubmittalRow) => boolean;
  projectInfo: ProjectSettings | null;
}

const COLORS = ["#00B050", "#FF0000", "#FFC000", "#6B7280"];

export default function Presentation({
  data,
  filterMonthly,
  filterCumulative,
  projectInfo,
}: PresentationProps) {
  
  const pInfo = projectInfo || {
    projectName: "NO PROJECT CONFIGURED",
    projectCode: "N/A",
    clientName: "N/A",
    consultantName: "N/A",
    contractorName: "N/A",
    projectManager: "N/A",
    documentControlManager: "N/A",
  };

  const monthlyData = useMemo(
    () => data.filter(filterMonthly),
    [data, filterMonthly],
  );
  const cumulativeData = useMemo(
    () => data.filter(filterCumulative),
    [data, filterCumulative],
  );

  const renderSlide = (content: React.ReactNode, title?: string) => (
    <div className="presentation-slide w-full aspect-[16/9] bg-[#ffffff] text-[#1e293b] relative shadow-2xl mb-8 overflow-hidden break-after-page page-break-after-always print:shadow-none print:mb-0 print:border-none border border-[#e2e8f0]">
      <div className="absolute top-1/2 -translate-y-1/2 -left-1/4 w-[150%] h-[150%] rounded-full border-[60px] border-[#f8fafc] opacity-50 z-0 pointer-events-none"></div>
      <div className="absolute top-1/2 -translate-y-1/2 -left-[10%] w-[120%] h-[120%] rounded-full border-[60px] border-[#f1f5f9] opacity-50 z-0 pointer-events-none"></div>
      
      {/* Branding Watermark */}
      <div className="absolute bottom-4 left-6 flex items-center gap-3 z-10 opacity-70">
        <img src="/logo.png" alt="Logo" className="h-8 max-w-[100px] object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        <div className="border-l-2 border-[#cbd5e1] pl-3">
            <p className="text-[10px] font-bold text-[#334155] tracking-wider uppercase">CONCEPT & PRODUCT VISION BY EZZ RASHAD</p>
            <p className="text-[8px] text-[#64748b] uppercase">Engineering Reporting & KPI Intelligence Platform</p>
        </div>
      </div>

      {title && (
        <div className="absolute top-8 left-12 right-12 flex justify-between items-start z-10">
          <div>
            <h1 className="text-3xl font-bold font-sans text-[#1e293b] mb-2">
              {pInfo.projectName}
            </h1>
            <h2 className="text-lg font-medium text-[#475569] flex items-center gap-2">
              <span className="text-[#94a3b8]">➢</span> {title}
            </h2>
          </div>
        </div>
      )}
      <div
        className={`relative z-10 w-full h-full ${title ? "pt-32 px-12 pb-12" : "p-12"}`}
      >
        {content}
      </div>
    </div>
  );

  const renderDivider = (title: string) => (
    <div className="presentation-slide w-full aspect-[16/9] bg-[#ffffff] text-[#1e293b] relative shadow-2xl mb-8 overflow-hidden break-after-page page-break-after-always print:shadow-none print:mb-0">
      <div className="absolute top-1/2 -translate-y-1/2 -left-[10%] w-[120%] h-[120%] rounded-full border-[60px] border-[#f1f5f9] opacity-50 z-0"></div>
      
      {/* Branding Watermark */}
      <div className="absolute bottom-4 left-6 flex items-center gap-3 z-10 opacity-70">
        <img src="/logo.png" alt="Logo" className="h-8 max-w-[100px] object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        <div className="border-l-2 border-[#cbd5e1] pl-3">
            <p className="text-[10px] font-bold text-[#334155] tracking-wider uppercase">CONCEPT & PRODUCT VISION BY EZZ RASHAD</p>
            <p className="text-[8px] text-[#64748b] uppercase">Engineering Reporting & KPI Intelligence Platform</p>
        </div>
      </div>

      <div className="absolute top-1/2 -translate-y-1/2 left-16 z-10">
        <h1 className="text-4xl font-bold text-[#1e293b] uppercase">{title}</h1>
      </div>
    </div>
  );

  const docTypes = Array.from(new Set(data.map((d) => d.documentType || "GENERAL")));

  const renderStandardTable = (statsData: any, cols: any[]) => {
    return (
      <table className="w-full text-xs text-left border-collapse mt-4 shadow-sm">
        <thead>
          <tr className="bg-[#1e293b] text-[#ffffff]">
            <th
              className="p-2 border border-[#475569]"
              colSpan={cols.length}
              style={{ textAlign: "center" }}
            >
              Data Log Type Summary
            </th>
          </tr>
          <tr className="bg-[#e2e8f0] text-[#1e293b]">
            {cols.map((c, i) => (
              <th key={i} className="p-2 border border-[#cbd5e1] font-bold text-center">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {statsData.stats.map((s: any) => (
            <tr key={s.discipline} className="hover:bg-[#f8fafc] transition-colors">
              <td className="p-2 border border-[#e2e8f0] font-bold bg-[#f1f5f9] text-center">
                {s.discipline}
              </td>
              {cols.slice(1).map((c, i) => (
                <td
                  key={i}
                  className={`p-2 border border-[#e2e8f0] text-center ${c.key === "Total" ? "font-bold bg-[#f8fafc]" : ""}`}
                >
                  {s[c.key]}
                </td>
              ))}
            </tr>
          ))}
          <tr className="bg-[#e2e8f0]">
            <td className="p-2 border border-[#cbd5e1] font-bold text-center">Total</td>
            {cols.slice(1).map((c, i) => (
              <td key={i} className="p-2 border border-[#cbd5e1] text-center font-black">
                {statsData.totalRow[c.key]}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    );
  };

  const renderStandardBar = (statsData: any, titleStr: string) => (
    <div className="w-full h-[70%]">
      <h3 className="text-center font-bold mb-4 text-sm text-[#334155]">{titleStr}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={statsData.stats}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis dataKey="discipline" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
          <RechartsTooltip cursor={{fill: '#F8FAFC'}} />
          <Legend wrapperStyle={{ fontSize: "10px", marginTop: "10px" }} />
          <Bar dataKey="Rev00" stackId="a" fill="#0EA5E9" name="Rev.00" radius={[0, 0, 4, 4]} />
          <Bar
            dataKey="FurtherRev"
            stackId="a"
            fill="#3B82F6"
            name="Further Rev."
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  const renderPieGrid = (
    statsData: any,
    titleStr: string,
    labels: string[] = ["Approve", "Rejected", "Pending"],
  ) => (
    <div className="flex flex-col h-full pb-8">
      <h3 className="font-bold mb-6 text-xl text-[#1e293b] px-4 border-l-4 border-[#3b82f6]">{titleStr}</h3>
      <div className="flex flex-wrap gap-6 justify-center items-start overflow-y-auto">
        {statsData.stats.map((s: any) => {
          let pieData = [];
          if (labels.length === 2 && labels[0] === "Closed") {
            pieData = [
              { name: "Closed", value: Number(s.Closed) || 0, fill: "#10B981" },
              {
                name: "Pending",
                value: Number(s.Pending) || 0,
                fill: "#F59E0B",
              },
            ];
          } else {
            pieData = [
              {
                name: "Approved",
                value: Number(s.Approved) || 0,
                fill: "#10B981",
              },
              {
                name: "Rejected Open",
                value: Number(s.RejectedOpen) || 0,
                fill: "#EF4444",
              },
              {
                name: "Rejected Closed",
                value: Number(s.RejectedClosed) || 0,
                fill: "#7F1D1D",
              },
              {
                name: "Pending",
                value: Number(s.Pending) || 0,
                fill: "#F59E0B",
              },
            ];
          }
          let hasData = pieData.some((p) => p.value > 0);
          // If no data, render an empty chart visually identical
          const finalData = hasData
            ? pieData.filter((p) => p.value > 0)
            : [{ name: "Void", value: 1, fill: "#F1F5F9" }];

          return (
            <div
              key={s.discipline}
              className="w-[22%] h-40 flex flex-col items-center bg-[#f8fafc] rounded-xl p-3 border border-[#f1f5f9] shadow-sm"
            >
              <h4 className="font-bold text-xs whitespace-nowrap mb-2 text-[#475569]">
                {s.discipline}
              </h4>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={finalData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    dataKey="value"
                    isAnimationActive={false}
                    paddingAngle={2}
                  >
                    {finalData.map((e, index) => (
                      <Cell key={index} fill={e.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(val: any) => (hasData ? val : 0)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          );
        })}
      </div>
    </div>
  );

  const compileStatsByDocType = (dataset: SubmittalRow[]) => {
    const stats = docTypes.map((lt) => {
      const dData = dataset.filter(
        (d) => (d.documentType || "GENERAL") === lt
      );
      const s = calculateStats(dData);
      
      return {
        discipline: lt, // Map Document Types identically to 'discipline' for chart components
        Rev00: s.totalDrawingsRev0 || s.totalSheetsRev0 || 0,
        FurtherRev: s.totalDrawingsFurtherRev || s.totalSheetsFurtherRev || 0,
        Approved: s.approved,
        RejectedOpen: s.rejectedOpen,
        RejectedClosed: s.rejectedClosed,
        Pending: s.pending,
        Total: s.totalSubmittedSheets,
        Closed: s.approved + s.rejectedClosed,
        Open: s.rejectedOpen + s.pending,
      };
    });

    stats.sort((a, b) => a.discipline.localeCompare(b.discipline));

    const totalRow = {
      discipline: "Total",
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

    return { stats, totalRow };
  };

  const periodStats = compileStatsByDocType(monthlyData);
  const cumulativeStats = compileStatsByDocType(cumulativeData);

  const summaryCols = [
    { label: "Classification", key: "discipline" },
    { label: "Rev. 00", key: "Rev00" },
    { label: "Further Rev.", key: "FurtherRev" },
    { label: "Total items", key: "Total" },
    { label: "Approved", key: "Approved" },
    { label: "Rej. Open", key: "RejectedOpen" },
    { label: "Rej. Closed", key: "RejectedClosed" },
    { label: "Pending", key: "Pending" },
  ];

  const pendingItems = useMemo(() => {
     return cumulativeData.filter(d => d.overdue).sort((a, b) => b.delayDays - a.delayDays);
  }, [cumulativeData]);

  const PENDING_PAGE_SIZE = 8;
  const pendingPages = [];
  for (let i = 0; i < pendingItems.length; i += PENDING_PAGE_SIZE) {
      pendingPages.push(pendingItems.slice(i, i + PENDING_PAGE_SIZE));
  }

  return (
    <div
      id="presentation-container"
      className="max-w-[1200px] mx-auto pb-20 print:p-0 print:m-0 print:max-w-none"
      style={
        { WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } as any
      }
    >
      {/* 0. Cover Page */}
      <div className="presentation-slide w-full aspect-[16/9] bg-[#0A192F] text-[#ffffff] relative shadow-2xl mb-8 overflow-hidden break-after-page page-break-after-always print:shadow-none print:mb-0 border border-[#e2e8f0] print:border-none">
        <div className="absolute top-1/2 -translate-y-1/2 -left-[30%] w-[150%] h-[150%] rounded-full border-[80px] border-[#0f2545] z-0 pointer-events-none"></div>
        <div className="absolute top-1/2 -translate-y-1/2 -left-[15%] w-[120%] h-[120%] rounded-full border-[80px] border-[#15315b] z-0 pointer-events-none"></div>
        <div className="absolute top-1/2 -translate-y-1/2 left-0 w-[90%] h-[90%] rounded-full border-[80px] border-[#1a3d72] z-0 pointer-events-none"></div>
        
        {/* Branding Watermark Cover */}
        <div className="absolute bottom-8 right-12 flex items-center gap-4 z-10">
            <div className="text-right border-r-2 border-[#1a3d72] pr-4">
                <p className="text-xs font-bold text-[#D4AF37] tracking-widest uppercase">Concept & Product Vision by Ezz Rashad</p>
                <p className="text-[10px] text-[#94a3b8] uppercase tracking-widest mt-1">Engineering Reporting & KPI Intelligence Platform</p>
            </div>
            <img src="/logo.png" alt="Logo" className="h-10 max-w-[120px] object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        </div>

        <div className="absolute top-1/2 -translate-y-1/2 left-16 z-10 max-w-[65%]">
          <h1 className="text-5xl font-bold text-[#D4AF37] mb-4 leading-tight">
            DocuSight Analytics<br/>Monthly KPI Report
          </h1>
          <h2 className="text-3xl text-[#ffffff] font-semibold mb-10 tracking-wide">{pInfo.projectName} - {pInfo.projectCode}</h2>
          
          <div className="bg-[#0f2545]/90 p-8 rounded-2xl border border-[#1a3d72] shadow-2xl inline-block text-sm w-full max-w-lg backdrop-blur-md">
             <table className="text-left w-full border-collapse">
               <tbody>
                 <tr>
                   <th className="pr-8 py-3 text-[#D4AF37] font-bold w-1/3 text-xs uppercase tracking-wider">Client</th>
                   <td className="text-[#ffffff] font-medium text-base">{pInfo.clientName}</td>
                 </tr>
                 <tr>
                   <th className="pr-8 py-3 text-[#D4AF37] font-bold text-xs uppercase tracking-wider border-t border-[#1a3d72]/50">Consultant</th>
                   <td className="text-[#ffffff] font-medium text-base border-t border-[#1a3d72]/50">{pInfo.consultantName}</td>
                 </tr>
                 <tr>
                   <th className="pr-8 py-3 text-[#D4AF37] font-bold text-xs uppercase tracking-wider border-t border-[#1a3d72]/50">Contractor</th>
                   <td className="text-[#ffffff] font-medium text-base border-t border-[#1a3d72]/50">{pInfo.contractorName}</td>
                 </tr>
                 <tr>
                   <th className="pr-8 py-3 text-[#D4AF37] font-bold text-xs uppercase tracking-wider border-t border-[#1a3d72]/50">Proj. Manager</th>
                   <td className="text-[#ffffff] font-medium text-base border-t border-[#1a3d72]/50">{pInfo.projectManager}</td>
                 </tr>
                 <tr>
                   <th className="pr-8 py-3 text-[#D4AF37] font-bold text-xs uppercase tracking-wider border-t border-[#1a3d72]/50">DC Manager</th>
                   <td className="text-[#ffffff] font-medium text-base border-t border-[#1a3d72]/50">{pInfo.documentControlManager}</td>
                 </tr>
               </tbody>
             </table>
          </div>
        </div>
        
        <div className="absolute bottom-12 left-16 z-10">
          <p className="text-sm font-medium tracking-widest text-[#cbd5e1]">REPORT DATE: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Index Page */}
      {renderSlide(
        <div className="flex flex-col h-full items-center justify-center">
          <ul
            className="text-2xl space-y-6 font-bold text-[#64748b] flex flex-col justify-center items-start"
            style={{ marginLeft: "-150px" }}
          >
            <li className="text-[#1e293b] uppercase flex items-center gap-4">
              <span className="text-[#3B82F6] font-black">1.</span> PROJECT INFORMATION
            </li>
            <li className="text-[#1e293b] uppercase flex items-center gap-4">
              <span className="text-[#3B82F6] font-black">2.</span> EXECUTIVE SUMMARY - THIS PERIOD
            </li>
            <li className="text-[#1e293b] uppercase flex items-center gap-4">
              <span className="text-[#3B82F6] font-black">3.</span> EXECUTIVE SUMMARY - CUMULATIVE
            </li>
            <li className="text-[#1e293b] uppercase flex items-center gap-4">
              <span className="text-[#3B82F6] font-black">4.</span> NON-COMPLIANCE & PENDING ITEMS
            </li>
          </ul>
          <h1 className="text-6xl font-black absolute left-20 top-1/2 -translate-y-1/2 text-[#e2e8f0] -rotate-90 tracking-widest">
            INDEX
          </h1>
        </div>,
      )}

      {/* 1. PROJECT INFO */}
      {renderDivider("1. PROJECT INFORMATION")}

      {/* 2. EXECUTIVE SUMMARY - THIS PERIOD */}
      {renderDivider("2. EXECUTIVE SUMMARY - THIS PERIOD")}
      {renderSlide(
        <div className="flex h-full gap-8">
          <div className="w-1/2 flex items-center">
            {renderStandardTable(periodStats, summaryCols)}
          </div>
          <div className="w-1/2 flex items-center justify-center">
            {renderStandardBar(periodStats, "Metrics - This Period")}
          </div>
        </div>,
        "Executive Summary - This Period",
      )}
      {renderSlide(
        renderPieGrid(periodStats, "Quality Approval Breakdown (This Period)"),
        "Executive Summary - This Period",
      )}

      {/* 3. EXECUTIVE SUMMARY - CUMULATIVE */}
      {renderDivider("3. EXECUTIVE SUMMARY - CUMULATIVE")}
      {renderSlide(
        <div className="flex h-full gap-8">
          <div className="w-1/2 flex items-center">
            {renderStandardTable(cumulativeStats, summaryCols)}
          </div>
          <div className="w-1/2 flex items-center justify-center">
            {renderStandardBar(cumulativeStats, "Metrics - Cumulative")}
          </div>
        </div>,
        "Executive Summary - Cumulative",
      )}
      {renderSlide(
        renderPieGrid(cumulativeStats, "Quality Approval Breakdown (Cumulative)"),
        "Executive Summary - Cumulative",
      )}

      {/* 4. NON-COMPLIANCE & PENDING ITEMS */}
      {renderDivider("4. PENDING ITEMS")}
      
      {pendingPages.length === 0 ? (
          renderSlide(
             <div className="flex flex-col h-full items-center justify-center text-[#64748b]">
                <p className="text-2xl font-bold">No Overdue Items</p>
                <p>All items are currently within their target SLA limits.</p>
             </div>,
             "Pending Engineering Records"
          )
      ) : (
          pendingPages.map((pageData, pageIdx) => renderSlide(
            <div className="flex flex-col h-full mt-4" key={`pending-page-${pageIdx}`}>
              <h3 className="font-bold mb-4 text-xl border-l-4 border-[#ef4444] px-3 flex justify-between">
                <span>Overdue Actions Required</span>
                <span className="text-sm font-normal text-[#64748b]">Page {pageIdx + 1} of {pendingPages.length}</span>
              </h3>
              <div className="overflow-hidden rounded-xl border border-[#e2e8f0]">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-[#1e293b] text-[#ffffff]">
                      <th className="p-3 border-b border-[#334155] w-12 text-center">No.</th>
                      <th className="p-3 border-b border-[#334155]">Classification</th>
                      <th className="p-3 border-b border-[#334155]">Ref / Issue Number</th>
                      <th className="p-3 border-b border-[#334155]">Trade</th>
                      <th className="p-3 border-b border-[#334155]">Days Overdue</th>
                      <th className="p-3 border-b border-[#334155]">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.map((row, i) => (
                        <tr key={i} className="bg-[#f8fafc] odd:bg-[#ffffff] min-h-[40px] hover:bg-[#f1f5f9]">
                          <td className="border-b border-[#e2e8f0] px-3 py-3 text-center text-[#94a3b8]">{pageIdx * PENDING_PAGE_SIZE + i + 1}</td>
                          <td className="border-b border-[#e2e8f0] px-3 py-3 font-bold text-[#3B82F6]">[{row.documentType}]</td>
                          <td className="border-b border-[#e2e8f0] px-3 py-3 font-black text-[#0A192F]">{row.docNo}</td>
                          <td className="border-b border-[#e2e8f0] px-3 py-3 text-[#475569]">{row.trade}</td>
                          <td className="border-b border-[#e2e8f0] px-3 py-3 font-bold text-[#ef4444]">{row.delayDays} Days</td>
                          <td className="border-b border-[#e2e8f0] px-3 py-3 text-xs text-[#64748b] truncate max-w-xs" title={row.status}>{row.status}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>,
            "Pending Engineering Records",
          ))
      )}

      {/* Final Thanks Slide */}
      <div className="presentation-slide w-full aspect-[16/9] bg-[#0A192F] text-[#ffffff] relative shadow-2xl mb-8 overflow-hidden break-after-page page-break-after-always print:shadow-none print:mb-0 border border-[#e2e8f0] print:border-none">
        <div className="absolute top-1/2 -translate-y-1/2 -left-[10%] w-[120%] h-[120%] rounded-full border-[60px] border-[#0f2545] opacity-50 z-0"></div>
        
        {/* Branding Watermark */}
        <div className="absolute bottom-6 left-10 flex items-center gap-4 z-10 opacity-90">
          <img src="/logo.png" alt="Logo" className="h-10 max-w-[120px] object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <div className="border-l-2 border-[#1a3d72] pl-4">
              <p className="text-xs font-bold text-[#D4AF37] tracking-widest uppercase">CONCEPT & PRODUCT VISION BY EZZ RASHAD</p>
              <p className="text-[10px] text-[#94a3b8] uppercase tracking-widest mt-1">Engineering Reporting & KPI Intelligence Platform</p>
          </div>
        </div>

        <div className="absolute top-1/2 -translate-y-1/2 right-20 z-10">
          <h1 className="text-7xl font-bold text-[#ffffff] tracking-widest uppercase">Thank You</h1>
          <p className="text-right mt-4 text-[#D4AF37] text-xl font-medium tracking-wide">End of Report</p>
        </div>
      </div>
    </div>
  );
}

