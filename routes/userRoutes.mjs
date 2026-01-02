import express from "express";
import {
  register,
  login,
  logout,
  getUser,
  updateProfile,
  changePassword,
  requestPasswordReset,
  resetPassword,
  getActiveSessions,
  deleteSpecificSession,
  logoutAllDevices,
  allUsers,
  deleteAccount,
  updateUserById,
  deleteUserById,
} from "../controllers/UserController.js";

import { checkAuth, authorizeAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password/:token", resetPassword);

router.post("/logout", checkAuth, logout);

router.get("/me", checkAuth, getUser);

router.patch("/update-profile", checkAuth, updateProfile);

router.patch("/change-password", checkAuth, changePassword);

router.get("/sessions", checkAuth, getActiveSessions);
router.delete("/sessions/:sessionId", checkAuth, deleteSpecificSession);
router.post("/logout-all-devices", checkAuth, logoutAllDevices);

router.delete("/delete-account", checkAuth, deleteAccount);

router.get("/all", checkAuth, authorizeAdmin, allUsers);

router.patch("/admin/update/:userId", checkAuth, authorizeAdmin, updateUserById);

router.delete("/:userId", checkAuth, authorizeAdmin, deleteUserById);


export default router;
