const mongoose = require("mongoose");
const Admin = require("../models/Admin");
const connectDB = require("../config/db"); // Veritabanı bağlantı dosyanızın yolu
require("dotenv").config({ path: "../../.env" }); // Proje kök dizinindeki .env dosyası için

const seedAdmin = async () => {
  try {
    await connectDB();

    const existingAdmin = await Admin.findOne({ username: "admin" });

    if (existingAdmin) {
      console.log("Admin user already exists.");
      mongoose.disconnect();
      return;
    }

    const adminData = {
      username: "admin",
      password: "password123", // Güvenli bir şifre seçin ve bunu .env dosyasında saklamayı düşünün
    };

    const admin = new Admin(adminData);
    await admin.save(); // pre-save hook şifreyi hashleyecektir

    console.log("Admin user created successfully!");
    mongoose.disconnect();
  } catch (error) {
    console.error("Error seeding admin user:", error);
    mongoose.disconnect();
    process.exit(1);
  }
};

seedAdmin();
