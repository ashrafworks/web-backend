import Session from "../models/sessionModel.js";
import User from "../models/userModel.js";
import { asyncHandler } from "../utils/asyncHandler.js";


export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const user = await User.findOne({ email }).lean();
  //check if user exist then throw error
  if (user) 
    throw {
      statusCode: 409,
      message: "Email already exists",
    };

  await User.create({
    name,
    email,
    password,
  });

  return res.status(200).json({
    success: true,
    message: "User registered successfully",
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  // first error declare
  const error = {
    statusCode: 401,
    message: "Invalid Credentials",
  };

  const user = await User.findOne({ email });
  if (!user) throw error;

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw error;

  const session = await Session.create({
    userId: user._id,
  });

  return res
    .cookie("token", session._id.toString(), {
      httpOnly: true,
      signed: true,
      maxAge: 60 * 1000 * 60 * 24 * 7,
    })
    .status(200)
    .json({
      success: true,
      message: "Logged In User",
    });
});

export const logout = asyncHandler(async (req, res) => {
  console.log(req.session);
  await req.session.deleteOne();
  return res.clearCookie('token').status(204).end();
})
