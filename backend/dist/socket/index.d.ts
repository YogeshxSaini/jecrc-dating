import { Server as SocketIOServer } from 'socket.io';
/**
 * Initialize Socket.IO handlers
 */
export declare function initializeSocketIO(io: SocketIOServer): void;
/**
 * Emit notification to a specific user
 */
export declare function emitNotification(io: SocketIOServer, userId: string, notification: any): void;
//# sourceMappingURL=index.d.ts.map