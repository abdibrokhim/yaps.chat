type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMessage {
  message: string;
  data?: any;
  timestamp: string;
  level: LogLevel;
  component: string;
}

class Logger {
  private static instance: Logger;
  private logs: LogMessage[] = [];
  private isEnabled: boolean = true;
  private logLevels: Record<LogLevel, boolean> = {
    debug: true,
    info: true,
    warn: true,
    error: true
  };

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
  }

  setLogLevel(level: LogLevel, enabled: boolean): void {
    this.logLevels[level] = enabled;
  }

  getLogs(): LogMessage[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  private formatData(data: any): string {
    try {
      if (typeof data === 'object') {
        return JSON.stringify(data, null, 2);
      }
      return String(data);
    } catch (error) {
      return `[Unserializable data: ${typeof data}]`;
    }
  }

  private log(level: LogLevel, component: string, message: string, data?: any): void {
    if (!this.isEnabled || !this.logLevels[level]) return;

    const timestamp = new Date().toISOString();
    const logMessage: LogMessage = {
      message,
      data,
      timestamp,
      level,
      component
    };

    this.logs.push(logMessage);

    // Format console output
    const colorMap = {
      debug: '#888888',
      info: '#4CAF50',
      warn: '#FFC107',
      error: '#F44336'
    };

    const formattedComponent = `%c[${component}]`;
    const formattedLevel = `%c[${level.toUpperCase()}]`;
    const formattedTimestamp = `%c[${timestamp}]`;
    
    // console.log(
    //   `${formattedComponent} ${formattedLevel} ${formattedTimestamp} %c${message}`,
    //   `color: #9C27B0; font-weight: bold;`,
    //   `color: ${colorMap[level]}; font-weight: bold;`,
    //   `color: #2196F3;`,
    //   `color: black;`
    // );

    // if (data !== undefined) {
    //   console.log('%cData:', 'font-weight: bold;', data);
    // }
  }

  debug(component: string, message: string, data?: any): void {
    this.log('debug', component, message, data);
  }

  info(component: string, message: string, data?: any): void {
    this.log('info', component, message, data);
  }

  warn(component: string, message: string, data?: any): void {
    this.log('warn', component, message, data);
  }

  error(component: string, message: string, data?: any): void {
    this.log('error', component, message, data);
  }
}

export const logger = Logger.getInstance(); 