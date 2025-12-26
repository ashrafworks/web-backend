import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import cookieParser from "socket.io-cookie-parser";
import User from "../models/userModel.js";
import Session from "../models/sessionModel.js";



const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://192.168.100.107:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Socket authentication middleware
  io.use(cookieParser("secret-key"));

  io.use(async (socket, next) => {
    try {
      // console.log(decodeURIComponent(socket.request.headers.cookie)); // all cookie set is this variable
      const token = socket.request.signedCookies.token;  
      console.log({token});

      if(!token) throw {
        codeStatus: 401,
        message: 'Unauthorized',
      }

      const session = await Session.findById(token).populate('userId');
      if(!session) throw { message: 'Session not found'}

      const user = await User.findOne({_id: session.userId}).lean();
      if(!user) throw { message: 'User not found'}


      socket.userId = user._id;
      socket.userRole = user.role;
      next();
    } catch (error) {
      next(error);
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.userId} (${socket.userRole})`);

    // User apne room mein join ho
    socket.join(`user_${socket.userId}`);

    // Typing indicator
    socket.on("typing_start", ({ conversationId, receiverId }) => {
      socket.to(`user_${receiverId}`).emit("user_typing", {
        conversationId,
        userId: socket.userId,
      });
    });

    socket.on("typing_stop", ({ conversationId, receiverId }) => {
      socket.to(`user_${receiverId}`).emit("user_stopped_typing", {
        conversationId,
        userId: socket.userId,
      });
    });

    // Mark message as read
    socket.on("mark_read", async ({ messageId, conversationId }) => {
      try {
        const Message = require("../models/Message");
        const Conversation = require("../models/Conversation");

        await Message.findByIdAndUpdate(messageId, { isRead: true });

        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
          if (socket.userRole === "Admin") {
            conversation.unreadByAdmin = Math.max(
              0,
              conversation.unreadByAdmin - 1
            );
          } else {
            conversation.unreadCount = Math.max(
              0,
              conversation.unreadCount - 1
            );
          }
          await conversation.save();

          // Notify the other user
          const otherUserId =
            socket.userRole === "Admin"
              ? conversation.user
              : conversation.admin;
          io.to(`user_${otherUserId}`).emit("message_read", {
            messageId,
            conversationId,
          });
        }
      } catch (error) {
        console.error("Mark read error:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });

  return io;
};

export default initializeSocket;
