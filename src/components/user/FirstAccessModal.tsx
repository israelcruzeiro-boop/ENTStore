import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { useAppStore } from '../../store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Camera, Save, UserCircle, KeyRound, CreditCard } from 'lucide-react';

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

export const FirstAccessModal = () => {
  const { user, company } = useAuth();
  const { slug } = useTenant();
  const { orgUnits, orgTopLevels, updateUser, users } = useAppStore();
  const navigate = useNavigate();

  const [isVisible, setIsVisible] = useState(true);
  
  const [formData, setFormData] = useState({
    email: user?.email || '',
    cpf: user?.cpf || '',
    orgUnitId: user?.orgUnitId || '',
    avatarUrl: user?.avatarUrl || '',
    password: '',
    confirmPassword: ''
  });

  const activeUnits = orgUnits.filter(u => u.companyId === company?.id && u.active);
  const activeTopLevels = orgTopLevels.filter(t => t.companyId === company?.id && t.active);
  
  const parentGroups = activeTopLevels.filter(t => activeUnits.some(u => u.parentId === t.id));
  const orphanUnits = activeUnits.filter(u => !u.parentId || !activeTopLevels.some(t => t.id === u.parentId));

  const unitLabel = company?.orgUnitName || 'Unidade';

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) return toast.error('A imagem deve ter no máximo 2MB.');
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, avatarUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleCompleteSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !company) return;

    if (!formData.email.trim()) return toast.error('O preenchimento do E-mail é obrigatório.');
    
    const emailExists = users.some(u => u.email?.toLowerCase() === formData.email.trim().toLowerCase() && u.id !== user.id);
    if (emailExists) return toast.error('Este e-mail já está em uso.');

    const cleanCpf = formData.cpf.replace(/\D/g, '');
    if (cleanCpf) {
       if (!isValidCPF(cleanCpf)) return toast.error('CPF inválido.');
       const cpfExists = users.some(u => u.cpf === cleanCpf && u.id !== user.id);
       if (cpfExists) return toast.error('Este CPF já está cadastrado por outro usuário.');
    }

    if (formData.password.length < 6) return toast.error('A nova senha deve ter pelo menos 6 caracteres.');
    if (formData.password !== formData.confirmPassword) return toast.error('As senhas não coincidem. Tente novamente.');

    if (activeUnits.length > 0 && !formData.orgUnitId) {
      return toast.error(`Selecione sua ${unitLabel} para continuar.`);
    }

    // Força o fechamento visual imediato
    setIsVisible(false);

    updateUser(user.id, {
      email: formData.email.trim(),
      cpf: cleanCpf || undefined,
      password: formData.password,
      orgUnitId: formData.orgUnitId || undefined,
      avatarUrl: formData.avatarUrl,
      firstAccess: false,
      status: 'ACTIVE'
    });

    toast.success('Perfil configurado! Bem-vindo(a).');
    navigate(`/${slug}/home`);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-zinc-950 flex flex-col items-center justify-center p-4">
       <div className="absolute inset-0 bg-gradient-to-br from-[var(--c-primary)]/10 to-transparent pointer-events-none"></div>

       <div className="w-full max-w-lg bg-zinc-900/90 backdrop-blur-xl rounded-3xl p-8 border border-zinc-800 shadow-2xl relative z-10 max-h-[95vh] overflow-y-auto hide-scrollbar">
          <div className="text-center mb-8">
             <h1 className="text-2xl font-bold text-white mb-2">Bem-vindo(a), {user?.name}!</h1>
             <p className="text-sm text-zinc-400">Este é seu primeiro acesso. Por segurança e para liberar sua plataforma, conclua seu cadastro abaixo.</p>
          </div>

          <form onSubmit={handleCompleteSetup} className="flex flex-col items-center">
            <div className="relative mb-6 group cursor-pointer" onClick={() => document.getElementById('avatar-upload-setup')?.click()} title="Adicionar foto de perfil">
              {formData.avatarUrl ? (
                 <img src={formData.avatarUrl} alt="avatar" className="w-24 h-24 rounded-full border-4 border-zinc-800 shadow-xl object-cover" />
              ) : (
                 <div className="w-24 h-24 rounded-full bg-zinc-950 text-[var(--c-primary)] flex items-center justify-center border-4 border-zinc-800 shadow-xl">
                   <UserCircle size={48} />
                 </div>
              )}
              <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <Camera size={20} className="text-white mb-1" />
                 <span className="text-[10px] text-white font-medium uppercase tracking-wider">Adicionar</span>
              </div>
              <input type="file" accept="image/*" className="hidden" id="avatar-upload-setup" onChange={handleImageUpload} />
            </div>

            <div className="w-full space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-1.5 text-left">
                    <label className="text-xs text-zinc-400 font-medium ml-1">E-mail Corporativo *</label>
                    <input 
                      type="email" 
                      value={formData.email} 
                      onChange={(e) => setFormData({...formData, email: e.target.value})} 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)] focus:border-transparent transition-all"
                      placeholder="seu@email.com"
                      required
                    />
                 </div>
                 <div className="space-y-1.5 text-left">
                    <label className="text-xs text-zinc-400 font-medium ml-1 flex items-center gap-1.5"><CreditCard size={12}/> CPF (Opcional)</label>
                    <input 
                      type="text" 
                      value={formData.cpf} 
                      onChange={(e) => setFormData({...formData, cpf: e.target.value.replace(/\D/g, '')})} 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)] focus:border-transparent transition-all"
                      placeholder="Apenas números"
                      maxLength={11}
                    />
                 </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-1.5 text-left">
                    <label className="text-xs text-zinc-400 font-medium ml-1 flex items-center gap-1.5"><KeyRound size={12}/> Nova Senha *</label>
                    <input 
                      type="password" 
                      value={formData.password} 
                      onChange={(e) => setFormData({...formData, password: e.target.value})} 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)] focus:border-transparent transition-all"
                      placeholder="Mínimo 6 caracteres"
                      required
                    />
                 </div>
                 <div className="space-y-1.5 text-left">
                    <label className="text-xs text-zinc-400 font-medium ml-1 flex items-center gap-1.5"><KeyRound size={12}/> Confirmar Senha *</label>
                    <input 
                      type="password" 
                      value={formData.confirmPassword} 
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)] focus:border-transparent transition-all"
                      placeholder="Repita a senha"
                      required
                    />
                 </div>
              </div>

              {activeUnits.length > 0 && (
                <div className="space-y-1.5 text-left pt-2 border-t border-zinc-800/50">
                   <label className="text-xs text-zinc-400 font-medium ml-1">Sua {unitLabel} Base *</label>
                   <select 
                      value={formData.orgUnitId} 
                      onChange={(e) => setFormData({...formData, orgUnitId: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)] focus:border-transparent transition-all cursor-pointer"
                      required
                   >
                      <option value="">Selecione...</option>
                      {parentGroups.map(parentGroup => {
                         const unitsInThisGroup = activeUnits.filter(u => u.parentId === parentGroup.id);
                         return (
                           <optgroup key={parentGroup.id} label={parentGroup.name} className="bg-zinc-800 text-zinc-300 font-bold">
                             {unitsInThisGroup.map(unit => (
                               <option key={unit.id} value={unit.id} className="text-white font-medium bg-zinc-950">
                                 {unit.name}
                               </option>
                             ))}
                           </optgroup>
                         )
                      })}
                      {orphanUnits.length > 0 && (
                         <optgroup label="Outras" className="bg-zinc-800 text-zinc-300 font-bold">
                            {orphanUnits.map(unit => (
                               <option key={unit.id} value={unit.id} className="text-white font-medium bg-zinc-950">
                                 {unit.name}
                               </option>
                            ))}
                         </optgroup>
                      )}
                   </select>
                </div>
              )}
            </div>

            <button 
               type="submit"
               className="w-full mt-8 flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98]"
               style={{ backgroundColor: 'var(--c-primary)' }}
            >
               <Save size={18} /> Salvar e Acessar Plataforma
            </button>
          </form>
       </div>
    </div>
  );
};