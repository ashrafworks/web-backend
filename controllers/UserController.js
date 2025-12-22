import User from "../models/userModel.js";

export async function getUser(req, res) {
  try {
    res.status(200).json({
      success: true,
      message: "user data",
      data: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        image: req.user.image,
        role: req.user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

export async function allUsers(req, res) {
  try {
    const allUsers = await User.find();
    return res.status(200).json({
      success: true,
      message: "All users data",
      data: allUsers,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
}
