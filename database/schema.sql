DROP TABLE IF EXISTS simulation_results CASCADE;
DROP TABLE IF EXISTS simulations CASCADE;
DROP TABLE IF EXISTS measurements CASCADE;
DROP TABLE IF EXISTS flow_conditions CASCADE;
DROP TABLE IF EXISTS sensors CASCADE;
DROP TABLE IF EXISTS pollutants CASCADE;
DROP TABLE IF EXISTS river_segments CASCADE;
DROP TABLE IF EXISTS rivers CASCADE;

CREATE TABLE rivers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE river_segments (
    id SERIAL PRIMARY KEY,
    river_id INTEGER NOT NULL REFERENCES rivers(id) ON DELETE CASCADE,
    segment_order INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    length_km NUMERIC(8, 3) NOT NULL,
    self_cleaning_rate NUMERIC(5, 3) NOT NULL,
    UNIQUE (river_id, segment_order)
);

CREATE TABLE sensors (
    id SERIAL PRIMARY KEY,
    segment_id INTEGER NOT NULL REFERENCES river_segments(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE pollutants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    danger_threshold NUMERIC(10, 2) NOT NULL,
    decay_multiplier NUMERIC(5, 3) NOT NULL
);

CREATE TABLE flow_conditions (
    id SERIAL PRIMARY KEY,
    segment_id INTEGER NOT NULL REFERENCES river_segments(id) ON DELETE CASCADE,
    measured_at TIMESTAMP NOT NULL,
    direction INTEGER NOT NULL CHECK (direction IN (-1, 1)),
    speed_kmh NUMERIC(8, 3) NOT NULL
);

CREATE TABLE measurements (
    id SERIAL PRIMARY KEY,
    sensor_id INTEGER NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
    measured_at TIMESTAMP NOT NULL,
    concentration NUMERIC(10, 2) NOT NULL
);

CREATE TABLE simulations (
    id SERIAL PRIMARY KEY,
    river_id INTEGER NOT NULL REFERENCES rivers(id) ON DELETE CASCADE,
    source_segment_id INTEGER NOT NULL REFERENCES river_segments(id),
    pollutant_id INTEGER NOT NULL REFERENCES pollutants(id),
    initial_concentration NUMERIC(10, 2) NOT NULL,
    forecast_hours INTEGER NOT NULL,
    probable_source_segment_id INTEGER REFERENCES river_segments(id),
    risk_level VARCHAR(30) NOT NULL,
    result_json JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_river_segments_river_id ON river_segments(river_id);
CREATE INDEX idx_sensors_segment_id ON sensors(segment_id);
CREATE INDEX idx_flow_conditions_segment_id ON flow_conditions(segment_id);
CREATE INDEX idx_measurements_sensor_id ON measurements(sensor_id);
CREATE INDEX idx_simulations_river_id ON simulations(river_id);