export {};

declare global {
  interface Window {
    /** System helpers */
    system: {
      homedir(): string;
    };

    /** Simple key–value store */
    store: {
      get<T = unknown>(key: string): Promise<T>;
      set<T = unknown>(key: string, value: T): Promise<void>;
      delete(key: string): Promise<void>;
    };

    /** Electron shell helpers */
    electron: {
      openExternal(url: string): Promise<boolean>;
      openPath(path: string): Promise<string>;
      setMaxListeners: (amount: number) => Promise<number>;
    };

    /** Filesystem helpers exposed from fsHelpers.cjs */
    fsHelpers: {
      exists(path: string): boolean;
      join(path: string): string;
      readFileSync(
        path: string,
        options?: { encoding?: string | null; flag?: string }
      ): Buffer | string;
      readdirSync(path: string): string[];
      unlinkSync(path: string): void;
      renameSync(oldPath: string, newPath: string): void;
      writeFileSync(file, data): void;
    };

    /** OS path helpers */
    path: {
      join(...parts: string[]): string;
      dirname(path: string): string;
      basename(path: string): string;
      extname(path: string): string;
      resolve(...paths: string[]): string;
    };

    /** Environment helpers */
    env: {
      get(key: string): string | undefined;
      pipInstall(
        pipPath: string,
        requirementsPath: string
      ): Promise<unknown>;
    };

    /** File dialog helpers (via IPC) */
    dialog: {
      showOpenDialog(
        options: Electron.OpenDialogOptions
      ): Promise<Electron.OpenDialogReturnValue>;

      showSaveDialog(
        options: Electron.SaveDialogOptions
      ): Promise<Electron.SaveDialogReturnValue>;
    };

    /** File-related helpers */
    files: {
      openFileDialog(args?: unknown): Promise<unknown>;
    };

    /** IPC helpers */
    ipc: {
      send(channel: string, data?: unknown): void;
      invoke<T = unknown>(channel: string, data?: unknown): Promise<T>;
      on(
        channel: string,
        callback: (...args: unknown[]) => void
      ): () => void;
      removeListener(
        channel: string,
        listener: (...args: unknown[]) => void
      ): void;
    };
  }
}