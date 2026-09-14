const express = require('express');
const pool = require('../db');
const router = express.Router();

router.get('/', async (req, res) => {
    try{
        const result = await pool.query(`
            SELECT id, name,
            danger_threshold as "dangerThreshold",
            decay_multiplier as "decayMultiplier"
            FROM pollutants ORDER BY id
        `)

        res.json(result.rows);
    } catch(error) {
        console.log('Error loading pollutants');
        res.status(500).json({
            error: 'Faild to load pollutants'
        });
    }
})

module.exports = router;