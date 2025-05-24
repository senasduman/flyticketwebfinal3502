const express = require("express");
const path = require("path");
const connectDB = require("./config/db");

const app = express();
connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "../public")));

// Routes
app.use("/api/flights", require("./routes/flights"));
app.use("/api/tickets", require("./routes/tickets"));
app.use("/api/admin", require("./routes/admin"));
app.use('/api/cities', require('./routes/cities'));

// Cities route
app.get("/api/cities", async (req, res) => {
  try {
    const City = require("./models/City");
    const cities = await City.find().sort({ city_name: 1 });
    res.json(cities);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});

// Seeder Route (Development only)
app.get("/api/seed-cities", async (req, res) => {
  try {
    const seedCities = require("./seeders/citySeeder");
    await seedCities();
    res.json({ message: "✅ 81 Türkiye şehri başarıyla eklendi!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/test", (req, res) => {
  res.json({ message: "FlyTicket API Çalışıyor! ✈️" });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "index.html"));
});

// Port Ayarı
const PORT = process.env.PORT || 5000; // .env'den portu al veya 5000 kullan

app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda başlatıldı.`));
