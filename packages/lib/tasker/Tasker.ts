import type { ILogger } from "./types";
export abstract class Tasker<T> {
  protected readonly asyncTasker: T;
  protected readonly syncTasker: T;
  protected readonly logger: ILogger;
  constructor(dependencies: { asyncTasker: T; syncTasker: T; logger: ILogger }) {
    this.asyncTasker = dependencies.syncTasker;
    this.syncTasker = dependencies.syncTasker;
    this.logger = dependencies.logger;
  }
  public async dispatch<K extends keyof T>(taskName: K, ...args: T[K] extends (...args: any[]) => any ? Parameters<T[K]> : never): Promise<T[K] extends (...args: any[]) => any ? Awaited<ReturnType<T[K]>> : never> {
    const method = this.syncTasker[taskName] as (...args: any[]) => any;
    return method.apply(this.syncTasker, args);
  }
}
