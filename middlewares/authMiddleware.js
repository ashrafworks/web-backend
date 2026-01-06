import Session from "../models/sessionModel.js";
import User from "../models/userModel.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const checkAuth = asyncHandler(async (req, res, next) => {
  const { token } = req.signedCookies;
console.log({token});
  if (!token) {
    const error = new Error("Authentication required. Please login");
    error.statusCode = 401;
    throw error;
  }

  const session = await Session.findById(token);

  if (!session) {
    const error = new Error("Session not found. Please login again");
    error.statusCode = 401;
    throw error;
  }

  if (session.expiresAt < new Date()) {
    await session.deleteOne();
    const error = new Error("Session expired. Please login again");
    error.statusCode = 401;
    throw error;
  }

  const user = await User.findById(session.userId).select("-password").lean();

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  session.lastActive = Date.now();
  await session.save();

  req.session = session;
  req.user = user;

  next();
});

export const authorizeAdmin = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    const error = new Error("Authentication required");
    error.statusCode = 401;
    throw error;
  }

  if (req.user.role !== "admin") {
    const error = new Error("Access denied. Admin only");
    error.statusCode = 403;
    throw error;
  }

  next();
});

// export const optionalAuth = asyncHandler(async (req, res, next) => {
//   const { token } = req.signedCookies;

//   if (!token) {
//     return next();
//   }

//   try {
//     const session = await Session.findById(token);

//     if (session && session.expiresAt > new Date()) {
//       const user = await User.findById(session.userId).select("-password").lean();

//       if (user) {
//         req.session = session;
//         req.user = user;

//         // Update last active
//         session.lastActive = Date.now();
//         await session.save();
//       }
//     }
//   } catch (error) {
//     // If there's an error, just continue without auth
//     console.error("Optional auth error:", error);
//   }

//   next();
// });
