const mongoose = require("mongoose");

const flightSchema = new mongoose.Schema(
  {
    flight_id: {
      type: String,
      required: true,
      unique: true,
    },
    from_city: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "City",
      required: true,
    },
    to_city: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "City",
      required: true,
    },
    departure_time: {
      type: Date,
      required: true,
    },
    arrival_time: {
      type: Date,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    seats_total: {
      type: Number,
      required: true,
      min: 1,
    },
    seats_available: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Flight Schedule Validation Rules
flightSchema.pre("save", async function (next) {
  try {
    // Rule 1: Aynı şehirden aynı saatte kalkış kontrolü
    const sameDepartureTime = new Date(this.departure_time);
    sameDepartureTime.setMinutes(0, 0, 0); // Saat başına yuvarla

    const nextHour = new Date(sameDepartureTime);
    nextHour.setHours(nextHour.getHours() + 1);

    const conflictingDeparture = await this.constructor.findOne({
      _id: { $ne: this._id },
      from_city: this.from_city,
      departure_time: {
        $gte: sameDepartureTime,
        $lt: nextHour,
      },
    });

    if (conflictingDeparture) {
      throw new Error("Bu şehirden bu saatte başka bir uçuş bulunmaktadır!");
    }

    // Rule 2: Aynı şehre aynı saatte varış kontrolü
    const sameArrivalTime = new Date(this.arrival_time);
    sameArrivalTime.setMinutes(0, 0, 0); // Saat başına yuvarla

    const nextArrivalHour = new Date(sameArrivalTime);
    nextArrivalHour.setHours(nextArrivalHour.getHours() + 1);

    const conflictingArrival = await this.constructor.findOne({
      _id: { $ne: this._id },
      to_city: this.to_city,
      arrival_time: {
        $gte: sameArrivalTime,
        $lt: nextArrivalHour,
      },
    });

    if (conflictingArrival) {
      throw new Error("Bu şehre bu saatte başka bir uçuş inmektedir!");
    }

    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model("Flight", flightSchema);
