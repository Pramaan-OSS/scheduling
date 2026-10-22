// Application compatibility helpers; no telemetry is collected or exported.
export const captureException = (..._args: unknown[]) => undefined;
export const captureReactException = captureException;
export const captureRequestError = captureException;
export const setUser = captureException;
export const setTag = captureException;
export const setContext = captureException;
export const addBreadcrumb = captureException;
export const init = captureException;
const span = { setAttribute: captureException, setAttributes: captureException, setStatus: captureException, addEvent: captureException, end: captureException };
export function startSpan<T>(_options: unknown, callback: (value: typeof span) => T): T { return callback(span); }
export const metrics = { count: captureException, distribution: captureException, gauge: captureException, increment: captureException };

export const startInactiveSpan = (..._args: unknown[]) => span;
