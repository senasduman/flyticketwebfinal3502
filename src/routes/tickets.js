const express = require("express");
const router = express.Router();
const Ticket = require("../models/Ticket");
const Flight = require("../models/Flight");
const { v4: uuidv4 } = require("uuid");

// @route   POST /api/tickets
// @desc    Bilet rezervasyonu yap (User Side)
// @access  Public
router.post("/", async (req, res) => {
  try {
    const {
      passenger_name,
      passenger_surname,
      passenger_email,
      flight_id,
      seat_number,
    } = req.body;

    // Uçuşu kontrol et
    const flight = await Flight.findById(flight_id);
    if (!flight) {
      return res.status(404).json({ msg: "Uçuş bulunamadı" });
    }

    // Müsait koltuk kontrolü
    if (flight.seats_available <= 0) {
      return res.status(400).json({ msg: "Bu uçuş için müsait koltuk yok" });
    }

    // Benzersiz ticket ID oluştur
    const ticket_id = `TK-${uuidv4().slice(0, 8).toUpperCase()}`;

    // Bilet oluştur
    const ticket = new Ticket({
      ticket_id,
      passenger_name,
      passenger_surname,
      passenger_email,
      flight_id,
      seat_number,
    });

    await ticket.save();

    // Uçuştaki müsait koltuk sayısını azalt
    flight.seats_available -= 1;
    await flight.save();

    // Populate edilmiş bilet bilgisini döndür
    const populatedTicket = await Ticket.findById(ticket._id).populate({
      path: "flight_id",
      populate: [
        { path: "from_city", select: "city_name" },
        { path: "to_city", select: "city_name" },
      ],
    });

    res.json({
      success: true,
      ticket: populatedTicket,
      message: "Bilet başarıyla rezerve edildi!",
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET /api/tickets/:ticket_id
// @desc    Bilet bilgilerini getir (User Side)
// @access  Public
router.get("/:ticket_id", async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      ticket_id: req.params.ticket_id,
    }).populate({
      path: "flight_id",
      populate: [
        { path: "from_city", select: "city_name" },
        { path: "to_city", select: "city_name" },
      ],
    });

    if (!ticket) {
      return res.status(404).json({ msg: "Bilet bulunamadı" });
    }

    res.json(ticket);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET /api/tickets
// @desc    Tüm biletleri getir (Admin Side)
// @access  Private (Admin only)
router.get("/", async (req, res) => {
  try {
    const tickets = await Ticket.find()
      .populate({
        path: "flight_id",
        populate: [
          { path: "from_city", select: "city_name" },
          { path: "to_city", select: "city_name" },
        ],
      })
      .sort({ createdAt: -1 });

    res.json(tickets);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});

// @route   DELETE /api/tickets/:id
// @desc    Bilet iptal et (Admin Side)
// @access  Private (Admin only)
router.delete("/:id", async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ msg: "Bilet bulunamadı" });
    }

    // Uçuştaki müsait koltuk sayısını artır
    const flight = await Flight.findById(ticket.flight_id);
    if (flight) {
      flight.seats_available += 1;
      await flight.save();
    }

    await Ticket.findByIdAndDelete(req.params.id);

    res.json({ msg: "Bilet iptal edildi" });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
