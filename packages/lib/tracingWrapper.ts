export interface TelemetrySpan { setAttribute(key: string, value: string | number | boolean): void }
export interface TelemetrySpanOptions { name: string; op?: string; attributes?: Record<string, string | number | boolean> }
export const isTelemetryEnabled = () => false;
export async function withSpan<T>(_options: TelemetrySpanOptions, callback: (span: TelemetrySpan) => Promise<T>): Promise<T> { return callback({ setAttribute: () => {} }); }
export const withReporting = <T extends any[], R>(callback: (...args: T) => R, _name: string) => callback;
const monitorCallbackAsync = async <T extends (...args: any[]) => any>(callback: T, ...args: Parameters<T>): Promise<ReturnType<T>> => callback(...args);
export const monitorCallbackSync = <T extends (...args: any[]) => any>(callback: T, ...args: Parameters<T>): ReturnType<T> => callback(...args);
export default monitorCallbackAsync;
