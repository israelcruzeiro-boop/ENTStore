const fs = require('fs');
const file = 'src/pages/admin/Repositories.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Insert VIDEO_PLAYLIST badge after PLAYLIST badge
const search = `</span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                  <List size={12} /> Simples`;

const replace = `</span>
                              ) : repo.type === 'VIDEO_PLAYLIST' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-teal-50 text-teal-700 border border-teal-100">
                                  <PlaySquare size={12} /> Vídeos
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                  <List size={12} /> Simples`;

if (content.includes(search)) {
  content = content.replace(search, replace);
  fs.writeFileSync(file, content);
  console.log('SUCCESS: Badge inserted');
} else {
  // Try with CRLF
  const searchCRLF = search.replace(/\n/g, '\r\n');
  if (content.includes(searchCRLF)) {
    content = content.replace(searchCRLF, replace.replace(/\n/g, '\r\n'));
    fs.writeFileSync(file, content);
    console.log('SUCCESS: Badge inserted (CRLF)');
  } else {
    console.log('FAILED: Search string not found');
    // Debug: show a portion
    const idx = content.indexOf('Playlist');
    if (idx > -1) {
      const snippet = content.substring(idx, idx + 200);
      console.log('Context around "Playlist":', JSON.stringify(snippet));
    }
  }
}
