const chalk = require('chalk');
const { format } = require('date-fns');

const LogLevel = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  SUCCESS: 'SUCCESS',
  DEBUG: 'DEBUG',
};

const COLORS = {
  [LogLevel.INFO]: 'blue',
  [LogLevel.WARN]: 'yellow',
  [LogLevel.ERROR]: 'red',
  [LogLevel.SUCCESS]: 'green',
  [LogLevel.DEBUG]: 'magenta',
};

function log(level, message, ...args) {
  const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
  const color = COLORS[level];
  const coloredLevel = chalk[color](level);
  console.log(`[${timestamp}] [${coloredLevel}] ${message}`, ...args);
}

const logger = {
  info: (message, ...args) => log(LogLevel.INFO, message, ...args),
  warn: (message, ...args) => log(LogLevel.WARN, message, ...args),
  error: (message, ...args) => log(LogLevel.ERROR, message, ...args),
  success: (message, ...args) => log(LogLevel.SUCCESS, message, ...args),
  debug: (message, ...args) => log(LogLevel.DEBUG, message, ...args),
};

module.exports = { logger };
