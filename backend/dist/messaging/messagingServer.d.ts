import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
export declare const initializeMessagingServer: (httpServer: HTTPServer) => SocketIOServer<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export declare const getOnlineUsers: () => string[];
//# sourceMappingURL=messagingServer.d.ts.map