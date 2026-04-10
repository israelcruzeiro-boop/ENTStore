import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { useOrgStructure, updateSupabaseUser, useUsers, useCourses, useUserCourseHistory } from '../../hooks/useSupabaseData';
import { useChecklists, useAllSubmissions } from '../../hooks/useChecklists';
import { UserCircle, LogOut, Shield, Save, Camera, Building2, Store, BookOpen, CheckSquare, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { isValidCPF } from '../../utils/validators';
import { uploadToSupabase } from '../../lib/storage';
import { checkCourseAccess } from '../../lib/permissions';

export const UserProfile = () => {
  const { user, company, logout, refreshUser } = useAuth();
  const { slug } = useTenant();
  const navigate = useNavigate();
  
  // SWR Hooks para dados do Supabase
  const { users, mutate: mutateUsers } = useUsers(company?.id);
  const { orgUnits, orgTopLevels } = useOrgStructure(company?.id);
  
  // Hooks de Cursos e Checklists
  const { courses } = useCourses(company?.id);
  const { history: courseEnrollments } = useUserCourseHistory(user?.id, company?.id);
  const { checklists } = useChecklists(company?.id);
  const { submissions: allSubmissions } = useAllSubmissions(company?.id);

  // Métricas de Cursos
  const accessibleCourses = courses.filter(c => c.status === 'ACTIVE' && checkCourseAccess(c, user, orgUnits, orgTopLevels));
  const coursesCompleted = courseEnrollments.filter(e => e.status === 'COMPLETED').length;
  const coursesInProgress = courseEnrollments.filter(e => e.status === 'IN_PROGRESS').length;
  const coursesNotStarted = Math.max(0, accessibleCourses.length - coursesCompleted - coursesInProgress);
  const courseCompletionRate = accessibleCourses.length > 0 ? Math.round((coursesCompleted / accessibleCourses.length) * 100) : 0;
  const courseAvgScore = coursesCompleted > 0 ? Math.round(courseEnrollments.filter(e => e.status === 'COMPLETED').reduce((a, b) => a + (b.score_percent || 0), 0) / coursesCompleted) : 0;

  // Métricas de Checklists
  const userSubmissions = allSubmissions.filter(s => s.user_id === user?.id);
  const checklistsCompleted = userSubmissions.filter(s => s.status === 'COMPLETED').length;
  const checklistsInProgress = userSubmissions.filter(s => s.status === 'IN_PROGRESS').length;
  const activeChecklists = checklists.filter(c => c.status === 'ACTIVE').length;
  const checklistsNotStarted = Math.max(0, activeChecklists - checklistsCompleted - checklistsInProgress);
  const checklistCompletionRate = activeChecklists > 0 ? Math.round((checklistsCompleted / activeChecklists) * 100) : 0;

  const unitLabel = company?.org_unit_name || 'Unidade';
  const org_levels = company?.org_levels?.length ? company.org_levels : [{ id: 'legacy', name: company?.org_top_level_name || 'Regional' }];

  const activeTopLevels = orgTopLevels.filter(t => t.company_id === company?.id && t.active);
  const activeUnits = orgUnits.filter(u => u.company_id === company?.id && u.active);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    avatar_url: '',
    org_unit_id: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        cpf: user.cpf || '',
        avatar_url: user.avatar_url || '',
        org_unit_id: user.org_unit_id || ''
      });
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && company?.id) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 20MB.');
        return;
      }
      
      try {
        toast.loading('Otimizando e enviando imagem...', { id: 'upload' });
        const url = await uploadToSupabase(file, 'assets', `companies/${company.id}/avatars`, 'avatar');
        setFormData(prev => ({ ...prev, avatar_url: url }));
        toast.success('Imagem preparada!', { id: 'upload' });
      } catch (error) {
        console.error('Erro no upload:', error);
        toast.error('Falha ao enviar imagem.', { id: 'upload' });
      }
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !company?.id) return;

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

    try {
      setIsSaving(true);
      await updateSupabaseUser(user.id, {
        name: formData.name,
        email: formData.email,
        cpf: cleanCpf || undefined,
        avatar_url: formData.avatar_url,
        org_unit_id: formData.org_unit_id || undefined // Se vazio, não envia para não quebrar UUID
      });

      await refreshUser(); // Atualiza o estado global do AuthContext
      await mutateUsers();
      toast.success('Perfil atualizado com sucesso!');
      navigate(`/${slug}/home`);
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      toast.error('Ocorreu um erro ao salvar as alterações.');
    } finally {
      setIsSaving(false);
    }
  };

  const getHierarchyPath = () => {
    if (!formData.org_unit_id) return [];
    const unit = activeUnits.find(u => u.id === formData.org_unit_id);
    if (!unit) return [];
    
    const path: { label: string, name: string }[] = [];
    let currentParent = activeTopLevels.find(t => t.id === unit.parent_id);
    
    while (currentParent) {
      const parentDef = org_levels.find(l => l.id === currentParent?.level_id) || org_levels[0];
      path.unshift({ label: parentDef.name, name: currentParent.name });
      currentParent = activeTopLevels.find(t => t.id === currentParent?.parent_id);
    }
    
    path.push({ label: unitLabel, name: unit.name });
    
    return path;
  };

  const hierarchyPath = getHierarchyPath();
  const currentUnit = activeUnits.find(u => u.id === formData.org_unit_id);

  return (
    <div className="pt-24 pb-12 px-4 md:px-12 max-w-4xl mx-auto min-h-screen">
       <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 md:p-12 shadow-2xl relative overflow-hidden">
          
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--c-primary)]/10 via-transparent to-transparent pointer-events-none"></div>

          <form onSubmit={handleSaveChanges} className="relative z-10 flex flex-col items-center w-full">
            
            {/* 1. Foto de Perfil */}
            <div 
              className="relative mb-6 group cursor-pointer" 
              onClick={() => document.getElementById('avatar-upload')?.click()}
              title="Clique para alterar a foto"
            >
              {formData.avatar_url ? (
                 <img src={formData.avatar_url} alt="avatar" className="w-32 h-32 md:w-40 md:h-40 rounded-full border-[6px] shadow-2xl object-cover transition-transform group-hover:scale-105" style={{ borderColor: company?.theme?.background || '#050505' }} />
              ) : (
                 <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-[#111] text-zinc-600 flex items-center justify-center border-[6px] border-[#050505] shadow-2xl transition-transform group-hover:scale-105">
                   <UserCircle size={64} />
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

            <div className="text-center mb-10">
               <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight flex items-center justify-center gap-2 drop-shadow-lg">
                 {user?.name}
               </h1>
               <div className="flex items-center justify-center gap-2 mt-2">
                 <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold bg-zinc-950 px-3 py-1 rounded-full border border-zinc-800">
                    {company?.name}
                 </span>
                 {user?.role === 'ADMIN' && (
                    <span className="flex items-center gap-1 text-[10px] bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full font-bold uppercase border border-blue-500/20">
                       <Shield size={12} /> Admin
                    </span>
                 )}
               </div>

            </div>

            {/* Desempenho Acadêmico - Inline no Header */}
            <div className="w-full grid grid-cols-2 gap-3 mt-2 mb-10 animate-in fade-in slide-in-from-bottom-3 duration-500">
               {/* Cursos Card */}
               <div className="bg-white/[0.03] backdrop-blur-md rounded-2xl p-5 border border-white/5 hover:border-blue-500/20 transition-colors">
                 <div className="flex items-center gap-2 mb-3">
                   <BookOpen size={14} className="text-blue-400" />
                   <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">Cursos</span>
                 </div>
                 <div className="text-3xl font-black text-white tabular-nums mb-1">{courseCompletionRate}<span className="text-lg text-white/30">%</span></div>
                 <div className="flex items-center gap-3 text-[10px] mt-2">
                   <span className="flex items-center gap-1 text-emerald-400 font-bold"><CheckCircle2 size={10}/>{coursesCompleted}</span>
                   <span className="flex items-center gap-1 text-blue-400 font-bold"><Clock size={10}/>{coursesInProgress}</span>
                   <span className="flex items-center gap-1 text-zinc-500 font-bold"><AlertCircle size={10}/>{coursesNotStarted}</span>
                 </div>
                 {courseAvgScore > 0 && (
                   <div className="mt-3 flex items-center gap-2">
                     <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
                       <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500" style={{ width: `${courseAvgScore}%` }} />
                     </div>
                     <span className="text-[10px] font-black text-white/60 tabular-nums">{courseAvgScore}%</span>
                   </div>
                 )}
               </div>

               {/* Checklists Card */}
               <div className="bg-white/[0.03] backdrop-blur-md rounded-2xl p-5 border border-white/5 hover:border-emerald-500/20 transition-colors">
                 <div className="flex items-center gap-2 mb-3">
                   <CheckSquare size={14} className="text-emerald-400" />
                   <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">Checklists</span>
                 </div>
                 <div className="text-3xl font-black text-white tabular-nums mb-1">{checklistCompletionRate}<span className="text-lg text-white/30">%</span></div>
                 <div className="flex items-center gap-3 text-[10px] mt-2">
                   <span className="flex items-center gap-1 text-emerald-400 font-bold"><CheckCircle2 size={10}/>{checklistsCompleted}</span>
                   <span className="flex items-center gap-1 text-blue-400 font-bold"><Clock size={10}/>{checklistsInProgress}</span>
                   <span className="flex items-center gap-1 text-zinc-500 font-bold"><AlertCircle size={10}/>{checklistsNotStarted}</span>
                 </div>
               </div>
            </div>

            {/* 2. Dados Pessoais */}
            <div className="w-full bg-white/5 backdrop-blur-md rounded-2xl p-6 md:p-8 mb-6 border border-white/5 shadow-inner">
               <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2 opacity-80">
                  Dados Pessoais
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
                   <div className="space-y-2 text-left">
                     <label className="text-xs text-zinc-400 font-semibold tracking-wide uppercase">Nome Completo</label>
                     <input 
                       type="text" 
                       value={formData.name} 
                       onChange={(e) => setFormData({...formData, name: e.target.value})} 
                       className="w-full bg-[#050505]/50 border border-white/10 rounded-xl p-3.5 text-white text-sm md:text-base focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all hover:border-white/20"
                       placeholder="Seu nome"
                     />
                  </div>
                  <div className="space-y-2 text-left">
                     <label className="text-xs text-zinc-400 font-semibold tracking-wide uppercase">E-mail</label>
                     <input 
                       type="email" 
                       value={formData.email} 
                       onChange={(e) => setFormData({...formData, email: e.target.value})} 
                       className="w-full bg-[#050505]/50 border border-white/10 rounded-xl p-3.5 text-white text-sm md:text-base focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all hover:border-white/20"
                       placeholder="seu@email.com"
                     />
                  </div>
               </div>
               <div className="space-y-2 text-left">
                  <label className="text-xs text-zinc-400 font-semibold tracking-wide uppercase flex justify-between items-center">
                    CPF
                    <span className="text-[10px] text-zinc-500/80 font-normal normal-case">Não editável</span>
                  </label>
                  <input 
                    type="text" 
                    value={formData.cpf ? formData.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : ''} 
                    readOnly
                    className="w-full bg-black/30 border border-transparent rounded-xl p-3.5 text-zinc-500 text-sm md:text-base cursor-not-allowed focus:outline-none"
                    placeholder="Não cadastrado"
                  />
               </div>
            </div>

            {/* 3. Vínculo Organizacional */}
            <div className="w-full bg-white/5 backdrop-blur-md rounded-2xl p-6 md:p-8 mb-8 border border-white/5 shadow-inner">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2 opacity-80">
                    Vínculo Organizacional
                 </h3>
               </div>

               <div className="mb-6 bg-[#050505]/40 border border-transparent rounded-xl p-5 flex flex-col gap-5">
                  {hierarchyPath.length > 0 ? (
                    hierarchyPath.map((pathItem, idx) => {
                      const isLast = idx === hierarchyPath.length - 1;
                      return (
                        <div key={idx} className="flex items-center gap-4 relative">
                           {idx > 0 && <div className="absolute -top-5 left-[1.35rem] w-px h-6 bg-white/10"></div>}
                           
                           <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${isLast ? 'bg-[#111] border border-[var(--c-primary)]/50 text-[var(--c-primary)]' : 'bg-[#050505] border border-white/5 text-zinc-500'}`}>
                              {isLast ? <Store size={20} /> : <Building2 size={20} />}
                           </div>
                           <div>
                              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-0.5">{pathItem.label}</p>
                              <p className="text-sm md:text-base font-bold text-white">{pathItem.name}</p>
                           </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-zinc-500 text-sm text-center py-4 font-medium">Nenhum vínculo organizacional definido.</div>
                  )}
               </div>
               
               <div className="space-y-2 text-left border-t border-white/5 pt-6">
                  <label className="text-xs text-zinc-400 font-semibold tracking-wide uppercase flex justify-between items-center">
                    {unitLabel} Atual
                    <span className="text-[10px] text-zinc-500/80 font-normal normal-case">Apenas admin pode alterar</span>
                  </label>
                  <input 
                    type="text" 
                    value={currentUnit ? currentUnit.name : ''} 
                    readOnly
                    className="w-full bg-black/20 border border-transparent rounded-xl p-3.5 text-zinc-500 text-sm md:text-base cursor-not-allowed focus:outline-none"
                    placeholder={`Nenhuma ${unitLabel.toLowerCase()} vinculada`}
                  />
               </div>
            </div>


            <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-4 pt-8 border-t border-white/10">
               <button 
                 type="button"
                 onClick={handleLogout}
                 className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 font-semibold transition-all shadow-lg"
               >
                 <LogOut size={18} />
                 Sair da Conta
               </button>

               <button 
                 type="submit"
                 disabled={isSaving}
                 className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-white hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] font-bold transition-all shadow-xl shadow-[var(--c-primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                 style={{ backgroundColor: 'var(--c-primary)' }}
               >
                 {isSaving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                 ) : (
                    <Save size={18} />
                 )}
                 {isSaving ? 'Salvando...' : 'Salvar Alterações'}
               </button>
            </div>

          </form>
       </div>
    </div>
  );
};