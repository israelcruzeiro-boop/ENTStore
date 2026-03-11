import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Building, User as UserIcon } from 'lucide-react';

export const Login = () => {
  const { login } = useAuth();
  const { companies } = useAppStore();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const loggedUser = login(email, password);
    
    if (loggedUser) {
      if (loggedUser.role === 'SUPER_ADMIN') {
        navigate('/super-admin');
      } else if (loggedUser.role === 'ADMIN') {
        const adminCompany = companies.find(c => c.id === loggedUser.companyId);
        if (adminCompany) {
           navigate(`/admin/${adminCompany.linkName}`);
        } else {
           setError('Empresa não encontrada ou inativa.');
        }
      } else {
        navigate('/');
      }
    } else {
      setError('E-mail ou senha incorretos, ou conta inativa.');
    }
  };

  const fillCredentials = (testEmail: string, testPass: string) => {
    setEmail(testEmail);
    setPassword(testPass);
    setError('');
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-zinc-800/50 p-8 md:p-10 relative z-10">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-zinc-700 shadow-xl mb-4 bg-zinc-800 flex items-center justify-center text-white font-bold text-xl">
            ENT
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">ENT<span className="text-blue-500">Store</span></h1>
          <p className="text-sm text-zinc-400 mt-1">Acesse sua conta corporativa</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-300 ml-1">E-mail corporativo</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-300 ml-1">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] mt-4"
          >
            Entrar na Plataforma
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-800/50">
           <p className="text-xs text-zinc-500 text-center mb-4 uppercase tracking-widest font-semibold">
             Acessos Rápidos de Teste
           </p>
           <div className="flex flex-col gap-2.5">
              <button 
                type="button" 
                onClick={() => fillCredentials('sadmin@entstore.com', '123456')}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-zinc-700 bg-zinc-800/40 hover:bg-zinc-700 hover:text-white text-zinc-400 text-sm transition-colors"
              >
                 <ShieldAlert size={16} /> Preencher Super Admin
              </button>
              
              <button 
                type="button" 
                onClick={() => fillCredentials('admin@entstore.com', '123456')}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-zinc-700 bg-zinc-800/40 hover:bg-zinc-700 hover:text-white text-zinc-400 text-sm transition-colors"
              >
                 <Building size={16} /> Preencher Admin (Acme)
              </button>

              <button 
                type="button" 
                onClick={() => fillCredentials('user@entstore.com', '123456')}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-zinc-700 bg-zinc-800/40 hover:bg-zinc-700 hover:text-white text-zinc-400 text-sm transition-colors"
              >
                 <UserIcon size={16} /> Preencher Usuário Final
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};