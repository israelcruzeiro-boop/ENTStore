import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { mockThemes } from '../../data/mock';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MoreVertical, CheckCircle2, XCircle, Building } from 'lucide-react';

export const SuperAdminDashboard = () => {
  const { companies, addCompany, toggleCompanyStatus } = useAppStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', logoUrl: '', active: true });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('O nome da empresa é obrigatório');
      return;
    }

    addCompany({
      name: formData.name,
      logoUrl: formData.logoUrl,
      active: formData.active,
      theme: mockThemes.corporateBlue // Tema padrão
    });

    toast.success('Empresa criada com sucesso! Admin padrão gerado.');
    setIsModalOpen(false);
    setFormData({ name: '', logoUrl: '', active: true });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
         <div>
           <h1 className="text-2xl font-bold text-slate-900">Gestão de Empresas (Tenants)</h1>
           <p className="text-sm text-slate-500 mt-1">Gerencie os clientes da plataforma ENTStore</p>
         </div>
         <Button onClick={() => setIsModalOpen(true)} className="bg-slate-900 hover:bg-slate-800">
            + Nova Company
         </Button>
      </div>
      
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
             <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-semibold">
                <tr>
                   <th className="p-4 w-16">Status</th>
                   <th className="p-4">Empresa</th>
                   <th className="p-4">Slug</th>
                   <th className="p-4">Criada em</th>
                   <th className="p-4 text-right">Ações</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {companies.map(company => (
                   <tr key={company.id} className={`hover:bg-slate-50 transition-colors ${!company.active ? 'opacity-60' : ''}`}>
                      <td className="p-4">
                         {company.active ? (
                           <CheckCircle2 className="text-emerald-500" size={20} />
                         ) : (
                           <XCircle className="text-slate-300" size={20} />
                         )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                            {company.logoUrl ? (
                              <img src={company.logoUrl} alt={company.name} className="w-full h-full object-cover" />
                            ) : (
                              <Building className="text-slate-400" size={18} />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{company.name}</p>
                            <p className="text-xs text-slate-500 font-mono">ID: {company.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-500">
                        {company.slug}
                      </td>
                      <td className="p-4 text-slate-500">
                        {new Date(company.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-4 text-right">
                         <div className="flex items-center justify-end gap-3">
                           <Switch 
                             checked={company.active} 
                             onCheckedChange={() => toggleCompanyStatus(company.id)}
                           />
                           <Button variant="ghost" size="icon" className="text-slate-400 hover:text-blue-600">
                             <MoreVertical size={18} />
                           </Button>
                         </div>
                      </td>
                   </tr>
                ))}
                {companies.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      Nenhuma empresa cadastrada ainda.
                    </td>
                  </tr>
                )}
             </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Nova Empresa</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label>Nome da Empresa *</Label>
              <Input 
                placeholder="Ex: Globex Corporation" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                autoFocus
              />
            </div>
            
            <div className="space-y-2">
              <Label>URL da Logo (Opcional)</Label>
              <Input 
                placeholder="https://..." 
                value={formData.logoUrl}
                onChange={(e) => setFormData({...formData, logoUrl: e.target.value})}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="space-y-0.5">
                <Label>Status da Conta</Label>
                <p className="text-xs text-slate-500">Se inativo, usuários não poderão logar.</p>
              </div>
              <Switch 
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({...formData, active: checked})}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit">Criar Empresa</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};