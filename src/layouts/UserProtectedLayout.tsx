import { TourProvider } from '../contexts/TourContext';
import { UserLayout } from './UserLayout';

export const UserProtectedLayout = () => (
  <TourProvider>
    <UserLayout />
  </TourProvider>
);
