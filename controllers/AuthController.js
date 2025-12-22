import Session from "../models/sessionModel.js";
import User from "../models/userModel.js";

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    //check if user exist then throu error
    const user = await User.findOne({ email }).lean();
    if (user) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    const data = await User.create({
      name,
      email,
      password,
    });

    res.status(200).json({
      success: true,
      message: "User registered successfully",
      data,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages,
      });
    }

    res.status(400).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    const isMatch = await user.comparePassword(password);
    if (!user || !isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid Credentials" });
    }

    const session = await Session.create({
      userId: user._id,
    });

    res.cookie("token", session._id.toString(), {
      httpOnly: true,
      signed: true,
      maxAge: 60 * 1000 * 60 * 24 * 7,
    });

    return res.status(200).json({
      success: true,
      message: "Logged In User",
    });
  } catch (error) {
    console.log("login route error", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
