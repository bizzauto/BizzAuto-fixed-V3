const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

// Shared helper to extract reseller ID from Authorization header
function getResellerId(authHeader) {
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const match = token.match(/^rp-token-(.+?)-\d+$/);
  return match ? match[1] : null;
}

module.exports = prisma;
module.exports.getResellerId = getResellerId;
