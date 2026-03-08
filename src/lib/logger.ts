/**
 * Structured logger — no external dependencies.
 * JSON output in production, pretty output in development.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

const MIN_LEVEL: LogLevel =
  ((import.meta.env.LOG_LEVEL ?? process.env.LOG_LEVEL ?? 'info') as LogLevel);

const IS_PROD: boolean =
  import.meta.env.PROD ?? process.env.NODE_ENV === 'production';

const CONSOLE_METHOD: Record<LogLevel, 'debug' | 'info' | 'warn' | 'error'> = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
};

export function createLogger(context: string) {
  function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
    if (LEVELS[level] < LEVELS[MIN_LEVEL]) return;

    const timestamp = new Date().toISOString();

    if (IS_PROD) {
      // Structured JSON output for production
      const entry: Record<string, unknown> = {
        timestamp,
        level,
        context,
        message,
      };
      if (data) {
        entry.data = data;
      }
      console[CONSOLE_METHOD[level]](JSON.stringify(entry));
    } else {
      // Pretty output for development
      const prefix = `[${timestamp}] ${level.toUpperCase()} (${context})`;
      if (data) {
        console[CONSOLE_METHOD[level]](prefix, message, data);
      } else {
        console[CONSOLE_METHOD[level]](prefix, message);
      }
    }
  }

  return {
    debug: (msg: string, data?: Record<string, unknown>) => log('debug', msg, data),
    info: (msg: string, data?: Record<string, unknown>) => log('info', msg, data),
    warn: (msg: string, data?: Record<string, unknown>) => log('warn', msg, data),
    error: (msg: string, data?: Record<string, unknown>) => log('error', msg, data),
  };
}
