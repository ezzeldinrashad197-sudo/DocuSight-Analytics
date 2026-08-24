import React from 'react';
import { SubmittalRow, ProjectSettings } from '../../types';

export const PRIMARY_BLUE = "#203864";
export const ACCENT_GOLD = "#eab308";

export function getDiscName(d: string, language: 'ar' | 'en') {
  if (language !== 'ar') return d;
  const lower = d.toUpperCase().trim();
  if (lower === 'TOTAL' || lower === 'GRAND TOTAL') return 'الإجمالي';
  if (lower === 'STR' || lower === 'STRUCTURAL') return 'إنشائي';
  if (lower === 'STR/SUR' || lower === 'STR-SUR') return 'إنشائي / مساحة (STR/SUR)';
  if (lower === 'ARCH' || lower === 'ARC' || lower === 'ARCHITECTURAL') return 'معماري';
  if (lower === 'MECH' || lower === 'MECHANICAL') return 'ميكانيك';
  if (lower === 'ELEC' || lower === 'ELECTRICAL') return 'كهرباء';
  if (lower === 'INFRA' || lower === 'INFRASTRUCTURE' || lower === 'INF') return 'طرق / بنية تحتية';
  if (lower === 'LANDSCAPE' || lower === 'LND') return 'لاندسكيب';
  if (lower === 'HSE') return 'السلامة والبيئة (HSE)';
  if (lower === 'SURVEY' || lower === 'SUR') return 'المساحة';
  if (lower === 'GENERAL' || lower === 'UNCLASSIFIED') return 'غير مصنف (UNCLASSIFIED)';
  return d;
}

export function getPieLabelTranslator(name: string, language: 'ar' | 'en') {
  if (language !== 'ar') return name;
  const lower = name.toUpperCase().trim();
  if (lower === 'APPROVED') return 'معتمد';
  if (lower === 'REJECTED' || lower === 'TOTAL REJECTED' || lower === 'TOTAL REJ.') return 'إجمالي المرفوض';
  if (lower === 'REJECTED OPEN' || lower === 'REJ. OPEN' || lower === 'OPEN REJECTIONS') return 'مرفوض مفتوح';
  if (lower === 'REJECTED CLOSED' || lower === 'REJ. CLOSED' || lower === 'CLOSED REJECTIONS') return 'مرفوض مغلق';
  if (lower === 'PENDING' || lower === 'PENDING REVIEW') return 'معلق';
  if (lower === 'CLOSED') return 'مغلق';
  if (lower === 'OPEN') return 'مفتوح';
  if (lower === 'SENT') return 'الصادر';
  if (lower === 'RECEIVED') return 'الوارد';
  return name;
}

export function getColLabel(label: string, language: 'ar' | 'en') {
  if (language !== 'ar') return label;
  const lower = label.toUpperCase().trim();
  if (lower === 'ITEMS' || lower === 'DISCIPLINE') return 'البنود / التخصص';
  if (lower === 'TOTAL SUBMITTALS' || lower === 'WORKLOAD' || lower === 'WORKLOAD SHEETS') return 'حجم العمل (الصفحات)';
  if (lower === 'TOTAL SHEETS REV.00' || lower === 'TOTAL REV.00' || lower === 'TOTAL REV00' || lower === 'REV 00' || lower === 'REV.00') return 'مراجعة 00';
  if (lower === 'TOTAL SHEETS FURTHER REV.' || lower === 'TOTAL FURTHER REV.' || lower === 'FURTHER REV' || lower === 'FURTHER REV.') return 'مراجعات لاحقة';
  if (lower === 'TOTAL' || lower === 'TOTAL UNIQUE' || lower === 'UNIQUE ITEMS') return 'البنود الفريدة';
  if (lower === 'APPROVED') return 'معتمد';
  if (lower === 'REJECTED') return 'مرفوض';
  if (lower === 'REJECTED OPEN' || lower === 'REJ. OPEN') return 'مرفوض مفتوح';
  if (lower === 'REJECTED CLOSED' || lower === 'REJ. CLOSED') return 'مرفوض مغلق';
  if (lower === 'TOTAL REJECTED' || lower === 'TOTAL REJ.') return 'إجمالي المرفوض';
  if (lower === 'PENDING') return 'معلق';
  if (lower === 'ACTIVE' || lower === 'ACTIVE ITEMS') return 'النشط';
  if (lower === 'OVERDUE') return 'متأخر';
  if (lower === 'OVERDUE %') return 'نسبة التأخير %';
  if (lower === 'CLOSED') return 'مغلق';
  if (lower === 'OPEN') return 'مفتوح';
  if (lower === 'STAKEHOLDER') return 'الجهة المعنية / الأطراف';
  if (lower === 'SENT') return 'الصادر';
  if (lower === 'RECEIVED') return 'الوارد';
  return label;
}

export function getChartTitle(title: string, language: 'ar' | 'en') {
  if (language !== 'ar') return title;
  const parts = title.split(' ');
  const bt = parts[0];
  const period = parts.slice(1, -1).join(' ').trim();
  const isMonthly = period.toLowerCase().includes('period');
  const periodAr = isMonthly ? 'لهذه الفترة' : 'تراكمي';
  return `تحليل حالة تقديمات ${bt} (${periodAr})`;
}

