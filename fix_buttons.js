const fs = require('fs');
const path = 'c:/Users/israe/Downloads/ENTStore/src/pages/user/ChecklistPlayer.tsx';
let content = fs.readFileSync(path, 'utf8');

const replacements = [
  {
    old: 'className="flex-1 md:flex-none h-16 px-10 text-zinc-500 hover:text-white border border-white/5 font-black rounded-2xl uppercase tracking-widest text-[11px]"',
    new: 'className="flex-1 md:flex-none h-16 px-10 text-slate-400 hover:text-slate-900 border border-slate-200 font-bold rounded-2xl uppercase tracking-widest text-[11px] bg-white shadow-sm transition-all"'
  },
  {
    old: 'className="flex-1 md:flex-none bg-white text-black hover:bg-zinc-200 font-black h-16 px-14 rounded-2xl shadow-2xl active:scale-95 transition-all text-[11px] uppercase tracking-widest"',
    new: 'className="flex-1 md:flex-none bg-slate-900 text-white hover:bg-slate-800 font-black h-16 px-14 rounded-2xl shadow-xl active:scale-95 transition-all text-[11px] uppercase tracking-widest"'
  },
  {
    old: 'className="flex-1 md:flex-none bg-[var(--c-primary)] hover:opacity-90 text-white font-black h-16 px-20 rounded-2xl shadow-[0_20px_50px_-12px_rgba(var(--c-primary-rgb),0.5)] transition-all active:scale-95 text-[11px] uppercase tracking-widest"',
    new: 'className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white font-black h-16 px-20 rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-95 text-[11px] uppercase tracking-widest"'
  }
];

replacements.forEach(r => {
  content = content.split(r.old).join(r.new);
});

fs.writeFileSync(path, content, 'utf8');
console.log('Botões atualizados com sucesso!');
