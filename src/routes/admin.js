const express = require("express");
const router = express.Router();
const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");

// @route   POST /api/admin/register
// @desc    Admin kaydı oluştur (İlk kurulum için)
// @access  Public (sadece ilk admin için)
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Admin zaten var mı kontrol et
    let admin = await Admin.findOne({ username });
    if (admin) {
      return res.status(400).json({ msg: "Bu admin kullanıcısı zaten mevcut" });
    }

    // Yeni admin oluştur
    admin = new Admin({
      username,
      password,
    });

    await admin.save();

    res.json({
      success: true,
      message: "Admin başarıyla oluşturuldu",
      admin: { id: admin._id, username: admin.username },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});

// @route   POST /api/admin/login
// @desc    Admin girişi
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Admin var mı kontrol et
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ msg: "Geçersiz kullanıcı adı veya şifre" });
    }

    // Şifre kontrolü
    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ msg: "Geçersiz kullanıcı adı veya şifre" });
    }

    // JWT Token oluştur
    const payload = {
      admin: {
        id: admin._id,
        username: admin.username,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || "flyticket-secret-key",
      { expiresIn: "24h" },
      (err, token) => {
        if (err) throw err;
        res.json({
          success: true,
          token,
          admin: {
            id: admin._id,
            username: admin.username,
          },
          message: "Giriş başarılı!",
        });
      }
    );
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET /api/admin/verify
// @desc    Token doğrulama
// @access  Private
router.get("/verify", async (req, res) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ msg: "Token bulunamadı, erişim reddedildi" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "flyticket-secret-key"
    );
    const admin = await Admin.findById(decoded.admin.id).select("-password");

    if (!admin) {
      return res.status(401).json({ msg: "Token geçersiz" });
    }

    res.json({
      success: true,
      admin: {
        id: admin._id,
        username: admin.username,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(401).json({ msg: "Token geçersiz" });
  }
});

// @route   GET /api/admin/stats
// @desc    Admin dashboard istatistikleri
// @access  Private
router.get("/stats", async (req, res) => {
  try {
    const Flight = require("../models/Flight");
    const Ticket = require("../models/Ticket");

    const totalFlights = await Flight.countDocuments();
    const totalBookings = await Ticket.countDocuments();

    // Son 7 günün rezervasyonları
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentBookings = await Ticket.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    // Toplam gelir hesaplama
    const bookingsWithFlight = await Ticket.find().populate(
      "flight_id",
      "price"
    );
    const totalRevenue = bookingsWithFlight.reduce((sum, ticket) => {
      return sum + (ticket.flight_id?.price || 0);
    }, 0);

    res.json({
      totalFlights,
      totalBookings,
      recentBookings,
      totalRevenue,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
