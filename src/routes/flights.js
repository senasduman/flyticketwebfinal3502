const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Flight = require("../models/Flight");
const City = require("../models/City");

async function getCityNameById(cityId) {
  try {
    console.log("Looking for city with ID:", cityId, "Type:", typeof cityId);

    if (!cityId) {
      console.log("No cityId provided");
      return null;
    }

    // Convert to string if it's an ObjectId instance
    const cityIdStr = cityId.toString();

    // Make sure it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(cityIdStr)) {
      console.log("Invalid ObjectId format:", cityIdStr);
      return null;
    }

    const city = await City.findById(cityIdStr);
    console.log("Found city for ID", cityIdStr, ":", city);

    return city ? city.city_name : null;
  } catch (error) {
    console.error("Error fetching city for ID", cityId, ":", error);
    return null;
  }
}

// Helper function to enrich flights with city names
async function enrichFlightsWithCityNames(flights) {
  const enrichedFlights = [];

  for (const flight of flights) {
    console.log("Processing flight:", {
      flight_id: flight.flight_id,
      from_city: flight.from_city,
      from_city_type: typeof flight.from_city,
      to_city: flight.to_city,
      to_city_type: typeof flight.to_city,
    });

    const fromCityName = await getCityNameById(flight.from_city);
    const toCityName = await getCityNameById(flight.to_city);

    console.log("City names resolved for flight", flight.flight_id, ":", {
      from_city_name: fromCityName,
      to_city_name: toCityName,
    });

    // If city names are null, try to fetch them again with a different approach
    let finalFromCityName = fromCityName;
    let finalToCityName = toCityName;

    if (!fromCityName && flight.from_city) {
      console.log("Retrying from_city lookup...");
      const fromCity = await City.findOne({ _id: flight.from_city });
      finalFromCityName = fromCity ? fromCity.city_name : null;
      console.log("Retry result for from_city:", finalFromCityName);
    }

    if (!toCityName && flight.to_city) {
      console.log("Retrying to_city lookup...");
      const toCity = await City.findOne({ _id: flight.to_city });
      finalToCityName = toCity ? toCity.city_name : null;
      console.log("Retry result for to_city:", finalToCityName);
    }

    enrichedFlights.push({
      ...flight.toObject(),
      from_city_name: finalFromCityName || `Unknown City (${flight.from_city})`,
      to_city_name: finalToCityName || `Unknown City (${flight.to_city})`,
      from_city_id: flight.from_city,
      to_city_id: flight.to_city,
      duration: Math.round(
        (flight.arrival_time - flight.departure_time) / (1000 * 60)
      ), // minutes
      seats_occupied: flight.seats_total - flight.seats_available,
      occupancy_rate: Math.round(
        ((flight.seats_total - flight.seats_available) / flight.seats_total) *
          100
      ),
    });
  }

  return enrichedFlights;
}

// @route   GET /api/flights
// @desc    Get all flights with city names
// @access  Public
router.get("/", async (req, res) => {
  try {
    console.log("=== Fetching all flights ===");

    const flights = await Flight.find().sort({ departure_time: 1 });
    console.log(`Found ${flights.length} raw flights`);

    // Debug: Check a few cities exist
    const cityCount = await City.countDocuments();
    console.log(`Total cities in database: ${cityCount}`);

    if (cityCount > 0) {
      const sampleCities = await City.find().limit(3);
      console.log(
        "Sample cities:",
        sampleCities.map((c) => ({ _id: c._id, city_name: c.city_name }))
      );
    }

    if (flights.length > 0) {
      console.log("First flight raw data:", {
        flight_id: flights[0].flight_id,
        from_city: flights[0].from_city,
        to_city: flights[0].to_city,
      });
    }

    const enrichedFlights = await enrichFlightsWithCityNames(flights);

    console.log("=== Enrichment complete ===");
    if (enrichedFlights.length > 0) {
      console.log("First enriched flight:", {
        flight_id: enrichedFlights[0].flight_id,
        from_city_name: enrichedFlights[0].from_city_name,
        to_city_name: enrichedFlights[0].to_city_name,
      });
    }

    // Return just the array, not wrapped in an object
    res.json(enrichedFlights);
  } catch (error) {
    console.error("Flights fetch error:", error);
    res.status(500).json({
      success: false,
      msg: "Uçuşlar getirilirken hata oluştu",
      error: error.message,
    });
  }
});

