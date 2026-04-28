import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { authService } from '../../services/api';
import { ApiException } from '../../services/api/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Save, UserCircle, KeyRound, Loader2 } from 'lucide-react';
import { Logger } from '../../utils/logger';

/**
 * Legacy first-access flow.
 *
 * On Phase 1 the backend rejects login when `firstAccess=true`
 * (HTTP 409 INVITE_PENDING_ACTIVATION) and forces the user through the
 * /auth/invites/activate flow. This modal therefore only ever shows up for
 * legacy users still flagged with `first_access=true` in the database.
 *
 * It now restricts itself to the fields the backend actually persists via
 * /auth/profile and /auth/password (name, email, password). Anything that the
 * Phase 1 contract does not expose — org unit, avatar upload — was removed so
 * the user is not asked to fill data that would be silently dropped.
 */
export const FirstAccessModal = () => {
  const { user, company, refreshUser } = useAuth();
  const { slug } = useTenant();
  const navigate = useNavigate();

  const [isVisible, setIsVisible] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    currentPassword: '',
    password: '',
    confirmPassword: '',
  });

  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !company) return;

    if (!formData.name.trim()) return toast.error('Informe seu nome completo.');
    if (!formData.email.trim()) return toast.error('O preenchimento do E-mail é obrigatório.');
    if (!formData.currentPassword) return toast.error('Informe sua senha atual.');
    if (formData.password.length < 8) return toast.error('A nova senha deve ter pelo menos 8 caracteres.');
    if (formData.password !== formData.confirmPassword) return toast.error('As senhas não coincidem. Tente novamente.');

    try {
      setIsSaving(true);

      await authService.updatePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.password,
      });

      await authService.updateProfile({
        name: formData.name.trim(),
        email: formData.email.trim(),
      });

      await refreshUser();

      toast.success('Perfil configurado! Bem-vindo(a).');
      setIsVisible(false);
      navigate(`/${slug}/home`);
    } catch (err) {
      const message =
        err instanceof ApiException ? err.message : 'Erro inesperado ao salvar o perfil.';
      Logger.error('Setup error', err);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
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
            <div className="mb-6">
              <div className="w-24 h-24 rounded-full bg-zinc-950 text-[var(--c-primary)] flex items-center justify-center border-4 border-zinc-800 shadow-xl">
                <UserCircle size={48} />
              </div>
            </div>

            <div className="w-full space-y-4">
              <div className="space-y-1.5 text-left">
                 <label className="text-xs text-zinc-400 font-medium ml-1">Nome Completo *</label>
                 <input
                   type="text"
                   value={formData.name}
                   onChange={(e) => setFormData({...formData, name: e.target.value})}
                   className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)] focus:border-transparent transition-all"
                   placeholder="Seu nome completo"
                   required
                 />
              </div>

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
                 <label className="text-xs text-zinc-400 font-medium ml-1 flex items-center gap-1.5"><KeyRound size={12}/> Senha Atual *</label>
                 <input
                   type="password"
                   value={formData.currentPassword}
                   onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                   className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)] focus:border-transparent transition-all"
                   placeholder="Sua senha atual"
                   required
                 />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-1.5 text-left">
                    <label className="text-xs text-zinc-400 font-medium ml-1 flex items-center gap-1.5"><KeyRound size={12}/> Nova Senha *</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)] focus:border-transparent transition-all"
                      placeholder="Mínimo 8 caracteres"
                      minLength={8}
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
                      minLength={8}
                      required
                    />
                 </div>
              </div>
            </div>

            <button 
               type="submit"
               disabled={isSaving}
               className="w-full mt-8 flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
               style={{ backgroundColor: 'var(--c-primary)' }}
            >
               {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
               {isSaving ? 'Configurando...' : 'Salvar e Acessar Plataforma'}
            </button>
          </form>
       </div>
    </div>
  );
};