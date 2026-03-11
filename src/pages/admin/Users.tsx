import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CheckCircle2, XCircle, Edit2, Trash2, Shield, User as UserIcon, Users, Activity, Eye, BookOpen, Calendar } from 'lucide-react';
import { User } from '../../types';

export const AdminUsers = () => {
  const { linkName } = useParams();
  const { user: currentUser } = useAuth();
  const { companies, users, addUser, updateUser, deleteUser, toggleUserStatus, contentViews, contents, simpleLinks, repositories } = useAppStore();
  
  const company = companies.find(c => c.linkName === linkName);
  
  // Filtra apenas usuários dessa empresa
  const companyUsers = users.filter(u => u.companyId === company?.id)
                            .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER' as 'ADMIN' | 'USER',
    active: true
  });

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{id: string, name: string} | null>(null);

  // Estados e cálculos para as Métricas de Atividade
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const userMetrics = useMemo(() => {
    if (!selectedUser) return null;
    const views = contentViews.filter(v => v.userId === selectedUser.id);
    
    let lastAccess = '';
    const contentMap = new Map<string, any>();

    views.forEach(v => {
      if (!lastAccess || new Date(v.viewedAt) > new Date(lastAccess)) {
        lastAccess = v.viewedAt;
      }
      const existing = contentMap.get(v.contentId);
      if (existing) {
        existing.viewCount += 1;
        if (new Date(v.viewedAt) > new Date(existing.lastView)) existing.lastView = v.viewedAt;
      } else {
        contentMap.set(v.contentId, { viewCount: 1, lastView: v.viewedAt, repoId: v.repositoryId, type: v.contentType });
      }
    });

    const history = Array.from(contentMap.entries()).map(([contentId, data]) => {
      let title = 'Conteúdo Excluído ou Desconhecido';
      
      const fullC = contents.find(c => c.id === contentId);
      if (fullC) {
         title = fullC.title;
      } else {
         const sLink = simpleLinks.find(l => l.id === contentId);
         if (sLink) title = sLink.name;
      }

      const repo = repositories.find(r => r.id === data.repoId);
      
      return {
        id: contentId,
        title,
        type: data.type,
        repoName: repo ? repo.name : 'Repositório Excluído',
        viewCount: data.viewCount,
        lastView: data.lastView
      };
    }).sort((a, b) => new Date(b.lastView).getTime() - new Date(a.lastView).getTime());

    return {
      totalViews: views.length,
      uniqueContents: contentMap.size,
      lastAccess,
      history
    };
  }, [selectedUser, contentViews, contents, simpleLinks, repositories]);


  if (!company) return null;

  const openCreate = () => {
    setEditingId(null);
    setFormData({ name: '', email: '', password: '', role: 'USER', active: true });
    setIsFormOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingId(user.id);
    setFormData({ 
      name: user.name, 
      email: user.email, 
      password: '', // Não mostramos a senha atual, apenas deixamos em branco para manter
      role: user.role as 'ADMIN' | 'USER', 
      active: user.active !== false // Por padrão é true se undefined
    });
    setIsFormOpen(true);
  };

  const openActivity = (user: User) => {
     setSelectedUser(user);
     setIsActivityOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      return toast.error('Nome e E-mail são obrigatórios.');
    }

    if (!editingId && !formData.password) {
      return toast.error('A senha é obrigatória para novos usuários.');
    }

    // Verifica e-mail duplicado
    const emailExists = users.some(u => u.email === formData.email && u.id !== editingId);
    if (emailExists) {
      return toast.error('Este e-mail já está em uso por outro usuário.');
    }

    if (editingId) {
      updateUser(editingId, {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        active: formData.active,
        ...(formData.password ? { password: formData.password } : {})
      });
      toast.success('Usuário atualizado com sucesso!');
    } else {
      addUser({
        companyId: company.id,
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        active: formData.active
      });
      toast.success('Usuário criado com sucesso!');
    }
    setIsFormOpen(false);
  };

  const handleDeleteUser = () => {
    if (userToDelete) {
      if (userToDelete.id === currentUser?.id) {
        toast.error('Você não pode excluir a sua própria conta.');
        setIsDeleteOpen(false);
        return;
      }
      deleteUser(userToDelete.id);
      toast.success('Usuário excluído.');
      setIsDeleteOpen(false);
    }
  };

  const toggleStatus = (user: User) => {
    if (user.id === currentUser?.id) {
      return toast.error('Você não pode inativar a sua própria conta.');
    }
    toggleUserStatus(user.id);
    toast.success(`Status alterado para ${user.active === false ? 'Ativo' : 'Inativo'}.`);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
         <div>
           <h1 className="text-2xl font-bold text-slate-900">Usuários</h1>
           <p className="text-sm text-slate-500 mt-1">Gerencie quem tem acesso aos conteúdos da {company.name}.</p>
         </div>
         <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
            + Novo Usuário
         </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
             <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-semibold">
                <tr>
                   <th className="p-4 w-16 text-center">Status</th>
                   <th className="p-4">Usuário</th>
                   <th className="p-4">Permissão</th>
                   <th className="p-4">Cadastrado em</th>
                   <th className="p-4 text-right">Ações</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {companyUsers.map(user => (
                   <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${user.active === false ? 'opacity-70 bg-slate-50/50' : ''}`}>
                      <td className="p-4 text-center">
                         <div className="flex justify-center">
                            {user.active !== false ? <CheckCircle2 className="text-emerald-500" size={20} title="Ativo" /> : <XCircle className="text-slate-400" size={20} title="Inativo" />}
                         </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                               <p className="font-semibold text-slate-900 text-base">{user.name}</p>
                               {user.id === currentUser?.id && (
                                  <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Você</span>
                               )}
                            </div>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                         <div className="flex items-center gap-1.5">
                            {user.role === 'ADMIN' ? (
                               <><Shield size={16} className="text-indigo-600" /><span className="font-medium text-indigo-700">Admin</span></>
                            ) : (
                               <><UserIcon size={16} className="text-slate-400" /><span className="text-slate-600">Usuário</span></>
                            )}
                         </div>
                      </td>
                      <td className="p-4 text-slate-500">{new Date(user.createdAt || '').toLocaleDateString('pt-BR')}</td>
                      <td className="p-4 text-right">
                         <div className="flex items-center justify-end gap-1 md:gap-2">
                           {user.role === 'USER' && (
                              <Button variant="ghost" size="icon" onClick={() => openActivity(user)} className="text-slate-400 hover:text-emerald-600" title="Ver Atividade">
                                 <Activity size={16} />
                              </Button>
                           )}
                           <Switch 
                             checked={user.active !== false} 
                             onCheckedChange={() => toggleStatus(user)} 
                             disabled={user.id === currentUser?.id}
                             title="Ativar/Inativar" 
                             className="ml-2"
                           />
                           <div className="h-6 w-px bg-slate-200 mx-1"></div>
                           <Button variant="ghost" size="icon" onClick={() => openEdit(user)} className="text-slate-400 hover:text-blue-600"><Edit2 size={16} /></Button>
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             onClick={() => {setUserToDelete({id: user.id, name: user.name}); setIsDeleteOpen(true);}} 
                             disabled={user.id === currentUser?.id}
                             className="text-slate-400 hover:text-red-600 disabled:opacity-50"
                           >
                              <Trash2 size={16} />
                           </Button>
                         </div>
                      </td>
                   </tr>
                ))}
                {companyUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Users size={48} className="text-slate-300 mb-4" />
                        <p className="text-lg font-medium text-slate-900">Nenhum usuário encontrado</p>
                        <p className="text-sm mt-1">Crie o primeiro usuário para conceder acesso à plataforma.</p>
                      </div>
                    </td>
                  </tr>
                )}
             </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE ATIVIDADE E MÉTRICAS DO USUÁRIO */}
      <Dialog open={isActivityOpen} onOpenChange={setIsActivityOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
             <DialogTitle className="text-xl">Atividade do Usuário</DialogTitle>
             <p className="text-sm text-slate-500 mt-1">Histórico de consumo e métricas de <strong>{selectedUser?.name}</strong>.</p>
          </DialogHeader>

          {userMetrics && (
            <div className="flex-1 overflow-y-auto mt-4 space-y-6 px-1 pb-2">
               {/* Resumo de Métricas */}
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                     <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"><Eye size={14} className="text-indigo-500"/> Visitas</p>
                     <p className="text-3xl font-black text-slate-900">{userMetrics.totalViews}</p>
                     <p className="text-xs text-slate-400 mt-1">Total de cliques em links e conteúdos</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                     <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"><BookOpen size={14} className="text-emerald-500"/> Engajamento</p>
                     <p className="text-3xl font-black text-slate-900">{userMetrics.uniqueContents}</p>
                     <p className="text-xs text-slate-400 mt-1">Conteúdos diferentes visualizados</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                     <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"><Calendar size={14} className="text-amber-500"/> Último Acesso</p>
                     <p className="text-lg font-bold text-slate-900 mt-1 leading-tight">
                       {userMetrics.lastAccess ? (
                         <>
                           {new Date(userMetrics.lastAccess).toLocaleDateString('pt-BR')} <br/>
                           <span className="text-sm text-slate-500 font-medium">às {new Date(userMetrics.lastAccess).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                         </>
                       ) : 'Nunca acessou'}
                     </p>
                  </div>
               </div>

               {/* Tabela de Histórico */}
               <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-3 border-b border-slate-200 pb-2">Conteúdos Acessados (Linha do Tempo)</h3>
                  {userMetrics.history.length > 0 ? (
                    <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                       <table className="w-full text-left text-sm text-slate-600">
                          <thead className="bg-slate-50 border-b border-slate-200">
                             <tr>
                                <th className="p-3 font-semibold text-slate-900">Conteúdo</th>
                                <th className="p-3 font-semibold text-slate-900">Repositório</th>
                                <th className="p-3 font-semibold text-slate-900 text-center">Visualizações</th>
                                <th className="p-3 font-semibold text-slate-900 text-right">Acessado em</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                             {userMetrics.history.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                   <td className="p-3">
                                      <p className="font-semibold text-slate-900 line-clamp-1">{item.title}</p>
                                      <p className="text-xs text-slate-500 mt-0.5 font-medium">{item.type}</p>
                                   </td>
                                   <td className="p-3 text-slate-500 line-clamp-1 text-xs">{item.repoName}</td>
                                   <td className="p-3 text-center">
                                      <span className="inline-flex items-center justify-center bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full px-2.5 py-0.5 border border-indigo-100">
                                         {item.viewCount}x
                                      </span>
                                   </td>
                                   <td className="p-3 text-right text-xs text-slate-500 font-medium">
                                      {new Date(item.lastView).toLocaleDateString('pt-BR')} <br/>
                                      <span className="text-[10px] text-slate-400">{new Date(item.lastView).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-slate-500">
                       <Activity size={32} className="mx-auto text-slate-300 mb-3" />
                       <p className="font-medium text-slate-700">O usuário ainda não visualizou nenhum conteúdo.</p>
                       <p className="text-sm mt-1">As métricas aparecerão aqui automaticamente.</p>
                    </div>
                  )}
               </div>
            </div>
          )}
          
          <div className="shrink-0 flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
             <Button type="button" variant="outline" onClick={() => setIsActivityOpen(false)}>Fechar Janela</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CRIAÇÃO/EDIÇÃO */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>{editingId ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveUser} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input placeholder="Ex: Maria Silva" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} autoFocus />
            </div>
            
            <div className="space-y-2">
              <Label>E-mail *</Label>
              <Input type="email" placeholder="maria@empresa.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>{editingId ? 'Nova Senha (deixe em branco para manter a atual)' : 'Senha *'}</Label>
              <Input type="text" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
            </div>

            <div className="space-y-2">
               <Label>Nível de Acesso *</Label>
               <select 
                 value={formData.role} 
                 onChange={(e) => setFormData({...formData, role: e.target.value as 'ADMIN' | 'USER'})}
                 className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
               >
                  <option value="USER">Usuário Final (Acesso apenas ao app de conteúdos)</option>
                  <option value="ADMIN">Administrador (Acesso ao painel Admin)</option>
               </select>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 mt-2">
              <div className="space-y-0.5">
                <Label>Usuário Ativo</Label>
                <p className="text-xs text-slate-500">Se desmarcado, ele não poderá fazer login.</p>
              </div>
              <Switch checked={formData.active} onCheckedChange={(checked) => setFormData({...formData, active: checked})} />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">{editingId ? 'Salvar Alterações' : 'Criar Usuário'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle className="text-red-600">Excluir Usuário</DialogTitle></DialogHeader>
          <div className="py-4">
             <p className="text-slate-600 text-sm">Tem certeza que deseja excluir <strong>{userToDelete?.name}</strong>?</p>
             <p className="text-red-500 text-sm mt-2 font-medium">Esta ação não poderá ser desfeita e revogará o acesso imediatamente.</p>
          </div>
          <div className="flex justify-end gap-3">
             <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
             <Button variant="destructive" onClick={handleDeleteUser}>Sim, excluir</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};