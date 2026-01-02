import { UAParser } from "ua-parser-js";
import Session from "../models/sessionModel.js";

export async function createSession(userId, req) {
  const parser = new UAParser(req.headers["user-agent"]);
  const deviceType = parser.getDevice().type;
  const device = deviceType
    ? deviceType.charAt(0).toUpperCase() + deviceType.slice(1)
    : "Desktop";
  const browserName = parser.getBrowser().name || "Unknown";
  const browserVersion = parser.getBrowser().version || "";
  const browser = `${browserName} ${browserVersion}`.trim();
  const ip = req.ip || req.connection?.remoteAddress || "Unknown";

  const session = await Session.create({
    userId,
    device,
    browser,
    ip,
    lastActive: Date.now(),
    expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days
  });

  return { session };
}

export async function verifySession(sessionId) {
  const session = await Session.findById(sessionId);

  if (!session) {
    throw new Error("Session not found or expired");
  }

  if (session.expiresAt < new Date()) {
    await session.deleteOne();
    throw new Error("Session expired");
  }

  session.lastActive = Date.now();
  await session.save();

  return { userId: session.userId, sessionId: session._id };
}

export async function deleteSession(sessionId) {
  try {
    await Session.findByIdAndDelete(sessionId);
    return true;
  } catch (error) {
    return false;
  }
}

export async function deleteAllUserSessions(userId) {
  const result = await Session.deleteMany({ userId });
  return result.deletedCount;
}

export async function getUserSessions(userId) {
  const sessions = await Session.find({ userId })
    .select("device browser ip location createdAt lastActive expiresAt")
    .sort({ lastActive: -1 });
  return sessions;
}

export async function cleanupExpiredSessions() {
  const result = await Session.deleteMany({
    expiresAt: { $lt: new Date() },
  });
  return result.deletedCount;
}
