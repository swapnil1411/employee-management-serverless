const jwt = require("jsonwebtoken");
const User = require("../models/user.js");
require("dotenv").config();

const authMiddleware = async (req) => {
  const token = req.headers.authorization;
  
  if (!token || !token.startsWith("Bearer ")) {
    return null;
  }

  try {
    const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password"); // Exclude password
    
    return user ? user : null;
  } catch (error) {
    console.error("❌ Token verification failed:", error.message);
    return null;
  }
};

module.exports = authMiddleware;
