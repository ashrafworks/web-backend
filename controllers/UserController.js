import User from "../models/userModel.js";
import Session from "../models/sessionModel.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import crypto from "crypto";
import { createSession, deleteSession } from "../utils/sessionHelper.js";

// AUTHENTICATION

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  if (!name || !email || !password) {
    const error = new Error("Please provide all required fields");
    error.statusCode = 400;
    throw error;
  }

  if (password.length < 8) {
    const error = new Error("Password must be at least 8 characters long");
    error.statusCode = 400;
    throw error;
  }

  if (confirmPassword && password !== confirmPassword) {
    const error = new Error("Passwords do not match");
    error.statusCode = 400;
    throw error;
  }

  if (name.trim().length < 3) {
    const error = new Error("Name must be at least 3 characters long");
    error.statusCode = 400;
    throw error;
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });

  if (existingUser) {
    const error = new Error("Email already exists");
    error.statusCode = 409;
    throw error;
  }

  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase(),
    password,
  });

  return res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image,
    },
  });
});

// Login user
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    const error = new Error("Please provide email and password");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  const isPasswordCorrect = await user.comparePassword(password);

  if (!isPasswordCorrect) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  const { session } = await createSession(user._id, req);

  return res
    .cookie("token", session._id.toString(), {
      httpOnly: true,
      secure: true,
      // secure: process.env.NODE_ENV === "production",
      signed: true,
      maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days
      sameSite: "none",
    })
    .status(200)
    .json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
          propertyId: user.propertyId,
        },
        session: {
          _id: session._id,
          device: session.device,
          browser: session.browser,
          expiresAt: session.expiresAt,
        },
      },
    });
});

export const logout = asyncHandler(async (req, res) => {
  const sessionId = req.session._id;

  if (!sessionId) {
    const error = new Error("No active session found");
    error.statusCode = 401;
    throw error;
  }

  await Session.findByIdAndDelete(sessionId);

  return res
    .clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      signed: true,
      sameSite: "strict",
    })
    .status(200)
    .json({
      success: true,
      message: "Logout successful",
    });
});

// USER PROFILE

export const getUser = asyncHandler(async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "User data fetched successfully",
    data: {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      image: req.user.image,
      role: req.user.role,
      propertyId: req.user.propertyId || null,
    },
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  if (!req.body) {
    const error = new Error(
      "Please provide at least one field name or image to update"
    );
    error.statusCode = 400;
    throw error;
  }

  const userId = req.user._id;
  const { name, image } = req.body;

  const updateData = {};

  if (name) {
    if (name.trim().length < 3) {
      const error = new Error("Name must be at least 3 characters long");
      error.statusCode = 400;
      throw error;
    }
    updateData.name = name.trim();
  }

  if (image) {
    if (typeof image !== "string" || !image.trim()) {
      const error = new Error("Invalid image URL");
      error.statusCode = 400;
      throw error;
    }
    updateData.image = image.trim();
  }

  const user = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true,
  }).select("-password");

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: user,
  });
});

// PASSWORD MANAGEMENT

export const changePassword = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    const error = new Error("Please provide all required fields");
    error.statusCode = 400;
    throw error;
  }

  if (newPassword.length < 8) {
    const error = new Error("New password must be at least 8 characters long");
    error.statusCode = 400;
    throw error;
  }

  if (newPassword !== confirmPassword) {
    const error = new Error("New password and confirm password do not match");
    error.statusCode = 400;
    throw error;
  }

  if (currentPassword === newPassword) {
    const error = new Error(
      "New password cannot be the same as current password"
    );
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const isPasswordCorrect = await user.comparePassword(currentPassword);

  if (!isPasswordCorrect) {
    const error = new Error("Current password is incorrect");
    error.statusCode = 401;
    throw error;
  }

  user.password = newPassword;
  await user.save();

  return res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});

