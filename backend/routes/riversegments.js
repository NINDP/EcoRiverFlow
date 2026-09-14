const express = require('express');
const pool = require('../db');
const router = express.Router();

router.get('/', async (req, res) => {
    try{
        const riverId = Number(req.query.riverId || 1);

        const result = await pool.query(
            `SELECT id,
            river_id as "riverId",
            segment_order as "segmentOrder",
            name,
            length_km as "lengthKm",
            self_cleaning_rate as "selfCleaningRate"
            FROM river_segments 
            WHERE river_id = $1
            ORDER BY id`,
            [riverId]
        );

        res.json(result.rows);
    } catch(error){
        console.log('Error loading river segments: ', error);
        res.status(500).json({
            error: 'Failed to load river segments'
        });
    }
})

module.exports = router;