import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../store/useAppStore';
import { useNavigate, useParams } from 'react-router-dom';
import { ShieldAlert, Building, User as UserIcon, AlertTriangle } from 'lucide-react';

export const Login = () => {
  const { login, user } = useAuth();
  const { companies } = useAppStore();
  const navigate = useNavigate();
  const { companySlug } = useParams();
  
  const tenantCompany = companySlug ? companies.find(c => c.linkName === companySlug || c.slug === companySlug) : null;
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Fallback para login global: reseta o tema (o TenantProvider já gerencia isso no slug)
  useEffect(() => {
    if (!tenantCompany) {
      const root = document.documentElement;
      root.style.setProperty('--c-primary', '#3b82f6');
      root.style.setProperty('--c-secondary', '#1d4ed8');
      root.style.setProperty('--c-bg', '#09090b');
      root.style.setProperty('--c-card', '#18181b');
      root.style.setProperty('--c-text', '#ffffff');
    }
  }, [tenantCompany]);

  // Auto-redirecionamento se a sessão já existir
  useEffect(() => {
    if (user) {
      if (user.role === 'SUPER_ADMIN') {
        navigate('/super-admin', { replace: true });
      } else if (user.role === 'ADMIN') {
        const adminCompany = companies.find(c => c.id === user.companyId);
        if (adminCompany) navigate(`/admin/${adminCompany.linkName}`, { replace: true });
      } else {
        navigate(`/${companySlug || tenantCompany?.linkName || ''}/home`, { replace: true });
      }
    }
  }, [user, navigate, companies, companySlug, tenantCompany]);

  // Fallback visual caso a empresa do slug não exista
  if (companySlug && !tenantCompany) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-center">
         <div className="w-20 h-20 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6">
            <AlertTriangle size={36} className="text-zinc-500" />
         </div>
         <h1 className="text-2xl font-bold text-white mb-2">Empresa não encontrada</h1>
         <p className="text-zinc-400 max-w-sm mb-8">
            O endereço <strong>{companySlug}</strong> não corresponde a nenhuma empresa ativa no momento.
         </p>
         <button onClick={() => navigate('/login')} className="px-6 py-2.5 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors">
            Acessar Login Global
         </button>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Passa o ID da empresa alvo para blindar a autenticação no tenant correto
    const loggedUser = login(identifier, password, tenantCompany?.id);
    
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
        navigate(`/${companySlug || tenantCompany?.linkName}/home`);
      }
    } else {
      setError('E-mail/CPF ou senha incorretos, ou conta inativa.');
    }
  };

  const fillCredentials = (testId: string, testPass: string) => {
    setIdentifier(testId);
    setPassword(testPass);
    setError('');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-500" style={{ backgroundColor: tenantCompany ? 'var(--c-bg)' : '#09090b' }}>
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full pointer-events-none opacity-20" style={{ backgroundColor: 'var(--c-primary, #2563eb)' }}></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full pointer-events-none opacity-20" style={{ backgroundColor: 'var(--c-secondary, #9333ea)' }}></div>

      <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/5 p-8 md:p-10 relative z-10" style={{ backgroundColor: tenantCompany ? 'var(--c-card)' : 'rgba(24, 24, 27, 0.8)' }}>
        
        <div className="flex flex-col items-center mb-8">
          {tenantCompany ? (
            <>
               {tenantCompany.logoUrl ? (
                  <img src={tenantCompany.logoUrl} alt={tenantCompany.name} className="w-28 h-28 mb-5 rounded-full object-cover shadow-xl border border-white/10 bg-black/20" />
               ) : (
                  <div className="w-28 h-28 rounded-full mb-5 flex items-center justify-center text-white font-bold text-4xl shadow-xl border border-white/10" style={{ backgroundColor: 'var(--c-primary)' }}>
                    {tenantCompany.name.charAt(0).toUpperCase()}
                  </div>
               )}
               <h1 className="text-2xl font-bold tracking-tight text-center" style={{ color: 'var(--c-text, #fff)' }}>{tenantCompany.name}</h1>
            </>
          ) : (
            <>
              <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-zinc-700 shadow-xl mb-5 bg-zinc-800 flex items-center justify-center text-white font-bold text-2xl">
                ENT
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">ENT<span className="text-blue-500">Store</span></h1>
            </>
          )}
          <p className="text-sm mt-1 opacity-70" style={{ color: 'var(--c-text, #a1a1aa)' }}>Acesse sua conta corporativa</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-500 text-sm text-center font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium ml-1 opacity-80" style={{ color: 'var(--c-text, #d4d4d8)' }}>E-mail ou CPF</label>
            <input 
              type="text" 
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="seu@email.com ou 000.000.000-00"
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:border-transparent transition-all placeholder:opacity-50"
              style={{ color: 'var(--c-text, #fff)', '--tw-ring-color': 'var(--c-primary, #3b82f6)' } as React.CSSProperties}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium ml-1 opacity-80" style={{ color: 'var(--c-text, #d4d4d8)' }}>Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:border-transparent transition-all placeholder:opacity-50"
              style={{ color: 'var(--c-text, #fff)', '--tw-ring-color': 'var(--c-primary, #3b82f6)' } as React.CSSProperties}
              required
            />
          </div>

          <button 
            type="submit"
            className="w-full font-medium py-3 rounded-xl shadow-lg transition-all active:scale-[0.98] mt-4 text-white"
            style={{ backgroundColor: 'var(--c-primary, #2563eb)' }}
          >
            Entrar na Plataforma
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10">
           <p className="text-xs text-center mb-4 uppercase tracking-widest font-semibold opacity-60" style={{ color: 'var(--c-text, #a1a1aa)' }}>
             Acessos Rápidos de Teste
           </p>
           <div className="flex flex-col gap-2.5">
              {!tenantCompany && (
                 <button type="button" onClick={() => fillCredentials('sadmin@entstore.com', '123456')} className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-white/10 bg-black/20 hover:bg-black/40 text-sm transition-colors opacity-80 hover:opacity-100" style={{ color: 'var(--c-text, #d4d4d8)' }}>
                    <ShieldAlert size={16} /> Preencher Super Admin
                 </button>
              )}
              
              <button type="button" onClick={() => fillCredentials('admin@entstore.com', '123456')} className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-white/10 bg-black/20 hover:bg-black/40 text-sm transition-colors opacity-80 hover:opacity-100" style={{ color: 'var(--c-text, #d4d4d8)' }}>
                 <Building size={16} /> Preencher Admin {tenantCompany ? `(${tenantCompany.name})` : '(Acme)'}
              </button>

              <button type="button" onClick={() => fillCredentials('user@entstore.com', '123456')} className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-white/10 bg-black/20 hover:bg-black/40 text-sm transition-colors opacity-80 hover:opacity-100" style={{ color: 'var(--c-text, #d4d4d8)' }}>
                 <UserIcon size={16} /> Preencher Usuário Final
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};