import { Navigate } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';

export const UserBiblioteca = () => {
  const { slug } = useTenant();
  return <Navigate to={`/${slug}/hub`} replace />;
};
