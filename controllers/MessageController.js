import Message from "../models/messageModel.js";
import Conversation from "../models/conversationModel.js";
import User from "../models/userModel.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Get or create conversation
export const getOrCreateConversation = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userRole = req.user.role; // 'User' or 'Admin'

  // User ke liye default admin se conversation banao
  if (userRole === "user") {
    // Find default admin or first admin
    let defaultAdmin = await User.findById(process.env.DEFAULT_ADMIN_ID);

    if (!defaultAdmin) {
      throw { statusCode: 400, message: "No admin available for chat" }
    }

    let conversation = await Conversation.findOne({
      userId,
      adminId: defaultAdmin._id,
    })
      .populate("userId", "name email avatar")
      .populate("adminId", "name email avatar");

    console.log({ userId });
    console.log({ adminId: defaultAdmin._id });
    if (!conversation) {
      conversation = await Conversation.create({
        userId,
        adminId: defaultAdmin._id,
      });

      conversation = await Conversation.findById(conversation._id)
        .populate("userId", "name email avatar")
        .populate("adminId", "name email avatar");
    }

    return res.status(200).json({ conversation });
  }

  // Admin ke liye - specific user ke saath conversation
  console.log(req.body.currentUser);
  const targetUserId = req.body.currentUser.id;
  if (!targetUserId) {
    return res.status(400).json({ message: "User ID is required for admin" });
  }

  let conversation = await Conversation.findOne({
    user: targetUserId,
    admin: userId,
  })
    .populate("userId", "name email avatar")
    .populate("adminId", "name email avatar");

  if (!conversation) {
    conversation = await Conversation.create({
      user: targetUserId,
      admin: userId,
    });

    conversation = await Conversation.findById(conversation._id)
      .populate("user", "name email avatar")
      .populate("admin", "name email avatar");
  }

  res.status(200).json({ conversation });
});

// Get all conversations (Admin ke liye - multiple users)
export const getAllConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    const { filter = "all", search = "" } = req.query;
    let query = {};

    if (userRole === "admin") {
      query.admin = userId;
      if (filter === "archived") {
        query.archivedByAdmin = true;
      } else {
        query.archivedByAdmin = false;
      }
    } else {
      query.user = userId;
      if (filter === "archived") {
        query.archived = true;
      } else {
        query.archived = false;
      }
    }
    let conversations = await Conversation.find({ adminId: query.admin })
      .populate("userId", "name email avatar")
      .populate("adminId", "name email avatar")
      .sort({ lastMessageDate: -1 });

    // Apply unread filter
    if (filter === "unread") {
      conversations = conversations.filter((c) =>
        userRole === "Admin" ? c.unreadByAdmin > 0 : c.unreadCount > 0
      );
    }

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      conversations = conversations.filter((c) => {
        const otherUser = userRole === "Admin" ? c.user : c.admin;
        return (
          otherUser.name.toLowerCase().includes(searchLower) ||
          c.lastMessage.toLowerCase().includes(searchLower)
        );
      });
    }

    res.status(200).json({ conversations });
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get messages for a conversation
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Check if user is part of this conversation
    if (
      userRole === "admin" &&
      conversation.adminId.toString() !== userId.toString()
    ) {
      return res.status(403).json({ message: "Access denied" });
    }
    if (
      userRole === "user" &&
      conversation.userId.toString() !== userId.toString()
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    const messages = await Message.find({ conversationId })
      .populate("sender", "name email avatar")
      .sort({ createdAt: 1 });

    // Mark messages as read
    if (userRole === "admin") {
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

    res.status(200).json({ messages });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Send message
export const sendMessage = async (req, res) => {
  try {
    const { conversationId, text } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Message text is required" });
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Check access
    if (
      userRole === "admin" &&
      conversation.adminId.toString() !== userId.toString()
    ) {
      return res.status(403).json({ message: "Access denied" });
    }
    if (
      userRole === "user" &&
      conversation.userId.toString() !== userId.toString()
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    const message = await Message.create({
      conversationId,
      sender: userId,
      senderModel: userRole,
      text: text.trim(),
    });

    const populatedMessage = await Message.findById(message._id).populate(
      "sender",
      "name email avatar"
    );

    // Update conversation
    conversation.lastMessage = text.trim();
    conversation.lastMessageDate = new Date();

    if (userRole === "admin") {
      conversation.unreadCount += 1;
    } else {
      conversation.unreadByAdmin += 1;
    }

    await conversation.save();

    // Emit socket event (handled in socket.js)
    const io = req.app.get("io");
    const receiverId =
      userRole === "admin" ? conversation.userId : conversation.adminId;

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

    res.status(201).json({ message: populatedMessage });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Archive conversation
export const archiveConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (userRole === "admin") {
      conversation.archivedByAdmin = !conversation.archivedByAdmin;
    } else {
      conversation.archived = !conversation.archived;
    }

    await conversation.save();

    res.status(200).json({
      message: "Conversation archive status updated",
      archived:
        userRole === "admin"
          ? conversation.archivedByAdmin
          : conversation.archived,
    });
  } catch (error) {
    console.error("Archive conversation error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete conversation
export const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Check access
    if (
      userRole === "admin" &&
      conversation.adminId.toString() !== userId.toString()
    ) {
      return res.status(403).json({ message: "Access denied" });
    }
    if (
      userRole === "user" &&
      conversation.userId.toString() !== userId.toString()
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Delete all messages
    await Message.deleteMany({ conversationId });

    // Delete conversation
    await Conversation.findByIdAndDelete(conversationId);

    res.status(200).json({ message: "Conversation deleted successfully" });
  } catch (error) {
    console.error("Delete conversation error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
