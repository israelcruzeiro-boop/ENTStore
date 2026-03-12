import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppStore } from '../../store/useAppStore';
import { toast } from 'sonner';
import { Camera, Save, UserCircle } from 'lucide-react';

export const FirstAccessModal = () => {
  const { user, company } = useAuth();
  const { orgUnits, orgTopLevels, updateUser, users } = useAppStore();

  const [formData, setFormData] = useState({
    email: user?.email || '',
    orgUnitId: user?.orgUnitId || '',
    avatarUrl: user?.avatarUrl || ''
  });

  const activeUnits = orgUnits.filter(u => u.companyId === company?.id && u.active);
  const orgLevels = company?.orgLevels?.length ? company.orgLevels : [{ id: 'legacy', name: company?.orgTopLevelName || 'Regional' }];
  const lowestLevel = orgLevels[orgLevels.length - 1];
  const activeTopLevels = orgTopLevels.filter(t => t.companyId === company?.id && t.active);
  const lowestLevelGroups = activeTopLevels.filter(t => t.levelId === lowestLevel.id || (!t.levelId && orgLevels.length === 1));
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
    if (!user) return;

    if (!formData.email.trim()) return toast.error('O preenchimento do E-mail é obrigatório.');
    
    // Validar e-mail único
    const emailExists = users.some(u => u.email?.toLowerCase() === formData.email.trim().toLowerCase() && u.id !== user.id);
    if (emailExists) return toast.error('Este e-mail já está em uso.');

    if (activeUnits.length > 0 && !formData.orgUnitId) {
      return toast.error(`Selecione sua ${unitLabel} para continuar.`);
    }

    updateUser(user.id, {
      email: formData.email.trim(),
      orgUnitId: formData.orgUnitId || undefined,
      avatarUrl: formData.avatarUrl,
      firstAccess: false,
      status: 'ACTIVE'
    });

    toast.success('Perfil configurado! Bem-vindo(a).');
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-zinc-950 flex flex-col items-center justify-center p-4">
       <div className="absolute inset-0 bg-gradient-to-br from-[var(--c-primary)]/10 to-transparent pointer-events-none"></div>

       <div className="w-full max-w-lg bg-zinc-900/90 backdrop-blur-xl rounded-3xl p-8 border border-zinc-800 shadow-2xl relative z-10">
          <div className="text-center mb-8">
             <h1 className="text-2xl font-bold text-white mb-2">Bem-vindo(a), {user?.name}!</h1>
             <p className="text-sm text-zinc-400">Este é seu primeiro acesso. Por favor, conclua seu cadastro para liberar a plataforma.</p>
          </div>

          <form onSubmit={handleCompleteSetup} className="flex flex-col items-center">
            {/* Foto */}
            <div className="relative mb-6 group cursor-pointer" onClick={() => document.getElementById('avatar-upload-setup')?.click()}>
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
              <div className="space-y-1.5 text-left">
                 <label className="text-xs text-zinc-400 font-medium ml-1">Seu E-mail Corporativo *</label>
                 <input 
                   type="email" 
                   value={formData.email} 
                   onChange={(e) => setFormData({...formData, email: e.target.value})} 
                   className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)] focus:border-transparent transition-all"
                   placeholder="seu@email.com"
                   required
                 />
              </div>

              {activeUnits.length > 0 && (
                <div className="space-y-1.5 text-left">
                   <label className="text-xs text-zinc-400 font-medium ml-1">Sua {unitLabel} Base *</label>
                   <select 
                      value={formData.orgUnitId} 
                      onChange={(e) => setFormData({...formData, orgUnitId: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)] focus:border-transparent transition-all cursor-pointer"
                      required
                   >
                      <option value="">Selecione...</option>
                      {lowestLevelGroups.map(parentGroup => {
                         const unitsInThisGroup = activeUnits.filter(u => u.parentId === parentGroup.id);
                         if (unitsInThisGroup.length === 0) return null;
                         return (
                           <optgroup key={parentGroup.id} label={`${lowestLevel.name}: ${parentGroup.name}`} className="bg-zinc-800 text-zinc-300 font-bold">
                             {unitsInThisGroup.map(unit => (
                               <option key={unit.id} value={unit.id} className="text-white font-medium bg-zinc-950">
                                 {unit.name}
                               </option>
                             ))}
                           </optgroup>
                         )
                      })}
                   </select>
                </div>
              )}
            </div>

            <button 
               type="submit"
               className="w-full mt-8 flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98]"
               style={{ backgroundColor: 'var(--c-primary)' }}
            >
               <Save size={18} /> Acessar Plataforma
            </button>
          </form>
       </div>
    </div>
  );
};