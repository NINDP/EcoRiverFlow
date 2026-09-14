const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/latest', async (req, res) => {
    try {
        const riverId = Number(req.query.riverId ?? 1);

        if (!Number.isInteger(riverId) || riverId <= 0) {
            return res.status(400).json({
                error: 'riverId must be a positive integer'
            });
        }

        const result = await pool.query(
            `
            SELECT DISTINCT ON (s.id)
                m.id,
                r.id AS "riverId",
                r.name AS "riverName",
                rs.id AS "segmentId",
                rs.segment_order AS "segmentOrder",
                rs.name AS "segmentName",
                s.id AS "sensorId",
                s.name AS "sensorName",
                m.measured_at AS "measuredAt",
                m.concentration
            FROM measurements m
            JOIN sensors s ON s.id = m.sensor_id
            JOIN river_segments rs ON rs.id = s.segment_id
            JOIN rivers r ON r.id = rs.river_id
            WHERE r.id = $1
            ORDER BY s.id, m.measured_at DESC
            `,
            [riverId]
        );

        const sorted = result.rows.sort((a, b) => a.segmentOrder - b.segmentOrder);

        res.json(sorted);
    } catch (error) {
        console.log('Error loading latest measurements:', error);

        res.status(500).json({
            error: 'Failed to load latest measurements'
        });
    }
});

router.get('/history', async (req, res) => {
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
                m.id,
                r.id AS "riverId",
                r.name AS "riverName",
                rs.id AS "segmentId",
                rs.segment_order AS "segmentOrder",
                rs.name AS "segmentName",
                s.id AS "sensorId",
                s.name AS "sensorName",
                m.measured_at AS "measuredAt",
                m.concentration
            FROM measurements m
            JOIN sensors s ON s.id = m.sensor_id
            JOIN river_segments rs ON rs.id = s.segment_id
            JOIN rivers r ON r.id = rs.river_id
            WHERE r.id = $1
            ORDER BY m.measured_at DESC, rs.segment_order
            `,
            [riverId]
        );

        res.json(result.rows);
    } catch (error) {
        console.log('Error loading measurements history:', error);

        res.status(500).json({
            error: 'Failed to load measurements history'
        });
    }
});

router.post('/', async (req, res) => {
    try {
        const { sensorId, measuredAt, concentration } = req.body;

        if (!sensorId || concentration === undefined) {
            return res.status(400).json({
                error: 'sensorId and concentration are required'
            });
        }

        const result = await pool.query(
            `
            INSERT INTO measurements (
                sensor_id,
                measured_at,
                concentration
            )
            VALUES ($1, COALESCE($2::timestamp, NOW()), $3)
            RETURNING
                id,
                sensor_id AS "sensorId",
                measured_at AS "measuredAt",
                concentration
            `,
            [sensorId, measuredAt || null, concentration]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.log('Error creating measurement:', error);

        res.status(500).json({
            error: 'Failed to create measurement'
        });
    }
});

router.get('/history', async (req, res) => {

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

                m.id,

                r.id AS "riverId",

                r.name AS "riverName",

                rs.id AS "segmentId",

                rs.segment_order AS "segmentOrder",

                rs.name AS "segmentName",

                s.id AS "sensorId",

                s.name AS "sensorName",

                m.measured_at AS "measuredAt",

                m.concentration

            FROM measurements m

            JOIN sensors s ON s.id = m.sensor_id

            JOIN river_segments rs ON rs.id = s.segment_id

            JOIN rivers r ON r.id = rs.river_id

            WHERE r.id = $1

            ORDER BY m.measured_at DESC, rs.segment_order

            `,

            [riverId]

        );

        res.json(result.rows);

    } catch (error) {

        console.log('Error loading measurements history:', error);

        res.status(500).json({

            error: 'Failed to load measurements history'

        });

    }

});

router.post('/', async (req, res) => {

    try {

        const { sensorId, measuredAt, concentration } = req.body;

        if (!sensorId || concentration === undefined) {

            return res.status(400).json({

                error: 'sensorId and concentration are required'

            });

        }

        const result = await pool.query(

            `

            INSERT INTO measurements (

                sensor_id,

                measured_at,

                concentration

            )

            VALUES ($1, COALESCE($2::timestamp, NOW()), $3)

            RETURNING

                id,

                sensor_id AS "sensorId",

                measured_at AS "measuredAt",

                concentration

            `,

            [sensorId, measuredAt || null, concentration]

        );

        res.status(201).json(result.rows[0]);

    } catch (error) {

        console.log('Error creating measurement:', error);

        res.status(500).json({

            error: 'Failed to create measurement'

        });

    }

});

module.exports = router;