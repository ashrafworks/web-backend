import crypto from "node:crypto";

export default function parseSignedCookie(cookieHeader, cookieName, secret) {
  if (!cookieHeader) return null;
  const cookies = {};

  cookieHeader.split(";").forEach((cookie) => {
    const [key, ...v] = cookie.split("=");
    if (!key) return;
    cookies[key.trim()] = v.join("="); 
  });

  let value = cookies[cookieName.trim()];
  if (!value) return null;

  value = decodeURIComponent(value);

  if (!value.startsWith("s:")) return value;

  // fix slice
  const signed = value.slice(2);

  const parts = signed.split(".");
  if (parts.length !== 2) return null;

  const [originalValue, signature] = parts;

  // fix base64 digest
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(originalValue)
    .digest("base64")
    .replace(/=+$/, ""); 

  if (signature === expectedSignature) return originalValue;

  return null;
}

// Test
const cookieHeader =
  "sessionId=s%3A694bf524335e2bdad796af73.DtwwlEDjDoC3Hq1YXzb0AxMeuMqB%2FzRB5fqWOvipxhk";

const sessionId = parseSignedCookie(cookieHeader, "sessionId", "mysecretkey");

console.log({ sessionId });
