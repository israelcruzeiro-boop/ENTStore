import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User, Company, UserRole } from '../types';
import { supabase } from '../lib/supabaseClient';
import { maskCPF } from '../hooks/useSupabaseData';
import { toast } from 'sonner';
import { Logger } from '../utils/logger';

interface AuthContextType {
  user: User | null;
  company: Company | null;
  loading: boolean;
  login: (identifier: string, pass: string, targetCompanyId?: string) => Promise<User | null>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  // Ref para o callback do listener sempre ler o valor mais recente do state
  const userRef = useRef<User | null>(null);
  const mountedRef = useRef(true);

  // Sincroniza ref com state
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Busca o perfil completo do usuário no public.users via Supabase
  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, email, cpf, role, company_id, org_unit_id, org_top_level_id, avatar_url, active, first_access, status, xp_total, coins_total, created_at')
        .eq('id', userId)
        .single();

      if (userError) {
        Logger.error('Core Auth Error [User Fetch]:', JSON.stringify(userError, null, 2));
        return null;
      }

      if (!userData) {
        Logger.error('User not found in public.users for ID:', userId);
        return null;
      }

      let companyData = null;

      if (userData.company_id) {
        const { data: compData, error: compError } = await supabase
          .from('companies')
          .select('id, name, slug, link_name, theme, logo_url, hero_image, hero_title, hero_subtitle, hero_position, hero_brightness, public_bio, active, checklists_enabled, landing_page_enabled, landing_page_active, landing_page_layout, org_unit_name, org_top_level_name, org_levels')
          .eq('id', userData.company_id)
          .single();
        
        if (compError) {
          Logger.error('Core Auth Error [Company Fetch]:', JSON.stringify(compError, null, 2));
          // Fallback para resolver o objeto company como nulo em vez de travar
          companyData = null;
        } else {
          companyData = compData;
        }
      }

      const rawRole = (userData.role || 'USER').toUpperCase();
      const finalRole = (rawRole === 'MAESTRO' ? 'SUPER_ADMIN' : rawRole) as UserRole;

      return { 
        user: { 
          ...userData, 
          role: finalRole,
          cpf_raw: userData.cpf,
          cpf: maskCPF(userData.cpf)
        } as User, 
        company: companyData as Company 
      };
    } catch (err) {
      Logger.error('Critical Auth Exception:', err);
      return null;
    }
  }, []);

  // Carrega ou atualiza o perfil de forma segura (fora de callbacks do Supabase)
  const loadProfile = useCallback(async (userId: string, showLoading: boolean) => {
    if (showLoading && mountedRef.current) {
      setLoading(true);
    }

    const profile = await fetchUserProfile(userId);
    
    if (mountedRef.current) {
      if (profile) {
        setUser(profile.user);
        setCompany(profile.company);
      } else {
        // Se falhou mas já temos user, mantemos (resiliência)
        const currentUser = userRef.current;
        if (!currentUser) {
          Logger.warn('Profile fetch failed, no existing user. Clearing session to stop loop.');
          setUser(null);
          setCompany(null);
        } else {
          Logger.warn('Profile fetch failed but keeping current session for stability.');
        }
      }
      setLoading(false);
    }
  }, [fetchUserProfile]);

  useEffect(() => {
    mountedRef.current = true;

    // 1. SESSÃO INICIAL: usa getSession() (NÃO bloqueia o auth lock)
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          Logger.info('Initial session found for:', session.user.email);
          await loadProfile(session.user.id, false); // loading já começa true
        } else {
          Logger.info('No initial session.');
          if (mountedRef.current) {
            setUser(null);
            setCompany(null);
            setLoading(false);
          }
        }
      } catch (err) {
        Logger.error('Error getting initial session:', err);
        if (mountedRef.current) setLoading(false);
      }
    };

    initSession();

    // 2. LISTENER: para eventos SUBSEQUENTES (login, logout, token refresh)
    // IMPORTANTE: NÃO faz await de queries de banco DENTRO do callback 
    // para evitar deadlock com o auth lock do Supabase.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = userRef.current;
      Logger.info(`Auth Event: ${event} | Has User: ${currentUser?.id ? 'Yes' : 'No'} | Session: ${session?.user?.email || 'none'}`);

      // INITIAL_SESSION já foi tratada pelo getSession() acima — ignora
      if (event === 'INITIAL_SESSION') {
        return;
      }

      if (event === 'SIGNED_OUT') {
        if (mountedRef.current) {
          setUser(null);
          setCompany(null);
          setLoading(false);
        }
        return;
      }

      if (session?.user) {
        // Se já temos o mesmo user, nada muda (troca de aba, token refresh silencioso)
        if (currentUser && currentUser.id === session.user.id && event !== 'USER_UPDATED') {
          Logger.info('Same user session, skipping profile reload.');
          if (mountedRef.current) setLoading(false);
          return;
        }

        // Novo login ou user atualizado — carrega perfil FORA do callback via setTimeout
        // Isso evita o deadlock do auth lock do Supabase
        setTimeout(() => {
          loadProfile(session.user.id, !currentUser);
        }, 0);
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const login = async (identifier: string, pass: string, targetCompanyId?: string): Promise<User | null> => {
    setLoading(true);
    try {
      const emailToUse = identifier.includes('@') ? identifier.trim() : `${identifier.trim()}@storepage.com`;
      
      let { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: pass
      });

      // Lógica resiliente: se der erro de credenciais, tenta dar signUp para sincronizar 
      if (error && error.message.includes('Invalid login credentials')) {
        // Use RPC to bypass RLS since unauthenticated users cannot read public.users
        const { data: publicUser } = await supabase.rpc('get_provisioned_user', { lookup_email: emailToUse });
        
        if (publicUser) {
          Logger.info("Usuário provisionado detectado, criando conta de autenticação...");
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: emailToUse,
            password: pass,
            options: { 
              data: { 
                name: publicUser.name, 
                role: publicUser.role,
                is_provisioned: true 
              } 
            }
          });

          if (signUpError) {
            Logger.error("SignUp Error (Provisioned):", signUpError.message);
            toast.error(`Sua conta está provisionada mas houve um erro ao ativá-la: ${signUpError.message}`);
          } else if (signUpData.user) {
            // Pequeno delay para o trigger handle_new_user terminar no banco
            await new Promise(resolve => setTimeout(resolve, 800));
            const retry = await supabase.auth.signInWithPassword({ email: emailToUse, password: pass });
            data = retry.data;
            error = retry.error;
          }
        }
      }

      if (error || !data.user) {
        if (error) Logger.error("Supabase Auth Error:", error.message);
        setLoading(false);
        return null;
      }

      // Login direto: fetch do perfil aqui (fora do listener, sem deadlock)
      const profile = await fetchUserProfile(data.user.id);
      if (profile) {
        if (targetCompanyId && profile.user.role !== 'SUPER_ADMIN' && profile.user.company_id !== targetCompanyId) {
           await logout();
           setLoading(false);
           return null;
        }
        setUser(profile.user);
        setCompany(profile.company);
        setLoading(false);
        return profile.user;
      }
      
      setLoading(false);
      return null;
    } catch (err) {
      Logger.error("Login catch error:", err);
      setLoading(false);
      return null;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCompany(null);
    localStorage.removeItem('storepage_auth_user');
  };

  const refreshUser = async () => {
    if (user?.id) {
      const profile = await fetchUserProfile(user.id);
      if (profile) {
        setUser(profile.user);
        setCompany(profile.company);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, company, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};