import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useCompanies } from '../../hooks/useSupabaseData';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Building, Upload, AlertTriangle, Save, Image as ImageIcon, Loader2, Sun, MoveVertical } from 'lucide-react';
import { uploadToSupabase } from '../../lib/storage';
import { Slider } from '@/components/ui/slider';
import { CoverPreview } from '../../components/admin/CoverPreview';

const RESERVED_SLUGS = ['admin', 'super-admin', 'login', 'api', 'assets', 'system', 'home', 'perfil', 'busca', 'hub', 'biblioteca'];

export const AdminSettings = () => {
  const { companySlug } = useParams();
  const navigate = useNavigate();
  const { companies, mutate: mutateCompanies } = useCompanies();
  
  const company = companies.find(c => c.link_name === companySlug || c.slug === companySlug);

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    link_name: '',
    logo_url: '',
    hero_image: '',
    hero_title: '',
    hero_subtitle: '',
    active: true,
    hero_position: 50,
    hero_brightness: 100
  });

  // Inicializa o form com os dados da empresa
  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name,
        link_name: company.companySlug,
        logo_url: company.logo_url || '',
        hero_image: company.hero_image || '',
        hero_title: company.hero_title || '',
        hero_subtitle: company.hero_subtitle || '',
        active: company.active,
        hero_position: company.hero_position ?? 50,
        hero_brightness: company.hero_brightness ?? 100
      });
    }
  }, [company]);

  if (!company) return (
     <div className="flex justify-center items-center h-48 text-slate-400">
        <Loader2 className="animate-spin" />
     </div>
  );

  const handleLinkNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLink = e.target.value.toLowerCase().replace(/[\s\W-]+/g, '');
    setFormData(prev => ({ ...prev, link_name: newLink }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo_url' | 'hero_image') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error('A imagem é muito grande (máximo 20MB).');
      return;
    }

    const context = field === 'logo_url' ? 'logo' : 'hero';

    try {
      setIsUploading(true);
      const toastId = toast.loading('Otimizando e enviando imagem...');
      
      const publicUrl = await uploadToSupabase(file, 'assets', `companies/${company.id}/${field}`, context);
      
      toast.dismiss(toastId);
      
      if (publicUrl) {
        setFormData(prev => ({ ...prev, [field]: publicUrl }));
        toast.success('Upload concluído!');
      } else {
        toast.error('Falha ao fazer upload da imagem no Supabase.');
      }
    } catch (error) {
      toast.error('Erro na conexão com o Supabase Storage.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = formData.name.trim();
    const newLinkName = formData.link_name.trim();

    if (!name || !newLinkName) {
      return toast.error('Nome e Link de Acesso são obrigatórios.');
    }

    if (RESERVED_SLUGS.includes(newLinkName)) {
      return toast.error(`O link "${newLinkName}" é reservado pelo sistema e não pode ser utilizado.`);
    }

    const isDuplicate = companies.some(c => c.slug === newLinkName && c.id !== company.id);
    if (isDuplicate) {
      return toast.error('Este Link de Acesso já está em uso por outra empresa.');
    }

    try {
      setIsSubmitting(true);
      const { error } = await supabase.from('companies').update(formData).eq('id', company.id);
      
      if (error) throw error;

      toast.success('Configurações atualizadas com sucesso!');
      mutateCompanies();
      
      if (newLinkName !== company.link_name) {
        navigate(`/admin/${newLinkName}/settings`, { replace: true });
      }
    } catch (err) {
      const error = err as Error;
      toast.error(`Erro ao salvar configurações: ${error.message}`);
    } finally {
      setIsSubmitting(false);
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

            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">Informações Principais</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Nome da Empresa *</Label>
                  <Input 
                    placeholder="Ex: Globex Corp" 
                    value={formData.name} 
                    onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))} 
                    disabled={isSubmitting}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Link de Acesso (URL) *</Label>
                  <div className={`flex shadow-sm rounded-md overflow-hidden border transition-colors focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 ${isSubmitting ? 'border-slate-100 bg-slate-50' : 'border-slate-200'}`}>
                    <span className="flex items-center px-3 bg-slate-50 text-slate-500 text-sm font-mono border-r border-slate-200">
                      storepage.com/
                    </span>
                    <Input 
                      className="border-0 rounded-none focus-visible:ring-0 px-3 shadow-none bg-white font-mono" 
                      placeholder="minhaempresa" 
                      value={formData.companySlug} 
                      onChange={handleLinkNameChange} 
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">Logomarca</h2>
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                 <div className="w-24 h-24 rounded-xl border-2 border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {formData.logo_url ? (
                      <img src={formData.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Building className="text-slate-300" size={32} />
                    )}
                 </div>
                 <div className="flex-1 space-y-3 w-full">
                    <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo_url')} className="hidden" id="company-logo-upload" />
                    <Button type="button" variant="outline" onClick={() => document.getElementById('company-logo-upload')?.click()} className="flex items-center gap-2" disabled={isUploading || isSubmitting}>
                      {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} 
                      {isUploading ? 'Enviando...' : 'Fazer Upload da Logo'}
                    </Button>
                    <div className="flex flex-col gap-1.5">
                       <Label className="text-xs text-slate-500">Ou cole a URL da imagem (https://...)</Label>
                       <Input placeholder="https://exemplo.com/logo.png" value={formData.logo_url} onChange={(e) => setFormData(prev => ({...prev, logo_url: e.target.value}))} className="text-sm max-w-md" disabled={isSubmitting} />
                    </div>
                 </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">Capa do Painel (Home do Usuário)</h2>
              <p className="text-sm text-slate-500 mb-4">Defina o grande banner que aparece no topo quando o colaborador acessa a plataforma.</p>
              
              <div className="space-y-4">
                 <div className="space-y-2">
                    <Label>Imagem de Capa (Banner)</Label>
                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-2 flex flex-col items-center justify-center relative bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group h-40 overflow-hidden" onClick={() => !isSubmitting && document.getElementById('hero-upload')?.click()}>
                       {formData.hero_image ? (
                          <>
                            <img src={formData.hero_image} alt="Capa" className="w-full h-full object-cover rounded-md opacity-80 group-hover:opacity-40 transition-opacity" />
                            {!isSubmitting && <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Button type="button" variant="secondary" size="sm">Trocar Imagem</Button></div>}
                          </>
                       ) : (
                          <div className="text-center p-4">
                             <ImageIcon className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                             <p className="text-xs text-slate-500">Proporção ideal: 16:9</p>
                          </div>
                       )}
                    </div>
                    <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'hero_image')} className="hidden" id="hero-upload" />
                    <Input placeholder="Ou cole a URL da imagem..." value={formData.hero_image} onChange={(e) => setFormData(prev => ({...prev, hero_image: e.target.value}))} className="h-8 text-xs mt-2" disabled={isSubmitting} />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label>Título Principal</Label>
                     <Input placeholder="Ex: Treinamento de Vendas 2024" value={formData.hero_title} onChange={(e) => setFormData(prev => ({...prev, hero_title: e.target.value}))} disabled={isSubmitting} />
                   </div>
                   <div className="space-y-2">
                     <Label>Subtítulo / Descrição</Label>
                     <Input placeholder="Ex: Assista aos novos conteúdos disponibilizados." value={formData.hero_subtitle} onChange={(e) => setFormData(prev => ({...prev, hero_subtitle: e.target.value}))} disabled={isSubmitting} />
                   </div>
                 </div>

                 {/* Real-time Preview */}
                 <div className="mb-6 mt-6">
                   <CoverPreview 
                      image={formData.hero_image}
                      position={formData.hero_position}
                      brightness={formData.hero_brightness}
                      title={formData.hero_title}
                      subtitle={formData.hero_subtitle}
                      type="hero"
                   />
                 </div>

                 {/* Advanced Hero Controls */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                          <MoveVertical size={14} className="text-indigo-500" /> Posição da Capa ({formData.hero_position}%)
                        </Label>
                      </div>
                      <Slider 
                        value={[formData.hero_position]} 
                        min={0} 
                        max={100} 
                        step={1} 
                        onValueChange={(val) => setFormData(prev => ({ ...prev, hero_position: val[0] }))}
                        disabled={isSubmitting}
                      />
                      <p className="text-[10px] text-slate-500">Ajuste o foco vertical da imagem do Home.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                          <Sun size={14} className="text-amber-500" /> Exposição ({formData.hero_brightness}%)
                        </Label>
                      </div>
                      <Slider 
                        value={[formData.hero_brightness]} 
                        min={0} 
                        max={200} 
                        step={1} 
                        onValueChange={(val) => setFormData(prev => ({ ...prev, hero_brightness: val[0] }))}
                        disabled={isSubmitting}
                      />
                      <p className="text-[10px] text-slate-500">Controle o brilho para melhor legibilidade dos textos no Home.</p>
                    </div>
                 </div>
              </div>
            </div>

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
                      onCheckedChange={(checked) => setFormData(prev => ({...prev, active: checked}))} 
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>
          
          <div className="bg-slate-50 p-6 border-t border-slate-200 flex justify-end">
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 px-6" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
              {isSubmitting ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
