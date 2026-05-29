const fs = require('fs');
const path = require('path');

const colorMap = {
  'slate-50': '#f8fafc',
  'slate-100': '#f1f5f9',
  'slate-200': '#e2e8f0',
  'slate-300': '#cbd5e1',
  'slate-400': '#94a3b8',
  'slate-500': '#64748b',
  'slate-600': '#475569',
  'slate-700': '#334155',
  'slate-800': '#1e293b',
  'slate-900': '#0f172a',
  'blue-50': '#eff6ff',
  'blue-100': '#dbeafe',
  'blue-200': '#bfdbfe',
  'blue-500': '#3b82f6',
  'blue-600': '#2563eb',
  'blue-700': '#1d4ed8',
  'emerald-50': '#ecfdf5',
  'emerald-100': '#d1fae5',
  'emerald-200': '#a7f3d0',
  'emerald-500': '#10b981',
  'emerald-600': '#059669',
  'emerald-700': '#047857',
  'emerald-800': '#065f46',
  'yellow-50': '#fefce8',
  'yellow-100': '#fef9c3',
  'yellow-200': '#fef08a',
  'yellow-500': '#eab308',
  'yellow-700': '#a16207',
  'amber-50': '#fffbeb',
  'amber-100': '#fef3c7',
  'amber-200': '#fde68a',
  'amber-500': '#f59e0b',
  'amber-700': '#b45309',
  'red-50': '#fef2f2',
  'red-100': '#fee2e2',
  'red-200': '#fecaca',
  'red-500': '#ef4444',
  'red-600': '#dc2626',
  'red-700': '#b91c1c'
};

const prefixes = ['bg-', 'text-', 'border-', 'hover:bg-', 'focus:ring-', 'focus:border-', 'odd:bg-', 'ring-'];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;

  for (const [color, hex] of Object.entries(colorMap)) {
    for (const prefix of prefixes) {
      const search = prefix + color;
      
      const regex = new RegExp(`(?<=[\\s"'\\\`{:]|^)${search.replace(':', '\\:')}(?=[\\s"'\\\`\\]}]|$)`, 'g');
      const replacement = `${prefix}[${hex}]`;
      newContent = newContent.replace(regex, replacement);
    }
  }

  // Also catch text-slate-500/80 patterns if any? Not used typically except for hover, but let's assume not.

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

const dir = './src';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

for (const file of files) {
  processFile(path.join(dir, file));
}
