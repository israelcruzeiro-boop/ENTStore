import { readFileSync, writeFileSync } from 'fs';
const file = 'src/pages/admin/Repositories.tsx';
let content = readFileSync(file, 'utf-8');

// Find the specific line pattern
const lines = content.split(/\r?\n/);
const lineEnding = content.includes('\r\n') ? '\r\n' : '\n';

let insertAfterIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Music size={12}') && lines[i].includes('Playlist')) {
    insertAfterIdx = i;
    break;
  }
}

if (insertAfterIdx === -1) {
  console.log('FAILED: Could not find Music/Playlist line');
  process.exit(1);
}

// Line after the Music/Playlist line should be </span>
// And after that should be ) : (
console.log(`Found at line ${insertAfterIdx + 1}: ${lines[insertAfterIdx].trim()}`);
console.log(`Next: ${lines[insertAfterIdx + 1].trim()}`);
console.log(`Next+1: ${lines[insertAfterIdx + 2].trim()}`);

// The line at insertAfterIdx+2 should be ") : ("
// We need to replace it with the VIDEO_PLAYLIST branch
if (lines[insertAfterIdx + 2].trim() === ') : (') {
  const indent = lines[insertAfterIdx + 2].match(/^(\s*)/)[1];
  const newLines = [
    `${indent}) : repo.type === 'VIDEO_PLAYLIST' ? (`,
    `${indent}  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-teal-50 text-teal-700 border border-teal-100">`,
    `${indent}    <PlaySquare size={12} /> Vídeos`,
    `${indent}  </span>`,
    `${indent}) : (`,
  ];
  
  lines.splice(insertAfterIdx + 2, 1, ...newLines);
  const result = lines.join(lineEnding);
  writeFileSync(file, result);
  console.log('SUCCESS: VIDEO_PLAYLIST badge inserted');
} else {
  console.log(`UNEXPECTED line at ${insertAfterIdx + 3}: "${lines[insertAfterIdx + 2].trim()}"`);
}
