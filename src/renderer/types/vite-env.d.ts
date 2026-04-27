export {};

declare global {
  interface Window {
    fsHelpers: {
      exists(path: string): boolean;
      join(...parts: string[]): string;

      readFileSync(path: string, encoding?: string): string;
      readdirSync(path: string): string[];
      unlinkSync(path: string): void;
      renameSync(from: string, to: string): void;
    };

    system: {
      homedir(): string;
    };

    env: {
      get(key: string): string | undefined;
    };

    ipc: {
      send(channel: string, data?: any): void;
      invoke<T = any>(channel: string, data?: any): Promise<T>;
      on(channel: string, callback: (...args: any[]) => void): () => void;
    };
  }
}