import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    lastMessage: {
      type: String,
      default: "",
    },

    lastMessageDate: {
      type: Date,
      default: Date.now,
    },

    unreadCount: {
      type: Number,
      default: 0,
    },

    unreadByAdmin: {
      type: Number,
      default: 0,
    },

    archived: {
      type: Boolean,
      default: false,
    },

    archivedByAdmin: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// ✅ ONE conversation per (userId + adminId)
conversationSchema.index(
  { userId: 1, adminId: 1 },
  { unique: true }
);

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;