export const requestPasswordReset = asyncHandler(async (req, res) => {
  console.log(req.body);
  const { email } = req.body;

  if (!email || !email.trim()) {
    const error = new Error("Email is required");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() });

  if (!user) {
    return res.status(200).json({
      success: true,
      message: "If the email exists, a password reset link has been sent",
    });
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenHash = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  user.resetPasswordToken = resetTokenHash;
  user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
  await user.save();

  const resetUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/users/reset-password/${resetToken}`;

  console.log("Password Reset URL:", resetUrl);

  return res.status(200).json({
    success: true,
    message: "Password reset link sent successfully",
    resetToken, //  only for testing
    resetUrl, // only for testing
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { newPassword, confirmPassword } = req.body;

  if (!token) {
    const error = new Error("Reset token is required");
    error.statusCode = 400;
    throw error;
  }

  if (!newPassword || !confirmPassword) {
    const error = new Error("Please provide new password and confirmation");
    error.statusCode = 400;
    throw error;
  }

  if (newPassword.length < 8) {
    const error = new Error("Password must be at least 8 characters long");
    error.statusCode = 400;
    throw error;
  }

  if (newPassword !== confirmPassword) {
    const error = new Error("Passwords do not match");
    error.statusCode = 400;
    throw error;
  }

  const resetTokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken: resetTokenHash,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    const error = new Error("Invalid or expired reset token");
    error.statusCode = 400;
    throw error;
  }

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  await Session.deleteMany({ userId: user._id });

  return res.status(200).json({
    success: true,
    message: "Password reset successful. Please login with your new password",
  });
});

// SESSION MANAGEMENT

export const getActiveSessions = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const sessions = await Session.find({ userId })
    .select("device browser ip location createdAt lastActive")
    .sort({ lastActive: -1 });

  return res.status(200).json({
    success: true,
    message: "Active sessions fetched successfully",
    data: sessions,
    count: sessions.length,
  });
});

export const deleteSpecificSession = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { sessionId } = req.params;

  if (!sessionId) {
    const error = new Error("Session ID is required");
    error.statusCode = 400;
    throw error;
  }

  const session = await Session.findOne({
    _id: sessionId,
    userId,
  });

  if (!session) {
    const error = new Error("Session not found");
    error.statusCode = 404;
    throw error;
  }

  await Session.findByIdAndDelete(sessionId);

  return res.status(200).json({
    success: true,
    message: "Session deleted successfully",
  });
});

export const logoutAllDevices = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const currentSessionId = req.session._id;

  const deleteAllIncludingCurrent = req.body.includeCurrentDevice || false;

  if (deleteAllIncludingCurrent) {
    await Session.deleteMany({ userId });
  } else {
    await Session.deleteMany({
      userId,
      _id: { $ne: currentSessionId },
    });
  }

  return res.status(200).json({
    success: true,
    message: deleteAllIncludingCurrent
      ? "Logged out from all devices successfully"
      : "Logged out from all other devices successfully",
  });
});

// ADMIN FUNCTIONALITY

export const allUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, search = "", role } = req.query;

  if (req.user.role !== "admin") {
    const error = new Error("Only admin can view all users");
    error.statusCode = 403;
    throw error;
  }

  const query = {};

  if (search && search.trim()) {
    query.$or = [
      { name: { $regex: search.trim(), $options: "i" } },
      { email: { $regex: search.trim(), $options: "i" } },
    ];
  }

  if (role) {
    query.role = role;
  }

  const users = await User.find(query)
    .select("-password")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await User.countDocuments(query);

  return res.status(200).json({
    success: true,
    message: "All users fetched successfully",
    data: users,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    },
  });
});

// Update user by ID (Admin only) - NEW FUNCTION
export const updateUserById = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { name, email, role, password, image } = req.body;

  // Check if user is admin
  if (req.user.role !== "admin") {
    const error = new Error("Only admin can update users");
    error.statusCode = 403;
    throw error;
  }

  if (!userId) {
    const error = new Error("User ID is required");
    error.statusCode = 400;
    throw error;
  }

  // Find user
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  // Prepare update data
  const updateData = {};

  // Validate and update name
  if (name !== undefined) {
    if (name.trim().length < 3) {
      const error = new Error("Name must be at least 3 characters long");
      error.statusCode = 400;
      throw error;
    }
    updateData.name = name.trim();
  }

  // Validate and update email
  if (email !== undefined) {
    // Check if email already exists (excluding current user)
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
      _id: { $ne: userId },
    });

    if (existingUser) {
      const error = new Error("Email already exists");
      error.statusCode = 409;
      throw error;
    }

    updateData.email = email.toLowerCase();
  }

  // Update role
  if (role !== undefined) {
    if (!["user", "admin"].includes(role)) {
      const error = new Error("Invalid role");
      error.statusCode = 400;
      throw error;
    }
    updateData.role = role;
  }

  // Update image
  if (image !== undefined) {
    updateData.image = image;
  }

  // Update password if provided
  if (password) {
    if (password.length < 8) {
      const error = new Error("Password must be at least 8 characters long");
      error.statusCode = 400;
      throw error;
    }
    user.password = password;
  }

  // Update user fields
  Object.assign(user, updateData);
  await user.save();

  // Return updated user without password
  const updatedUser = await User.findById(userId).select("-password");

  return res.status(200).json({
    success: true,
    message: "User updated successfully",
    data: updatedUser,
  });
});

// Delete user by ID (Admin only) - NEW FUNCTION
export const deleteUserById = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const adminId = req.user._id;

  // Check if user is admin
  if (req.user.role !== "admin") {
    const error = new Error("Only admin can delete users");
    error.statusCode = 403;
    throw error;
  }

  if (!userId) {
    const error = new Error("User ID is required");
    error.statusCode = 400;
    throw error;
  }

  // Check if trying to delete self
  if (userId === adminId.toString()) {
    const error = new Error("You cannot delete your own account from here");
    error.statusCode = 400;
    throw error;
  }

  // Find user
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  // Delete all user sessions
  await Session.deleteMany({ userId });

  // Delete user
  await User.findByIdAndDelete(userId);

  return res.status(200).json({
    success: true,
    message: "User deleted successfully",
  });
});

// ACCOUNT MANAGEMENT

export const deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { password } = req.body;

  if (!password) {
    const error = new Error("Password is required to delete account");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const isPasswordCorrect = await user.comparePassword(password);

  if (!isPasswordCorrect) {
    const error = new Error("Incorrect password");
    error.statusCode = 401;
    throw error;
  }

  await Session.deleteMany({ userId });

  await User.findByIdAndDelete(userId);

  return res.status(200).json({
    success: true,
    message: "Account deleted successfully",
  });
});