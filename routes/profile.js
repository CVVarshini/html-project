const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pool = require("../config/db");
const router = express.Router();

// Ensure photos directory exists
const photosDir = path.join(__dirname, "..", "photos");
if (!fs.existsSync(photosDir)) {
  fs.mkdirSync(photosDir);
}

// Multer config for profile photo
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, photosDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Middleware to check login
function requireLogin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ success: false, message: "Not logged in" });
  }
  next();
}

// Update profile
router.post("/profile", requireLogin, upload.single("profilePhoto"), async (req, res) => {
  try {
    const { fullName, email, phone, district } = req.body;
    const userId = req.session.userId;

    // Update user details
    await pool.query(
      "UPDATE users SET full_name=?, email=?, phone=?, district=? WHERE user_id=?",
      [fullName, email, phone, district, userId]
    );

    // Save profile photo if uploaded
    if (req.file) {
      const photoUrl = `/photos/${req.file.filename}`;
      try {
        await pool.query(
          `INSERT INTO user_photos (user_id, photo_url, mime_type, uploaded_at)
           VALUES (?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE photo_url=?, mime_type=?, uploaded_at=NOW()`,
          [userId, photoUrl, req.file.mimetype, photoUrl, req.file.mimetype]
        );
        console.log("Photo saved successfully for user:", userId, "URL:", photoUrl);
      } catch (err) {
        console.error("Error saving photo:", err);
      }
    }

    res.json({ success: true, message: "Profile updated successfully!" });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ success: false, message: "Error updating profile" });
  }
});

// Get profile
router.get("/user", requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    const [[user]] = await pool.query(
      "SELECT user_id, full_name, email, phone, district FROM users WHERE user_id=?",
      [userId]
    );
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Get the latest photo
    const [photos] = await pool.query(
      "SELECT photo_url FROM user_photos WHERE user_id=? ORDER BY uploaded_at DESC LIMIT 1",
      [userId]
    );
    console.log("Photos from DB:", photos);
    const profilePhotoUrl = photos.length > 0 ? photos[0].photo_url : null;

    res.json({
      success: true,
      user: {
        ...user,
        profile_photo: profilePhotoUrl,
      },
    });
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ success: false, message: "Error fetching profile" });
  }
});

module.exports = router;
