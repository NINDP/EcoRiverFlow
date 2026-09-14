const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const riverId = Number(req.query.riverId ?? 1);

        if (!Number.isInteger(riverId) || riverId <= 0) {
            return res.status(400).json({
                error: 'riverId must be a positive integer'
            });
        }

        const result = await pool.query(
            `
            SELECT
                s.id,
                s.segment_id AS "segmentId",
                rs.segment_order AS "segmentOrder",
                rs.name AS "segmentName",
                s.name,
                s.is_active AS "isActive"
            FROM sensors s
            JOIN river_segments rs ON rs.id = s.segment_id
            WHERE rs.river_id = $1
            ORDER BY rs.segment_order, s.id
            `,
            [riverId]
        );

        res.json(result.rows);
    } catch (error) {
        console.log('Error loading sensors:', error);

        res.status(500).json({
            error: 'Failed to load sensors'
        });
    }
});

module.exports = router;