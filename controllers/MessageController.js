import Message from "../models/messageModel.js";
import Conversation from "../models/conversationModel.js";
import User from "../models/userModel.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Get or create conversation
export const getOrCreateConversation = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userRole = req.user.role;

  // User ke liye default admin se conversation banao
  if (userRole === "user") {
    // Find default admin or first admin
    let defaultAdmin = await User.findById(process.env.DEFAULT_ADMIN_ID);

    // If default admin not found, find any admin
    if (!defaultAdmin) {
      defaultAdmin = await User.findOne({ role: "admin" });
    }

    if (!defaultAdmin) {
      const error = new Error("No admin available for chat");
      error.statusCode = 404;
      throw error;
    }

    let conversation = await Conversation.findOne({
      userId,
      adminId: defaultAdmin._id,
    })
      .populate("userId", "name email image")
      .populate("adminId", "name email image");

    if (!conversation) {
      conversation = await Conversation.create({
        userId,
        adminId: defaultAdmin._id,
      });

      conversation = await Conversation.findById(conversation._id)
        .populate("userId", "name email image")
        .populate("adminId", "name email image");
    }

    return res.status(200).json({
      success: true,
      data: conversation,
    });
  }

  // Admin ke liye - specific user ke saath conversation
  const targetUserId = req.body.currentUser?.id;

  if (!targetUserId) {
    const error = new Error("User ID is required for admin");
    error.statusCode = 400;
    throw error;
  }

  // Check if target user exists
  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    const error = new Error("Target user not found");
    error.statusCode = 404;
    throw error;
  }

  let conversation = await Conversation.findOne({
    userId: targetUserId,
    adminId: userId,
  })
    .populate("userId", "name email image")
    .populate("adminId", "name email image");

  if (!conversation) {
    conversation = await Conversation.create({
      userId: targetUserId,
      adminId: userId,
    });

    conversation = await Conversation.findById(conversation._id)
      .populate("userId", "name email image")
      .populate("adminId", "name email image");
  }

  res.status(200).json({
    success: true,
    data: conversation,
  });
});

// Get all conversations (Admin ke liye - multiple users)
export const getAllConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userRole = req.user.role;
  const { filter = "all", search = "" } = req.query;

  let query = {};

  if (userRole === "admin") {
    query.adminId = userId;
    if (filter === "archived") {
      query.archivedByAdmin = true;
    } else if (filter === "all") {
      query.archivedByAdmin = false;
    }
  } else {
    query.userId = userId;
    if (filter === "archived") {
      query.archived = true;
    } else if (filter === "all") {
      query.archived = false;
    }
  }

  let conversations = await Conversation.find(query)
    .populate("userId", "name email image")
    .populate("adminId", "name email image")
    .sort({ lastMessageDate: -1 });

  // Apply unread filter
  if (filter === "unread") {
    conversations = conversations.filter((c) =>
      userRole === "admin" ? c.unreadByAdmin > 0 : c.unreadCount > 0
    );
  }

  // Apply search filter
  if (search && search.trim()) {
    const searchLower = search.toLowerCase().trim();
    conversations = conversations.filter((c) => {
      const otherUser = userRole === "admin" ? c.userId : c.adminId;
      const userName = otherUser?.name || "";
      const lastMsg = c.lastMessage || "";
      
      return (
        userName.toLowerCase().includes(searchLower) ||
        lastMsg.toLowerCase().includes(searchLower)
      );
    });
  }

  res.status(200).json({
    success: true,
    data: conversations,
    count: conversations.length,
  });
});

// Get messages for a conversation
export const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;
  const userRole = req.user.role;

  if (!conversationId) {
    const error = new Error("Conversation ID is required");
    error.statusCode = 400;
    throw error;
  }

  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    const error = new Error("Conversation not found");
    error.statusCode = 404;
    throw error;
  }

  // Check if user is part of this conversation
  const isAdmin = userRole === "admin";
  const isAuthorized = isAdmin
    ? conversation.adminId.toString() === userId.toString()
    : conversation.userId.toString() === userId.toString();

  if (!isAuthorized) {
    const error = new Error("Access denied to this conversation");
    error.statusCode = 403;
    throw error;
  }

  const messages = await Message.find({ conversationId })
    .populate("sender", "name email image")
    .sort({ createdAt: 1 });

  // Mark messages as read
  if (isAdmin) {
    await Message.updateMany(
      { conversationId, senderModel: "user", isRead: false },
      { isRead: true }
    );
    conversation.unreadByAdmin = 0;
  } else {
    await Message.updateMany(
      { conversationId, senderModel: "admin", isRead: false },
      { isRead: true }
    );
    conversation.unreadCount = 0;
  }

  await conversation.save();

  res.status(200).json({
    success: true,
    data: messages,
    count: messages.length,
  });
});

