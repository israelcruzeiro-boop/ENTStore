import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { mockThemes } from '../../data/mock';

export const AdminAppearance = () => {
  const { company } = useAuth();
  const [activeTheme, setActiveTheme] = useState('corporateBlue'); // Just a mock state

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Identidade Visual</h1>
      <p className="text-slate-600 mb-8">Personalize a aparência do painel dos seus usuários para refletir sua marca.</p>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Temas Pré-definidos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(mockThemes).map(([key, theme]) => (
               <button 
                  key={key}
                  onClick={() => setActiveTheme(key)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${activeTheme === key ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200 hover:border-slate-300'}`}
               >
                  <div className="flex gap-2 mb-3">
                     <div className="w-6 h-6 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                     <div className="w-6 h-6 rounded-full" style={{ backgroundColor: theme.background }}></div>
                  </div>
                  <p className="font-medium text-slate-900 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
               </button>
            ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
         <h2 className="text-lg font-semibold text-slate-900 mb-4">Cores Personalizadas</h2>
         <div className="space-y-4">
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Cor Primária (Destaques, Botões)</label>
               <div className="flex gap-2">
                  <input type="color" defaultValue={company?.theme?.primary || '#2563EB'} className="h-10 w-10 rounded border border-slate-200 cursor-pointer" />
                  <input type="text" defaultValue={company?.theme?.primary || '#2563EB'} className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
               </div>
            </div>
            {/* Outros campos de cor seriam semelhantes */}
         </div>
         <div className="mt-6">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
               Salvar Alterações
            </button>
         </div>
      </div>
    </div>
  );
};