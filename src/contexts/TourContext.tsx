import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Step } from 'react-joyride';
import { USER_TOURS, TourKey } from '../data/userTourSteps';

interface TourContextType {
  steps: Step[];
  run: boolean;
  activeTourKey: TourKey;
  startTour: (key: TourKey) => void;
  stopTour: () => void;
  setRun: (run: boolean) => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const TourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTourKey, setActiveTourKey] = useState<TourKey>('GENERAL');
  const [steps, setSteps] = useState<Step[]>(USER_TOURS.GENERAL);
  const [run, setRun] = useState(false);

  const startTour = useCallback((key: TourKey) => {
    setActiveTourKey(key);
    setSteps(USER_TOURS[key]);
    // Pequeno delay para garantir que o Joyride perceba a mudança de passos antes de rodar
    setTimeout(() => setRun(true), 50);
  }, []);

  const stopTour = useCallback(() => {
    setRun(false);
  }, []);

  return (
    <TourContext.Provider value={{ 
      steps, 
      run, 
      activeTourKey, 
      startTour, 
      stopTour, 
      setRun 
    }}>
      {children}
    </TourContext.Provider>
  );
};

export const useTourContext = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTourContext must be used within a TourProvider');
  }
  return context;
};
