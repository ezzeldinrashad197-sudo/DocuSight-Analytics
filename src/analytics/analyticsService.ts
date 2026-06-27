import { AnyRecord } from './models';

export interface BaseAnalytics {
    totalRecords: number;
    openItems: number;
    closedItems: number;
    overdueItems: number;
    monthlySubmitted: number;
    cumulativeSubmitted: number;
}

// ... more advanced analytics to follow

export const generateGlobalAnalytics = (records: AnyRecord[]) => {
    // Basic shared logic
    return {
        totalRecords: records.length,
        // to be expanded based on engine logic
    };
};
