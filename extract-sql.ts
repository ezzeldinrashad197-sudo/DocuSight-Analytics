import fs from 'fs';
const sql = fs.readFileSync('drizzle/0000_sloppy_matthew_murdock.sql', 'utf8');
console.log(JSON.stringify(sql.split('--> statement-breakpoint').map(s => s.trim()).filter(s => s)));
