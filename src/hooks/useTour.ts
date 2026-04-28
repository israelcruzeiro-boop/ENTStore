import { useState, useCallback } from 'react';
import { STATUS, EVENTS, type Step, type Props, type EventData, type Controls } from 'react-joyride';

/**
 * Hook reutilizável para gerenciar Guided Tours (React Joyride v3+).
 * Encapsula estado, callback e configurações padrão.
 */
export function useTour(steps: Step[]) {
  const [runTour, setRunTour] = useState(false);

  const startTour = useCallback(() => {
    setRunTour(true);
  }, []);

  const handleEvent = useCallback((data: EventData, controls: Controls) => {
    const { status, type } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRunTour(false);
    }
    if (type === EVENTS.TOUR_END) {
      setRunTour(false);
    }
  }, []);

  const joyrideProps: Props = {
    steps,
    run: runTour,
    continuous: true,
    onEvent: handleEvent,
    options: {
      primaryColor: '#4f46e5',
      zIndex: 10000,
      showProgress: true,
      buttons: ['back', 'close', 'skip', 'primary'],
    },
    locale: {
      back: 'Voltar',
      close: 'Fechar',
      last: 'Entendi!',
      next: 'Próximo',
      skip: 'Pular Tour',
    },
    styles: {
      tooltipContainer: {
        textAlign: 'left' as const,
      },
      buttonPrimary: {
        borderRadius: '8px',
        fontWeight: 'bold',
        fontSize: '14px',
        padding: '8px 16px',
      },
      buttonBack: {
        color: '#64748b',
        fontSize: '14px',
      },
      buttonSkip: {
        color: '#94a3b8',
        fontSize: '13px',
      },
      tooltip: {
        borderRadius: '12px',
        padding: '20px',
      },
    },
  };

  return { runTour, startTour, joyrideProps };
}
