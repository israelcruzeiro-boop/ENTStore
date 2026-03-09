import { MOCK_COMPANIES } from '../../data/mock';

export const SuperAdminDashboard = () => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
         <h1 className="text-2xl font-bold text-slate-900">Gestão de Empresas (Tenants)</h1>
         <button className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800 transition-colors">
            + Nova Company
         </button>
      </div>
      
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
           <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-semibold">
              <tr>
                 <th className="p-4">ID</th>
                 <th className="p-4">Nome da Empresa</th>
                 <th className="p-4">Status</th>
                 <th className="p-4 text-right">Ações</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-slate-100">
              {MOCK_COMPANIES.map(company => (
                 <tr key={company.id} className="hover:bg-slate-50">
                    <td className="p-4 font-mono text-xs">{company.id}</td>
                    <td className="p-4 font-medium text-slate-900">{company.name}</td>
                    <td className="p-4">
                       <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          {company.active ? 'Ativo' : 'Inativo'}
                       </span>
                    </td>
                    <td className="p-4 text-right">
                       <button className="text-blue-600 hover:text-blue-800 font-medium text-sm mr-3">Editar</button>
                       <button className="text-slate-500 hover:text-slate-700 font-medium text-sm">Admins</button>
                    </td>
                 </tr>
              ))}
           </tbody>
        </table>
      </div>
    </div>
  );
};