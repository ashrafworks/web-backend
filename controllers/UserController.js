import User from "../models/userModel.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getUser = asyncHandler(async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "user data",
    data: {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      image: req.user.image,
      role: req.user.role,
    },
  });
});

export const allUsers = asyncHandler(async (req, res) => {
  const allUsers = await User.find();
  return res.status(200).json({
    success: true,
    message: "All users data",
    data: allUsers,
  });
});
