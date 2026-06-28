import { useState, useRef } from 'react';
import { SubmittalRow } from '../types';
import { processMultiUpload } from '../utils/multiFileParser';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { logAuditContext } from '../firebase';
import { useLanguage } from '../utils/i18n';

export function useUpload(
  setData: (data: SubmittalRow[]) => void,
  setActiveTab: (tab: 'dashboard' | 'monthly' | 'cumulative' | 'delay' | 'rfi' | 'presentation' | 'register' | 'insights' | 'ncr' | 'sor' | 'ltr') => void,
  setStartDate: (date: string) => void,
  setEndDate: (date: string) => void
) {
  const { t } = useLanguage();
  const [parseMessage, setParseMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    try {
       const parsed = await processMultiUpload(files);
       const safeParsed = Array.isArray(parsed) ? parsed : [];
       
       if (safeParsed.length === 0) {
           setParseMessage(t('upload_no_data'));
           setIsError(true);
           await logAuditContext("UPLOAD_FAILED", "log_file", { reason: "No matching data" });
       } else {
           const dates = safeParsed
               .map(d => d && d.submissionDate ? new Date(d.submissionDate).getTime() : NaN)
               .filter(t => !isNaN(t));
           if (dates.length > 0) {
               const maxDate = new Date(Math.max(...dates));
               setStartDate(format(startOfMonth(maxDate), 'yyyy-MM-dd'));
               setEndDate(format(endOfMonth(maxDate), 'yyyy-MM-dd'));
           }

           setData(safeParsed);
           setParseMessage(t('upload_success_params').replace('{count}', String(safeParsed.length)));
           setIsError(false);
           setActiveTab('dashboard');
           await logAuditContext("UPLOAD_SUCCESS", "log_file", { rows: safeParsed.length, fileNames: Array.from(files).map(f => f.name) });
       }
    } catch (err: any) {
       setParseMessage(t('upload_error'));
       setIsError(true);
       await logAuditContext("UPLOAD_ERROR", "log_file", { error: err.message });
    }
    setIsLoading(false);
  };

  return {
    parseMessage,
    isError,
    isLoading,
    fileInputRef,
    handleFileUpload,
    setParseMessage,
    setIsError
  };
}
