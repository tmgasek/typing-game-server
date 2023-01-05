import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import logger from "./utils/logger";

const EVENTS = {
  connection: "connection",
  CLIENT: {
    CREATE_ROOM: "CREATE_ROOM",
    SEND_ROOM_MESSAGE: "SEND_ROOM_MESSAGE",
    JOIN_ROOM: "JOIN_ROOM",
    START_GAME: "START_GAME",
    GET_PLAYERS_IN_ROOM: "GET_PLAYERS_IN_ROOM",
  },
  SERVER: {
    ROOMS: "ROOMS",
    JOINED_ROOM: "JOINED_ROOM",
    ROOM_MESSAGE: "ROOM_MESSAGE",
    GAME_STARTED: "GAME_STARTED",
    SEND_PLAYERS_IN_ROOM: "SEND_PLAYERS_IN_ROOM",
    SEND_ALL_USERS: "SEND_ALL_USERS",
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

    const allUsers: any = [];
    // send all users to client on connection
    for (let [id, socket] of io.of("/").sockets) {
      allUsers.push({
        userID: id,
        //@ts-ignore
        username: socket.username,
      });
    }
    io.emit(EVENTS.SERVER.SEND_ALL_USERS, allUsers);
    socket.on("disconnect", () => {
      logger.info(`Client with id ${socket.id} disconnected`);
      // TODO:
    });

    /*
     * Handle sending a message to a room
     */
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
    socket.on(EVENTS.CLIENT.JOIN_ROOM, async ({ roomId }) => {
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
    socket.on(EVENTS.CLIENT.START_GAME, ({ roomId }) => {
      console.log("GAME STARTED in room: ", roomId);
      // sends to all clients in room
      io.in(roomId).emit(EVENTS.SERVER.GAME_STARTED);

      // const words = generate();
    });

    socket.on("GET_WORDS", ({ roomId }) => {
      const words = "hello world";

      io.in(roomId).emit("WORDS", words);
    });

    /*
     * Handle getting all players in a room
     */
    socket.on(EVENTS.CLIENT.GET_PLAYERS_IN_ROOM, async ({ roomId }) => {
      const users: any[] = [];
      const sockets = await io.in(roomId).fetchSockets();
      sockets.forEach((socket) => {
        users.push({
          userID: socket.id,
          //@ts-ignore
          username: socket.username,
        });
      });

      io.in(roomId).emit(EVENTS.SERVER.SEND_PLAYERS_IN_ROOM, {
        users,
      });
    });

    /*
     * Handle game over
     */
    socket.on("GAME_OVER", ({ roomId }) => {
      console.log("GAME OVER in room: ", roomId);
      io.in(roomId).emit("GAME_OVER_SERVER");
    });

    /*
     * Handle getting and showing stats
     */
    socket.on("SENDING_STATS", ({ roomId, username, wpm, accuracy }) => {
      // update stats in room
      rooms[roomId] = {
        ...rooms[roomId],
        [username]: {
          wpm,
          accuracy,
        },
      };

      // make an an array of all users in room with stats
      const users: any[] = [];
      //@ts-ignore
      for (let [username, stats] of Object.entries(rooms[roomId])) {
        console.log(username, stats);
        if (username === "name") continue;
        users.push({ username, stats });
      }

      // emit event if number of users in room is equal to number of users with stats
      const socketsInRoom = io.sockets.adapter.rooms.get(roomId)?.size;
      if (socketsInRoom === users.length) {
        io.in(roomId).emit("SENDING_STATS_SERVER", {
          users,
        });
      }

      // remove all users from room
      rooms[roomId] = {
        name: rooms[roomId].name,
      };
    });
  });
}

export default socket;
