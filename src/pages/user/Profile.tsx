import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppStore } from '../../store/useAppStore';
import { UserCircle, LogOut, Shield, Save, Camera, Building2, Store } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

const isValidCPF = (cpf: string) => {
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let sum = 0, rest;
  for (let i = 1; i <= 9; i++) sum = sum + parseInt(cpf.substring(i-1, i)) * (11 - i);
  rest = (sum * 10) % 11;
  if ((rest === 10) || (rest === 11)) rest = 0;
  if (rest !== parseInt(cpf.substring(9, 10))) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum = sum + parseInt(cpf.substring(i-1, i)) * (12 - i);
  rest = (sum * 10) % 11;
  if ((rest === 10) || (rest === 11)) rest = 0;
  if (rest !== parseInt(cpf.substring(10, 11))) return false;
  return true;
};

export const UserProfile = () => {
  const { user, company, logout } = useAuth();
  const navigate = useNavigate();
  const { slug } = useParams();
  const { orgUnits, orgTopLevels, updateUser, users } = useAppStore();

  const unitLabel = company?.orgUnitName || 'Unidade';
  const orgLevels = company?.orgLevels?.length ? company.orgLevels : [{ id: 'legacy', name: company?.orgTopLevelName || 'Regional' }];

  const activeTopLevels = orgTopLevels.filter(t => t.companyId === company?.id && t.active);
  const activeUnits = orgUnits.filter(u => u.companyId === company?.id && u.active);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    avatarUrl: '',
    orgUnitId: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        cpf: user.cpf || '',
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

    const emailExists = users.some(u => u.email?.toLowerCase() === formData.email.trim().toLowerCase() && u.id !== user.id);
    if (emailExists) return toast.error('Este e-mail já está em uso.');

    const cleanCpf = formData.cpf.replace(/\D/g, '');
    if (cleanCpf && cleanCpf !== user.cpf) {
       if (!isValidCPF(cleanCpf)) return toast.error('CPF inválido.');
       const cpfExists = users.some(u => u.cpf === cleanCpf && u.id !== user.id);
       if (cpfExists) return toast.error('Este CPF já está sendo usado por outro usuário.');
    }

    updateUser(user.id, {
      name: formData.name,
      email: formData.email,
      cpf: cleanCpf || undefined,
      avatarUrl: formData.avatarUrl,
      orgUnitId: formData.orgUnitId
    });

    toast.success('Perfil atualizado com sucesso!');
    navigate(`/${slug}`);
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
  const currentUnit = activeUnits.find(u => u.id === formData.orgUnitId);

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
               <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
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
               <div className="space-y-1.5 text-left">
                  <label className="text-xs text-zinc-500 font-medium flex justify-between items-center">
                    CPF
                    <span className="text-[10px] text-zinc-600 font-normal">Não editável</span>
                  </label>
                  <input 
                    type="text" 
                    value={formData.cpf ? formData.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : ''} 
                    readOnly
                    className="w-full bg-zinc-950 border border-zinc-800/50 rounded-xl p-3 text-zinc-500 text-sm cursor-not-allowed focus:outline-none"
                    placeholder="Não cadastrado"
                  />
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
               
               <div className="space-y-1.5 text-left border-t border-zinc-800/50 pt-5">
                  <label className="text-xs text-zinc-500 font-medium flex justify-between items-center">
                    {unitLabel} Atual
                    <span className="text-[10px] text-zinc-600 font-normal">Apenas admin pode alterar</span>
                  </label>
                  <input 
                    type="text" 
                    value={currentUnit ? currentUnit.name : ''} 
                    readOnly
                    className="w-full bg-zinc-950 border border-zinc-800/50 rounded-xl p-3 text-zinc-500 text-sm cursor-not-allowed focus:outline-none"
                    placeholder={`Nenhuma ${unitLabel.toLowerCase()} vinculada`}
                  />
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