// import dotenv from "dotenv";
// dotenv.config();
import http from "node:http";
import express from "express";
import cors from "cors";
import userRoutes from "./routes/userRoutes.mjs";
import messageRoutes from "./routes/messageRoutes.mjs";
import propertyRoutes from "./routes/propertyRoutes.mjs";
import bookingRoutes from "./routes/bookingRoutes.js";
import { connectDb } from "./config/db.js";
import cookieParser from "cookie-parser";
import { errorHandler } from "./utils/errorHandler.js";
import initializeSocket from "./config/socket.js";

const allowedOrigins = [
  "http://localhost:1234",
  "http://localhost:5173",
  "https://claudie-pitiful-karyl.ngrok-free.dev",
  "https://deluxe-bienenstitch-fbd7b1.netlify.app"
]; //only for testing

try {
  await connectDb();

  const app = express();
  const server = http.createServer(app);
  app.use(
    cors({
      // origin: process.env.FRONTEND_URL || "http://192.168.100.107:1234",
      origin: allowedOrigins,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser("secret-key"));

  const io = initializeSocket(server);
  app.set("io", io);

  // app.use("/api/auth", authRoutes);
  app.use("/api/user", userRoutes);
  app.use("/api/messages", messageRoutes);
  app.use("/api/properties", propertyRoutes);
  app.use("/api/bookings", bookingRoutes);

  // app.get(
  //   "/test",
  //   asyncHandler(async (req, res) => {
  //     res.cookie("token", "694e9a67cf593042e13b102e", {
  //       httpOnly: true,
  //       signed: true,
  //       maxAge: 60 * 1000 * 60 * 24 * 7,
  //     }).end('cookie saved');
  //   })
  // );

  app.use(errorHandler);

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} catch (error) {
  console.log("Server Error", error);
}
