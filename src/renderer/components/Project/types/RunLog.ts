export interface RunLogEntry {
  id: number,
  time?: string;
  level: 'UI-event' | 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | string;
  message?: string;
}

export interface LoggableEvent {
    level: 'UI-event' | 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | string;
    message: string;
    time?: string;
}