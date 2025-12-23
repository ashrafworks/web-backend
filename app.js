import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.mjs";
import userRoutes from "./routes/userRoutes.mjs";
import reservationRoute from "./routes/reservationRoute.mjs";
import { connectDb } from "./config/db.js";
import cookieParser from "cookie-parser";
import Session from "./models/sessionModel.js";
import User from "./models/userModel.js";
import { errorHandler } from "./utils/errorHandler.js";
import { asyncHandler } from "./utils/asyncHandler.js";

try {
  await connectDb();

  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(cookieParser("secret-key"));

  app.use("/api/auth", authRoutes);
  app.use("/api", userRoutes);
  app.use("/api/reservations", reservationRoute)

  app.get(
    "/test",
    asyncHandler(async (req, res) => {
      // return res.json({message: 'hello world'})
      throw new Error();
    })
  );

  // global error handler middleware
  app.use(errorHandler);

  app.listen(3000, () => {
    console.log("Server running on 3000 port");
  });
} catch (error) {
  console.log("Server Error", error);
}
