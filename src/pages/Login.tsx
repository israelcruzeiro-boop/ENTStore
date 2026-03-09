import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MOCK_COMPANIES } from '../data/mock';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Em um ambiente real, a logo viria através de um slug na URL (ex: acme.entstore.com)
  // Como é um mock, vamos usar a logo da primeira empresa cadastrada como demonstração.
  const companyLogo = MOCK_COMPANIES[0].logoUrl;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const success = login(email, password);
    
    if (success) {
      // O redirect adequado é feito pelas rotas no App.tsx ou podemos forçar aqui
      // Vamos direcionar baseado no email para facilitar a demonstração
      if (email === 'sadmin@entstore.com') navigate('/super-admin');
      else if (email === 'admin@entstore.com') navigate('/admin');
      else navigate('/');
    } else {
      setError('E-mail ou senha incorretos.');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-zinc-800/50 p-8 md:p-10 relative z-10">
        
        {/* Logo Circular */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-zinc-700 shadow-xl mb-4 bg-zinc-800 flex items-center justify-center">
            {companyLogo ? (
              <img src={companyLogo} alt="Company Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-zinc-500">Logo</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">ENT<span className="text-blue-500">Store</span></h1>
          <p className="text-sm text-zinc-400 mt-1">Acesse sua conta</p>
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
              placeholder="exemplo@entstore.com"
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
           <p className="text-xs text-zinc-500 text-center mb-2 uppercase tracking-widest font-semibold">Credenciais de Teste</p>
           <div className="text-xs text-zinc-400 flex flex-col items-center gap-1 font-mono">
              <span>user@entstore.com</span>
              <span>admin@entstore.com</span>
              <span>sadmin@entstore.com</span>
              <span className="mt-2 font-sans bg-zinc-800 px-2 py-1 rounded text-zinc-300">Senha: 123456</span>
           </div>
        </div>

      </div>
    </div>
  );
};