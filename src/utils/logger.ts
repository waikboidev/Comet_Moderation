import chalk from 'chalk';
import { format } from 'date-fns';

enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS',
  DEBUG = 'DEBUG',
}

const COLORS = {
  [LogLevel.INFO]: 'blue',
  [LogLevel.WARN]: 'yellow',
  [LogLevel.ERROR]: 'red',
  [LogLevel.SUCCESS]: 'green',
  [LogLevel.DEBUG]: 'magenta',
};

function log(level: LogLevel, message: string, ...args: any[]) {
  const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
  const color = COLORS[level];
  const coloredLevel = chalk[color as 'blue'](level);
  console.log(`[${timestamp}] [${coloredLevel}] ${message}`, ...args);
}

export const logger = {
  info: (message: string, ...args: any[]) => log(LogLevel.INFO, message, ...args),
  warn: (message: string, ...args: any[]) => log(LogLevel.WARN, message, ...args),
  error: (message: string, ...args: any[]) => log(LogLevel.ERROR, message, ...args),
  success: (message: string, ...args: any[]) => log(LogLevel.SUCCESS, message, ...args),
  debug: (message: string, ...args: any[]) => log(LogLevel.DEBUG, message, ...args),
};
