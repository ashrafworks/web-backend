import express from "express";
import { checkAuth } from "../middlewares/authMiddleware.js";
import {
  archiveConversation,
  deleteConversation,
  getAllConversations,
  getMessages,
  getOrCreateConversation,
  sendMessage,
} from "../controllers/MessageController.js";

const router = express.Router();

router.post("/conversation", checkAuth, getOrCreateConversation);

router.get("/conversations", checkAuth, getAllConversations);

router.get("/conversation/:conversationId/messages", checkAuth, getMessages);

router.post("/message", checkAuth, sendMessage);

router.patch(
  "/conversation/:conversationId/archive",
  checkAuth,
  archiveConversation
);

router.delete("/conversation/:conversationId", checkAuth, deleteConversation);

export default router;
