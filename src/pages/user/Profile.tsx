import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppStore } from '../../store/useAppStore';
import { UserCircle, LogOut, Shield, Save, Camera, Building2, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const UserProfile = () => {
  const { user, company, logout } = useAuth();
  const navigate = useNavigate();
  const { orgUnits, orgTopLevels, updateUser } = useAppStore();

  const unitLabel = company?.orgUnitName || 'Unidade';
  const orgLevels = company?.orgLevels?.length ? company.orgLevels : [{ id: 'legacy', name: company?.orgTopLevelName || 'Regional' }];

  const activeTopLevels = orgTopLevels.filter(t => t.companyId === company?.id && t.active);
  const activeUnits = orgUnits.filter(u => u.companyId === company?.id && u.active);

  // Agrupamento robusto de lojas
  const parentGroups = activeTopLevels.filter(t => activeUnits.some(u => u.parentId === t.id));
  const orphanUnits = activeUnits.filter(u => !u.parentId || !activeTopLevels.some(t => t.id === u.parentId));

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    avatarUrl: '',
    orgUnitId: ''
  });

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

  const getHierarchyPath = () => {
    if (!formData.orgUnitId) return [];
    const unit = activeUnits.find(u => u.id === formData.orgUnitId);
    if (!unit) return [];
    
    const path: { label: string, name: string }[] = [];
    let currentParent = activeTopLevels.find(t => t.id === unit.parentId);
    
    while (currentParent) {
      const parentDef = orgLevels.find(l => l.id === currentParent?.levelId) || orgLevels[0];
      path.unshift({ label: parentDef.name, name: currentParent.name });
      currentParent = activeTopLevels.find(t => t.id === currentParent?.parentId);
    }
    
    path.push({ label: unitLabel, name: unit.name });
    
    return path;
  };

  const hierarchyPath = getHierarchyPath();

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

               <div className="mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-4">
                  {hierarchyPath.length > 0 ? (
                    hierarchyPath.map((pathItem, idx) => {
                      const isLast = idx === hierarchyPath.length - 1;
                      return (
                        <div key={idx} className="flex items-center gap-3 relative">
                           {idx > 0 && <div className="absolute -top-4 left-5 w-px h-4 bg-zinc-800"></div>}
                           
                           <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isLast ? 'bg-zinc-950 border border-zinc-800 shadow-inner text-[var(--c-primary)]' : 'bg-zinc-950 border border-zinc-800 text-zinc-400'}`}>
                              {isLast ? <Store size={18} /> : <Building2 size={18} />}
                           </div>
                           <div>
                              <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">{pathItem.label}</p>
                              <p className="text-sm font-bold text-white">{pathItem.name}</p>
                           </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-zinc-500 text-sm text-center py-2 font-medium">Nenhum vínculo organizacional definido.</div>
                  )}
               </div>
               
               <div className="space-y-3 text-left border-t border-zinc-800/50 pt-5">
                  <label className="text-xs text-zinc-500 font-medium">Alterar {unitLabel}</label>
                  <select 
                     value={formData.orgUnitId} 
                     onChange={(e) => setFormData({...formData, orgUnitId: e.target.value})}
                     className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)] focus:border-transparent transition-all cursor-pointer"
                  >
                     <option value="">Nenhuma {unitLabel.toLowerCase()} selecionada</option>
                     {parentGroups.map(parentGroup => {
                        const unitsInThisGroup = activeUnits.filter(u => u.parentId === parentGroup.id);
                        return (
                          <optgroup key={parentGroup.id} label={parentGroup.name} className="bg-zinc-800 text-zinc-300 font-bold">
                            {unitsInThisGroup.map(unit => (
                              <option key={unit.id} value={unit.id} className="text-white font-medium bg-zinc-900">
                                {unit.name}
                              </option>
                            ))}
                          </optgroup>
                        )
                     })}
                     {orphanUnits.length > 0 && (
                        <optgroup label="Outras" className="bg-zinc-800 text-zinc-300 font-bold">
                           {orphanUnits.map(unit => (
                              <option key={unit.id} value={unit.id} className="text-white font-medium bg-zinc-900">
                                {unit.name}
                              </option>
                           ))}
                        </optgroup>
                     )}
                  </select>
               </div>
            </div>

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