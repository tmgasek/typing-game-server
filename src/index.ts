import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

dotenv.config();

const app = express();
const port = process.env.PORT;

app.get("/", (_, res) => {
});

app.listen(port, () => {
  console.log(`server running at localhost:${port}`);
});
