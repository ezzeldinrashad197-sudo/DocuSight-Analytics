import { SubmittalRow } from '../types';
import { getStatusCodeCategory } from './calculations';

export function runEnterpriseEngine(data: SubmittalRow[]) {
    // Basic Filtering
    const docs = data.filter(d => Boolean(d.documentType) && !d.documentType?.includes('LTR'));

    const safeParseDate = (dateStr: string | undefined): Date | null => {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
    };

    let totalDocs = docs.length;

    // SLA & Overdue
    let overdueCount = 0;
    let totalDelayDays = 0;
    let closedOrRespondedCount = 0;
    let totalReviewDays = 0;

    let reworkDocsCount = 0;
    let totalRevisions = 0;
    let approvedCount = 0;
    let rejectedCount = 0;
    let paddingCount = 0;
    let closedCount = 0;
    
    // NCRs
    const ncrs = data.filter(d => d.documentType?.includes('NCR'));
    let ncrClosedCount = ncrs.filter(n => getStatusCodeCategory(n.status) === 'REJECTED_CLOSED' || n.status?.toUpperCase() === 'CLOSED' || n.recordStatus?.toUpperCase() === 'CLOSED').length;
    let ncrResRate = ncrs.length > 0 ? (ncrClosedCount / ncrs.length) * 100 : 100;

    docs.forEach(d => {
        const cat = getStatusCodeCategory(d.status);
        if (cat === 'APPROVED') approvedCount++;
        if (cat === 'REJECTED_OPEN' || cat === 'REJECTED_CLOSED') rejectedCount++;
        if (cat === 'PENDING') paddingCount++;
        if (cat === 'REJECTED_CLOSED' || cat === 'APPROVED' || d.recordStatus?.toUpperCase() === 'CLOSED') closedCount++;

        const subDate = safeParseDate(d.submissionDate);
        const resDate = safeParseDate(d.responseDate);
        
        if (d.overdue) {
            overdueCount++;
            totalDelayDays += (d.delayDays || 0);
        }

        if (subDate && resDate) {
            const diffTime = Math.abs(resDate.getTime() - subDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            totalReviewDays += diffDays;
            closedOrRespondedCount++;
        }

        let rev = 0;
        if (d.rev && typeof d.rev === 'string') {
            const parsed = parseInt(d.rev, 10);
            if (!isNaN(parsed)) rev = parsed;
        } else if (typeof d.rev === 'number') {
            rev = d.rev;
        }
        if (rev > 0) {
            reworkDocsCount++;
            totalRevisions += rev;
        }
    });

    const approvalRate = totalDocs > 0 ? (approvedCount / totalDocs) * 100 : 0;
    const closureRate = totalDocs > 0 ? (closedCount / totalDocs) * 100 : 0;
    const overdueRate = totalDocs > 0 ? (overdueCount / totalDocs) * 100 : 0;
    // Overdue Performance = 100 - overdueRate
    const overduePerf = Math.max(0, 100 - overdueRate);
    
    // Review Duration (Assume 14 days is 100% score, 28 days is 0% score)
    const avgReviewDays = closedOrRespondedCount > 0 ? totalReviewDays / closedOrRespondedCount : 0;
    let reviewDurationScore = 100;
    if (avgReviewDays > 14) {
        reviewDurationScore = Math.max(0, 100 - ((avgReviewDays - 14) * 5)); // Lose 5% per day over 14
    }

    const reworkRate = totalDocs > 0 ? (reworkDocsCount / totalDocs) * 100 : 0;
    // Rework Perf = 100 - reworkRate
    const reworkPerf = Math.max(0, 100 - reworkRate);

    // Weighted Formula: 25% Approval, 20% Closure, 20% Overdue Perf, 15% Review Duration, 10% Rework, 10% NCR Res
    const projectHealthScore = (
        (approvalRate * 0.25) +
        (closureRate * 0.20) +
        (overduePerf * 0.20) +
        (reviewDurationScore * 0.15) +
        (reworkPerf * 0.10) +
        (ncrResRate * 0.10)
    );

    let healthClassification = 'Critical';
    if (projectHealthScore >= 85) healthClassification = 'Excellent';
    else if (projectHealthScore >= 70) healthClassification = 'Good';
    else if (projectHealthScore >= 50) healthClassification = 'Attention Required';

    const getDisc = (d: SubmittalRow) => {
        let docT = d.documentType || 'GENERAL';
        let disc = docT.includes('-') ? docT.substring(docT.indexOf('-') + 1).trim() : (d.discipline || d.trade || 'GENERAL').toUpperCase().trim();
        if (disc === 'ARC' || disc === 'ARCH' || disc.includes('ARCHITECT')) return 'ARCH';
        if (disc === 'MEC' || disc === 'MECH' || disc.includes('MECHANIC')) return 'MECH';
        if (disc === 'ELE' || disc === 'ELEC' || disc.includes('ELECTRIC')) return 'ELEC';
        if (disc === 'INF' || disc === 'INFR' || disc === 'INFRA' || disc.includes('INFRASTRUCT')) return 'INFRA';
        if (disc === 'LND' || disc === 'LAND' || disc.includes('LANDSCAP')) return 'LAND';
        if (disc === 'STR' || disc.includes('STRUCT')) return 'STR';
        return disc;
    };

    // Calculate details per discipline
    const discs: Record<string, any> = {};
    docs.forEach(d => {
        const disc = getDisc(d);
        if (!discs[disc]) {
            discs[disc] = { submitted: 0, approved: 0, rejected: 0, overdue: 0, rework: 0, reviewDaysSum: 0, reviewCount: 0 };
        }
        discs[disc].submitted++;
        const cat = getStatusCodeCategory(d.status);
        if (cat === 'APPROVED') discs[disc].approved++;
        if (cat === 'REJECTED_OPEN' || cat === 'REJECTED_CLOSED') discs[disc].rejected++;
        if (d.overdue) discs[disc].overdue++;
        let rev = 0;
        if (typeof d.rev === 'number') rev = d.rev;
        if (typeof d.rev === 'string') rev = parseInt(d.rev, 10) || 0;
        if (rev > 0) discs[disc].rework++;

        const sub = safeParseDate(d.submissionDate);
        const res = safeParseDate(d.responseDate);
        if (sub && res) {
            discs[disc].reviewDaysSum += Math.ceil(Math.abs(res.getTime() - sub.getTime()) / (1000 * 60 * 60 * 24));
            discs[disc].reviewCount++;
        }
    });

    const disciplineAnalytics = Object.keys(discs).map(k => {
        const v = discs[k];
        return {
            name: k,
            submitted: v.submitted,
            approvalRate: v.submitted > 0 ? (v.approved / v.submitted) * 100 : 0,
            rejectionRate: v.submitted > 0 ? (v.rejected / v.submitted) * 100 : 0,
            avgReviewDuration: v.reviewCount > 0 ? v.reviewDaysSum / v.reviewCount : 0,
            overdueRatio: v.submitted > 0 ? (v.overdue / v.submitted) * 100 : 0,
            reworkRatio: v.submitted > 0 ? (v.rework / v.submitted) * 100 : 0,
            healthScore: Math.min(100, Math.max(0, 100 - (v.submitted > 0 ? (v.overdue / v.submitted) * 100 : 0) - (v.submitted > 0 ? (v.rework / v.submitted) * 50 : 0)))
        };
    }).sort((a,b) => b.submitted - a.submitted);

    // Consultant Analytics
    const reviewers: Record<string, any> = {};
    docs.filter(d => d.consultant).forEach(d => {
        const name = d.consultant || 'Unknown';
        if (!reviewers[name]) reviewers[name] = { submitted: 0, approved: 0, rejected: 0, overdue: 0, pending: 0, reviewDaysSum: 0, reviewCount: 0 };
        reviewers[name].submitted++;
        const cat = getStatusCodeCategory(d.status);
        if (cat === 'APPROVED') reviewers[name].approved++;
        if (cat === 'REJECTED_OPEN' || cat === 'REJECTED_CLOSED') reviewers[name].rejected++;
        if (cat === 'PENDING') reviewers[name].pending++;
        if (d.overdue) reviewers[name].overdue++;
        
        const sub = safeParseDate(d.submissionDate);
        const res = safeParseDate(d.responseDate);
        if (sub && res) {
            reviewers[name].reviewDaysSum += Math.ceil(Math.abs(res.getTime() - sub.getTime()) / (1000 * 60 * 60 * 24));
            reviewers[name].reviewCount++;
        }
    });

    const consultantAnalytics = Object.keys(reviewers).map(k => {
        const v = reviewers[k];
        return {
            name: k,
            docsReviewed: v.reviewCount,
            avgReviewDuration: v.reviewCount > 0 ? v.reviewDaysSum / v.reviewCount : 0,
            approvalRatio: v.submitted > 0 ? (v.approved / v.submitted) * 100 : 0,
            rejectionRatio: v.submitted > 0 ? (v.rejected / v.submitted) * 100 : 0,
            overdueReviews: v.overdue,
            pendingReviews: v.pending,
            overallScore: Math.min(100, Math.max(0, 100 - (v.submitted > 0 ? (v.overdue / v.submitted) * 100 : 0)))
        };
    }).sort((a,b) => b.docsReviewed - a.docsReviewed);

    const originators: Record<string, any> = {};
    docs.forEach(d => {
        const originator = (d as any).originator || d.contractor || 'Unknown';
        if (!originators[originator]) originators[originator] = { submitted: 0, approved: 0, rejected: 0, closed: 0, pending: 0, overdue: 0, rework: 0, reviewDaysSum: 0, reviewCount: 0 };
        originators[originator].submitted++;
        const cat = getStatusCodeCategory(d.status);
        if (cat === 'APPROVED') originators[originator].approved++;
        if (cat === 'REJECTED_OPEN' || cat === 'REJECTED_CLOSED') originators[originator].rejected++;
        if (cat === 'PENDING') originators[originator].pending++;
        if (cat === 'APPROVED' || cat === 'REJECTED_CLOSED' || d.recordStatus?.toUpperCase() === 'CLOSED') originators[originator].closed++;
        if (d.overdue) originators[originator].overdue++;
        let revStr = String(d.rev || '0');
        let rev = parseInt(revStr, 10);
        if (!isNaN(rev) && rev > 0) originators[originator].rework++;

        const sub = safeParseDate(d.submissionDate);
        const res = safeParseDate(d.responseDate);
        if (sub && res) {
            originators[originator].reviewDaysSum += Math.ceil(Math.abs(res.getTime() - sub.getTime()) / (1000 * 60 * 60 * 24));
            originators[originator].reviewCount++;
        }
    });

    const contractorAnalytics = Object.keys(originators).map(k => {
        const v = originators[k];
        return {
            name: k,
            submittedDocs: v.submitted,
            approvalRatio: v.submitted > 0 ? (v.approved / v.submitted) * 100 : 0,
            rejectionRatio: v.submitted > 0 ? (v.rejected / v.submitted) * 100 : 0,
            reworkRatio: v.submitted > 0 ? (v.rework / v.submitted) * 100 : 0,
            closureRatio: v.submitted > 0 ? (v.closed / v.submitted) * 100 : 0,
            avgReviewDuration: v.reviewCount > 0 ? v.reviewDaysSum / v.reviewCount : 0,
            overdueRatio: v.submitted > 0 ? (v.overdue / v.submitted) * 100 : 0,
            contractorScore: Math.min(100, Math.max(0, 100 - (v.submitted > 0 ? (v.rework / v.submitted) * 50 : 0) - (v.submitted > 0 ? (v.overdue / v.submitted) * 30 : 0)))
        };
    }).sort((a,b) => b.contractorScore - a.contractorScore);

    // Root Cause Analysis (Simple Simulation over comments / reasons)
    const rootCausesData: Record<string, number> = {
        'Technical Issue': 0,
        'Missing Information': 0,
        'Drawing Coordination': 0,
        'Design Issue': 0,
        'Quality Issue': 0
    };
    
    docs.filter(d => getStatusCodeCategory(d.status).includes('REJECTED')).forEach(d => {
        const remarks = (d.remarks || (d as any).comments || '').toLowerCase();
        if (remarks.includes('missing') || remarks.includes('attach')) rootCausesData['Missing Information']++;
        else if (remarks.includes('coord') || remarks.includes('clash')) rootCausesData['Drawing Coordination']++;
        else if (remarks.includes('design') || remarks.includes('spec')) rootCausesData['Design Issue']++;
        else if (remarks.includes('quality') || remarks.includes('ncr')) rootCausesData['Quality Issue']++;
        else rootCausesData['Technical Issue']++;
    });

    const rootCauseAnalytics = Object.keys(rootCausesData).map(k => ({
        category: k,
        count: rootCausesData[k]
    })).sort((a,b) => b.count - a.count);

    // Forecasting (Simple Linear)
    const expectedApprovalRate = approvalRate; // Trending toward baseline
    const expectedClosureRate = closureRate;

    return {
        health: {
            score: projectHealthScore,
            classification: healthClassification,
            approvalRate,
            closureRate,
            overduePerf,
            reviewDurationScore,
            avgReviewDays,
            reworkRate,
            ncrResRate
        },
        bottlenecks: disciplineAnalytics.filter(d => d.overdueRatio > 20 || d.avgReviewDuration > 14).map(d => d.name),
        disciplineAnalytics,
        consultantAnalytics,
        contractorAnalytics,
        rootCauseAnalytics,
        overdueAnalytics: {
           overdueRate,
           overdueDocs: overdueCount,
           delayDays: totalDelayDays
        },
        reworkAnalytics: {
           reworkRate,
           totalRevisions,
           reworkDocsCount
        },
        forecast: {
            expectedApprovalRate,
            expectedClosureRate
        }
    };
}
