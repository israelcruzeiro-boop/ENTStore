import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCompanies } from '../hooks/useSupabaseData';
import { useNavigate, useParams } from 'react-router-dom';
import { ShieldAlert, Building, User as UserIcon, AlertTriangle, Loader2 } from 'lucide-react';

export const Login = () => {
  const { login, user } = useAuth();
  const { companies, isLoading: companiesLoading } = useCompanies();
  const navigate = useNavigate();
  const { companySlug } = useParams();

  const tenantCompany = companySlug ? companies.find(c => c.link_name === companySlug || c.slug === companySlug) : null;

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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
    // Só redireciona se tiver usuário e a lista de empresas já tiver carregado (evita loop)
    if (user && !companiesLoading) {
      if (user.role === 'SUPER_ADMIN') {
        navigate('/super-admin', { replace: true });
      } else if (user.role === 'ADMIN') {
        const adminCompany = companies.find(c => c.id === user.company_id);
        if (adminCompany) navigate(`/admin/${adminCompany.slug}`, { replace: true });
      } else {
        const userCompany = companies.find(c => c.id === user.company_id);
        const slugPrefix = companySlug || tenantCompany?.slug || userCompany?.slug;
        if (slugPrefix) navigate(`/${slugPrefix}/home`, { replace: true });
      }
    }
  }, [user, navigate, companies, companiesLoading, companySlug, tenantCompany]);

  // Fallback visual caso a empresa do slug não exista
  if (companySlug && !tenantCompany) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-20 h-20 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6">
          <AlertTriangle size={36} className="text-zinc-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Empresa não encontrada</h2>
        <p className="text-zinc-400 max-w-sm mb-8">
          O endereço <strong>{companySlug}</strong> não corresponde a nenhuma empresa ativa no momento.
        </p>
        <button onClick={() => navigate('/login')} className="px-6 py-2.5 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors">
          Acessar Login Global
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);

    try {
      // Passa o ID da empresa alvo para blindar a autenticação no tenant correto
      const loggedUser = await login(identifier, password, tenantCompany?.id);

      if (loggedUser) {
        if (loggedUser.role === 'SUPER_ADMIN') {
          navigate('/super-admin');
        } else if (loggedUser.role === 'ADMIN') {
          const adminCompany = companies.find(c => c.id === loggedUser.company_id);
          if (adminCompany) {
            navigate(`/admin/${adminCompany.slug}`);
          } else {
            setError('Empresa não encontrada ou inativa.');
          }
        } else {
          const userCompany = companies.find(c => c.id === loggedUser.company_id);
          const slugPrefix = companySlug || tenantCompany?.slug || userCompany?.slug;
          if (slugPrefix) navigate(`/${slugPrefix}/home`);
        }
      } else {
        setError('E-mail/CPF ou senha incorretos, ou conta inativa.');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError('Ocorreu um erro ao tentar entrar. Tente novamente.');
    } finally {
      setIsLoggingIn(false);
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

          {tenantCompany ? (
            <div className="mb-8 flex flex-col items-center">
              {tenantCompany.logo_url ? (
                <img 
                  src={tenantCompany.logo_url} 
                  alt={tenantCompany.name} 
                  className="w-32 h-32 md:w-44 md:h-44 rounded-full object-cover shadow-2xl border-2 border-white/20" 
                />
              ) : (
                <div className="w-32 h-32 md:w-44 md:h-44 rounded-full flex items-center justify-center text-white font-black text-5xl md:text-6xl shadow-2xl border-2 border-white/20" style={{ backgroundColor: 'var(--c-primary)' }}>
                  {tenantCompany.name.charAt(0).toUpperCase()}
                </div>
              )}
              <h1 className="text-lg font-black mt-6 opacity-90 uppercase tracking-[0.2em]" style={{ color: 'var(--c-text, #fff)' }}>{tenantCompany.name}</h1>
            </div>
          ) : (
            <div className="mb-8 flex justify-center">
              <img 
                src="https://ik.imagekit.io/lflb43qwh/StorePage/StorePage.png" 
                alt="STORE PAGE" 
                className="w-32 h-32 md:w-44 md:h-44 rounded-full object-cover shadow-2xl border-2 border-white/20 transition-transform hover:scale-105 duration-300" 
                onError={(e) => {
                  // Fallback final apenas para lidar com quebra na renderização se o cache falhar
                  const target = e.target as HTMLImageElement;
                  if (!target.src.includes('StorePage.png')) {
                     target.src = "https://ik.imagekit.io/lflb43qwh/StorePage/StorePage.png";
                  }
                  target.onerror = null;
                }}
              />
            </div>
          )}

          {!tenantCompany && (
            <p className="text-sm mt-2 opacity-50 text-center" style={{ color: 'var(--c-text, #a1a1aa)' }}>Plataforma de Armazenamento de Mídias</p>
          )}

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
            disabled={isLoggingIn}
            className="w-full flex justify-center items-center gap-2 font-medium py-3 rounded-xl shadow-lg transition-all active:scale-[0.98] mt-4 text-white disabled:opacity-70 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--c-primary, #2563eb)' }}
          >
            {isLoggingIn ? <><Loader2 size={20} className="animate-spin" /> Entrando...</> : 'Entrar na Plataforma'}
          </button>
        </form>

      </div>
    </div>
  );
};