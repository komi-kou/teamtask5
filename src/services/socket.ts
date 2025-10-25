import { io, Socket } from 'socket.io-client';
import { LocalStorage } from '../utils/storage';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private currentTeamId: string | null = null;

  connect(teamId: string) {
    if (this.socket) {
      this.disconnect();
    }

    this.currentTeamId = teamId;
    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      if (teamId) {
        this.joinTeam(teamId);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    // Handle data updates
    this.socket.on('data-updated', (data: any) => {
      console.log('Data updated:', data);
      this.emit('dataUpdated', data);
      // Update local storage
      if (data.dataType && data.data) {
        LocalStorage.set(data.dataType, data.data);
      }
    });

    this.socket.on('data-deleted', (data: any) => {
      console.log('Data deleted:', data);
      this.emit('dataDeleted', data);
      // Remove from local storage
      if (data.dataType) {
        LocalStorage.remove(data.dataType);
      }
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinTeam(teamId: string) {
    if (this.socket) {
      this.socket.emit('join-team', teamId);
    }
  }

  sendDataUpdate(teamId: string, dataType: string, data: any) {
    if (this.socket) {
      this.socket.emit('data-update', {
        teamId,
        dataType,
        data
      });
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getCurrentTeamId(): string | null {
    return this.currentTeamId;
  }
}

export default new SocketService();