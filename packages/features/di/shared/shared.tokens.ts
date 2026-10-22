export const SHARED_TOKENS = {
  // Infrastructure services
  TASKER: Symbol("ITasker"),
  LOGGER: Symbol("ILogger"),
  LOGGER_MODULE: Symbol("ILoggerModule"),
  OWNED_WORKER_LOGGER: Symbol("IWorkerLogger"),
  OWNED_WORKER_LOGGER_MODULE: Symbol("IWorkerLoggerModule"),
} as const;
