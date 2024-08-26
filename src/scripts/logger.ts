import chalk from 'chalk';

enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  VERBOSE = 4,
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  error(message: string): void {
    if (this.logLevel >= LogLevel.ERROR) {
      console.error(chalk.red(`[ERROR] ${message}`));
    }
  }

  warn(message: string): void {
    if (this.logLevel >= LogLevel.WARN) {
      console.warn(chalk.yellow(`[WARN] ${message}`));
    }
  }

  info(message: string): void {
    if (this.logLevel >= LogLevel.INFO) {
      console.info(chalk.blue(`[INFO] ${message}`));
    }
  }

  debug(message: string): void {
    if (this.logLevel >= LogLevel.DEBUG) {
      console.debug(chalk.green(`[DEBUG] ${message}`));
    }
  }

  verbose(message: string): void {
    if (this.logLevel >= LogLevel.VERBOSE) {
      console.log(chalk.gray(`[VERBOSE] ${message}`));
    }
  }
}

export const logger = Logger.getInstance();
export default Logger;
