import express from 'express';
import Property from '../models/propertyModel.js';

const router = express.Router();

router.get("/:propertyId", async function (req, res) {
    const propertyId = req.params.propertyId;
    const propertyData = await Property.findById(propertyId).populate('host', 'name email , avatar');
    console.log(propertyData)
    return res.status(200).json({
        success: true,
        data: propertyData
    });
});

export default router;