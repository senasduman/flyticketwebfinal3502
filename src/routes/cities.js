const express = require("express");
const router = express.Router();
const City = require("../models/City");

// @route   GET /api/cities
// @desc    Tüm şehirleri getir
// @access  Public
router.get("/", async (req, res) => {
  try {
    const cities = await City.find().sort({ city_name: 1 });
    console.log("Cities found:", cities.length); // Debug için
    res.json(cities);
  } catch (error) {
    console.error("Cities fetch error:", error.message);
    res.status(500).json({ msg: "Server Error", error: error.message });
  }
});

module.exports = router;
