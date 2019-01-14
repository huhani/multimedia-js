// TODO: Move to Objec-TS long-term

const DEBUG = false;

const PREFIX_ROOT = 'mm';

const LOGGER_CONFIG_STORAGE_KEY = 'mmjs:LoggerConfig';

const noop = () => {};

const getPrefix = function (type: string, category: string): string {
  const prefix = `[${PREFIX_ROOT}]:[${type}]:[${category}] >`;
  return prefix;
};

export function checkLogLevel (level: number, catLevel: number) {
  switch (catLevel) {
  case LoggerLevel.DEBUG: return (level >= LoggerLevel.DEBUG) && console.debug;
  case LoggerLevel.LOG: return (level >= LoggerLevel.LOG) && console.log;
  case LoggerLevel.INFO: return (level >= LoggerLevel.INFO) && console.info;
  case LoggerLevel.WARN: return (level >= LoggerLevel.WARN) && console.warn;
  case LoggerLevel.ERROR: return (level >= LoggerLevel.ERROR) && console.error;
  }
}

export type LoggerFunc = (...args: any[]) => void;

export type Logger = {
  debug: LoggerFunc
  log: LoggerFunc
  info: LoggerFunc,
  warn: LoggerFunc
  error: LoggerFunc
};

export enum LoggerLevel {
  ON = Infinity,
  DEBUG = 5,
  LOG = 4,
  INFO = 3,
  WARN = 2,
  ERROR = 1,
  OFF = 0
}

export type LoggerConfig = {
  [catMatcher: string]: LoggerLevel
};

export const defaultGlobalConfig: LoggerConfig = {'*': 0};

export const loggerConfig: LoggerConfig = getLocalLoggerConfig();

function persistConfig(config: LoggerConfig): boolean {
  if (localStorage) { //re-persist
    localStorage.setItem(LOGGER_CONFIG_STORAGE_KEY, JSON.stringify(config));
    return true;
  }
  return false;
}

export function getLocalLoggerConfig(): LoggerConfig {

  let config: LoggerConfig;

  const globalScope = self;

  if (globalScope.localStorage) {
    let object: string = localStorage.getItem(LOGGER_CONFIG_STORAGE_KEY) || "{}";

    try {
      config = JSON.parse(object);
    } catch(err) {
      console.warn('LOGGER: Got most likely corrupt logger config data! Running recovery routine...');
      removeLocalLoggerConfig();
      return getLocalLoggerConfig();
    }

    // persist if creating state first time
    persistConfig(config);

  } else { // fallback for workers (or no LocalStorage API support)
    config = globalScope[LOGGER_CONFIG_STORAGE_KEY] || defaultGlobalConfig;
    globalScope[LOGGER_CONFIG_STORAGE_KEY] = config;
  }

  return config;
}

export function removeLocalLoggerConfig() {
  delete self[LOGGER_CONFIG_STORAGE_KEY];
  localStorage.removeItem(LOGGER_CONFIG_STORAGE_KEY);
}

export function setLocalLoggerLevel(categoryMatcher: string, level: LoggerLevel): LoggerConfig {
  const config = getLocalLoggerConfig();
  config[categoryMatcher] = level;
  // store with changes
  persistConfig(config);
  return config;
}

export function getConfiguredLoggerLevelForCategory(
  category: string,
  defaultLevel: LoggerLevel = LoggerLevel.OFF,
  config: LoggerConfig = getLocalLoggerConfig()): LoggerLevel {

  let retLevel = defaultLevel
  Object.getOwnPropertyNames(config).forEach((catMatcher: string) => {

    const level: LoggerLevel = config[catMatcher];
    const isCatMatching = (new RegExp("^" + catMatcher.split("*").join(".*") + "$")).test(category);

    if (isCatMatching && level < retLevel) { // we are enforcing the lowest level specified by any matching category wildcard
      retLevel = level;
    }

  })
  return retLevel;
}

export const getLogger = function (category: string, level: number = LoggerLevel.ON): Logger {
  //const window = self; // Needed for WebWorker compat --> it's even more complex but we don't need to access console scopped

  level = getConfiguredLoggerLevelForCategory(category, level);

  if (DEBUG) {
    console.log(`Set-up log category <${category}> with level ${level}`);
  }

  return {
    debug: checkLogLevel(level, LoggerLevel.DEBUG) ? console.debug.bind(window['console'], getPrefix('d', category)) : noop,
    log: checkLogLevel(level, LoggerLevel.LOG) ? console.log.bind(window['console'], getPrefix('l', category)) : noop,
    info: checkLogLevel(level, LoggerLevel.INFO) ? console.info.bind(window['console'], getPrefix('i', category)) : noop,
    warn: checkLogLevel(level, LoggerLevel.WARN) ? console.warn.bind(window['console'], getPrefix('w', category)) : noop,
    error: checkLogLevel(level, LoggerLevel.ERROR) ? console.error.bind(window['console'], getPrefix('e', category)) : noop
  };
};

export function makeLogTimestamped (...args): string {
  let message = `[${(new Date()).toISOString()}]`;
  args.forEach((arg) => {
    message += ' ' + arg;
  });
  return message;
}
