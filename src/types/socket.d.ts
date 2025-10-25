export {}; // Make this file a module

declare module 'socket.io-client' {
  export interface Socket {
    connected: boolean;
    id: string;
    on(event: string, callback: (...args: any[]) => void): void;
    emit(event: string, ...args: any[]): void;
    off(event: string, callback?: (...args: any[]) => void): void;
    disconnect(): void;
    connect(): void;
  }

  export interface SocketOptions {
    transports?: string[];
    reconnection?: boolean;
    reconnectionAttempts?: number;
    reconnectionDelay?: number;
  }

  export function io(url: string, options?: SocketOptions): Socket;
}