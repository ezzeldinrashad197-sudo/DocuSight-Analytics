const fs = require('fs');
const path = require('path');

const colorMap = {
  'indigo-500': '#6366f1',
  'indigo-600': '#4f46e5',
  'amber-600': '#d97706',
  'yellow-600': '#ca8a04',
  'rose-100': '#ffe4e6',
  'rose-200': '#fecdd3',
  'rose-700': '#be123c',
  'rose-800': '#9f1239',
  'rose-900': '#881337',
  'red-600': '#dc2626',
  'yellow-700': '#a16207',
  'amber-500': '#f59e0b',
  'emerald-500': '#10b981',
  'blue-600': '#2563eb'
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
