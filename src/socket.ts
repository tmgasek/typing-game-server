import { Server, Socket } from "socket.io";
import logger from "./utils/logger";
import { v4 as uuidv4 } from "uuid";

const EVENTS = {
  connection: "connection",
  CLIENT: {
    CREATE_ROOM: "CREATE_ROOM",
    SEND_ROOM_MESSAGE: "SEND_ROOM_MESSAGE",
    JOIN_ROOM: "JOIN_ROOM",
    START_GAME: "START_GAME",
  },
  SERVER: {
    ROOMS: "ROOMS",
    JOINED_ROOM: "JOINED_ROOM",
    ROOM_MESSAGE: "ROOM_MESSAGE",
    GAME_STARTED: "GAME_STARTED",
    SEND_PLAYERS: "SEND_PLAYERS",
  },
};

const rooms: Record<string, { name: string }> = {};

function socket({ io }: { io: Server }) {
  logger.info("Sockets enabled");

  /*
   * Middleware
   */
  io.use((socket, next) => {
    const username = socket.handshake.auth.username;
    if (!username) {
      return next(new Error("invalid username"));
    }
    // @ts-ignore
    socket.username = username;
    next();
  });
  /*
   * Handle connection setup
   */
  io.on(EVENTS.connection, (socket: Socket) => {
    logger.info(`Client connected with id ${socket.id}`);

    // send all rooms to client on connection
    socket.emit(EVENTS.SERVER.ROOMS, rooms);

    const users: any = [];
    // send all users to client on connection
    for (let [id, socket] of io.of("/").sockets) {
      users.push({
        userID: id,
        //@ts-ignore
        username: socket.username,
      });
    }
    io.emit("users", users);
    socket.on("disconnect", () => {
      logger.info(`Client with id ${socket.id} disconnected`);
    });

    // handle creating a room
    socket.on(EVENTS.CLIENT.CREATE_ROOM, ({ roomName }) => {
      logger.info(
        `Client with id ${socket.id} created room with name ${roomName}`
      );
      const roomId = uuidv4();
      rooms[roomId] = {
        name: roomName,
      };
      socket.join(roomId);
      // broadcast event to say there is new room
      socket.broadcast.emit(EVENTS.SERVER.ROOMS, rooms);
      // emit back to room creator (broadcast doesn't let creator know) with all the new rooms
      socket.emit(EVENTS.SERVER.ROOMS, rooms);
      socket.emit(EVENTS.SERVER.JOINED_ROOM, roomId);
    });

    /*
     * Handle joining a room
     */
    socket.on(EVENTS.CLIENT.JOIN_ROOM, ({ roomId }) => {
      socket.join(roomId);
      socket.emit(EVENTS.SERVER.JOINED_ROOM, roomId);
    });

    /*
     * Handle sending a message to a room
     */
    socket.on(
      EVENTS.CLIENT.SEND_ROOM_MESSAGE,
      ({ roomId, message, username }) => {
        const date = new Date();
        socket.to(roomId).emit(EVENTS.SERVER.ROOM_MESSAGE, {
          message,
          username,
          time: `${date.getHours()}:${date.getMinutes()}`,
        });
      }
    );

    /*
     * Handle starting a game
     */
    socket.on(EVENTS.CLIENT.START_GAME, ({ roomId, username = "sample" }) => {
      // sends to all clients in room
      io.in(roomId).emit(EVENTS.SERVER.GAME_STARTED);
      // get all the clients in the room
      const clients = io.sockets.adapter.rooms.get(roomId);
      // for each client in set
      const clientsArray: any = [];
      clients?.forEach((client) => {
        clientsArray.push(client);
      });

      io.in(roomId).emit(EVENTS.SERVER.SEND_PLAYERS, {
        clientsArray,
        msg: "shit",
        username,
      });
    });

    /*
     * Send all players to client
     */
    socket.on("", ({ roomId }) => {
      // todo:
    });
  });
}

export default socket;