interface CompanyLogoProps {
  projectInfo: ProjectSettings | null;
  sizeClass?: string;
  inlineTextClass?: string;
  extraPositionClass?: string;
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  projectInfo,
  sizeClass = "h-8",
  inlineTextClass = "text-sm",
  extraPositionClass = ""
}) => {
  const logoUrl = projectInfo?.logoUrl;
  const containerClasses = `bg-white rounded-lg border border-slate-100 shadow-sm px-6 py-2 flex items-center justify-center shrink-0 ${extraPositionClass}`;
  
  if (logoUrl) {
    return (
      <div className={containerClasses}>
        <img src={logoUrl} alt="Company Logo" className={`${sizeClass} w-auto max-h-full object-contain`} />
      </div>
    );
  }
  const cName = projectInfo?.contractorName !== "N/A" && projectInfo?.contractorName 
    ? projectInfo.contractorName 
    : (projectInfo?.projectName && projectInfo.projectName !== "NO PROJECT CONFIGURED" ? projectInfo.projectName : "COMPANY");
  return (
    <div className={containerClasses}>
      <div className={`font-sans font-bold tracking-wider text-[#203864] ${inlineTextClass} select-none uppercase truncate max-w-[220px]`}>
        {cName}
      </div>
    </div>
  );
};

export function getMonthlySummary(stats: any, language: 'ar' | 'en') {
  const approvalRateStr = typeof stats.approvalRate === 'number' ? `${stats.approvalRate.toFixed(1)}%` : '—';
  const slaComplianceStr = typeof stats.slaCompliance === 'number' ? `${stats.slaCompliance.toFixed(1)}%` : (language === 'ar' ? 'لا توجد بيانات ردود' : 'N/A');

  if (language === 'ar') {
    return [
      `تمت معالجة ما مجموعه ${stats.total} معاملة تقديم مستندات خلال هذه الفترة الشهرية الحالية.`,
      `بلغت نسبة الموافقة على جودة التقديمات معتمد/معتمد بملحوظات ${approvalRateStr} من إجمالي الردود المستلمة.`,
      `يوجد حالياً ${stats.pending} وثيقة معلقة تحت المراجعة من قبل الاستشاري، منها ${stats.overdueCount} معاملة متأخرة عن تاريخ الرد المحدد بالاتفاقية.`,
      `بلغ معدل الالتزام باتفاقية مستوى الخدمة (SLA) للاستجابة بالردود ${slaComplianceStr} بمتوسط تأخير قدره ${stats.avgDelay} يوم للأعمال المتأخرة.`
    ];
  }
  return [
    `A total of ${stats.total} processed submittals were reviewed and registered during this current monthly period.`,
    `The quality approval rate (Status Code A & B) reached ${approvalRateStr} of all answered transactions.`,
    `There are currently ${stats.pending} pending items under consultant review, with ${stats.overdueCount} items currently flagged as overdue.`,
    `The response SLA compliance rate stands at ${slaComplianceStr}, with an average response turnaround delay of ${stats.avgDelay} days.`
  ];
}

export function getCumulativeSummary(stats: any, language: 'ar' | 'en') {
  const approvalRateStr = typeof stats.approvalRate === 'number' ? `${stats.approvalRate.toFixed(1)}%` : '—';
  const slaComplianceStr = typeof stats.slaCompliance === 'number' ? `${stats.slaCompliance.toFixed(1)}%` : (language === 'ar' ? 'لا توجد بيانات ردود' : 'N/A');

  if (language === 'ar') {
    return [
      `بلغ إجمالي الوثائق المسجلة والتقديمات بالمشروع منذ التأسيس ${stats.total} وثيقة.`,
      `نسبة الجودة والموافقات التراكمية للمشروع مستقرة عند ${approvalRateStr}، مما يعكس الامتثال لمعايير التصميم والمواصفات الفنية.`,
      `تم إغلاق وتسوية ما مجموعه ${stats.total - stats.pending} وثيقة بنجاح، مع بقاء ${stats.pending} وثيقة نشطة وقيد المتابعة حالياً.`,
      `معدل التزام الاستشاري باتفاقية مستوى الخدمة التاريخي للمشروع هو ${slaComplianceStr} مع متوسط رد تاريخي قدره ${stats.avgDelay} يوم.`
    ];
  }
  return [
    `The overall cumulative project database contains a total of ${stats.total} registered submittals and document control records.`,
    `The lifetime project approval quality index is stabilized at ${approvalRateStr}, ensuring compliance with standards.`,
    `A total of ${stats.total - stats.pending} submittals have been resolved and closed successfully, with ${stats.pending} active documents remaining.`,
    `The historical project SLA compliance rate is recorded at ${slaComplianceStr}, with a lifetime average response time of ${stats.avgDelay} days.`
  ];
}

export function getMonthlyRecommendations(stats: any, language: 'ar' | 'en') {
  if (language === 'ar') {
    return [
      "تصعيد وتنبيه فوري لجميع طلبات المخططات التنفيذية المتأخرة بالرد لتجنب أي تأثير مباشر على جدول التنفيذ بالموقع.",
      `عقد اجتماع لمواءمة التخصصات الهندسية (خاصة تلك التي تحتوي على ${stats.overdueCount} معاملة متأخرة) لتسريع وتيرة المراجعات الفنية.`,
      "تطبيق آليات المتابعة الاستباقية لتسليم التقديمات الحرجة قبل 7 أيام من مواعيد الاحتياج الفعلي بالموقع.",
      "التأكيد على المقاولين لإرسال نسخ المخططات المنقحة والردود على الملاحظات في غضون 5 أيام عمل كحد أقصى من الاسترجاع."
    ];
  }
  return [
    "Initiate immediate high-priority escalation for all overdue Shop Drawings to mitigate any critical path impacts on site works.",
    `Schedule an urgent alignment meeting with engineering leads regarding disciplines holding ${stats.overdueCount} overdue items.`,
    "Implement proactive tracking protocols for critical-path submittals at least 7 days prior to scheduled installation dates.",
    "Enforce strict revision turnaround directives, requiring contractors to address comments and resubmit within 5 business days."
  ];
}
