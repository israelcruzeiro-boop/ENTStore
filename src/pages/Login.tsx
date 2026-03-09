import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MOCK_USERS } from '../data/mock';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (userId: string, role: string) => {
    login(userId);
    if (role === 'SUPER_ADMIN') navigate('/super-admin');
    else if (role === 'ADMIN') navigate('/admin');
    else navigate('/');
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden border border-zinc-800">
        <div className="p-8 text-center border-b border-zinc-800">
          <h1 className="text-3xl font-bold text-white mb-2">[NOME] <span className="text-blue-500">Store</span></h1>
          <p className="text-zinc-400">Ambiente de Demonstração (Mock)</p>
        </div>
        
        <div className="p-8">
          <h2 className="text-zinc-300 font-medium mb-6 text-sm uppercase tracking-wider text-center">Entrar como:</h2>
          
          <div className="space-y-4">
            {MOCK_USERS.map(user => (
              <button
                key={user.id}
                onClick={() => handleLogin(user.id, user.role)}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-zinc-800 hover:border-zinc-600 bg-zinc-800/50 hover:bg-zinc-800 transition-all group"
              >
                <div className="text-left">
                  <div className="font-medium text-white group-hover:text-blue-400 transition-colors">{user.name}</div>
                  <div className="text-xs text-zinc-500">{user.email}</div>
                </div>
                <div className="text-xs font-mono px-2 py-1 bg-zinc-950 rounded text-zinc-400">
                  {user.role}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};