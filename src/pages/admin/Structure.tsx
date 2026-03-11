import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Network, Save, Building2, Store } from 'lucide-react';

export const AdminStructure = () => {
  const { linkName } = useParams();
  const { companies, updateCompany } = useAppStore();
  
  const company = companies.find(c => c.linkName === linkName);

  const [formData, setFormData] = useState({
    orgTopLevelName: '',
    orgUnitName: ''
  });

  useEffect(() => {
    if (company) {
      setFormData({
        orgTopLevelName: company.orgTopLevelName || '',
        orgUnitName: company.orgUnitName || ''
      });
    }
  }, [company]);

  if (!company) return null;

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();

    updateCompany(company.id, {
      orgTopLevelName: formData.orgTopLevelName.trim(),
      orgUnitName: formData.orgUnitName.trim()
    });

    toast.success('Estrutura Organizacional atualizada com sucesso!');
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Network className="text-indigo-600" size={28} />
          Estrutura Organizacional
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Personalize como a sua empresa chama os níveis hierárquicos e unidades de negócio.
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 md:p-8 space-y-8">
            
            <div className="space-y-6">
              <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 flex gap-3">
                 <Network className="text-indigo-500 shrink-0 mt-0.5" size={20} />
                 <div>
                    <h3 className="text-sm font-semibold text-indigo-900">Personalização de Nomenclaturas</h3>
                    <p className="text-xs text-indigo-700/80 mt-1">
                       Estas configurações mudam os rótulos em todo o sistema. Por exemplo, se você alterar "Unidade" para "Loja", os cadastros de usuários e filtros exibirão "Loja".
                    </p>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-base">
                     <Building2 size={18} className="text-slate-400" />
                     Nome do Nível Superior
                  </Label>
                  <p className="text-xs text-slate-500 leading-relaxed">
                     Como você chama os grandes agrupamentos ou divisões? (Ex: Regional, Diretoria, Grupo, Marca).
                  </p>
                  <Input 
                    placeholder="Ex: Regional" 
                    value={formData.orgTopLevelName} 
                    onChange={(e) => setFormData({...formData, orgTopLevelName: e.target.value})} 
                    className="h-11"
                  />
                  <div className="mt-2 text-xs text-slate-400 font-medium">
                    Preview no sistema: 
                    <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded mx-1">
                      {formData.orgTopLevelName || 'Regional'}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-base">
                     <Store size={18} className="text-slate-400" />
                     Nome da Unidade Base
                  </Label>
                  <p className="text-xs text-slate-500 leading-relaxed">
                     Como você chama a ponta operacional do negócio? (Ex: Loja, Unidade, Filial, Franquia).
                  </p>
                  <Input 
                    placeholder="Ex: Loja" 
                    value={formData.orgUnitName} 
                    onChange={(e) => setFormData({...formData, orgUnitName: e.target.value})} 
                    className="h-11"
                  />
                  <div className="mt-2 text-xs text-slate-400 font-medium">
                    Preview no sistema: 
                    <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded mx-1">
                      {formData.orgUnitName || 'Unidade'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
          
          <div className="bg-slate-50 p-6 border-t border-slate-200 flex justify-end">
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 px-6">
              <Save size={18} /> Salvar Nomenclaturas
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};