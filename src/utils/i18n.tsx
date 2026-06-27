import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ar';

interface TranslationDictionary {
  [key: string]: {
    en: string;
    ar: string;
  };
}

const translations: TranslationDictionary = {
  // Login Screen
  'enterprise_access': { en: 'Enterprise Access', ar: 'وصول المؤسسات' },
  'docusight_platform': { en: 'DocuSight Analytics Platform', ar: 'منصة DocuSight للتحليلات' },
  'sso_required_message': { en: 'Please authenticate via SSO to access the command center.', ar: 'يرجى المصادقة عبر بوابة SSO للوصول إلى مركز التحكم.' },
  'sign_in_with_sso': { en: 'Sign In with SSO', ar: 'تسجيل الدخول عبر SSO' },
  'authenticating': { en: 'Authenticating...', ar: 'جاري التحقق من الهوية...' },
  'bypass_prompt': { en: 'Having issues signing in with Google? Click here for alternative login', ar: 'تواجه مشكلة في تسجيل الدخول عبر Google؟ اضغط هنا للدخول البديل' },
  'developer_bypass_title': { en: 'Alternative Token / Developer Access', ar: 'الرمز البديل / دخول المطورين' },
  'cancel': { en: 'Cancel', ar: 'إلغاء' },
  'email_address': { en: 'Email Address', ar: 'البريد الإلكتروني' },
  'emergency_passcode': { en: 'Emergency Passcode', ar: 'رمز المرور الطارئ' },
  'passcode_hint': { en: 'Passcode is: 123456', ar: 'رمز المرور هو: 123456' },
  'confirm_and_login': { en: 'Confirm Passcode and Login', ar: 'تأكيد الرمز والدخول' },
  'authorized_personnel_only': { en: 'Authorized personnel only. Multi-Factor Authentication enforcement active.', ar: 'للموظفين المصرح لهم فقط. تفعيل المصادقة الثنائية نشط.' },
  'auth_error': { en: 'Authentication Error', ar: 'خطأ في التحقق من الهوية' },
  'unauthorized_domain_msg': { en: 'This domain is not authorized. Please add the current URL to your Firebase Console -> Authentication -> Settings -> Authorized domains.', ar: 'هذا النطاق غير مصرح به. يرجى إضافة الرابط الحالي بقائمة النطاقات المصرح بها.' },
  'open_new_tab_login': { en: 'Open App in New Tab to Login', ar: 'افتح التطبيق في علامة تبويب جديدة لتسجيل الدخول' },
  'login_popup_iframe_warning': { en: 'Running inside the preview frame? Google Sign-In requires a full browser window.', ar: 'هل تعمل داخل إطار عرض مؤقت؟ تسجيل دخول جوجل يقتضي فتح نافذة تصفح مستقلة بملء الشاشة.' },
  
  // Navigation & Sections
  'sidebar_technical_modules': { en: 'Technical Modules', ar: 'الوحدات الفنية' },
  'sidebar_analytical_engines': { en: 'Analytical Engines', ar: 'محركات التحليل' },
  
  // Tabs
  'tab_portfolio': { en: 'Portfolio Center', ar: 'مركز المحفظة' },
  'tab_enterprise_dashboard': { en: 'Enterprise Dashboard', ar: 'لوحة التحكم الرئيسية' },
  'tab_master_register': { en: 'Master Document Register', ar: 'السجل الرئيسي للوثائق' },
  'tab_validation': { en: 'Global Data Validation', ar: 'التحقق من صحة البيانات' },
  'tab_aging': { en: 'Advanced Aging Analysis', ar: 'التحليل المتقدم للأعمار الزمنية' },
  'tab_sla': { en: 'SLA Compliance Monitoring', ar: 'مراقبة الامتثال لاتفاقية مستوى الخدمة' },
  'tab_actions': { en: 'Submittal Action Tracker', ar: 'متابع إجراءات التقديمات' },
  'tab_monthly': { en: 'Monthly Analytics', ar: 'التحليلات الشهرية' },
  'tab_cumulative': { en: 'Cumulative Analytics', ar: 'التحليلات التراكمية' },
  'tab_rfi': { en: 'RFI Progress Analytics', ar: 'تحليلات تقدم طلبات المعلومات (RFI)' },
  'tab_ncr': { en: 'NCR Analytics', ar: 'تحليلات عدم المطابقة (NCR)' },
  'tab_sor': { en: 'SOR Analytics', ar: 'تحليلات ملاحظات الموقع (SOR)' },
  'tab_ltr': { en: 'Correspondence Tracker', ar: 'تتبع المراسلات والخطابات' },
  'tab_presentation': { en: 'Presentation Mode', ar: 'العروض التقديمية للمشروع' },
  'tab_insights': { en: 'Smart AI Insights', ar: 'رؤى الذكاء الاصطناعي الذكية' },
  'tab_monitoring': { en: 'System Monitoring Logs', ar: 'سجلات المراقبة والتتبع' },
  'tab_warehouse': { en: 'Data Warehouse', ar: 'مستودع البيانات التراكمية' },
  'tab_trend_forecast': { en: 'Trend & Forecast Engine', ar: 'محرك التحليلات والتنبؤات' },
  
  // Sidebar footer & Settings
  'sidebar_settings': { en: 'Settings', ar: 'إعدادات المنصة' },
  'sidebar_sign_out': { en: 'Sign Out', ar: 'تسجيل الخروج' },

  // General buttons
  'btn_upload_excel': { en: 'Upload Excel Log', ar: 'رفع سجل إكسل' },
  'btn_processing': { en: 'Processing...', ar: 'جاري المعالجة...' },
  'btn_export_pptx': { en: 'Export PPTX', ar: 'تصدير PPTX' },
  'btn_exporting': { en: 'Exporting...', ar: 'جاري التصدير...' },
  'btn_export_pdf': { en: 'Export PDF', ar: 'تصدير PDF' },
  'btn_exporting_pdf': { en: 'Exporting PDF...', ar: 'جاري تصدير PDF...' },
  'btn_add_user': { en: 'Add Core Team Member', ar: 'إضافة عضو جديد للفريق الخاص بك' },
  'no_project_configured': { en: 'No Project Configured', ar: 'لا يوجد مشروع مهيأ حالياً' },

  // RFI, Items, Slides, Statuses
  'rfi_progress_title': { en: 'RFI Progress Analytics', ar: 'تتبع تقدم طلبات المعلومات (RFI)' },
  'rfi_processed_period': { en: 'RFI processed and received this period.', ar: 'إجمالي طلبات المعلومات التي تمت معالجتها واستلامها لهذه الفترة.' },
  'rfi_this_period': { en: 'RFI This Period', ar: 'طلبات المعلومات لهذه الفترة' },
  'rfi_cumulative': { en: 'RFI Cumulative', ar: 'طلبات المعلومات التراكمية' },
  
  'presentation_title_page': { en: 'DOCUMENT CONTROL', ar: 'مراقبة وإدارة الوثائق' },
  'presentation_subtitle': { en: 'MONTHLY REPORT', ar: 'التقرير الشهري لمراقبة الوثائق' },
  'presentation_confidential': { en: 'CONFIDENTIAL', ar: 'سري للغاية' },
  'presentation_thanks': { en: 'Thanks', ar: 'خالص الشكر والتقدير' },
  'presentation_team_signature': { en: 'Document Control Team', ar: 'فريق عمل التنسيق وإدارة مراقبة الوثائق' },
  'project_info_title': { en: 'Project Information & Team', ar: 'معلومات المشروع وفريق العمل الفني' },
  'project_info_subtitle': { en: 'Team Members & Project Details', ar: 'أعضاء فريق العمل وتفاصيل بيانات المشروع كافّة' },
  'project_info_card_employer': { en: 'Employer', ar: 'مالك المشروع / صاحب العمل' },
  'project_info_card_consultant': { en: 'Consultant', ar: 'استشاري المشروع' },
  'project_info_card_authority': { en: 'CA / PM', ar: 'مدير المشروع / CA' },
  'project_info_card_contractor': { en: 'Contractor', ar: 'المقاول الرئيسي للمشروع' },

  // Slide table headers
  'index_page_title': { en: 'INDEX', ar: 'فهرس ومحتويات العرض' },
  'index_page_subtitle': { en: 'Table of Contents', ar: 'مخطط محتويات العرض التقديمي' },
  
  'rejected_items_title': { en: 'Rejected Items', ar: 'الوثائق والتقديمات المرفوضة' },
  'rejected_items_subtitle': { en: 'Items Requiring Resubmission', ar: 'العناصر التي تتطلب إعادة تقديم لتصحيح الملاحظات' },
  'no_rejected_items': { en: 'No Rejected Items', ar: 'لا توجد عناصر مرفوضة حالياً' },
  'all_rejected_resolved': { en: 'All rejected submittals are resolved or resubmitted.', ar: 'تم الانتهاء من جميع التقديمات والبنود المرفوضة وإعادة تقديمها بنجاح' },

  'pending_items_title': { en: 'Pending Items', ar: 'الوثائق والتقديمات المعلقة' },
  'pending_items_subtitle': { en: 'Items Requiring Response', ar: 'البنود والخطابات الجاري مراجعتها وتتطلب رد مسبق' },
  'pending_items_overdue': { en: 'Pending Items (Overdue)', ar: 'المعلقات المتأخرة المتجاوزة للمدة' },
  'rejected_items_req_resub': { en: 'Rejected Items (Action Required)', ar: 'الوثائق المرفوضة (تتطلب تصحيح وإعادة تقديم)' },
  
  'col_no': { en: 'No.', ar: 'مسلسل' },
  'col_type': { en: 'Type of Documents', ar: 'نوع الوثيقة المحلّلة' },
  'col_ref': { en: 'Ref / Link', ar: 'الرقم المرجعي والوصلة' },
  'col_trade': { en: 'Trade', ar: 'التخصص الفني' },
  'col_remarks': { en: 'Remarks', ar: 'الملاحظات والتوصيات' },
  'overdue_by_days': { en: 'Overdue by', ar: 'متأخرة بـ' },
  'days_label': { en: 'days', ar: 'يوم' },

  // RFI Charts
  'rfi_quality_approval': { en: 'RFI Quality Approval', ar: 'معايير جودة طلبات المعلومات' },
  'closed_label': { en: 'Closed', ar: 'مغلق' },
  'pending_label': { en: 'Pending', ar: 'معلق' },

  // NCR Analytics Tab
  'ncr_kpi_title': { en: 'Monthly NCR KPIs', ar: 'مؤشرات الأداء لتقارير عدم المطابقة الخاضعة للشهور' },
  'ncr_kpi_subtitle': { en: 'Analytical reporting containing KPIs, overdue limits, and status of corrective actions.', ar: 'تقرير تحليلي يحتوي على المؤشرات الرئيسية، وتتابع الإجراءات التصحيحية لعدم المطابقة.' },
  'ncr_critical_overdue': { en: 'Critical Overdue', ar: 'المتجاوز الحرج' },
  'ncr_cumulative_title': { en: 'Cumulative NCR Summary (Project to date)', ar: 'ملخص تقارير عدم المطابقة التراكمي للمشروع' },
  'ncr_monthly_title': { en: 'Monthly NCR Summary', ar: 'ملخص تقارير عدم المطابقة الشهري' },
  'ncr_monthly_desc': { en: 'Based on Sent Date Corrective Action within reporting month. Excludes non-month activity unless open-pending.', ar: 'بناءً على تقديمات الإجراء التصحيحي للشهر المحدد، ويقاس الحد الأقصى للإجراء بـ 14 يوماً.' },
  'ncr_history_desc': { en: 'Details of NCR responses processed within the month.', ar: 'تفاصيل وحركة الإشعارات والردود لعدم المطابقة المسجلة داخل الشهر.' },

  // Translation table / Setting center
  'setting_title': { en: 'User & Permissions Configuration', ar: 'تهيئة وإدارة حسابات المستخدمين والصلاحيات' },
  'user_add_success': { en: 'User added successfully!', ar: 'تم إضافة المستخدم واكتمال العملية بنجاح!' },
  'user_update_success': { en: 'User role updated successfully.', ar: 'تم تحديث صلاحية المستخدم وحفظ المتغيرات بنجاح.' },
  'user_delete_confirm': { en: 'Are you sure you want to remove this user from the system?', ar: 'هل أنت متأكد من رغبتك في إخراج/حذف هذا المستخدم بالكامل من النظام السحابي؟' },
  'user_delete_success': { en: 'User record removed successfully.', ar: 'تم إزاحة وحذف المستخدم بنجاح.' },
  'field_username': { en: 'Full Name / Designation (Optional)', ar: 'الاسم أو المسمى الوظيفي للموظف (اختياري)' },
  'field_role': { en: 'Enterprise Role / Authority', ar: 'المستوى الوظيفي وصلاحيات الوصول السحابية' },
  'field_email': { en: 'MFA Registered G-Suite Email', ar: 'البريد الإلكتروني الموثق بنظام المصادقة (G-Suite)' },
  'btn_save': { en: 'Save Configurations', ar: 'حفظ تهيئة الصلاحيات بنجاح' },
  'presentation_settings_title': { en: 'Presentation Tables Settings', ar: 'إعدادات عرض جداول المعلقات والمرفوضات' },
  'presentation_settings_rejected_rows': { en: 'Rejected Rows (Count limit per page)', ar: 'عدد الصفوف في الصفحة الواحدة لجدول المرفوضات' },
  'presentation_settings_pending_rows': { en: 'Pending Rows (Count limit per page)', ar: 'عدد الصفوف في الصفحة الواحدة لجدول المعلقات' },
  'presentation_settings_ref_col': { en: 'Reference Number Column Header', ar: 'تسمية العمود للرقم المرجعي (Ref/Link)' },
  'presentation_settings_remarks_col': { en: 'Remarks Column Header', ar: 'تسمية العمود للملاحظات (Remarks)' },
  'user_update_success_params': {
    en: 'Successfully updated user ({email}) permissions to ({role}).',
    ar: 'تم تحديث صلاحية المستخدم ({email}) إلى ({role}) وتطبيقها على جميع حساباته بنجاح.'
  },
  'email_address_required': {
    en: 'Email address required',
    ar: 'يرجى إدخال البريد الإلكتروني (Email Address required)'
  },
  'user_added_success_params': {
    en: 'Successfully added user {email}! Permissions will apply upon next sign in.',
    ar: 'تمت إضافة المستخدم {email} بنجاح! بمجرد دخوله سيتم تطبيق الصلاحية تلقائياً.'
  },
  'cannot_delete_primary_admin': {
    en: 'Cannot delete the primary administrator account.',
    ar: 'لا يمكن حذف البريد الإلكتروني للمدير الأساسي.'
  },
  'user_delete_confirm_params': {
    en: 'Are you sure you want to remove user ({email}) from the team?',
    ar: 'هل أنت متأكد من رغبتك في إخراج/حذف المستخدم ({email}) من فريق العمل وجعل صلاحيته ملغاة بالكامل؟'
  },
  'user_deleted_success': {
    en: 'Successfully deleted all user records and associations.',
    ar: 'تم حذف جميع السجلات والصلاحيات المرتبطة بالمستخدم بنجاح.'
  },
  'generating_export_report': {
    en: 'Generating Export Report / Presentation',
    ar: 'جاري تجهيز وتصدير التقرير'
  },
  'wait_processing_document': {
    en: 'Please wait while we process the document. This may take a few moments...',
    ar: 'يرجى الانتظار أثناء معالجة المستند. قد يستغرق هذا بضع لحظات...'
  },
  'upload_success_params': {
    en: '100% - Successfully read {count} data rows.',
    ar: '100% - تمت قراءة {count} صف من البيانات بنجاح.'
  },
  'upload_error': {
    en: 'An error occurred while parsing the file.',
    ar: 'حدث خطأ أثناء قراءة الملف.'
  },
  'upload_no_data': {
    en: 'No matching data found. Make sure headers are correctly mapped.',
    ar: 'لم يتم العثور على بيانات مطابقة. يرجى التأكد من مطابقة أسماء الأعمدة.'
  },
  'placeholder_full_name': {
    en: 'e.g. John Doe',
    ar: 'مثال: أحمد علي'
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('docu_sight_lang') as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    localStorage.setItem('docu_sight_lang', lang);
    setLanguageState(lang);
  };

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string): string => {
    if (translations[key]) {
      return translations[key][language];
    }
    return key;
  };

  const isRtl = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRtl }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export function parseMixedText(text: string, language: 'en' | 'ar'): string {
  if (!text) return '';
  if (text.includes('|')) {
    const parts = text.split('|');
    if (language === 'ar' && parts[1]) {
      return parts[1].trim();
    }
    return parts[0].trim();
  }
  return text;
}

