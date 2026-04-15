/**
 * Logger customizado para centralizar logs do sistema.
 * Substitui o uso de console.log conforme REGRAS_AGENTE.md.
 */

const isProd = import.meta.env.PROD;

export const Logger = {
  info: (message: string, ...args: any[]) => {
    if (!isProd) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    if (isProd) {
      // Em produção, logamos a mensagem e apenas as mensagens de objetos de erro
      // para evitar vazamento de stack traces no console do browser.
      const sanitizedArgs = args.map(arg => 
        arg instanceof Error ? arg.message : arg
      );
      console.error(`[ERROR] ${message}`, ...sanitizedArgs);
    } else {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },
  debug: (message: string, ...args: any[]) => {
    if (!isProd) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
};
