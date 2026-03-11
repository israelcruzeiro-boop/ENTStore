import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Building, Upload, AlertTriangle, Save, Image as ImageIcon } from 'lucide-react';

export const AdminSettings = () => {
  const { linkName } = useParams();
  const navigate = useNavigate();
  const { companies, updateCompany } = useAppStore();
  
  const company = companies.find(c => c.linkName === linkName);

  const [formData, setFormData] = useState({
    name: '',
    linkName: '',
    logoUrl: '',
    heroImage: '',
    heroTitle: '',
    heroSubtitle: '',
    active: true
  });

  // Inicializa o form com os dados da empresa
  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name,
        linkName: company.linkName,
        logoUrl: company.logoUrl || '',
        heroImage: company.heroImage || '',
        heroTitle: company.heroTitle || '',
        heroSubtitle: company.heroSubtitle || '',
        active: company.active
      });
    }
  }, [company]);

  if (!company) return null;

  const handleLinkNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLink = e.target.value.toLowerCase().replace(/[\s\W-]+/g, '');
    setFormData({ ...formData, linkName: newLink });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'heroImage') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, [field]: reader.result as string });
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

    const isDuplicate = companies.some(c => c.linkName === newLinkName && c.id !== company.id);
    if (isDuplicate) {
      return toast.error('Este Link de Acesso já está em uso por outra empresa.');
    }

    updateCompany(company.id, formData);

    toast.success('Configurações atualizadas com sucesso!');

    if (newLinkName !== company.linkName) {
      navigate(`/admin/${newLinkName}/settings`, { replace: true });
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Configurações da Empresa</h1>
        <p className="text-sm text-slate-500 mt-1">
          Gerencie os dados básicos e a página inicial da <strong>{company.name}</strong>.
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
                </div>
              </div>
            </div>

            {/* Logo */}
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
                    <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'logoUrl')} className="hidden" id="company-logo-upload" />
                    <Button type="button" variant="outline" onClick={() => document.getElementById('company-logo-upload')?.click()} className="flex items-center gap-2">
                      <Upload size={16} /> Fazer Upload da Logo
                    </Button>
                    <div className="flex flex-col gap-1.5">
                       <Label className="text-xs text-slate-500">Ou cole a URL da imagem (https://...)</Label>
                       <Input placeholder="https://exemplo.com/logo.png" value={formData.logoUrl} onChange={(e) => setFormData({...formData, logoUrl: e.target.value})} className="text-sm max-w-md" />
                    </div>
                 </div>
              </div>
            </div>

            {/* Capa do Painel do Usuário (Hero Banner) */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">Capa do Painel (Home do Usuário)</h2>
              <p className="text-sm text-slate-500 mb-4">Defina o grande banner que aparece no topo quando o colaborador acessa a plataforma.</p>
              
              <div className="space-y-4">
                 <div className="space-y-2">
                    <Label>Imagem de Capa (Banner)</Label>
                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-2 flex flex-col items-center justify-center relative bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group h-40 overflow-hidden" onClick={() => document.getElementById('hero-upload')?.click()}>
                       {formData.heroImage ? (
                          <>
                            <img src={formData.heroImage} alt="Capa" className="w-full h-full object-cover rounded-md opacity-80 group-hover:opacity-40 transition-opacity" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Button type="button" variant="secondary" size="sm">Trocar Imagem</Button></div>
                          </>
                       ) : (
                          <div className="text-center p-4">
                             <ImageIcon className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                             <p className="text-xs text-slate-500">Proporção ideal: 16:9</p>
                          </div>
                       )}
                    </div>
                    <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'heroImage')} className="hidden" id="hero-upload" />
                    <Input placeholder="Ou cole a URL da imagem..." value={formData.heroImage} onChange={(e) => setFormData({...formData, heroImage: e.target.value})} className="h-8 text-xs mt-2" />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label>Título Principal</Label>
                     <Input placeholder="Ex: Treinamento de Vendas 2024" value={formData.heroTitle} onChange={(e) => setFormData({...formData, heroTitle: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                     <Label>Subtítulo / Descrição</Label>
                     <Input placeholder="Ex: Assista aos novos conteúdos disponibilizados." value={formData.heroSubtitle} onChange={(e) => setFormData({...formData, heroSubtitle: e.target.value})} />
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