// import express from 'express';
// import Reservation from '../models/reservationModel.js';
// import { allReservations, checkAvailability, create, getUserReservations } from '../controllers/ReservationController.js';
// import { authorizeAdmim, checkAuth } from '../middlewares/authMiddleware.js';

// const router = express.Router();

// // Check Property Availability
// router.post('/check-availability', checkAvailability);

// // Create New Reservation
// router.post('/create', checkAuth, create);

// // Get All Reservations (Admin)
// router.get('/all-reservations', checkAuth, authorizeAdmim, allReservations);

// // Get User's Reservations
// router.get('/my-reservations', checkAuth, getUserReservations);

// // Get Single Reservation by ID
// router.get('/:id', async (req, res) => {
//   try {
//     const { id } = req.params;

//     const reservation = await Reservation.findById(id)
//       .populate('userId', 'name email phone');

//     if (!reservation) {
//       return res.status(404).json({ 
//         success: false, 
//         message: 'Reservation nahi mili' 
//       });
//     }

//     res.status(200).json({
//       success: true,
//       reservation
//     });

//   } catch (error) {
//     res.status(500).json({ 
//       success: false, 
//       message: 'Server error', 
//       error: error.message 
//     });
//   }
// });

// // Update Payment Status
// router.patch('/:id/payment-status', async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { paymentStatus, paymentIntentId } = req.body;

//     if (!paymentStatus) {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Payment status required hai' 
//       });
//     }

//     const updateData = { paymentStatus };
    
//     // Agar payment completed ho to reservation bhi confirm karo
//     if (paymentStatus === 'completed') {
//       updateData.reservationStatus = 'confirmed';
//     }

//     if (paymentIntentId) {
//       updateData.paymentIntentId = paymentIntentId;
//     }

//     const reservation = await Reservation.findByIdAndUpdate(
//       id,
//       updateData,
//       { new: true }
//     );

//     if (!reservation) {
//       return res.status(404).json({ 
//         success: false, 
//         message: 'Reservation nahi mili' 
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: 'Payment status update ho gayi',
//       reservation
//     });

//   } catch (error) {
//     res.status(500).json({ 
//       success: false, 
//       message: 'Server error', 
//       error: error.message 
//     });
//   }
// });

// // Cancel Reservation
// router.patch('/:id/cancel', async (req, res) => {
//   try {
//     const { id } = req.params;

//     const reservation = await Reservation.findById(id);

//     if (!reservation) {
//       return res.status(404).json({ 
//         success: false, 
//         message: 'Reservation nahi mili' 
//       });
//     }

//     // Check agar already cancelled ya completed hai
//     if (reservation.reservationStatus === 'cancelled') {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Reservation pehle se cancelled hai' 
//       });
//     }

//     if (reservation.reservationStatus === 'completed') {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Completed reservation cancel nahi ho sakti' 
//       });
//     }

//     reservation.reservationStatus = 'cancelled';
//     await reservation.save();

//     res.status(200).json({
//       success: true,
//       message: 'Reservation cancel ho gayi',
//       reservation
//     });

//   } catch (error) {
//     res.status(500).json({ 
//       success: false, 
//       message: 'Server error', 
//       error: error.message 
//     });
//   }
// });

// //Update Reservation
// router.put('/:id', async (req, res) => {
//   try {
//     const { id } = req.params;
//     const updates = req.body;

//     // Agar dates update ho rahe hain to availability check karo
//     if (updates.checkInDate || updates.checkOutDate) {
//       const reservation = await Reservation.findById(id);
      
//       const checkIn = updates.checkInDate ? new Date(updates.checkInDate) : reservation.checkInDate;
//       const checkOut = updates.checkOutDate ? new Date(updates.checkOutDate) : reservation.checkOutDate;

//       const isAvailable = await Reservation.checkAvailability(checkIn, checkOut, id);
      
//       if (!isAvailable) {
//         return res.status(400).json({ 
//           success: false, 
//           message: 'New dates pe property already booked hai' 
//         });
//       }

//       // Recalculate nights and price
//       const diffTime = Math.abs(checkOut - checkIn);
//       const numberOfNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
//       updates.numberOfNights = numberOfNights;
//       updates.totalPrice = numberOfNights * (updates.pricePerNight || reservation.pricePerNight);
//     }

//     const reservation = await Reservation.findByIdAndUpdate(
//       id,
//       updates,
//       { new: true, runValidators: true }
//     );

//     if (!reservation) {
//       return res.status(404).json({ 
//         success: false, 
//         message: 'Reservation nahi mili' 
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: 'Reservation update ho gayi',
//       reservation
//     });

//   } catch (error) {
//     res.status(500).json({ 
//       success: false, 
//       message: 'Server error', 
//       error: error.message 
//     });
//   }
// });

// //Delete Reservation (Admin only)
// router.delete('/:id', async (req, res) => {
//   try {
//     const { id } = req.params;

//     const reservation = await Reservation.findByIdAndDelete(id);

//     if (!reservation) {
//       return res.status(404).json({ 
//         success: false, 
//         message: 'Reservation nahi mili' 
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: 'Reservation delete ho gayi'
//     });

//   } catch (error) {
//     res.status(500).json({ 
//       success: false, 
//       message: 'Server error', 
//       error: error.message 
//     });
//   }
// });

// // Get Upcoming Reservations
// router.get('/upcoming/list', async (req, res) => {
//   try {
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     const reservations = await Reservation.find({
//       checkInDate: { $gte: today },
//       reservationStatus: { $nin: ['cancelled'] }
//     })
//     .sort({ checkInDate: 1 })
//     .populate('userId', 'name email');

//     res.status(200).json({
//       success: true,
//       reservations
//     });

//   } catch (error) {
//     res.status(500).json({ 
//       success: false, 
//       message: 'Server error', 
//       error: error.message 
//     });
//   }
// });

// // Get Past Reservations
// router.get('/past/list', async (req, res) => {
//   try {
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     const reservations = await Reservation.find({
//       checkOutDate: { $lt: today }
//     })
//     .sort({ checkOutDate: -1 })
//     .populate('userId', 'name email');

//     res.status(200).json({
//       success: true,
//       reservations
//     });

//   } catch (error) {
//     res.status(500).json({ 
//       success: false, 
//       message: 'Server error', 
//       error: error.message 
//     });
//   }
// });

// export default router;