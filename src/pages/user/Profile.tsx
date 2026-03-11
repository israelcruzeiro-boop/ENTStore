import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppStore } from '../../store/useAppStore';
import { UserCircle, LogOut, Shield, Store, Building2, Edit2, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const UserProfile = () => {
  const { user, company, logout } = useAuth();
  const navigate = useNavigate();
  const { orgUnits, orgTopLevels, updateUser } = useAppStore();

  const [isEditingUnit, setIsEditingUnit] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState(user?.orgUnitId || '');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSaveUnit = () => {
    if (user) {
      updateUser(user.id, { orgUnitId: selectedUnitId });
      toast.success('Vínculo atualizado com sucesso!');
      setIsEditingUnit(false);
    }
  };

  // Nomenclaturas personalizadas da empresa
  const unitLabel = company?.orgUnitName || 'Unidade';
  const topLevelLabel = company?.orgTopLevelName || 'Nível Superior';

  // Dados da unidade atual vinculada ao usuário
  const currentUnit = orgUnits.find(u => u.id === user?.orgUnitId);
  const currentTopLevel = currentUnit ? orgTopLevels.find(t => t.id === currentUnit.parentId) : null;

  // Lista de unidades e níveis ativos da empresa atual
  const activeTopLevels = orgTopLevels.filter(t => t.companyId === company?.id && t.active);
  const activeUnits = orgUnits.filter(u => u.companyId === company?.id && u.active);

  return (
    <div className="pt-24 pb-12 px-4 md:px-12 max-w-3xl mx-auto min-h-screen">
       <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-3xl p-8 md:p-12 flex flex-col items-center text-center shadow-xl relative overflow-hidden">
          
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--c-primary)]/10 to-transparent pointer-events-none"></div>

          <div className="relative z-10 flex flex-col items-center w-full">
            {user?.avatarUrl ? (
               <img src={user.avatarUrl} alt="avatar" className="w-28 h-28 rounded-full mb-6 border-4 border-zinc-800 shadow-2xl object-cover" />
            ) : (
               <div className="w-28 h-28 rounded-full bg-zinc-950 text-zinc-600 flex items-center justify-center mb-6 border-4 border-zinc-800 shadow-2xl">
                 <UserCircle size={56} />
               </div>
            )}
            <h1 className="text-3xl font-bold text-white mb-1">{user?.name}</h1>
            <p className="text-zinc-400 mb-8 flex items-center gap-2">
               {user?.email}
               {user?.role === 'ADMIN' && (
                  <span className="flex items-center gap-1 text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-bold uppercase">
                     <Shield size={10} /> Admin
                  </span>
               )}
            </p>

            {/* Bloco Empresa */}
            <div className="w-full bg-zinc-950 rounded-2xl p-5 mb-4 flex flex-col items-start text-left border border-zinc-800/80 shadow-inner">
               <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--c-primary)' }}></span> Empresa Logada
               </p>
               <p className="text-white font-medium text-xl">{company?.name}</p>
            </div>

            {/* Bloco Unidade Organizacional */}
            <div className="w-full bg-zinc-950 rounded-2xl p-5 mb-10 flex flex-col items-start text-left border border-zinc-800/80 shadow-inner relative transition-all">
               <div className="flex justify-between items-start w-full mb-3">
                 <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold flex items-center gap-1.5">
                    <Store size={14} className="text-emerald-500" /> Vínculo Organizacional
                 </p>
                 {!isEditingUnit && activeUnits.length > 0 && (
                   <button 
                     onClick={() => setIsEditingUnit(true)} 
                     className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1 text-sm bg-zinc-900 px-3 py-1 rounded-md border border-zinc-800"
                   >
                     <Edit2 size={14} /> Alterar
                   </button>
                 )}
               </div>

               {isEditingUnit ? (
                 <div className="w-full space-y-4 animate-in fade-in zoom-in-95 duration-200">
                   <select 
                     value={selectedUnitId} 
                     onChange={(e) => setSelectedUnitId(e.target.value)}
                     className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)] focus:border-transparent transition-all"
                   >
                     <option value="">Selecione a {unitLabel}</option>
                     {activeTopLevels.map(topLevel => {
                        const unitsInThisLevel = activeUnits.filter(u => u.parentId === topLevel.id);
                        if (unitsInThisLevel.length === 0) return null;
                        return (
                          <optgroup key={topLevel.id} label={`${topLevelLabel}: ${topLevel.name}`} className="bg-zinc-900 text-zinc-400 font-bold">
                            {unitsInThisLevel.map(unit => (
                              <option key={unit.id} value={unit.id} className="text-white font-medium">
                                {unit.name}
                              </option>
                            ))}
                          </optgroup>
                        )
                     })}
                   </select>
                   <div className="flex justify-end gap-2">
                     <button 
                       onClick={() => { setIsEditingUnit(false); setSelectedUnitId(user?.orgUnitId || ''); }} 
                       className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all flex items-center gap-2"
                     >
                       <X size={16} /> Cancelar
                     </button>
                     <button 
                       onClick={handleSaveUnit} 
                       className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-80 transition-all flex items-center gap-2 shadow-lg"
                       style={{ backgroundColor: 'var(--c-primary)' }}
                     >
                       <Save size={16} /> Salvar Vínculo
                     </button>
                   </div>
                 </div>
               ) : (
                 <div className="w-full">
                   {currentUnit ? (
                     <div className="space-y-1.5 mt-1">
                       <div className="flex items-center gap-2 text-white font-medium text-lg">
                         <Store size={18} className="text-zinc-400" />
                         <span className="text-zinc-500 text-sm font-normal">{unitLabel}:</span> 
                         {currentUnit.name}
                       </div>
                       {currentTopLevel && (
                         <div className="flex items-center gap-2 text-zinc-400 font-medium text-sm ml-1 border-l-2 border-zinc-800 pl-3">
                           <Building2 size={16} className="text-zinc-500" />
                           <span className="text-zinc-500 text-xs font-normal">{topLevelLabel}:</span> 
                           {currentTopLevel.name}
                         </div>
                       )}
                     </div>
                   ) : (
                     <p className="text-zinc-500 text-sm mt-1">
                       Nenhuma {unitLabel.toLowerCase()} vinculada no momento.
                     </p>
                   )}
                 </div>
               )}
            </div>

            <button 
               onClick={handleLogout}
               className="w-full sm:w-auto flex items-center justify-center gap-2 px-10 py-3.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white hover:shadow-lg hover:shadow-red-500/20 font-bold transition-all border border-red-500/20"
            >
               <LogOut size={20} />
               Sair da Conta
            </button>
          </div>
       </div>
    </div>
  );
};