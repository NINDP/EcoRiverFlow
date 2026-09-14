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
                sim.id,
                sim.river_id AS "riverId",
                r.name AS "riverName",
                sim.source_segment_id AS "sourceSegmentId",
                source_segment.name AS "sourceSegmentName",
                sim.pollutant_id AS "pollutantId",
                p.name AS "pollutantName",
                sim.initial_concentration AS "initialConcentration",
                sim.forecast_hours AS "forecastHours",
                sim.probable_source_segment_id AS "probableSourceSegmentId",
                probable_segment.name AS "probableSourceSegmentName",
                sim.risk_level AS "riskLevel",
                sim.result_json AS "resultJson",
                sim.created_at AS "createdAt"
            FROM simulations sim
            JOIN rivers r ON r.id = sim.river_id
            JOIN pollutants p ON p.id = sim.pollutant_id
            LEFT JOIN river_segments source_segment ON source_segment.id = sim.source_segment_id
            LEFT JOIN river_segments probable_segment ON probable_segment.id = sim.probable_source_segment_id
            WHERE sim.river_id = $1
            ORDER BY sim.created_at DESC
            `,
            [riverId]
        );

        res.json(result.rows);
    } catch (error) {
        console.log('Error loading simulations:', error);

        res.status(500).json({
            error: 'Failed to load simulations'
        });
    }
});

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
            SELECT
                sim.id,
                sim.river_id AS "riverId",
                r.name AS "riverName",
                sim.source_segment_id AS "sourceSegmentId",
                source_segment.name AS "sourceSegmentName",
                sim.pollutant_id AS "pollutantId",
                p.name AS "pollutantName",
                sim.initial_concentration AS "initialConcentration",
                sim.forecast_hours AS "forecastHours",
                sim.probable_source_segment_id AS "probableSourceSegmentId",
                probable_segment.name AS "probableSourceSegmentName",
                sim.risk_level AS "riskLevel",
                sim.result_json AS "resultJson",
                sim.created_at AS "createdAt"
            FROM simulations sim
            JOIN rivers r ON r.id = sim.river_id
            JOIN pollutants p ON p.id = sim.pollutant_id
            LEFT JOIN river_segments source_segment ON source_segment.id = sim.source_segment_id
            LEFT JOIN river_segments probable_segment ON probable_segment.id = sim.probable_source_segment_id
            WHERE sim.river_id = $1
            ORDER BY sim.created_at DESC
            LIMIT 1
            `,
            [riverId]
        );

        res.json(result.rows[0] || null);
    } catch (error) {
        console.log('Error loading latest simulation:', error);

        res.status(500).json({
            error: 'Failed to load latest simulation'
        });
    }
});

router.post('/', async (req, res) => {
    try {
        const {
            riverId,
            sourceSegmentId,
            pollutantId,
            initialConcentration,
            forecastHours,
            probableSourceSegmentId,
            riskLevel,
            resultJson
        } = req.body;

        if (
            !riverId ||
            !pollutantId ||
            initialConcentration === undefined ||
            !forecastHours ||
            !riskLevel ||
            !resultJson
        ) {
            return res.status(400).json({
                error: 'Missing required simulation fields'
            });
        }

        const result = await pool.query(
            `
            INSERT INTO simulations (
                river_id,
                source_segment_id,
                pollutant_id,
                initial_concentration,
                forecast_hours,
                probable_source_segment_id,
                risk_level,
                result_json
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING
                id,
                river_id AS "riverId",
                source_segment_id AS "sourceSegmentId",
                pollutant_id AS "pollutantId",
                initial_concentration AS "initialConcentration",
                forecast_hours AS "forecastHours",
                probable_source_segment_id AS "probableSourceSegmentId",
                risk_level AS "riskLevel",
                result_json AS "resultJson",
                created_at AS "createdAt"
            `,
            [
                riverId,
                sourceSegmentId || null,
                pollutantId,
                initialConcentration,
                forecastHours,
                probableSourceSegmentId || null,
                riskLevel,
                resultJson
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.log('Error creating simulation:', error);

        res.status(500).json({
            error: 'Failed to create simulation'
        });
    }
});

module.exports = router;