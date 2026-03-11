import { useAuth } from '../../contexts/AuthContext';
import { UserCircle, LogOut, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const UserProfile = () => {
  const { user, company, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="pt-24 pb-12 px-4 md:px-12 max-w-3xl mx-auto min-h-screen">
       <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-3xl p-8 md:p-12 flex flex-col items-center text-center shadow-xl relative overflow-hidden">
          
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--c-primary)]/10 to-transparent pointer-events-none"></div>

          <div className="relative z-10 flex flex-col items-center">
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

            <div className="w-full bg-zinc-950 rounded-2xl p-5 mb-10 flex flex-col items-start text-left border border-zinc-800/80 shadow-inner">
               <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Vinculado à Empresa
               </p>
               <p className="text-white font-medium text-xl">{company?.name}</p>
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