import JSZip from 'jszip';
import { parseExcelFile } from './parser';
import { SubmittalRow } from '../types';

export const processMultiUpload = async (files: FileList | File[]): Promise<SubmittalRow[]> => {
    let allParsed: SubmittalRow[] = [];

    const fileArray = Array.from(files);

    for (const file of fileArray) {
        if (file.name.endsWith('.zip')) {
            const zip = new JSZip();
            const contents = await zip.loadAsync(file);
            
            for (const [relativePath, zipEntry] of Object.entries(contents.files)) {
                if (zipEntry.dir || relativePath.startsWith('__MACOSX/')) continue;
                if (relativePath.endsWith('.xlsx') || relativePath.endsWith('.xls')) {
                    const blob = await zipEntry.async('blob');
                    const extractedFile = new File([blob], zipEntry.name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    const rows = await parseExcelFile(extractedFile);
                    allParsed = allParsed.concat(rows);
                }
            }
        } 
        else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
            const rows = await parseExcelFile(file);
            allParsed = allParsed.concat(rows);
        }
    }

    return allParsed;
};
