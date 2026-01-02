// import express from "express";
// import {
//   register,
//   login,
//   logout,
//   verifyToken,
//   refreshToken,
// } from "../controllers/authController.js";
// import { authMiddleware } from "../middlewares/authMiddleware.js";

// const router = express.Router();

// // ========== PUBLIC ROUTES ==========
// // Register new user
// router.post("/register", register);

// // Login user
// router.post("/login", login);

// // Verify token (check if token is valid)
// router.post("/verify-token", verifyToken);

// // ========== PROTECTED ROUTES ==========
// // Logout (requires authentication)
// router.post("/logout", authMiddleware, logout);

// // Refresh token (extend session)
// router.post("/refresh-token", refreshToken);

// export default router;