type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

interface LogMeta {
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const LOG_COLORS: Record<LogLevel, string> = {
  ERROR: '\x1b[31m', // Red
  WARN: '\x1b[33m', // Yellow
  INFO: '\x1b[36m', // Cyan
  DEBUG: '\x1b[90m', // Gray
};

const RESET_COLOR = '\x1b[0m';

class Logger {
  private minLevel: number;
  private isDevelopment: boolean;

  constructor() {
    // Read NODE_ENV and handle empty strings (Bun may pass empty string)
    const env = (process.env.NODE_ENV?.trim() || 'development').toLowerCase();
    this.isDevelopment = env === 'development';
    this.minLevel = this.isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] <= this.minLevel;
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: LogLevel, message: string, meta?: LogMeta | Error): string {
    const timestamp = this.getTimestamp();

    if (this.isDevelopment) {
      // Development: Colorful output
      const color = LOG_COLORS[level];
      let formatted = `${color}[${level}]${RESET_COLOR} ${timestamp} - ${message}`;

      if (meta) {
        if (meta instanceof Error) {
          formatted += `\n  Error: ${meta.message}`;
          if (meta.stack) {
            formatted += `\n  Stack: ${meta.stack}`;
          }
        } else {
          formatted += `\n  ${JSON.stringify(meta, null, 2)}`;
        }
      }

      return formatted;
    } else {
      // Production: JSON format
      const logObject: Record<string, unknown> = {
        level,
        timestamp,
        message,
      };

      if (meta) {
        if (meta instanceof Error) {
          logObject.error = {
            message: meta.message,
            stack: meta.stack,
            name: meta.name,
          };
        } else {
          logObject.meta = meta;
        }
      }

      return JSON.stringify(logObject);
    }
  }

  private log(level: LogLevel, message: string, meta?: LogMeta | Error): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formatted = this.formatMessage(level, message, meta);

    if (level === 'ERROR') {
      console.error(formatted);
    } else if (level === 'WARN') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  error(message: string, error?: Error): void {
    this.log('ERROR', message, error);
  }

  warn(message: string, meta?: LogMeta): void {
    this.log('WARN', message, meta);
  }

  info(message: string, meta?: LogMeta): void {
    this.log('INFO', message, meta);
  }

  debug(message: string, meta?: LogMeta): void {
    this.log('DEBUG', message, meta);
  }
}

export const logger = new Logger();
