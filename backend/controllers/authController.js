const jwt = require("jsonwebtoken");
const User = require("../models/User");
const bcrypt = require("bcrypt");

// Helper to sanitize user object and ensure no sensitive data is leaked
const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  createdAt: user.createdAt,
  github: user.github?.login ? {
    login: user.github.login,
    avatarUrl: user.github.avatarUrl,
    connectedAt: user.github.connectedAt,
  } : undefined,
});

// Register user
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Only allow Gmail accounts
    if (!email || !/^[a-zA-Z0-9._%+\-]+@gmail\.com$/i.test(email)) {
      return res.status(400).json({ message: "Only Gmail accounts (@gmail.com) are allowed to sign up." });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const strongPassword = /^(?=.*[A-Z])(?=.*[0-9]).{8,}$/;
    if (!strongPassword.test(password)) {
      return res.status(400).json({
        message: "Password must include 1 uppercase, 1 number, min 8 chars",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashpassord = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashpassord,
    });

    res.status(201).json({
      message: "User registered successfully",
      user: sanitizeUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login user 
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Create token (stores only user id, signed with secret)
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

// Get current user profile (using verified JWT)
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password -github.accessToken -github.tokenIv");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};