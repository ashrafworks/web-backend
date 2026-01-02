// import Session from "../models/sessionModel.js";
// import User from "../models/userModel.js";
// import { asyncHandler } from "../utils/asyncHandler.js";
// import { createSession, deleteSession } from "../utils/sessionHelper.js";
// import jwt from "jsonwebtoken";

// // Register new user
// export const register = asyncHandler(async (req, res) => {
//   const { name, email, password, confirmPassword } = req.body;

//   // Validate required fields
//   if (!name || !email || !password) {
//     const error = new Error("Please provide all required fields");
//     error.statusCode = 400;
//     throw error;
//   }

//   // Validate password length
//   if (password.length < 8) {
//     const error = new Error("Password must be at least 8 characters long");
//     error.statusCode = 400;
//     throw error;
//   }

//   // Check if passwords match (if confirmPassword is provided)
//   if (confirmPassword && password !== confirmPassword) {
//     const error = new Error("Passwords do not match");
//     error.statusCode = 400;
//     throw error;
//   }

//   // Validate name length
//   if (name.trim().length < 3) {
//     const error = new Error("Name must be at least 3 characters long");
//     error.statusCode = 400;
//     throw error;
//   }

//   // Check if user already exists
//   const existingUser = await User.findOne({ email: email.toLowerCase() });

//   if (existingUser) {
//     const error = new Error("Email already exists");
//     error.statusCode = 409;
//     throw error;
//   }

//   // Create new user
//   const user = await User.create({
//     name: name.trim(),
//     email: email.toLowerCase(),
//     password,
//   });

//   // Return user data without password
//   return res.status(201).json({
//     success: true,
//     message: "User registered successfully",
//     data: {
//       _id: user._id,
//       name: user.name,
//       email: user.email,
//       role: user.role,
//       image: user.image,
//     },
//   });
// });

// // Login user
// export const login = asyncHandler(async (req, res) => {
//   const { email, password } = req.body;

//   // Validate required fields
//   if (!email || !password) {
//     const error = new Error("Please provide email and password");
//     error.statusCode = 400;
//     throw error;
//   }

//   // Find user by email
//   const user = await User.findOne({ email: email.toLowerCase() });

//   if (!user) {
//     const error = new Error("Invalid credentials");
//     error.statusCode = 401;
//     throw error;
//   }

//   // Verify password
//   const isPasswordCorrect = await user.comparePassword(password);

//   if (!isPasswordCorrect) {
//     const error = new Error("Invalid credentials");
//     error.statusCode = 401;
//     throw error;
//   }

//   // Create session with device info
//   const { session, token } = await createSession(user._id, req);

//   // Set cookie and return response
//   return res
//     .cookie("token", token, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production", // true in production
//       signed: true,
//       maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
//       sameSite: "strict",
//     })
//     .status(200)
//     .json({
//       success: true,
//       message: "Login successful",
//       token, // Also send in response for mobile apps
//       data: {
//         user: {
//           _id: user._id,
//           name: user.name,
//           email: user.email,
//           role: user.role,
//           image: user.image,
//           propertyId: user.propertyId,
//         },
//         session: {
//           _id: session._id,
//           device: session.device,
//           browser: session.browser,
//           expiresAt: session.expiresAt,
//         },
//       },
//     });
// });

// // Logout user (current device only)
// export const logout = asyncHandler(async (req, res) => {
//   // Get token from cookie or header
//   const token =
//     req.signedCookies.token ||
//     req.headers.authorization?.replace("Bearer ", "");

//   if (!token) {
//     const error = new Error("No active session found");
//     error.statusCode = 401;
//     throw error;
//   }

//   // Delete session
//   await deleteSession(token);

//   // Clear cookie
//   return res
//     .clearCookie("token", {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       signed: true,
//       sameSite: "strict",
//     })
//     .status(200)
//     .json({
//       success: true,
//       message: "Logout successful",
//     });
// });

// // Verify token and get current user
// export const verifyToken = asyncHandler(async (req, res) => {
//   // Get token from cookie or header
//   const token =
//     req.signedCookies.token ||
//     req.headers.authorization?.replace("Bearer ", "");

