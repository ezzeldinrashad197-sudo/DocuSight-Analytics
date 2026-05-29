const fs = require('fs');
const path = require('path');

const colorMap = {
  'white': '#ffffff',
  'black': '#000000'
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