// @route   GET /api/flights/search
// @desc    Search flights by criteria
// @access  Public
router.get("/search", async (req, res) => {
  try {
    const { from, to, date } = req.query;

    console.log("Search request:", { from, to, date });

    // Validation
    if (!from || !to || !date) {
      return res.status(400).json({
        success: false,
        msg: "Kalkış şehri, varış şehri ve tarih gereklidir",
      });
    }

    if (from === to) {
      return res.status(400).json({
        success: false,
        msg: "Kalkış ve varış şehri aynı olamaz",
      });
    }

    // Validate ObjectIds
    if (
      !mongoose.Types.ObjectId.isValid(from) ||
      !mongoose.Types.ObjectId.isValid(to)
    ) {
      return res.status(400).json({
        success: false,
        msg: "Geçersiz şehir ID'si",
      });
    }

    // Parse date
    const searchDate = new Date(date);
    if (isNaN(searchDate.getTime())) {
      return res.status(400).json({
        success: false,
        msg: "Geçersiz tarih formatı",
      });
    }

    // Create date range for the entire day
    const startOfDay = new Date(searchDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(searchDate);
    endOfDay.setHours(23, 59, 59, 999);

    console.log("Searching with criteria:", {
      from_city: from,
      to_city: to,
      date_range: { start: startOfDay, end: endOfDay },
    });

    // Search flights
    const flights = await Flight.find({
      from_city: from,
      to_city: to,
      departure_time: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    })
      .populate("from_city", "city_name city_id")
      .populate("to_city", "city_name city_id")
      .sort({ departure_time: 1 });

    console.log(`Found ${flights.length} flights`);

    // Format response with consistent data structure
    const formattedFlights = flights.map((flight) => ({
      _id: flight._id,
      flight_id: flight.flight_id,
      from_city: {
        _id: flight.from_city._id,
        city_name: flight.from_city.city_name,
        city_id: flight.from_city.city_id,
      },
      to_city: {
        _id: flight.to_city._id,
        city_name: flight.to_city.city_name,
        city_id: flight.to_city.city_id,
      },
      departure_time: flight.departure_time,
      arrival_time: flight.arrival_time,
      price: flight.price,
      seats_total: flight.seats_total,
      seats_available: flight.seats_available,
      createdAt: flight.createdAt,
      updatedAt: flight.updatedAt,
    }));

    res.json({
      success: true,
      count: formattedFlights.length,
      data: formattedFlights,
    });
  } catch (error) {
    console.error("Search flights error:", error);
    res.status(500).json({
      success: false,
      msg: "Uçuş getirilirken hata oluştu",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Add a route to refresh flight data (for debugging)
router.get("/refresh", async (req, res) => {
  try {
    console.log("=== Refreshing flight data ===");

    // Get all flights
    const flights = await Flight.find();

    // Re-enrich all flights
    const enrichedFlights = await enrichFlightsWithCityNames(flights);

    console.log("Refreshed flights:", enrichedFlights.length);

    res.json({
      success: true,
      message: "Flights refreshed",
      count: enrichedFlights.length,
      data: enrichedFlights,
    });
  } catch (error) {
    console.error("Refresh error:", error);
    res.status(500).json({
      success: false,
      msg: "Refresh failed",
      error: error.message,
    });
  }
});

// @route   POST /api/flights
// @desc    Create new flight
// @access  Private (Admin only)
router.post("/", async (req, res) => {
  try {
    const {
      flight_id,
      from_city,
      to_city,
      departure_time,
      arrival_time,
      price,
      seats_total,
      seats_available,
    } = req.body;

    console.log("Creating flight with data:", req.body);

    // Validate required fields
    const requiredFields = [
      "flight_id",
      "from_city",
      "to_city",
      "departure_time",
      "arrival_time",
      "price",
      "seats_total",
    ];

    const missingFields = requiredFields.filter((field) => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        msg: `Eksik alanlar: ${missingFields.join(", ")}`,
      });
    }

    // Validate ObjectId format
    if (
      !mongoose.Types.ObjectId.isValid(from_city) ||
      !mongoose.Types.ObjectId.isValid(to_city)
    ) {
      return res.status(400).json({
        success: false,
        msg: "Geçersiz şehir ID formatı",
      });
    }

    // Validate cities exist
    const fromCity = await City.findById(from_city);
    const toCity = await City.findById(to_city);

    console.log("City validation:", {
      from_city: from_city,
      fromCity: fromCity,
      to_city: to_city,
      toCity: toCity,
    });

    if (!fromCity || !toCity) {
      return res.status(400).json({
        success: false,
        msg: "Geçersiz şehir seçimi",
        details: {
          fromCityFound: !!fromCity,
          toCityFound: !!toCity,
        },
      });
    }

    console.log("Cities validated:", {
      from: fromCity.city_name,
      to: toCity.city_name,
    });

    // Create flight
    const flight = new Flight({
      flight_id: flight_id.toUpperCase(),
      from_city: new mongoose.Types.ObjectId(from_city),
      to_city: new mongoose.Types.ObjectId(to_city),
      departure_time: new Date(departure_time),
      arrival_time: new Date(arrival_time),
      price: parseFloat(price),
      seats_total: parseInt(seats_total),
      seats_available: seats_available
        ? parseInt(seats_available)
        : parseInt(seats_total),
    });

    const savedFlight = await flight.save();
    console.log("Flight saved successfully");

    // Return enriched flight
    const enrichedFlights = await enrichFlightsWithCityNames([savedFlight]);

    console.log("Flight created successfully:", {
      flight_id: enrichedFlights[0].flight_id,
      route: `${enrichedFlights[0].from_city_name} → ${enrichedFlights[0].to_city_name}`,
    });

    // Return just the flight object
    res.status(201).json(enrichedFlights[0]);
  } catch (error) {
    console.error("Flight creation error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        msg: "Bu uçuş kodu zaten kullanımda",
      });
    }

    res.status(500).json({
      success: false,
      msg: "Uçuş oluşturulurken hata oluştu",
      error: error.message,
    });
  }
});

// @route   PUT /api/flights/:id
// @desc    Update flight
// @access  Private (Admin only)
router.put("/:id", async (req, res) => {
  try {
    console.log("Updating flight:", req.params.id, req.body);

    // Validate cities if provided
    if (req.body.from_city) {
      if (!mongoose.Types.ObjectId.isValid(req.body.from_city)) {
        return res.status(400).json({
          success: false,
          msg: "Geçersiz kalkış şehri ID formatı",
        });
      }
      const fromCityExists = await City.findById(req.body.from_city);
      if (!fromCityExists) {
        return res.status(400).json({
          success: false,
          msg: "Geçersiz kalkış şehri",
        });
      }
    }

    if (req.body.to_city) {
      if (!mongoose.Types.ObjectId.isValid(req.body.to_city)) {
        return res.status(400).json({
          success: false,
          msg: "Geçersiz varış şehri ID formatı",
        });
      }
      const toCityExists = await City.findById(req.body.to_city);
      if (!toCityExists) {
        return res.status(400).json({
          success: false,
          msg: "Geçersiz varış şehri",
        });
      }
    }

    // Update flight
    const flight = await Flight.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        flight_id: req.body.flight_id
          ? req.body.flight_id.toUpperCase()
          : undefined,
      },
      { new: true, runValidators: true }
    );

    if (!flight) {
      return res.status(404).json({
        success: false,
        msg: "Uçuş bulunamadı",
      });
    }

    const enrichedFlights = await enrichFlightsWithCityNames([flight]);

    console.log("Flight updated successfully:", flight.flight_id);

    res.json(enrichedFlights[0]);
  } catch (error) {
    console.error("Flight update error:", error);
    res.status(500).json({
      success: false,
      msg: "Uçuş güncellenirken hata oluştu",
      error: error.message,
    });
  }
});

