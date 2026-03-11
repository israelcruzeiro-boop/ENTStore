import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppStore } from '../../store/useAppStore';
import { UserCircle, LogOut, Shield, Save, Camera, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const UserProfile = () => {
  const { user, company, logout } = useAuth();
  const navigate = useNavigate();
  const { orgUnits, orgTopLevels, updateUser } = useAppStore();

  // Nomenclaturas personalizadas da empresa
  const unitLabel = company?.orgUnitName || 'Unidade';
  const topLevelLabel = company?.orgTopLevelName || 'Nível Superior';

  // Lista de unidades e níveis ativos da empresa atual
  const activeTopLevels = orgTopLevels.filter(t => t.companyId === company?.id && t.active);
  const activeUnits = orgUnits.filter(u => u.companyId === company?.id && u.active);

  // Estado do formulário
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    avatarUrl: '',
    orgUnitId: ''
  });

  // Carrega os dados do usuário logado ao iniciar
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        avatarUrl: user.avatarUrl || '',
        orgUnitId: user.orgUnitId || ''
      });
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Upload e preview da foto de perfil
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatarUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Salvar alterações na store persistente
  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.name.trim() || !formData.email.trim()) {
      return toast.error('Nome e E-mail são obrigatórios.');
    }

    updateUser(user.id, {
      name: formData.name,
      email: formData.email,
      avatarUrl: formData.avatarUrl,
      orgUnitId: formData.orgUnitId
    });

    toast.success('Perfil atualizado com sucesso!');
  };

  // Recupera as informações de nível superior baseado na unidade selecionada (para exibição na UI)
  const currentUnit = orgUnits.find(u => u.id === formData.orgUnitId);
  const currentTopLevel = currentUnit ? orgTopLevels.find(t => t.id === currentUnit.parentId) : null;

  return (
    <div className="pt-24 pb-12 px-4 md:px-12 max-w-3xl mx-auto min-h-screen">
       <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-3xl p-6 md:p-10 shadow-xl relative overflow-hidden">
          
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--c-primary)]/5 to-transparent pointer-events-none"></div>

          <form onSubmit={handleSaveChanges} className="relative z-10 flex flex-col items-center w-full">
            
            {/* 1. Foto de Perfil */}
            <div 
              className="relative mb-6 group cursor-pointer" 
              onClick={() => document.getElementById('avatar-upload')?.click()}
              title="Clique para alterar a foto"
            >
              {formData.avatarUrl ? (
                 <img src={formData.avatarUrl} alt="avatar" className="w-28 h-28 rounded-full border-4 border-zinc-800 shadow-2xl object-cover" />
              ) : (
                 <div className="w-28 h-28 rounded-full bg-zinc-950 text-zinc-600 flex items-center justify-center border-4 border-zinc-800 shadow-2xl">
                   <UserCircle size={56} />
                 </div>
              )}
              <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <Camera size={24} className="text-white mb-1" />
                 <span className="text-[10px] text-white font-medium uppercase tracking-wider">Alterar</span>
              </div>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                id="avatar-upload" 
                onChange={handleImageUpload} 
              />
            </div>

            <div className="text-center mb-8">
               <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 flex items-center justify-center gap-2">
                 {user?.name}
               </h1>
               <div className="flex items-center justify-center gap-2 mt-2">
                 <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold bg-zinc-950 px-3 py-1 rounded-full border border-zinc-800">
                    {company?.name}
                 </span>
                 {user?.role === 'ADMIN' && (
                    <span className="flex items-center gap-1 text-[10px] bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full font-bold uppercase border border-indigo-500/20">
                       <Shield size={12} /> Admin
                    </span>
                 )}
               </div>
            </div>

            {/* 2. Dados Pessoais */}
            <div className="w-full bg-zinc-950/50 rounded-2xl p-6 mb-6 border border-zinc-800/80 shadow-inner">
               <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                  Dados Pessoais
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5 text-left">
                     <label className="text-xs text-zinc-500 font-medium">Nome Completo</label>
                     <input 
                       type="text" 
                       value={formData.name} 
                       onChange={(e) => setFormData({...formData, name: e.target.value})} 
                       className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)] focus:border-transparent transition-all"
                       placeholder="Seu nome"
                     />
                  </div>
                  <div className="space-y-1.5 text-left">
                     <label className="text-xs text-zinc-500 font-medium">E-mail</label>
                     <input 
                       type="email" 
                       value={formData.email} 
                       onChange={(e) => setFormData({...formData, email: e.target.value})} 
                       className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)] focus:border-transparent transition-all"
                       placeholder="seu@email.com"
                     />
                  </div>
               </div>
            </div>

            {/* 3. Vínculo Organizacional */}
            <div className="w-full bg-zinc-950/50 rounded-2xl p-6 mb-8 border border-zinc-800/80 shadow-inner">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    Vínculo Organizacional
                 </h3>
               </div>
               
               <div className="space-y-3 text-left">
                  <label className="text-xs text-zinc-500 font-medium">Selecione sua {unitLabel}</label>
                  <select 
                     value={formData.orgUnitId} 
                     onChange={(e) => setFormData({...formData, orgUnitId: e.target.value})}
                     className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)] focus:border-transparent transition-all cursor-pointer"
                  >
                     <option value="">Nenhuma {unitLabel.toLowerCase()} selecionada</option>
                     {activeTopLevels.map(topLevel => {
                        const unitsInThisLevel = activeUnits.filter(u => u.parentId === topLevel.id);
                        if (unitsInThisLevel.length === 0) return null;
                        return (
                          <optgroup key={topLevel.id} label={`${topLevelLabel}: ${topLevel.name}`} className="bg-zinc-800 text-zinc-300 font-bold">
                            {unitsInThisLevel.map(unit => (
                              <option key={unit.id} value={unit.id} className="text-white font-medium bg-zinc-900">
                                {unit.name}
                              </option>
                            ))}
                          </optgroup>
                        )
                     })}
                  </select>

                  {/* Mostra visualmente o nível superior atual se houver unidade selecionada */}
                  {currentTopLevel && (
                    <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-zinc-900/50 rounded-lg border border-zinc-800">
                      <Building2 size={14} className="text-zinc-500" />
                      <span className="text-xs text-zinc-400">
                        Pertence ao {topLevelLabel.toLowerCase()}: <strong className="text-white">{currentTopLevel.name}</strong>
                      </span>
                    </div>
                  )}
               </div>
            </div>

            {/* Ações / Botões */}
            <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-zinc-800/50">
               <button 
                 type="button"
                 onClick={handleLogout}
                 className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 text-red-400 hover:bg-red-500/10 hover:text-red-300 border border-zinc-800 hover:border-red-500/30 font-semibold transition-all"
               >
                 <LogOut size={18} />
                 Sair da Conta
               </button>

               <button 
                 type="submit"
                 className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-white hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] font-bold transition-all shadow-lg"
                 style={{ backgroundColor: 'var(--c-primary)' }}
               >
                 <Save size={18} />
                 Salvar Alterações
               </button>
            </div>

          </form>
       </div>
    </div>
  );
};