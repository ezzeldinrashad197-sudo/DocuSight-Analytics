import { AnyRecord, NormalizedStatus } from './models';

export const normalizeStatus = (raw: string): NormalizedStatus => {
    const s = raw.trim().toUpperCase();
    
    if (!s) return 'PENDING';
    
    if (s.includes('APP') || s === 'A' || s === 'B' || s.includes('ACCEP') || s === 'CODE A' || s === 'CODE B') {
        return 'APPROVED';
    }
    
    if (s.includes('CLOS') || s.includes('COMPLET') || s.includes('ANSWER')) {
        return 'CLOSED';
    }
    
    if (s.includes('REJ') || s === 'C' || s.includes('RESUB') || s === 'CODE C' || s.includes('RETURN')) {
        return 'REJECTED_OPEN';
    }
    
    if (s.includes('PENDING') || s.includes('WAITING') || s.includes('REVIEW') || s === 'OPEN') {
        // Technically open or pending
        if (s.includes('REVIEW')) return 'PENDING';
        return 'OPEN';
    }
    
    return 'PENDING';
};

export const normalizeNcrStatus = (record: Record<string, any>): NormalizedStatus => {
   // Legacy or custom behavior depending on ncrAction/ncrStatus combos
   const status = String(record.ncrStatus || record.rawStatus || '').toUpperCase();
   const action = String(record.ncrAction || record.rawStatus || '').toUpperCase();
   
   const isClosed = status.includes('CLOSED');
   const isRej = action.includes('REJECT') || action.includes('NOT ACCEPT');
   const isUnderReview = action.includes('REVIEW');

   if (isClosed) {
       return isRej ? 'REJECTED_CLOSED' : 'CLOSED';
   }
   if (isRej) {
       return 'REJECTED_OPEN';
   }
   if (isUnderReview) {
       return 'PENDING';
   }

   return 'OPEN';
}
