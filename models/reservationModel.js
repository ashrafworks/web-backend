// import mongoose, { Types } from "mongoose";

// const reservationSchema = new mongoose.Schema(
//   {
//     // User details
//     userId: {
//       type: Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     userName: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     userEmail: {
//       type: String,
//       required: true,
//       lowercase: true,
//       trim: true,
//     },
//     userPhone: {
//       type: String,
//       required: true,
//       trim: true,
//     },

//     // Booking dates
//     checkInDate: {
//       type: Date,
//       required: true,
//     },
//     checkOutDate: {
//       type: Date,
//       required: true,
//       validate: {
//         validator: function (value) {
//           return value > this.checkInDate;
//         },
//         message: "Check-out date check-in are not valid please enter a valid dates",
//       },
//     },

//     // Guest info
//     guests: {
//       adults: {
//         type: Number,
//         required: true,
//         min: 1,
//       },
//       children: {
//         type: Number,
//         default: 0,
//         min: 0,
//       }
//     },
//     pets: {
//       type: Boolean,
//       default: false,
//     },

//     numberOfNights: {
//       type: Number,
//       required: true,
//       min: 1,
//     },

//     // Pricing
//     pricePerNight: {
//       type: Number,
//       required: true,
//       min: 0,
//     },

//     totalPrice: {
//       type: Number,
//       required: true,
//       min: 0,
//     },

//     // Payment details
//     paymentStatus: {
//       type: String,
//       enum: ["pending", "completed", "failed", "refunded"],
//       default: "pending",
//     },

//     paymentMethod: {
//       type: String,
//       enum: ["stripe", "card", "cash", "other", "paypal", "google pay"],
//       default: "stripe",
//     },
    
//     paymentIntentId: {
//       type: String,
//       default: null,
//     },

//     // Reservation status
//     reservationStatus: {
//       type: String,
//       enum: ["confirmed", "cancelled", "completed", "pending"],
//       default: "pending",
//     },

//     // Property info
//     propertyName: {
//       type: String,
//       required: true,
//       default: "Main Property",
//     },
//     propertyAddress: {
//       type: String,
//       required: true,
//     },

//     // Optional fields
//     specialRequests: {
//       type: String,
//       trim: true,
//       maxlength: 500,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// // Indexes
// reservationSchema.index({ checkInDate: 1, checkOutDate: 1 });
// reservationSchema.index({ userId: 1 });
// reservationSchema.index({ reservationStatus: 1 });
// reservationSchema.index({ paymentStatus: 1 });

// // Method to check if dates are available
// reservationSchema.statics.checkAvailability = async function (
//   checkIn,
//   checkOut,
//   excludeId = null
// ) {
//   const query = {
//     reservationStatus: { $nin: ["cancelled"] },
//     $or: [
//       {
//         checkInDate: { $lte: checkIn },
//         checkOutDate: { $gt: checkIn },
//       },

//       {
//         checkInDate: { $lt: checkOut },
//         checkOutDate: { $gte: checkOut },
//       },

//       {
//         checkInDate: { $gte: checkIn },
//         checkOutDate: { $lte: checkOut },
//       },
//     ],
//   };

//   if (excludeId) {
//     query._id = { $ne: excludeId };
//   }

//   const conflictingReservations = await this.find(query);
//   return conflictingReservations.length === 0;
// };

// // Method to calculate number of nights
// reservationSchema.methods.calculateNights = function () {
//   const diffTime = Math.abs(this.checkOutDate - this.checkInDate);
//   const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
//   return diffDays;
// };

// const Reservation = mongoose.model("Reservation", reservationSchema);

// export default Reservation;
