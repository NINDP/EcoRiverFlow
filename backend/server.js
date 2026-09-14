const express = require('express');
const cors = require('cors');

const riversRouter = require('./routes/rivers');
const riverSegmentsRouter = require('./routes/riversegments');
const measurementsRouter = require('./routes/measurements');
const pollutantsRouter = require('./routes/pollutants');
const flowsRouter = require('./routes/flows');
const sensorsRouter = require('./routes/sensors');
const simulationsRouter = require('./routes/simulations');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'EcoRiverFlow backend is running'
    });
});

app.use('/api/rivers', riversRouter);
app.use('/api/segments', riverSegmentsRouter);
app.use('/api/measurements', measurementsRouter);
app.use('/api/pollutants', pollutantsRouter);
app.use('/api/flows', flowsRouter);
app.use('/api/sensors', sensorsRouter);
app.use('/api/simulations', simulationsRouter);

app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found'
    });
});

app.listen(PORT, () => {
    console.log(`EcoRiverFlow backend started on http://localhost:${PORT}`);
});