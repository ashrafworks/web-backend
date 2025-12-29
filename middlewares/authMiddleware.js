import Session from "../models/sessionModel.js";
import User from "../models/userModel.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const checkAuth = asyncHandler(async (req, res, next) => {
  const { token } = req.signedCookies;
  console.log({token});
  
  const session = await Session.findOne({ _id: token });
  if (!token || !session) {
    const error = {
      statusCode: 401,
      message: "User not logged in",
    }
    throw error;  // throwing error
  }
  
  req.session = session;
  const user = await User.findOne({ _id: session.userId }).lean();
  req.user = user;

  next();
});

export const authorizeAdmim = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    const error = {
      statusCode: 403,
      message: "Admin access denied",
    };
    throw error;
  }

  next();
});
