export {};

declare global {
  interface Window {
    store: {
      get<T = unknown>(key: string): T;
      set<T = unknown>(key: string, value: T): void;
      delete(key: string): void;
    };

    configStore: {
      get<T = unknown>(id: string, key: string): T;
      set<T = unknown>(id: string, key: string, value: T): void;
      delete(id: string, key: string): void;
    };

    electron: {
      openExternal: (url: string) => Promise<void>;
      openPath: (path: string) => Promise<string>;
    };

    fsHelpers: {
      exists(path: string): boolean;
      join(...parts: string[]): string;
    };

     dialog: {
      showOpenDialog(
        options: Electron.OpenDialogOptions
      ): Promise<Electron.OpenDialogReturnValue>;

      showSaveDialog(
        options: Electron.SaveDialogOptions
      ): Promise<Electron.SaveDialogReturnValue>;
    };
	
    ipc: {
      send(channel: string, data?: unknown): void;
      invoke<T = unknown>(channel: string, data?: unknown): Promise<T>;
      on(
        channel: string,
        callback: (...args: unknown[]) => void
      ): () => void;
    };

  }
}