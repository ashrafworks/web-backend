import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },

    checkIn: {
      type: Date,
      required: true,
    },
    checkOut: {
      type: Date,
      required: true,
    },

    totalGuests: {
      type: Number,
      required: true,
      min: 1,
    },
    adults: {
      type: Number,
      required: true,
      min: 1,
    },
    children: {
      type: Number,
      default: 0,
      min: 0,
    },
    pets: {
      type: Number,
      default: 0,
      min: 0,
    },

    contactInfo: {
      fullName: {
        type: String,
        required: true,
        trim: true,
      },
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },
      phone: {
        type: String,
        required: true,
        trim: true,
      },
      address: {
        type: String,
        required: true,
        trim: true,
      },
      city: {
        type: String,
        required: true,
        trim: true,
      },
      zipCode: {
        type: String,
        required: true,
        trim: true,
      },
      country: {
        type: String,
        required: true,
        default: "Pakistan",
      },
    },

    pricing: {
      pricePerNight: {
        type: Number,
        required: true,
      },
      totalNights: {
        type: Number,
        required: true,
      },
      subtotal: {
        type: Number,
        required: true,
      },
      serviceFee: {
        type: Number,
        required: true,
      },
      discount: {
        type: Number,
        default: 0,
      },
      totalAmount: {
        type: Number,
        required: true,
      },
    },

    paymentInfo: {
      paymentIntentId: {
        type: String,
        required: true,
      },
      paymentStatus: {
        type: String,
        enum: ["succeeded", "pending", "failed"],
        default: "succeeded",
      },
      lastFourDigits: {
        type: String,
        required: true,
      },
      paymentDate: {
        type: Date,
        default: Date.now,
      },
    },

    bookingStatus: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "confirmed",
    },

    bookingId: {
      type: String,
      unique: true,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ propertyId: 1, checkIn: 1, checkOut: 1 });

bookingSchema.virtual("duration").get(function () {
  const diffTime = Math.abs(this.checkOut - this.checkIn);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

bookingSchema.methods.isActive = function () {
  const now = new Date();
  return (
    this.checkIn <= now &&
    this.checkOut >= now &&
    this.bookingStatus === "confirmed"
  );
};

bookingSchema.methods.canBeCancelled = function () {
  const now = new Date();
  const diffTime = this.checkIn - now;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  return diffDays > 1 && this.bookingStatus !== "cancelled";
};

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
