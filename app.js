import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.mjs";
import userRoutes from "./routes/userRoutes.mjs";
import { connectDb } from "./config/db.js";
import cookieParser from "cookie-parser";
import Session from "./models/sessionModel.js";
import User from "./models/userModel.js";

try {
  await connectDb();

  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(cookieParser('secret-key'));

  app.use("/api/auth", authRoutes);
  app.use("/api", userRoutes);

  app.get("/test", async(req, res) => {
    const users = await User.find();
    console.log({users});
    console.log("test route");
    res.end('test route')
  });

  app.listen(3000, () => {
    console.log("Server running on 3000 port");
  });
} catch (error) {
    console.log('Server Error', error);
}
