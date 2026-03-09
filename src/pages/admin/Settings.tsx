import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Building, Upload, AlertTriangle, Save } from 'lucide-react';

export const AdminSettings = () => {
  const { linkName } = useParams();
  const navigate = useNavigate();
  const { companies, updateCompany } = useAppStore();
  
  const company = companies.find(c => c.linkName === linkName);

  const [formData, setFormData] = useState({
    name: '',
    linkName: '',
    logoUrl: '',
    active: true
  });

  // Inicializa o form com os dados da empresa
  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name,
        linkName: company.linkName,
        logoUrl: company.logoUrl || '',
        active: company.active
      });
    }
  }, [company]);

  if (!company) return null;

  const handleLinkNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLink = e.target.value.toLowerCase().replace(/[\s\W-]+/g, '');
    setFormData({ ...formData, linkName: newLink });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();

    const name = formData.name.trim();
    const newLinkName = formData.linkName.trim();

    if (!name || !newLinkName) {
      return toast.error('Nome e Link de Acesso são obrigatórios.');
    }

    // Verifica se o novo linkName já existe em OUTRA empresa
    const isDuplicate = companies.some(c => c.linkName === newLinkName && c.id !== company.id);
    if (isDuplicate) {
      return toast.error('Este Link de Acesso já está em uso por outra empresa.');
    }

    // Atualiza a empresa
    updateCompany(company.id, {
      name,
      linkName: newLinkName,
      logoUrl: formData.logoUrl,
      active: formData.active
    });

    toast.success('Configurações atualizadas com sucesso!');

    // Se o linkName mudou, precisamos redirecionar o admin para a nova URL
    if (newLinkName !== company.linkName) {
      navigate(`/admin/${newLinkName}/settings`, { replace: true });
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Configurações da Empresa</h1>
        <p className="text-sm text-slate-500 mt-1">
          Gerencie os dados básicos e o status de acesso da <strong>{company.name}</strong>.
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 md:p-8 space-y-8">
            
            {/* Seção Básica */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">Informações Principais</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Nome da Empresa *</Label>
                  <Input 
                    placeholder="Ex: Globex Corp" 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Link de Acesso (URL) *</Label>
                  <div className="flex shadow-sm rounded-md overflow-hidden border border-slate-200 transition-colors focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
                    <span className="flex items-center px-3 bg-slate-50 text-slate-500 text-sm font-mono border-r border-slate-200">
                      /admin/
                    </span>
                    <Input 
                      className="border-0 rounded-none focus-visible:ring-0 px-3 shadow-none bg-white font-mono" 
                      placeholder="minhaempresa" 
                      value={formData.linkName} 
                      onChange={handleLinkNameChange} 
                    />
                  </div>
                  <p className="text-xs text-slate-500">Este é o link que você usa para acessar este painel.</p>
                </div>
              </div>
            </div>

            {/* Seção Identidade Visual Básica (Logo) */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">Logomarca</h2>
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                 <div className="w-24 h-24 rounded-xl border-2 border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {formData.logoUrl ? (
                      <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Building className="text-slate-300" size={32} />
                    )}
                 </div>
                 <div className="flex-1 space-y-3 w-full">
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload}
                      className="hidden" 
                      id="company-logo-upload"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => document.getElementById('company-logo-upload')?.click()}
                      className="flex items-center gap-2"
                    >
                      <Upload size={16} /> Fazer Upload da Logo
                    </Button>
                    <div className="flex flex-col gap-1.5">
                       <Label className="text-xs text-slate-500">Ou cole a URL da imagem (https://...)</Label>
                       <Input 
                         placeholder="https://exemplo.com/logo.png" 
                         value={formData.logoUrl} 
                         onChange={(e) => setFormData({...formData, logoUrl: e.target.value})} 
                         className="text-sm max-w-md"
                       />
                    </div>
                 </div>
              </div>
            </div>

            {/* Seção de Risco (Status) */}
            <div className="pt-4">
              <div className={`p-5 rounded-xl border ${formData.active ? 'border-slate-200 bg-slate-50' : 'border-red-200 bg-red-50'} transition-colors`}>
                <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
                  <div>
                    <h3 className={`text-base font-semibold flex items-center gap-2 ${formData.active ? 'text-slate-900' : 'text-red-700'}`}>
                      {!formData.active && <AlertTriangle size={18} />}
                      Status da Empresa
                    </h3>
                    <p className={`text-sm mt-1 ${formData.active ? 'text-slate-500' : 'text-red-600/80'}`}>
                      {formData.active 
                        ? 'Sua empresa está ativa. Todos os usuários e administradores têm acesso normal.' 
                        : 'Empresa inativada. Os usuários não poderão fazer login até que seja reativada.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm shrink-0">
                    <Label className="font-medium text-slate-700 cursor-pointer">
                      {formData.active ? 'Ativa' : 'Inativa'}
                    </Label>
                    <Switch 
                      checked={formData.active} 
                      onCheckedChange={(checked) => setFormData({...formData, active: checked})} 
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>
          
          {/* Rodapé do form */}
          <div className="bg-slate-50 p-6 border-t border-slate-200 flex justify-end">
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 px-6">
              <Save size={18} /> Salvar Configurações
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};