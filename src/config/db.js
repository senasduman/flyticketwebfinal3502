const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoURI =
    process.env.MONGO_URI || "mongodb://localhost:27017/flyticketDB";

  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB Bağlantısı Başarılı...");
  } catch (err) {
    console.error("MongoDB İlk Bağlantı Hatası:", err.message);
    // Uygulamayı sonlandır
    process.exit(1);
  }

  // Bağlantı kurulduktan sonra olay dinleyicilerini ayarla
  mongoose.connection.on("error", (err) => {
    console.error("MongoDB Çalışma Zamanı Hatası:", err);
  });

  mongoose.connection.on("disconnected", () => {
    console.log("MongoDB bağlantısı kesildi.");
  });

  mongoose.connection.on("reconnected", () => {
    console.log("MongoDB bağlantısı yeniden kuruldu.");
  });
};

module.exports = connectDB;
