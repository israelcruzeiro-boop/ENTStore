import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { authService } from '../services/api';
import { ApiException, tokenStorage } from '../services/api/client';
import { Logger } from '../utils/logger';

type InviteSummary = Awaited<ReturnType<typeof authService.createInviteActivationSession>>;

type InviteStatus = 'idle' | 'loading' | 'invalid' | 'ready' | 'submitting' | 'success';

export const ActivateInvite = () => {
  const params = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Token can come either from the path (/ativar-convite/:token) or from a
  // ?token=... query parameter, which makes it easier to deep link from email.
  const initialTokenRef = useRef(params.token ?? searchParams.get('token') ?? '');

  const [status, setStatus] = useState<InviteStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [summary, setSummary] = useState<InviteSummary | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    orgUnitId: '',
  });

  useEffect(() => {
    const initialToken = initialTokenRef.current;
    if (!initialToken) {
      setStatus('invalid');
      setErrorMessage('Token de ativação ausente.');
      return;
    }

    window.history.replaceState(null, document.title, '/ativar-convite');

    let cancelled = false;
    const lookup = async () => {
      setStatus('loading');
      try {
        const data = await authService.createInviteActivationSession(initialToken);
        if (cancelled) return;
        setSummary(data);
        setFormData((prev) => ({
          ...prev,
          name: data.invite.name ?? '',
          email: data.invite.email ?? '',
          orgUnitId: data.invite.orgUnitId ?? '',
        }));
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof ApiException
            ? translateInviteError(err)
            : 'Não foi possível validar o convite.';
        Logger.warn('Invite lookup failed', err);
        setErrorMessage(message);
        setStatus('invalid');
      }
    };

    void lookup();
    return () => {
      cancelled = true;
    };
  }, []);

  const tenantSlug = useMemo(() => {
    if (!summary?.company) return null;
    return summary.company.linkName ?? summary.company.slug ?? null;
  }, [summary]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!summary) return;

    if (!formData.email.trim()) {
      setErrorMessage('Informe um e-mail válido.');
      return;
    }
    if (formData.password.length < 8) {
      setErrorMessage('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('As senhas não coincidem.');
      return;
    }

    setErrorMessage('');
    setStatus('submitting');
    try {
      const session = await authService.activateInvite({
        email: formData.email.trim(),
        name: formData.name.trim() || undefined,
        password: formData.password,
        orgUnitId: formData.orgUnitId || summary.invite.orgUnitId || null,
      });

      tokenStorage.set(session.accessToken);
      setStatus('success');

      // Bounce the user into their tenant area when we know the slug; otherwise
      // send them to the global login so AuthContext can rebuild from /auth/me.
      const targetSlug = tenantSlug ?? '';
      window.setTimeout(() => {
        if (targetSlug) {
          navigate(`/${targetSlug}/home`, { replace: true });
        } else {
          navigate('/login', { replace: true });
        }
      }, 1200);
    } catch (err) {
      const message =
        err instanceof ApiException ? translateInviteError(err) : 'Falha ao ativar o convite.';
      Logger.error('Invite activation failed', err);
      setErrorMessage(message);
      setStatus('ready');
    }
  };

  if (status === 'loading' || status === 'idle') {
    return (
      <CenteredShell>
        <div className="flex flex-col items-center gap-4 text-zinc-300">
          <Loader2 className="animate-spin" size={32} />
          <p className="text-sm">Validando convite...</p>
        </div>
      </CenteredShell>
    );
  }

  if (status === 'invalid' || !summary) {
    return (
      <CenteredShell>
        <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/5 p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4">
            <AlertTriangle size={28} className="text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Convite indisponível</h1>
          <p className="text-sm text-zinc-400 mb-6">{errorMessage || 'Token inválido ou expirado.'}</p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="px-5 py-2.5 rounded-xl bg-zinc-800 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
          >
            Ir para o login
          </button>
        </div>
      </CenteredShell>
    );
  }

  if (status === 'success') {
    return (
      <CenteredShell>
        <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/5 p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4">
            <CheckCircle2 size={28} className="text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Conta ativada</h1>
          <p className="text-sm text-zinc-400">Você será redirecionado em instantes.</p>
        </div>
      </CenteredShell>
    );
  }

  const submitting = status === 'submitting';
  const companyName = summary.company?.name ?? 'sua empresa';

  return (
    <CenteredShell>
      <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/5 p-8 md:p-10">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3">
            <ShieldCheck size={26} className="text-indigo-300" />
          </div>
          <h1 className="text-xl font-bold text-white">Bem-vindo(a) à {companyName}</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Defina sua senha e confirme seus dados para concluir a ativação.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/40 text-red-300 text-sm text-center font-medium">
              {errorMessage}
            </div>
          )}

          <Field label="Nome completo">
            <input
              type="text"
              value={formData.name}
              onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              className="auth-input"
              required
            />
          </Field>

          <Field label="E-mail">
            <input
              type="email"
              value={formData.email}
              onChange={(event) => setFormData({ ...formData, email: event.target.value })}
              className="auth-input"
              required
            />
          </Field>

          <Field label="Nova senha" icon={<KeyRound size={12} />}>
            <input
              type="password"
              value={formData.password}
              onChange={(event) => setFormData({ ...formData, password: event.target.value })}
              className="auth-input"
              minLength={8}
              required
            />
          </Field>

          <Field label="Confirmar senha" icon={<KeyRound size={12} />}>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(event) => setFormData({ ...formData, confirmPassword: event.target.value })}
              className="auth-input"
              minLength={8}
              required
            />
          </Field>

          {summary.availableUnits.length > 0 && (
            <Field label="Unidade base">
              <select
                value={formData.orgUnitId}
                onChange={(event) => setFormData({ ...formData, orgUnitId: event.target.value })}
                className="auth-input cursor-pointer"
              >
                <option value="">Selecione...</option>
                {summary.availableUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-500 text-white font-bold transition-all hover:bg-indigo-400 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
            {submitting ? 'Ativando...' : 'Ativar minha conta'}
          </button>
        </form>
      </div>

      <style>{`
        .auth-input {
          width: 100%;
          background-color: rgba(9, 9, 11, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          color: #fafafa;
          font-size: 0.875rem;
          transition: all 0.15s ease;
        }
        .auth-input:focus {
          outline: none;
          border-color: rgba(99, 102, 241, 0.5);
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
        }
      `}</style>
    </CenteredShell>
  );
};

const Field = ({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="space-y-1.5 text-left">
    <label className="text-xs text-zinc-400 font-medium ml-1 flex items-center gap-1.5">
      {icon}
      {label}
    </label>
    {children}
  </div>
);

const CenteredShell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 py-10">
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full opacity-20 bg-indigo-500" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full opacity-20 bg-blue-500" />
    </div>
    <div className="relative z-10 w-full flex justify-center">{children}</div>
  </div>
);

function translateInviteError(error: ApiException): string {
  switch (error.code) {
    case 'INVITE_INVALID':
      return 'Convite inválido ou já utilizado.';
    case 'INVITE_EXPIRED':
      return 'Este convite expirou. Solicite um novo ao administrador.';
    case 'INVITE_PENDING_ACTIVATION':
      return 'Convite ainda pendente. Tente novamente em instantes.';
    case 'INVALID_PAYLOAD':
      return 'Dados inválidos. Confira os campos e tente novamente.';
    default:
      return error.message || 'Não foi possível concluir a operação.';
  }
}

export default ActivateInvite;
