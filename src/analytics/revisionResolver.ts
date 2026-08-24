/**
 * Canonical revision resolver.
 * Single source of truth for revision validity, ordering and weighting.
 */
export const isValidRevision = (revStr: string | number | null | undefined): boolean => {
  if (revStr === undefined || revStr === null) return false;
  const val = String(revStr).trim().toUpperCase();
  if (val === '' || ['N/A', '-', 'NONE', 'NULL', 'UNDEFINED', 'BLANK', '(BLANK)'].includes(val)) return false;
  return true;
};

export const getRevisionWeight = (revStr: string | number | null | undefined): number => {
  if (!isValidRevision(revStr)) return -1;
  const val = String(revStr).trim().toUpperCase();

  if (['0', '00', '0.0', 'REV 0', 'REV 00', 'REV.0', 'REV.00', 'REV0', 'REV00', 'R0', 'R00', 'R0.0'].includes(val)) return 0;
  if (val === 'AS-BUILT' || val === 'ASBUILT') return 100000;
  if (val === 'IFC') return 90000;

  if (val.startsWith('IFC')) {
    const num = parseInt(val.replace(/[^\d]/g, ''), 10) || 0;
    return 90000 + num;
  }

  if (val.startsWith('P')) {
    const num = parseInt(val.substring(1), 10);
    if (num === 0) return 0;
    if (!isNaN(num)) return 1000 + num;
  }

  if (val.startsWith('C') && val.length > 1 && !isNaN(parseInt(val.substring(1), 10))) {
    const num = parseInt(val.substring(1), 10);
    if (num === 0) return 0;
    return 2000 + num;
  }

  const numCheck = parseInt(val, 10);
  if (!isNaN(numCheck) && (String(numCheck) === val || String(numCheck).padStart(val.length, '0') === val)) return numCheck;

  if (/^[A-Z]+$/.test(val)) {
    let score = 0;
    for (let i = 0; i < val.length; i++) score = score * 26 + (val.charCodeAt(i) - 64);
    return 5000 + score;
  }

  const cleanedNum = parseInt(val.replace(/[^\d]/g, ''), 10);
  if (!isNaN(cleanedNum)) {
    if (cleanedNum === 0) return 0;
    return 3000 + cleanedNum;
  }

  let alphaSum = 0;
  for (let i = 0; i < Math.min(val.length, 5); i++) alphaSum += val.charCodeAt(i) * Math.pow(10, 5 - i);
  return alphaSum;
};

export const compareRevisionsCanonical = (
  revA: string | number | undefined | null,
  revB: string | number | undefined | null
): number => {
  const a = getRevisionWeight(revA);
  const b = getRevisionWeight(revB);
  if (a < 0 && b < 0) return 0;
  if (a < 0) return -1;
  if (b < 0) return 1;
  return a - b;
};
