import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { settingsService } from '../../services/api';
import { mockThemes } from '../../data/mock';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Company, Theme } from '../../types';
import { Play, Search, UserCircle, ChevronRight, Loader2, Save, ExternalLink, LayoutTemplate, Sparkles, Image as ImageIcon, PanelTop, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Joyride } from 'react-joyride';
import { useTour } from '../../hooks/useTour';
import { APPEARANCE_STEPS } from '../../data/tourSteps';

export const AdminAppearance = () => {
  const { company, refreshUser } = useAuth();
  
  // Tour Guiado
  const { startTour, joyrideProps } = useTour(APPEARANCE_STEPS);

  const [activeThemeKey, setActiveThemeKey] = useState('custom');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localTheme, setLocalTheme] = useState<Theme>({
    primary: '#2563EB',
    secondary: '#1D4ED8',
    background: '#09090b',
    card: '#18181b',
    text: '#ffffff'
  });
  const [publicBio, setPublicBio] = useState('');
  const [landingPageActive, setLandingPageActive] = useState(false);
  const [landingPageLayout, setLandingPageLayout] = useState<NonNullable<Company['landing_page_layout']>>('classic');

  useEffect(() => {
     if (company?.theme) {
        setLocalTheme(company.theme);
        const presetEntry = Object.entries(mockThemes).find(([_, t]) => 
            (t as Theme).primary === company.theme.primary && (t as Theme).background === company.theme.background
        );
        setActiveThemeKey(presetEntry ? presetEntry[0] : 'custom');
     }
     if (company?.public_bio) {
        setPublicBio(company.public_bio);
     }
     if (company?.landing_page_active !== undefined) {
        setLandingPageActive(company.landing_page_active);
     }
     if (company?.landing_page_layout) {
        setLandingPageLayout(company.landing_page_layout);
     }
  }, [company]);

  const handleApplyPreset = (key: string, theme: Theme) => {
    setActiveThemeKey(key);
    setLocalTheme(theme);
  };

  const handleColorChange = (key: keyof Theme, value: string) => {
    setLocalTheme(prev => ({ ...prev, [key]: value }));
    setActiveThemeKey('custom');
  };

  const handleSaveTheme = async () => {
    if (!company) return;
    
    try {
      setIsSubmitting(true);
      await settingsService.updateAppearance({
        theme: {
          primary: localTheme.primary,
          secondary: localTheme.secondary,
          surface: localTheme.background,
          text: localTheme.text,
        },
      });

      toast.success('Aparência atualizada e aplicada com sucesso!');
      await refreshUser();
    } catch (err) {
      const error = err as Error;
      toast.error(`Erro ao salvar identidade visual: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!company) return (
    <div className="flex justify-center items-center h-48 text-slate-400">
       <Loader2 className="animate-spin" />
    </div>
  );

  const colorFields: { key: keyof Theme, label: string }[] = [
    { key: 'primary', label: 'Cor Primária (Destaques e Botões)' },
    { key: 'secondary', label: 'Cor Secundária (Ações Secundárias)' },
    { key: 'background', label: 'Cor de Fundo (Background)' },
    { key: 'card', label: 'Cor dos Cards (Superfícies)' },
    { key: 'text', label: 'Cor do Texto Principal' },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <Joyride {...joyrideProps} />
      <div className="mb-8 flex justify-between items-center tour-appearance-header">
         <div>
            <h1 className="text-2xl font-bold text-slate-900">Identidade Visual</h1>
            <p className="text-sm text-slate-500 mt-1">Personalize a aparência do painel dos seus usuários na <strong>{company.name}</strong>.</p>
         </div>
         <div className="flex gap-2">
           <Button variant="ghost" size="sm" className="hidden sm:flex text-indigo-600 font-bold hover:bg-indigo-50" onClick={startTour}>
              <HelpCircle size={16} className="mr-1" /> Como funciona?
           </Button>
           <Button onClick={handleSaveTheme} className="bg-indigo-600 hover:bg-indigo-700 text-white hidden md:flex items-center gap-2" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Salvar Aparência
           </Button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 tour-appearance-visual">
         <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-4">Temas Pré-definidos</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {Object.entries(mockThemes).map(([key, theme]) => (
                     <button 
                        key={key}
                        onClick={() => handleApplyPreset(key, theme as Theme)}
                        disabled={isSubmitting}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${activeThemeKey === key ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-slate-300'} disabled:opacity-50`}
                     >
                        <div className="flex gap-1.5 mb-2">
                           <div className="w-5 h-5 rounded-full border border-black/10" style={{ backgroundColor: (theme as Theme).primary }}></div>
                           <div className="w-5 h-5 rounded-full border border-black/10" style={{ backgroundColor: (theme as Theme).background }}></div>
                        </div>
                        <p className="font-medium text-xs text-slate-900 capitalize truncate">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                     </button>
                  ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
               <h2 className="text-base font-semibold text-slate-900 mb-4">Cores Personalizadas</h2>
               <div className="space-y-5">
                  {colorFields.map((field) => (
                     <div key={field.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <label className="text-sm font-medium text-slate-700">{field.label}</label>
                        <div className="flex gap-2 items-center">
                           <Input 
                             type="color" 
                             value={localTheme[field.key]} 
                             onChange={(e) => handleColorChange(field.key, e.target.value)}
                             disabled={isSubmitting}
                             className="h-10 w-16 p-1 cursor-pointer border-slate-200 bg-white" 
                           />
                           <Input 
                             type="text" 
                             value={localTheme[field.key]}
                             onChange={(e) => handleColorChange(field.key, e.target.value)}
                             disabled={isSubmitting}
                             className="font-mono text-sm h-10 w-24 uppercase" 
                             maxLength={7}
                           />
                        </div>
                     </div>
                  ))}
               </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
               <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-1">Estilo de Capa Global (Banner)</h2>
               <p className="text-sm text-slate-500 mb-4">Define o layout visual da capa aplicado na Home do usuário, Detalhes de Repositório e Landing Page.</p>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                 {[
                   { id: 'classic', label: 'Clássico', desc: 'Capa padrão com avatar sobreposto.', icon: <LayoutTemplate size={18}/> },
                   { id: 'gradient', label: 'Degradê Premium', desc: 'Capa fundida ao fundo escuro suavemente.', icon: <Sparkles size={18}/> },
                   { id: 'immersive', label: 'Imersivo', desc: 'Capa tela-cheia com desfoque central.', icon: <ImageIcon size={18}/> },
                   { id: 'solid', label: 'Recorte Seco', desc: 'Divisão nítida da capa e conteúdo.', icon: <PanelTop size={18}/> }
                 ].map(layout => (
                   <button 
                     key={layout.id}
                     type="button"
                     onClick={() => setLandingPageLayout(layout.id as NonNullable<Company['landing_page_layout']>)}
                     disabled={isSubmitting}
                     className={`flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all ${landingPageLayout === layout.id ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 disabled:opacity-50'}`}
                   >
                      <div className={`mb-2 p-2 rounded-lg transition-colors ${landingPageLayout === layout.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                         {layout.icon}
                      </div>
                      <span className={`font-semibold text-sm transition-colors ${landingPageLayout === layout.id ? 'text-indigo-900' : 'text-slate-700'}`}>{layout.label}</span>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{layout.desc} Aplicado na Home, Repositórios e Landing Page.</p>
                   </button>
                 ))}
               </div>
            </div>

            {company.landing_page_enabled !== false && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 tour-appearance-forms">
                 <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
                   <div>
                      <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">Página Pública (Landing Page)</h2>
                      <p className="text-sm text-slate-500 mt-1">Exponha os repositórios aprovados da sua empresa na internet de forma pública e otimizada.</p>
                   </div>
                   <Switch checked={landingPageActive} onCheckedChange={setLandingPageActive} disabled={isSubmitting} title="Ativar Landing Page" />
                 </div>
                 
                 <div className={`transition-all duration-300 ${!landingPageActive ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                   <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-slate-700">Bio Descritiva</label>
                      <Link to={`/${company.link_name || company.slug}/landing`} target="_blank" className="text-xs font-semibold text-indigo-600 flex items-center gap-2 hover:text-indigo-800 transition-colors">
                         <ExternalLink size={14} /> Acessar Landing Page
                      </Link>
                   </div>
                   <textarea 
                      className="flex w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 min-h-[100px] resize-y"
                      placeholder="Escreva uma breve bio ou slogan da empresa..."
                      value={publicBio}
                      onChange={(e) => setPublicBio(e.target.value)}
                      disabled={isSubmitting || !landingPageActive}
                   />
                 </div>
              </div>
            )}  

            <Button onClick={handleSaveTheme} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full md:hidden flex justify-center items-center gap-2" disabled={isSubmitting}>
               {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
               Salvar Aparência
            </Button>
         </div>

         <div>
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xl sticky top-6 bg-white">
               <div className="bg-slate-100 px-4 py-3 flex items-center gap-2 border-b border-slate-200">
                  <div className="flex gap-1.5">
                     <div className="w-3 h-3 rounded-full bg-red-400"></div>
                     <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                     <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                  </div>
                  <span className="text-slate-500 text-xs ml-4 font-medium">Preview ao vivo - App do Usuário</span>
               </div>
               
               <div 
                  style={{ backgroundColor: localTheme.background, color: localTheme.text }} 
                  className="min-h-[500px] relative transition-colors duration-300 font-sans"
               >
                  <header className="px-6 py-4 flex justify-between items-center bg-black/20 backdrop-blur-sm border-b border-white/5">
                     <div className="font-bold text-xl flex gap-1">
                        ENT<span style={{ color: localTheme.primary }}>Store</span>
                     </div>
                     <div className="flex gap-4 opacity-70">
                        <Search size={18} />
                        <UserCircle size={18} />
                     </div>
                  </header>

                  <div className="px-6 py-10 relative overflow-hidden">
                     <div className="absolute inset-0 opacity-10" style={{ backgroundColor: localTheme.primary, background: `linear-gradient(45deg, ${localTheme.background}, ${localTheme.primary})` }}></div>
                     <div className="relative z-10">
                        <h2 className="text-3xl font-bold mb-3">Boas-vindas, Colaborador!</h2>
                        <p className="opacity-80 text-sm mb-6 max-w-sm leading-relaxed">
                           Sua identidade visual será aplicada em todos os botões, links, fundos e textos do ambiente logado.
                        </p>
                        <div className="flex gap-3">
                           <button 
                              className="flex items-center gap-2 px-6 py-2.5 rounded-md font-bold transition-transform hover:scale-105 shadow-lg" 
                              style={{ backgroundColor: localTheme.primary, color: '#ffffff' }}
                           >
                              <Play size={16} fill="currentColor" /> Explorar App
                           </button>
                           <button 
                              className="flex items-center gap-2 px-6 py-2.5 rounded-md font-bold transition-transform hover:bg-black/20" 
                              style={{ backgroundColor: localTheme.secondary, color: '#ffffff' }}
                           >
                              Saber mais
                           </button>
                        </div>
                     </div>
                  </div>

                  <div className="px-6 pb-10">
                     <h3 className="text-lg font-semibold mb-4 flex items-center group">
                        Meus Repositórios 
                        <ChevronRight className="ml-1 opacity-50 transition-colors" style={{ color: localTheme.primary }} />
                     </h3>
                     <div className="flex gap-4 overflow-hidden">
                        {[1, 2].map(i => (
                           <div key={i} className="w-48 rounded-lg overflow-hidden shrink-0 border border-white/5 shadow-md" style={{ backgroundColor: localTheme.card }}>
                              <div className="h-32 bg-black/20 relative group">
                                 <div className="absolute inset-0 opacity-20 bg-gradient-to-tr from-black to-transparent"></div>
                                 <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 cursor-pointer">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-xl transition-transform hover:scale-110" style={{ backgroundColor: localTheme.primary }}>
                                       <Play size={16} fill="currentColor" className="ml-1" />
                                    </div>
                                 </div>
                              </div>
                              <div className="p-4">
                                 <div className="h-4 w-3/4 rounded mb-2 opacity-80" style={{ backgroundColor: localTheme.text }}></div>
                                 <div className="h-3 w-1/2 rounded opacity-40" style={{ backgroundColor: localTheme.text }}></div>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};