// Send message
export const sendMessage = asyncHandler(async (req, res) => {
  const { conversationId, text } = req.body;
  const userId = req.user._id;
  const userRole = req.user.role;

  // Validate required fields
  if (!conversationId) {
    const error = new Error("Conversation ID is required");
    error.statusCode = 400;
    throw error;
  }

  if (!text || !text.trim()) {
    const error = new Error("Message text is required");
    error.statusCode = 400;
    throw error;
  }

  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    const error = new Error("Conversation not found");
    error.statusCode = 404;
    throw error;
  }

  // Check access
  const isAdmin = userRole === "admin";
  const isAuthorized = isAdmin
    ? conversation.adminId.toString() === userId.toString()
    : conversation.userId.toString() === userId.toString();

  if (!isAuthorized) {
    const error = new Error("Access denied to this conversation");
    error.statusCode = 403;
    throw error;
  }

  // Create message
  const message = await Message.create({
    conversationId,
    sender: userId,
    senderModel: userRole,
    text: text.trim(),
  });

  const populatedMessage = await Message.findById(message._id).populate(
    "sender",
    "name email image"
  );

  // Update conversation
  conversation.lastMessage = text.trim();
  conversation.lastMessageDate = new Date();

  if (isAdmin) {
    conversation.unreadCount += 1;
  } else {
    conversation.unreadByAdmin += 1;
  }

  await conversation.save();

  // Emit socket event (handled in socket.js)
  try {
    const io = req.app.get("io");
    if (io) {
      const receiverId = isAdmin ? conversation.userId : conversation.adminId;

      io.to(`user_${receiverId}`).emit("new_message", {
        message: populatedMessage,
        conversation: {
          _id: conversation._id,
          lastMessage: conversation.lastMessage,
          lastMessageDate: conversation.lastMessageDate,
          unreadCount: conversation.unreadCount,
          unreadByAdmin: conversation.unreadByAdmin,
        },
      });
    }
  } catch (socketError) {
    // Log socket error but don't fail the request
    console.error("Socket emission error:", socketError);
  }

  res.status(201).json({
    success: true,
    message: "Message sent successfully",
    data: populatedMessage,
  });
});

// Archive conversation
export const archiveConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;
  const userRole = req.user.role;

  if (!conversationId) {
    const error = new Error("Conversation ID is required");
    error.statusCode = 400;
    throw error;
  }

  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    const error = new Error("Conversation not found");
    error.statusCode = 404;
    throw error;
  }

  // Check access
  const isAdmin = userRole === "admin";
  const isAuthorized = isAdmin
    ? conversation.adminId.toString() === userId.toString()
    : conversation.userId.toString() === userId.toString();

  if (!isAuthorized) {
    const error = new Error("Access denied to this conversation");
    error.statusCode = 403;
    throw error;
  }

  // Toggle archive status
  if (isAdmin) {
    conversation.archivedByAdmin = !conversation.archivedByAdmin;
  } else {
    conversation.archived = !conversation.archived;
  }

  await conversation.save();

  res.status(200).json({
    success: true,
    message: `Conversation ${
      (isAdmin ? conversation.archivedByAdmin : conversation.archived)
        ? "archived"
        : "unarchived"
    } successfully`,
    data: {
      archived: isAdmin ? conversation.archivedByAdmin : conversation.archived,
    },
  });
});

// Delete conversation
export const deleteConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;
  const userRole = req.user.role;

  if (!conversationId) {
    const error = new Error("Conversation ID is required");
    error.statusCode = 400;
    throw error;
  }

  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    const error = new Error("Conversation not found");
    error.statusCode = 404;
    throw error;
  }

  // Check access
  const isAdmin = userRole === "admin";
  const isAuthorized = isAdmin
    ? conversation.adminId.toString() === userId.toString()
    : conversation.userId.toString() === userId.toString();

  if (!isAuthorized) {
    const error = new Error("Access denied to this conversation");
    error.statusCode = 403;
    throw error;
  }

  // Delete all messages
  await Message.deleteMany({ conversationId });

  // Delete conversation
  await Conversation.findByIdAndDelete(conversationId);

  res.status(200).json({
    success: true,
    message: "Conversation deleted successfully",
  });
});