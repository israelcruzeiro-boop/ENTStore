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
import { CheckCircle2, XCircle, Edit2, Trash2, Shield, User as UserIcon, Users, Activity, Eye, BookOpen, Calendar, Store, Upload, FileSpreadsheet, AlertCircle, Download } from 'lucide-react';
import { User } from '../../types';
import * as XLSX from 'xlsx';

const isValidCPF = (cpf: string) => {
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let sum = 0, rest;
  for (let i = 1; i <= 9; i++) sum = sum + parseInt(cpf.substring(i-1, i)) * (11 - i);
  rest = (sum * 10) % 11;
  if ((rest === 10) || (rest === 11)) rest = 0;
  if (rest !== parseInt(cpf.substring(9, 10))) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum = sum + parseInt(cpf.substring(i-1, i)) * (12 - i);
  rest = (sum * 10) % 11;
  if ((rest === 10) || (rest === 11)) rest = 0;
  if (rest !== parseInt(cpf.substring(10, 11))) return false;
  return true;
};

export const AdminUsers = () => {
  const { linkName } = useParams();
  const { user: currentUser } = useAuth();
  const { companies, users, addUser, updateUser, deleteUser, toggleUserStatus, contentViews, contents, simpleLinks, repositories, orgUnits } = useAppStore();
  
  const company = companies.find(c => c.linkName === linkName);
  const companyUsers = users.filter(u => u.companyId === company?.id)
                            .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());

  const companyUnits = orgUnits.filter(u => u.companyId === company?.id && u.active);
  const unitLabel = company?.orgUnitName || 'Unidade';

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', email: '', cpf: '', password: '', role: 'USER' as 'ADMIN' | 'USER', active: true, orgUnitId: ''
  });

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{id: string, name: string} | null>(null);

  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Estados de Importação
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<'upload' | 'preview'>('upload');
  const [parsedData, setParsedData] = useState<any[]>([]);

  const userMetrics = useMemo(() => {
    if (!selectedUser) return null;
    const views = contentViews.filter(v => v.userId === selectedUser.id);
    let lastAccess = '';
    const contentMap = new Map<string, any>();

    views.forEach(v => {
      if (!lastAccess || new Date(v.viewedAt) > new Date(lastAccess)) lastAccess = v.viewedAt;
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
      if (fullC) title = fullC.title;
      else {
         const sLink = simpleLinks.find(l => l.id === contentId);
         if (sLink) title = sLink.name;
      }
      const repo = repositories.find(r => r.id === data.repoId);
      return { id: contentId, title, type: data.type, repoName: repo ? repo.name : 'Repositório Excluído', viewCount: data.viewCount, lastView: data.lastView };
    }).sort((a, b) => new Date(b.lastView).getTime() - new Date(a.lastView).getTime());

    return { totalViews: views.length, uniqueContents: contentMap.size, lastAccess, history };
  }, [selectedUser, contentViews, contents, simpleLinks, repositories]);

  if (!company) return null;

  const openCreate = () => {
    setEditingId(null);
    setFormData({ name: '', email: '', cpf: '', password: '', role: 'USER', active: true, orgUnitId: '' });
    setIsFormOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingId(user.id);
    setFormData({ name: user.name, email: user.email || '', cpf: user.cpf || '', password: '', role: user.role as 'ADMIN' | 'USER', active: user.active !== false, orgUnitId: user.orgUnitId || '' });
    setIsFormOpen(true);
  };

  const openActivity = (user: User) => { setSelectedUser(user); setIsActivityOpen(true); };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return toast.error('Nome é obrigatório.');
    if (!editingId && !formData.password) return toast.error('A senha é obrigatória para novos usuários.');

    if (formData.email) {
       const emailExists = users.some(u => u.email && u.email === formData.email && u.id !== editingId);
       if (emailExists) return toast.error('Este e-mail já está em uso por outro usuário.');
    }

    let cleanCpf = formData.cpf.replace(/\D/g, '');
    if (cleanCpf) {
       if (!isValidCPF(cleanCpf)) return toast.error('CPF inválido.');
       const cpfExists = users.some(u => u.cpf === cleanCpf && u.id !== editingId);
       if (cpfExists) return toast.error('Este CPF já está cadastrado no sistema.');
    }

    const payload = {
      name: formData.name,
      email: formData.email || undefined,
      cpf: cleanCpf || undefined,
      role: formData.role,
      active: formData.active,
      orgUnitId: formData.orgUnitId || undefined,
      status: 'ACTIVE' as const
    };

    if (editingId) {
      updateUser(editingId, { ...payload, ...(formData.password ? { password: formData.password } : {}) });
      toast.success('Usuário atualizado com sucesso!');
    } else {
      addUser({ companyId: company.id, password: formData.password, ...payload });
      toast.success('Usuário criado com sucesso!');
    }
    setIsFormOpen(false);
  };

  const handleDeleteUser = () => {
    if (userToDelete) {
      if (userToDelete.id === currentUser?.id) return toast.error('Você não pode excluir a sua própria conta.');
      deleteUser(userToDelete.id);
      toast.success('Usuário excluído.');
      setIsDeleteOpen(false);
    }
  };

  const toggleStatus = (user: User) => {
    if (user.id === currentUser?.id) return toast.error('Você não pode inativar a sua própria conta.');
    toggleUserStatus(user.id);
    toast.success(`Status alterado para ${user.active === false ? 'Ativo' : 'Inativo'}.`);
  };

  // --- Importação de Planilha ---
  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { Nome: 'João da Silva', CPF: '12345678901' },
      { Nome: 'Maria Oliveira', CPF: '09876543210' }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo Importação');
    XLSX.writeFile(wb, 'modelo_usuarios_entstore.xlsx');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws);

        const cpfSet = new Set<string>();

        const processed = rows.map((row: any, index: number) => {
          const keys = Object.keys(row);
          const nomeKey = keys.find(k => k.toLowerCase().includes('nome'));
          const cpfKey = keys.find(k => k.toLowerCase().includes('cpf'));
          
          const nome = nomeKey ? String(row[nomeKey]).trim() : '';
          let cpfRaw = cpfKey ? row[cpfKey] : '';
          if (typeof cpfRaw === 'number') cpfRaw = cpfRaw.toString().padStart(11, '0');
          const cpf = String(cpfRaw).replace(/\D/g, '');

          const errors = [];
          let isDuplicate = false;

          if (!nome) errors.push('Nome vazio');
          if (!cpf) errors.push('CPF vazio');
          else if (!isValidCPF(cpf)) errors.push('CPF inválido');
          else {
             if (users.some(u => u.cpf === cpf)) {
               errors.push('CPF já cadastrado no sistema');
               isDuplicate = true;
             } else if (cpfSet.has(cpf)) {
               errors.push('CPF duplicado nesta planilha');
               isDuplicate = true;
             } else {
               cpfSet.add(cpf);
             }
          }

          return { nome, cpf, valid: errors.length === 0, errors, isDuplicate, rowNum: index + 2 };
        });

        setParsedData(processed);
        setImportStep('preview');
      } catch (err) {
        toast.error('Erro ao ler a planilha. Verifique o formato do arquivo.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; 
  };

  const handleConfirmImport = () => {
    const validRows = parsedData.filter(r => r.valid);
    if (validRows.length === 0) return toast.error('Nenhuma linha válida para importar.');

    validRows.forEach(row => {
      addUser({
        companyId: company.id,
        name: row.nome,
        cpf: row.cpf,
        password: row.cpf, // Senha inicial é o CPF
        role: 'USER',
        status: 'PENDING_SETUP',
        firstAccess: true,
        active: true,
      });
    });

    toast.success(`${validRows.length} usuários importados com sucesso!`);
    setIsImportModalOpen(false);
  };

  const totalRows = parsedData.length;
  const validRows = parsedData.filter(r => r.valid);
  const duplicateRows = parsedData.filter(r => !r.valid && r.isDuplicate);
  const errorRows = parsedData.filter(r => !r.valid && !r.isDuplicate); // Erros não relacionados à duplicação

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
         <div>
           <h1 className="text-2xl font-bold text-slate-900">Usuários</h1>
           <p className="text-sm text-slate-500 mt-1">Gerencie quem tem acesso aos conteúdos da {company.name}.</p>
         </div>
         <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => { setIsImportModalOpen(true); setImportStep('upload'); }} className="bg-white border-slate-200 flex-1 sm:flex-none text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-200">
               <Upload size={16} className="mr-2" /> Importar Planilha
            </Button>
            <Button onClick={openCreate} className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm flex-1 sm:flex-none">
               + Novo Usuário
            </Button>
         </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
             <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-semibold">
                <tr>
                   <th className="p-4 w-16 text-center">Status</th>
                   <th className="p-4">Usuário</th>
                   <th className="p-4">Identificação</th>
                   <th className="p-4">Permissão</th>
                   <th className="p-4 text-right">Ações</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {companyUsers.map(user => {
                   const userUnit = orgUnits.find(u => u.id === user.orgUnitId);
                   return (
                   <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${user.active === false ? 'opacity-70 bg-slate-50/50' : ''}`}>
                      <td className="p-4 text-center">
                         <div className="flex justify-center">
                            {user.active !== false ? <CheckCircle2 className="text-emerald-500" size={20} title="Ativo" /> : <XCircle className="text-slate-400" size={20} title="Inativo" />}
                         </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {user.avatarUrl ? (
                             <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" />
                          ) : (
                             <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                               {user.name.charAt(0).toUpperCase()}
                             </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                               <p className="font-semibold text-slate-900 text-base">{user.name}</p>
                               {user.id === currentUser?.id && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Você</span>}
                               {user.status === 'PENDING_SETUP' && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase">Setup Pendente</span>}
                            </div>
                            <p className="text-xs text-slate-500">{user.email || 'Sem e-mail'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                         <p className="text-sm font-medium text-slate-700">{user.cpf ? user.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : '-'}</p>
                      </td>
                      <td className="p-4">
                         <div className="flex flex-col items-start gap-1.5">
                            <div className="flex items-center gap-1.5">
                               {user.role === 'ADMIN' ? (
                                  <><Shield size={16} className="text-indigo-600" /><span className="font-medium text-indigo-700">Admin</span></>
                               ) : (
                                  <><UserIcon size={16} className="text-slate-400" /><span className="text-slate-600">Usuário</span></>
                               )}
                            </div>
                            {userUnit && (
                               <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md" title={unitLabel}>
                                  <Store size={10} /> {userUnit.name}
                               </div>
                            )}
                         </div>
                      </td>
                      <td className="p-4 text-right">
                         <div className="flex items-center justify-end gap-1 md:gap-2">
                           {user.role === 'USER' && (
                              <Button variant="ghost" size="icon" onClick={() => openActivity(user)} className="text-slate-400 hover:text-emerald-600" title="Ver Atividade">
                                 <Activity size={16} />
                              </Button>
                           )}
                           <Switch checked={user.active !== false} onCheckedChange={() => toggleStatus(user)} disabled={user.id === currentUser?.id} title="Ativar/Inativar" className="ml-2" />
                           <div className="h-6 w-px bg-slate-200 mx-1"></div>
                           <Button variant="ghost" size="icon" onClick={() => openEdit(user)} className="text-slate-400 hover:text-blue-600"><Edit2 size={16} /></Button>
                           <Button variant="ghost" size="icon" onClick={() => {setUserToDelete({id: user.id, name: user.name}); setIsDeleteOpen(true);}} disabled={user.id === currentUser?.id} className="text-slate-400 hover:text-red-600 disabled:opacity-50"><Trash2 size={16} /></Button>
                         </div>
                      </td>
                   </tr>
                )})}
             </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE IMPORTAÇÃO (XLSX/CSV) */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
             <DialogTitle>Importar Usuários em Lote</DialogTitle>
             {importStep === 'upload' && <p className="text-sm text-slate-500 mt-1">Faça o upload de uma planilha .xlsx ou .csv contendo colunas de "Nome" e "CPF".</p>}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto mt-4 px-1">
            {importStep === 'upload' ? (
               <div className="space-y-4">
                 <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 flex flex-col items-center justify-center text-center bg-slate-50 hover:bg-indigo-50/50 transition-colors cursor-pointer group" onClick={() => document.getElementById('file-upload')?.click()}>
                    <FileSpreadsheet size={48} className="text-indigo-400 mb-4 group-hover:scale-110 transition-transform" />
                    <p className="font-semibold text-slate-700 text-lg mb-1">Clique para selecionar o arquivo</p>
                    <p className="text-sm text-slate-500 mb-4">Arquivos suportados: .xlsx, .csv</p>
                    <input type="file" id="file-upload" accept=".xlsx, .csv" className="hidden" onChange={handleFileUpload} />
                 </div>

                 <div className="bg-slate-100 p-4 rounded-lg flex items-center justify-between border border-slate-200">
                    <div className="flex flex-col">
                       <span className="font-medium text-slate-800 text-sm">Não tem a planilha ainda?</span>
                       <span className="text-xs text-slate-500">Baixe o nosso modelo padrão para preencher.</span>
                    </div>
                    <Button variant="outline" onClick={handleDownloadTemplate} className="bg-white hover:bg-slate-50 text-indigo-600 border-indigo-200 shadow-sm flex items-center gap-2">
                       <Download size={16} /> Baixar Modelo
                    </Button>
                 </div>
               </div>
            ) : (
               <div className="space-y-4">
                  {/* Métricas Detalhadas */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                     <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total</p>
                        <p className="text-xl font-black text-slate-800">{totalRows}</p>
                     </div>
                     <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                        <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Válidas</p>
                        <p className="text-xl font-black text-emerald-600">{validRows.length}</p>
                     </div>
                     <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Duplicadas</p>
                        <p className="text-xl font-black text-amber-600">{duplicateRows.length}</p>
                     </div>
                     <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                        <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Com Erro</p>
                        <p className="text-xl font-black text-red-600">{errorRows.length}</p>
                     </div>
                  </div>

                  {/* Tabela de Preview */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                     <div className="max-h-[280px] overflow-y-auto">
                        <table className="w-full text-left text-sm text-slate-600 relative">
                           <thead className="bg-slate-100 border-b border-slate-200 text-slate-900 sticky top-0 z-10">
                              <tr>
                                 <th className="p-2.5 pl-4 w-12 text-xs font-semibold">L.</th>
                                 <th className="p-2.5 text-xs font-semibold">Nome</th>
                                 <th className="p-2.5 text-xs font-semibold">CPF</th>
                                 <th className="p-2.5 text-xs font-semibold">Status</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {parsedData.map((row, i) => (
                                 <tr key={i} className={row.valid ? 'bg-white' : (row.isDuplicate ? 'bg-amber-50/50' : 'bg-red-50/50')}>
                                    <td className="p-2 pl-4 font-mono text-[10px] text-slate-400">{row.rowNum}</td>
                                    <td className="p-2 font-medium text-slate-800 text-xs">{row.nome || '-'}</td>
                                    <td className="p-2 font-mono text-xs">{row.cpf || '-'}</td>
                                    <td className="p-2">
                                       {row.valid ? (
                                          <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold"><CheckCircle2 size={14}/> Pronto</span>
                                       ) : (
                                          <div className="flex flex-col gap-0.5">
                                             {row.errors.map((e: string, ei: number) => (
                                                <span key={ei} className={`flex items-center gap-1 text-xs font-medium ${row.isDuplicate ? 'text-amber-600' : 'text-red-600'}`}>
                                                   <AlertCircle size={12}/> {e}
                                                </span>
                                             ))}
                                          </div>
                                       )}
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
                  
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex gap-3 text-indigo-800 text-sm">
                     <Shield className="shrink-0 mt-0.5" size={18} />
                     <div>
                        <p className="font-bold mb-1">Como funcionará o acesso?</p>
                        <p className="leading-relaxed">Os {validRows.length} usuários válidos serão criados. Eles usarão o <strong>CPF (apenas números) como senha temporária</strong> no primeiro login e serão solicitados a preencher os dados restantes do perfil antes de acessar a plataforma.</p>
                     </div>
                  </div>
               </div>
            )}
          </div>

          <div className="shrink-0 flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
             {importStep === 'preview' && <Button type="button" variant="outline" onClick={() => setImportStep('upload')}>Nova Planilha</Button>}
             <Button type="button" variant="outline" onClick={() => setIsImportModalOpen(false)}>Cancelar</Button>
             {importStep === 'preview' && validRows.length > 0 && (
                <Button type="button" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleConfirmImport}>
                   Importar {validRows.length} Usuários
                </Button>
             )}
          </div>
        </DialogContent>
      </Dialog>

      {/* OUTROS MODAIS (ATIVIDADE, CRIAÇÃO, EXCLUSÃO) */}
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

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>{editingId ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveUser} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input placeholder="Ex: Maria Silva" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} autoFocus />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>CPF (Opcional)</Label>
                 <Input type="text" placeholder="Apenas números" value={formData.cpf} onChange={(e) => setFormData({...formData, cpf: e.target.value.replace(/\D/g, '')})} maxLength={11} />
               </div>
               <div className="space-y-2">
                 <Label>E-mail (Opcional)</Label>
                 <Input type="email" placeholder="maria@empresa.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
               </div>
            </div>

            <div className="space-y-2">
              <Label>{editingId ? 'Nova Senha (deixe em branco para manter a atual)' : 'Senha *'}</Label>
              <Input type="text" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                 <Label>Nível de Acesso *</Label>
                 <select 
                   value={formData.role} 
                   onChange={(e) => setFormData({...formData, role: e.target.value as 'ADMIN' | 'USER'})}
                   className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                 >
                    <option value="USER">Usuário Final</option>
                    <option value="ADMIN">Administrador</option>
                 </select>
              </div>
              <div className="space-y-2">
                 <Label>{unitLabel}</Label>
                 <select 
                   value={formData.orgUnitId} 
                   onChange={(e) => setFormData({...formData, orgUnitId: e.target.value})}
                   className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                 >
                    <option value="">Nenhuma</option>
                    {companyUnits.map(unit => (
                      <option key={unit.id} value={unit.id}>{unit.name}</option>
                    ))}
                 </select>
              </div>
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