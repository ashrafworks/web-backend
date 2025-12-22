import Session from "../models/sessionModel.js";
import User from "../models/userModel.js";

export async function checkAuth(req, res, next) {
  try {
    const { token } = req.signedCookies;
    const session = await Session.findOne({_id: token});
    console.log({token});
    if (!token || !session) {
      return res.status(401).json({
        success: false,
        message: "User not logged in",
      });
    }
    const user = await User.findOne({ _id: session.userId });

    req.user = user;

    next();
  } catch (error) {
    console.log("checkAuth error", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}