//   if (!token) {
//     const error = new Error("No token provided");
//     error.statusCode = 401;
//     throw error;
//   }

//   try {
//     // Verify JWT
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     // Find session
//     const session = await Session.findOne({
//       _id: decoded.sessionId,
//       userId: decoded.userId,
//       token,
//     });

//     if (!session) {
//       const error = new Error("Session not found or expired");
//       error.statusCode = 401;
//       throw error;
//     }

//     // Check if session is expired
//     if (session.expiresAt < new Date()) {
//       await session.deleteOne();
//       const error = new Error("Session expired");
//       error.statusCode = 401;
//       throw error;
//     }

//     // Get user
//     const user = await User.findById(decoded.userId).select("-password");

//     if (!user) {
//       const error = new Error("User not found");
//       error.statusCode = 404;
//       throw error;
//     }

//     // Update session last active
//     session.lastActive = Date.now();
//     await session.save();

//     return res.status(200).json({
//       success: true,
//       message: "Token is valid",
//       data: {
//         user: {
//           _id: user._id,
//           name: user.name,
//           email: user.email,
//           role: user.role,
//           image: user.image,
//           propertyId: user.propertyId,
//         },
//         session: {
//           _id: session._id,
//           device: session.device,
//           browser: session.browser,
//           lastActive: session.lastActive,
//           expiresAt: session.expiresAt,
//         },
//       },
//     });
//   } catch (error) {
//     if (error.name === "JsonWebTokenError") {
//       const err = new Error("Invalid token");
//       err.statusCode = 401;
//       throw err;
//     }
//     if (error.name === "TokenExpiredError") {
//       const err = new Error("Token expired");
//       err.statusCode = 401;
//       throw err;
//     }
//     throw error;
//   }
// });

// // Refresh token (extend session)
// export const refreshToken = asyncHandler(async (req, res) => {
//   // Get token from cookie or header
//   const oldToken =
//     req.signedCookies.token ||
//     req.headers.authorization?.replace("Bearer ", "");

//   if (!oldToken) {
//     const error = new Error("No token provided");
//     error.statusCode = 401;
//     throw error;
//   }

//   try {
//     // Verify old token
//     const decoded = jwt.verify(oldToken, process.env.JWT_SECRET);

//     // Find session
//     const session = await Session.findOne({
//       _id: decoded.sessionId,
//       userId: decoded.userId,
//     });

//     if (!session) {
//       const error = new Error("Session not found");
//       error.statusCode = 401;
//       throw error;
//     }

//     // Check if session is expired
//     if (session.expiresAt < new Date()) {
//       await session.deleteOne();
//       const error = new Error("Session expired");
//       error.statusCode = 401;
//       throw error;
//     }

//     // Generate new token
//     const newToken = jwt.sign(
//       { userId: session.userId, sessionId: session._id },
//       process.env.JWT_SECRET,
//       { expiresIn: "30d" }
//     );

//     // Update session
//     session.token = newToken;
//     session.lastActive = Date.now();
//     session.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
//     await session.save();

//     // Get user
//     const user = await User.findById(session.userId).select("-password");

//     // Set new cookie
//     return res
//       .cookie("token", newToken, {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === "production",
//         signed: true,
//         maxAge: 30 * 24 * 60 * 60 * 1000,
//         sameSite: "strict",
//       })
//       .status(200)
//       .json({
//         success: true,
//         message: "Token refreshed successfully",
//         token: newToken,
//         data: {
//           user: {
//             _id: user._id,
//             name: user.name,
//             email: user.email,
//             role: user.role,
//             image: user.image,
//             propertyId: user.propertyId,
//           },
//           session: {
//             _id: session._id,
//             expiresAt: session.expiresAt,
//           },
//         },
//       });
//   } catch (error) {
//     if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
//       const err = new Error("Invalid or expired token");
//       err.statusCode = 401;
//       throw err;
//     }
//     throw error;
//   }
// });