// @route   DELETE /api/flights/:id
// @desc    Delete flight
// @access  Private (Admin only)
router.delete("/:id", async (req, res) => {
  try {
    console.log("Deleting flight:", req.params.id);

    const flight = await Flight.findById(req.params.id);

    if (!flight) {
      return res.status(404).json({
        success: false,
        msg: "Uçuş bulunamadı",
      });
    }

    await Flight.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      msg: "Uçuş başarıyla silindi",
    });
  } catch (error) {
    console.error("Flight deletion error:", error);
    res.status(500).json({
      success: false,
      msg: "Uçuş silinirken hata oluştu",
      error: error.message,
    });
  }
});

// @route   GET /api/flights/:id
// @desc    Get single flight with city names
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const flight = await Flight.findById(req.params.id);

    if (!flight) {
      return res.status(404).json({
        success: false,
        msg: "Uçuş bulunamadı",
      });
    }

    const enrichedFlights = await enrichFlightsWithCityNames([flight]);

    // Return just the flight object
    res.json(enrichedFlights[0]);
  } catch (error) {
    console.error("Flight fetch error:", error);
    res.status(500).json({
      success: false,
      msg: "Uçuş getirilirken hata oluştu",
      error: error.message,
    });
  }
});

// Add this debugging route first to understand what's in your database
router.get("/debug", async (req, res) => {
  try {
    console.log("=== DEBUG: Database Analysis ===");

    // Get all cities
    const cities = await City.find();
    console.log("All cities in database:");
    cities.forEach((city) => {
      console.log(`  - ID: ${city._id}, Name: ${city.city_name}`);
    });

    // Get all flights
    const flights = await Flight.find();
    console.log("\nAll flights in database:");
    flights.forEach((flight) => {
      console.log(`  - Flight: ${flight.flight_id}`);
      console.log(
        `    From: ${flight.from_city} (type: ${typeof flight.from_city})`
      );
      console.log(`    To: ${flight.to_city} (type: ${typeof flight.to_city})`);
    });

    // Check if any flight city IDs match city IDs
    console.log("\n=== Checking for matches ===");
    for (const flight of flights) {
      const fromCityMatch = cities.find(
        (city) => city._id.toString() === flight.from_city.toString()
      );
      const toCityMatch = cities.find(
        (city) => city._id.toString() === flight.to_city.toString()
      );

      console.log(`Flight ${flight.flight_id}:`);
      console.log(
        `  From city match: ${
          fromCityMatch ? fromCityMatch.city_name : "NO MATCH"
        }`
      );
      console.log(
        `  To city match: ${toCityMatch ? toCityMatch.city_name : "NO MATCH"}`
      );
    }

    res.json({
      cities: cities.map((c) => ({ id: c._id, name: c.city_name })),
      flights: flights.map((f) => ({
        flight_id: f.flight_id,
        from_city: f.from_city,
        to_city: f.to_city,
      })),
    });
  } catch (error) {
    console.error("Debug error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Enhanced getCityNameById function with more debugging
async function getCityNameById(cityId) {
  try {
    console.log("Looking for city with ID:", cityId, "Type:", typeof cityId);

    if (!cityId) {
      console.log("No cityId provided");
      return null;
    }

    // Convert to string if it's an ObjectId instance
    const cityIdStr = cityId.toString();
    console.log("Converted to string:", cityIdStr);

    // Make sure it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(cityIdStr)) {
      console.log("Invalid ObjectId format:", cityIdStr);
      return null;
    }

    // Try multiple approaches to find the city
    let city = await City.findById(cityIdStr);
    console.log("findById result:", city);

    if (!city) {
      // Try with findOne using string comparison
      city = await City.findOne({ _id: cityIdStr });
      console.log("findOne with string result:", city);
    }

    if (!city) {
      // Try with ObjectId conversion
      city = await City.findOne({
        _id: new mongoose.Types.ObjectId(cityIdStr),
      });
      console.log("findOne with ObjectId result:", city);
    }

    if (!city) {
      // List all cities to see what's available
      const allCities = await City.find();
      console.log("All available cities:");
      allCities.forEach((c) => console.log(`  ${c._id} -> ${c.city_name}`));
    }

    return city ? city.city_name : null;
  } catch (error) {
    console.error("Error fetching city for ID", cityId, ":", error);
    return null;
  }
}

// Add a route to fix existing flights with wrong city references
router.post("/fix-cities", async (req, res) => {
  try {
    console.log("=== Fixing flight city references ===");

    const flights = await Flight.find();
    const cities = await City.find();

    console.log(`Found ${flights.length} flights and ${cities.length} cities`);

    let fixedCount = 0;

    for (const flight of flights) {
      let needsUpdate = false;
      let updateData = {};

      // Check if from_city exists
      const fromCityExists = cities.find(
        (c) => c._id.toString() === flight.from_city.toString()
      );
      if (!fromCityExists) {
        console.log(
          `Flight ${flight.flight_id}: from_city ${flight.from_city} not found`
        );
        // You might want to set it to a default city or ask for manual mapping
        // For now, let's find the first city that might match by name if you have any pattern
      }

      // Check if to_city exists
      const toCityExists = cities.find(
        (c) => c._id.toString() === flight.to_city.toString()
      );
      if (!toCityExists) {
        console.log(
          `Flight ${flight.flight_id}: to_city ${flight.to_city} not found`
        );
      }

      // If you want to auto-fix with the first available cities (for testing):
      if (!fromCityExists && cities.length > 0) {
        updateData.from_city = cities[0]._id;
        needsUpdate = true;
        console.log(`Setting from_city to ${cities[0].city_name}`);
      }

      if (!toCityExists && cities.length > 1) {
        updateData.to_city = cities[1]._id;
        needsUpdate = true;
        console.log(`Setting to_city to ${cities[1].city_name}`);
      }

      if (needsUpdate) {
        await Flight.findByIdAndUpdate(flight._id, updateData);
        fixedCount++;
        console.log(`Fixed flight ${flight.flight_id}`);
      }
    }

    res.json({
      success: true,
      message: `Fixed ${fixedCount} flights`,
      fixedCount,
    });
  } catch (error) {
    console.error("Fix error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
