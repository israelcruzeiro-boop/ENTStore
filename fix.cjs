const fs = require('fs');
let content = fs.readFileSync('src/pages/user/RepositoryDetail.tsx', 'utf-8');

let lines = content.split('\n');
for (let i = 430; i < 485; i++) {
  if (lines[i] !== undefined) {
    if (lines[i].includes('music.thumbnail_url')) {
      lines[i] = lines[i].replace('music.thumbnail_url', 'item.thumbnail_url').replace('music.url', 'item.url').replace('music.title', 'item.title');
    }
    if (lines[i].includes('{music.title}')) {
      lines[i] = lines[i].replace('{music.title}', '{item.title}');
    }
    if (lines[i].includes('music.description')) {
      lines[i] = lines[i].replace('music.description', 'item.description').replace("'Dynamic Audio Content'", "(isPlaylist ? 'Áudio' : 'Vídeo')");
    }
    if (lines[i].includes('<PlayCircle size={20} className="text-zinc-400" />')) {
      lines[i] = lines[i].replace('<PlayCircle size={20} className="text-zinc-400" />', '(isPlaylist ? <PlayCircle size={20} className="text-zinc-400" /> : <PlaySquare size={20} className="text-zinc-400" />)');
    }
  }
}

fs.writeFileSync('src/pages/user/RepositoryDetail.tsx', lines.join('\n'));
console.log("Fix aplicado com sucesso");
