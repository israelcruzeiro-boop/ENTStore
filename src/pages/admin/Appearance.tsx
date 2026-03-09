import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { mockThemes } from '../../data/mock';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const AdminAppearance = () => {
  const { linkName } = useParams();
  const { companies, updateCompanyTheme } = useAppStore();
  const company = companies.find(c => c.linkName === linkName);
  
  const [activeThemeKey, setActiveThemeKey] = useState('corporateBlue');
  const [primaryColor, setPrimaryColor] = useState(company?.theme?.primary || '#2563EB');

  useEffect(() => {
     if (company?.theme?.primary) setPrimaryColor(company.theme.primary);
  }, [company]);

  const handleApplyPreset = (key: string, theme: any) => {
    if (!company) return;
    setActiveThemeKey(key);
    setPrimaryColor(theme.primary);
    updateCompanyTheme(company.id, theme);
    toast.success('Tema aplicado com sucesso!');
  };

  const handleSaveCustom = () => {
    if (!company) return;
    updateCompanyTheme(company.id, { primary: primaryColor });
    toast.success('Cor primária customizada salva!');
  };

  if (!company) return null;

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
                  onClick={() => handleApplyPreset(key, theme)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${activeThemeKey === key ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200 hover:border-slate-300'}`}
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
         <div className="space-y-4 max-w-sm">
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-2">Cor Primária (Destaques, Botões)</label>
               <div className="flex gap-3 items-center">
                  <Input 
                    type="color" 
                    value={primaryColor} 
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-12 w-20 p-1 cursor-pointer" 
                  />
                  <Input 
                    type="text" 
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="font-mono" 
                  />
               </div>
            </div>
         </div>
         <div className="mt-6 pt-6 border-t border-slate-100">
            <Button onClick={handleSaveCustom}>
               Salvar Cor Personalizada
            </Button>
         </div>
      </div>
    </div>
  );
};