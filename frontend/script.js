const API_BASE_URL = 'http://localhost:8080';

const RIVER_COLUMN_WIDTH = 180;

let currentRiver = null;
let currentSegments = [];
let currentMeasurements = [];
let currentPollutants = [];
let currentFlows = [];

async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP Error: ${response.status}. ${errorText}`);
    }

    if (response.status === 204) {
        return null;
    }

    return await response.json();
}

async function loadRivers() {
    try {
        return await fetchJson(`${API_BASE_URL}/api/rivers`);
    } catch (error) {
        console.log('Error loading rivers:', error);
        return [];
    }
}

async function loadRiverSegments(riverId) {
    try {
        return await fetchJson(`${API_BASE_URL}/api/segments?riverId=${riverId}`);
    } catch (error) {
        console.log('Error loading river segments:', error);
        return [];
    }
}

async function loadMeasurements(riverId) {
    try {
        return await fetchJson(`${API_BASE_URL}/api/measurements/latest?riverId=${riverId}`);
    } catch (error) {
        console.log('Error loading measurements:', error);
        return [];
    }
}

async function loadPollutants() {
    try {
        return await fetchJson(`${API_BASE_URL}/api/pollutants`);
    } catch (error) {
        console.log('Error loading pollutants:', error);
        return [];
    }
}

async function loadFlows(riverId) {
    try {
        return await fetchJson(`${API_BASE_URL}/api/flows?riverId=${riverId}`);
    } catch (error) {
        console.log('Error loading flow conditions:', error);
        return [];
    }
}

async function saveSimulation(simulationPayload) {
    try {
        return await fetchJson(`${API_BASE_URL}/api/simulations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(simulationPayload)
        });
    } catch (error) {
        console.log('Error saving simulation:', error);
        return null;
    }
}

function clearSelect(select) {
    if (!select) {
        return;
    }

    select.innerHTML = '';
}

function createOption(value, text, selected = false) {
    const option = document.createElement('option');

    option.value = value;
    option.textContent = text;
    option.selected = selected;

    return option;
}

function renderSegmentsOption(segments) {
    const select = document.querySelector('.source-pollution');

    if (!select) {
        return;
    }

    clearSelect(select);

    if (segments.length === 0) {
        select.appendChild(createOption('', 'Участки не найдены'));
        return;
    }

    segments.forEach(segment => {
        select.appendChild(createOption(segment.id, segment.name));
    });
}

function renderPollutantsOption(pollutants) {
    const select = document.querySelector('.type-pollutant');

    if (!select) {
        return;
    }

    clearSelect(select);

    if (pollutants.length === 0) {
        select.appendChild(createOption('', 'Загрязнители не найдены'));
        return;
    }

    pollutants.forEach(pollutant => {
        select.appendChild(createOption(pollutant.id, pollutant.name));
    });
}

function getHourWord(hours) {
    const lastDigit = hours % 10;
    const lastTwoDigits = hours % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
        return 'часов';
    }

    if (lastDigit === 1) {
        return 'час';
    }

    if (lastDigit >= 2 && lastDigit <= 4) {
        return 'часа';
    }

    return 'часов';
}

function renderTimePollutionOption() {
    const select = document.querySelector('.time-pollution');

    if (!select) {
        return;
    }

    clearSelect(select);

    for (let i = 1; i <= 6; i++) {
        select.appendChild(createOption(i, `${i} ${getHourWord(i)}`, i === 6));
    }
}

function getMeasurementBySegmentId(segmentId, measurements) {
    return measurements.find(measurement => {
        return Number(measurement.segmentId) === Number(segmentId);
    });
}

function getSegmentConcentration(segmentId, measurements) {
    const measurement = getMeasurementBySegmentId(segmentId, measurements);

    if (!measurement) {
        return 0;
    }

    return Number(measurement.concentration);
}

function getConcentrationClass(concentration) {
    if (concentration >= 75) {
        return 'concentration--danger';
    }

    if (concentration >= 50) {
        return 'concentration--warning';
    }

    if (concentration >= 25) {
        return 'concentration--medium';
    }

    return 'concentration--low';
}

function getRiskLevel(maxConcentration) {
    if (maxConcentration >= 100) {
        return 'CRITICAL';
    }

    if (maxConcentration >= 75) {
        return 'HIGH';
    }

    if (maxConcentration >= 50) {
        return 'MEDIUM';
    }

    return 'LOW';
}

function getRiverWidth(segmentsCount) {
    const minWidth = 600;
    return Math.max(segmentsCount * RIVER_COLUMN_WIDTH, minWidth);
}

function renderRiverSegments(segments, measurements = []) {
    const riverColumns = document.querySelector('#river-columns');
    const riverVisual = document.querySelector('#river-visual');

    if (!riverColumns || !riverVisual) {
        return;
    }

    riverVisual.style.width = `${getRiverWidth(segments.length)}px`;

    if (segments.length === 0) {
        riverColumns.innerHTML = `
            <div class="river-column">
                <h3 class="river-column__title">Нет участков</h3>
                <span class="river-arrow">→</span>
                <span class="concentration concentration--low">0 ppm</span>
            </div>
        `;
        return;
    }

    riverColumns.innerHTML = segments
        .map(segment => {
            const concentration = getSegmentConcentration(segment.id, measurements);
            const roundedConcentration = Math.round(concentration);
            const concentrationClass = getConcentrationClass(roundedConcentration);

            return `
                <div class="river-column" data-segment-id="${segment.id}">
                    <h3 class="river-column__title">${segment.name}</h3>
                    <span class="river-arrow">→</span>
                    <span class="concentration ${concentrationClass}">
                        ${roundedConcentration} ppm
                    </span>
                </div>
            `;
        })
        .join('');
}

function getSelectedSimulationData() {
    const sourceSelect = document.querySelector('.source-pollution');
    const pollutantSelect = document.querySelector('.type-pollutant');
    const concentrationInput = document.querySelector('.initial-concentration');
    const timeSelect = document.querySelector('.time-pollution');

    return {
        riverId: Number(currentRiver?.id),
        sourceSegmentId: Number(sourceSelect?.value),
        pollutantId: Number(pollutantSelect?.value),
        initialConcentration: Number(concentrationInput?.value),
        forecastHours: Number(timeSelect?.value)
    };
}

function getSourceSegment(sourceSegmentId) {
    return currentSegments.find(segment => {
        return Number(segment.id) === Number(sourceSegmentId);
    });
}

function buildPreviewMeasurementsFromSource(segments, sourceSegmentId, initialConcentration) {
    const sourceSegment = getSourceSegment(sourceSegmentId);

    if (!sourceSegment) {
        return [];
    }

    const sourceOrder = Number(sourceSegment.segmentOrder);

    return segments.map(segment => {
        const segmentOrder = Number(segment.segmentOrder);

        let concentration = 0;

        if (segmentOrder === sourceOrder) {
            concentration = initialConcentration;
        } else if (segmentOrder > sourceOrder) {
            const distanceFromSource = segmentOrder - sourceOrder;

            concentration = Math.max(
                0,
                Math.round(initialConcentration * Math.pow(0.75, distanceFromSource))
            );
        }

        return {
            segmentId: segment.id,
            concentration
        };
    });
}

function buildForecastFromSource(segments, sourceSegmentId, initialConcentration, forecastHours) {
    const sourceSegment = getSourceSegment(sourceSegmentId);

    if (!sourceSegment) {
        return [];
    }

    const sourceOrder = Number(sourceSegment.segmentOrder);
    const forecast = [];

    for (let hour = 0; hour <= forecastHours; hour++) {
        const concentrations = segments.map(segment => {
            const segmentOrder = Number(segment.segmentOrder);
            const distanceFromSource = segmentOrder - sourceOrder;

            if (distanceFromSource < 0) {
                return 0;
            }

            const arrivalDelay = distanceFromSource;

            if (hour < arrivalDelay) {
                return 0;
            }

            const timeAfterArrival = hour - arrivalDelay;
            const distanceDecay = Math.pow(0.78, distanceFromSource);
            const timeDecay = Math.pow(0.88, timeAfterArrival);

            return Math.max(
                0,
                Math.round(initialConcentration * distanceDecay * timeDecay)
            );
        });

        forecast.push({
            hour,
            concentrations
        });
    }

    return forecast;
}

function getMaxConcentrationFromMeasurements(measurements) {
    if (measurements.length === 0) {
        return 0;
    }

    return Math.max(...measurements.map(item => Number(item.concentration)));
}

function findProbableSourceByJump(segments, measurements) {
    if (!segments.length || !measurements.length) {
        return null;
    }

    const orderedSegments = [...segments].sort((a, b) => {
        return Number(a.segmentOrder) - Number(b.segmentOrder);
    });

    let bestSegment = null;
    let bestJump = -Infinity;

    for (let i = 1; i < orderedSegments.length; i++) {
        const previousSegment = orderedSegments[i - 1];
        const currentSegment = orderedSegments[i];

        const previousConcentration = getSegmentConcentration(previousSegment.id, measurements);
        const currentConcentration = getSegmentConcentration(currentSegment.id, measurements);

        const jump = currentConcentration - previousConcentration;

        if (jump > bestJump) {
            bestJump = jump;
            bestSegment = currentSegment;
        }
    }

    if (bestJump < 20) {
        const firstSegment = orderedSegments[0];
        const firstConcentration = getSegmentConcentration(firstSegment.id, measurements);

        if (firstConcentration >= 75) {
            return firstSegment;
        }

        return null;
    }

    return bestSegment;
}

function showPollutionMarker(sourceSegmentId) {
    const marker = document.querySelector('#pollution-marker');
    const markerText = document.querySelector('#pollution-marker-text');
    const riverVisual = document.querySelector('#river-visual');

    if (!marker || !markerText || !riverVisual) {
        return;
    }

    const sourceSegment = getSourceSegment(sourceSegmentId);

    if (!sourceSegment) {
        marker.classList.add('is-hidden');
        return;
    }

    const index = currentSegments.findIndex(segment => {
        return Number(segment.id) === Number(sourceSegmentId);
    });

    const markerLeft = index * RIVER_COLUMN_WIDTH + RIVER_COLUMN_WIDTH / 2;

    markerText.textContent = sourceSegment.name;
    marker.style.left = `${markerLeft}px`;
    marker.style.transform = 'translateX(-50%)';
    marker.classList.remove('is-hidden');
}

function hidePollutionMarker() {
    const marker = document.querySelector('#pollution-marker');

    if (!marker) {
        return;
    }

    marker.classList.add('is-hidden');
}

function getAverageFlowSpeed(flows) {
    if (!flows.length) {
        return 0;
    }

    const sum = flows.reduce((acc, flow) => acc + Number(flow.speedKmh || 0), 0);
    return sum / flows.length;
}

function getAverageSelfCleaning(segments) {
    if (!segments.length) {
        return 0;
    }

    const sum = segments.reduce((acc, segment) => {
        return acc + Number(segment.selfCleaningRate || 0);
    }, 0);

    return sum / segments.length;
}

function getFlowDirectionText(flows) {
    const firstFlow = flows[0];

    if (!firstFlow) {
        return 'Неизвестно';
    }

    return Number(firstFlow.direction) === -1
        ? 'Вверх по течению'
        : 'Вниз по течению';
}

function renderMetrics() {
    const flowSpeedElement = document.querySelector('#metric-flow-speed');
    const cleaningElement = document.querySelector('#metric-cleaning');
    const sensorsElement = document.querySelector('#metric-sensors');
    const riskDistanceElement = document.querySelector('#metric-risk-distance');

    const averageFlowSpeed = getAverageFlowSpeed(currentFlows);
    const averageCleaning = getAverageSelfCleaning(currentSegments);

    if (flowSpeedElement) {
        flowSpeedElement.textContent = `${averageFlowSpeed.toFixed(2)} км/ч`;
    }

    if (cleaningElement) {
        cleaningElement.textContent = `${Math.round(averageCleaning * 100)} %`;
    }

    if (sensorsElement) {
        sensorsElement.textContent = `${currentMeasurements.length} / ${currentSegments.length}`;
    }

    if (riskDistanceElement) {
        riskDistanceElement.textContent = `${Math.max(currentSegments.length - 1, 0)} участ.`;
    }
}

function renderDiagnostics(sourceSegment, riskLevel, description) {
    const sourceElement = document.querySelector('#diagnostic-source');
    const riskElement = document.querySelector('#diagnostic-risk');
    const flowElement = document.querySelector('#diagnostic-flow');
    const descriptionElement = document.querySelector('#diagnostic-description');
    const warningBox = document.querySelector('#warning-box');
    const flowDirectionText = document.querySelector('#flow-direction-text');

    if (sourceElement) {
        sourceElement.textContent = sourceSegment ? sourceSegment.name : 'Не найден';
    }

    if (riskElement) {
        riskElement.textContent = translateRiskLevel(riskLevel);
    }

    const flowText = getFlowDirectionText(currentFlows);

    if (flowElement) {
        flowElement.textContent = flowText;
    }

    if (flowDirectionText) {
        flowDirectionText.textContent = flowText;
    }

    if (descriptionElement) {
        descriptionElement.textContent = description || 'Недостаточно данных для диагностики.';
    }

    if (warningBox) {
        if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
            warningBox.classList.remove('is-hidden');
        } else {
            warningBox.classList.add('is-hidden');
        }
    }
}

function translateRiskLevel(riskLevel) {
    switch (riskLevel) {
        case 'CRITICAL':
            return 'Критический';
        case 'HIGH':
            return 'Высокий';
        case 'MEDIUM':
            return 'Средний';
        case 'LOW':
            return 'Низкий';
        default:
            return 'Неизвестно';
    }
}

function renderEvents(events) {
    const container = document.querySelector('#events-list');

    if (!container) {
        return;
    }

    if (!events.length) {
        container.innerHTML = '<p class="empty-state">Событий пока нет.</p>';
        return;
    }

    container.innerHTML = events.map(event => `
        <article class="event-item event-item--${event.type}">
            <span class="event-item__time">${event.time}</span>
            <div>
                <p class="event-item__title">${event.title}</p>
                <p class="event-item__text">${event.text}</p>
            </div>
        </article>
    `).join('');
}

function buildEventsFromMeasurements(measurements) {
    const dangerousMeasurements = measurements
        .filter(item => Number(item.concentration) >= 75)
        .slice(0, 3);

    if (!dangerousMeasurements.length) {
        return [
            {
                time: 'сейчас',
                type: 'info',
                title: 'Данные получены',
                text: 'Все показатели в норме'
            }
        ];
    }

    return dangerousMeasurements.map(item => ({
        time: formatShortTime(item.measuredAt),
        type: Number(item.concentration) >= 75 ? 'danger' : 'warning',
        title: `Превышение на ${item.segmentName}`,
        text: `Концентрация ${Math.round(Number(item.concentration))} ppm`
    }));
}

function formatShortTime(value) {
    if (!value) {
        return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function renderForecastChart(forecast, sourceSegmentId) {
    const container = document.querySelector('#forecast-chart');
    const title = document.querySelector('#forecast-title');

    if (!container) {
        return;
    }

    const sourceSegment = getSourceSegment(sourceSegmentId);

    if (title) {
        title.textContent = sourceSegment 
            ? `Прогноз — ${sourceSegment.name}` 
            : 'Прогноз концентрации';
    }

    if (!forecast.length) {
        container.innerHTML = '<p class="empty-state">Нет данных для графика.</p>';
        return;
    }

    const sourceIndex = currentSegments.findIndex(segment => {
        return Number(segment.id) === Number(sourceSegmentId);
    });

    const values = forecast.map(item => {
        return Number(item.concentrations[sourceIndex] || 0);
    });

    const width = 640;
    const height = 180;
    const paddingLeft = 34;
    const paddingRight = 16;
    const paddingTop = 18;
    const paddingBottom = 28;

    const maxValue = Math.max(100, ...values);
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const points = values.map((value, index) => {
        const x = paddingLeft + (chartWidth / Math.max(values.length - 1, 1)) * index;
        const y = paddingTop + chartHeight - (value / maxValue) * chartHeight;

        return { x, y, value, hour: forecast[index].hour };
    });

    const polylinePoints = points.map(point => `${point.x},${point.y}`).join(' ');
    const thresholdY = paddingTop + chartHeight - (75 / maxValue) * chartHeight;

    container.innerHTML = `
        <svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
            <line class="chart-axis" x1="${paddingLeft}" y1="${paddingTop + chartHeight}" x2="${width - paddingRight}" y2="${paddingTop + chartHeight}"></line>
            <line class="chart-axis" x1="${paddingLeft}" y1="${paddingTop}" x2="${paddingLeft}" y2="${paddingTop + chartHeight}"></line>
            <line class="chart-threshold" x1="${paddingLeft}" y1="${thresholdY}" x2="${width - paddingRight}" y2="${thresholdY}"></line>
            <polyline class="chart-line" points="${polylinePoints}"></polyline>

            ${points.map(point => `
                <circle class="chart-point" cx="${point.x}" cy="${point.y}" r="4"></circle>
                <text class="chart-label" x="${point.x}" y="${point.y - 10}" text-anchor="middle">${Math.round(point.value)}</text>
                <text class="chart-time" x="${point.x}" y="${height - 8}" text-anchor="middle">${point.hour}ч</text>
            `).join('')}
        </svg>
    `;
}

async function handleSimulationSubmit(event) {
    event.preventDefault();

    const simulationData = getSelectedSimulationData();

    if (!simulationData.sourceSegmentId || !simulationData.pollutantId) {
        console.log('Не выбран источник загрязнения или тип загрязнителя');
        return;
    }

    if (!simulationData.initialConcentration || simulationData.initialConcentration <= 0) {
        console.log('Начальная концентрация должна быть больше 0');
        return;
    }

    const previewMeasurements = buildPreviewMeasurementsFromSource(
        currentSegments,
        simulationData.sourceSegmentId,
        simulationData.initialConcentration
    );

    const forecast = buildForecastFromSource(
        currentSegments,
        simulationData.sourceSegmentId,
        simulationData.initialConcentration,
        simulationData.forecastHours
    );

    const maxConcentration = getMaxConcentrationFromMeasurements(previewMeasurements);
    const riskLevel = getRiskLevel(maxConcentration);

    const resultJson = {
        mode: 'KNOWN_SOURCE_FORECAST',
        sourceSegmentId: simulationData.sourceSegmentId,
        pollutantId: simulationData.pollutantId,
        riskLevel,
        forecast
    };

    renderRiverSegments(currentSegments, previewMeasurements);
    showPollutionMarker(simulationData.sourceSegmentId);

    const sourceSegment = getSourceSegment(simulationData.sourceSegmentId);

    renderDiagnostics(
        sourceSegment,
        riskLevel,
        `Выброс загрязнителя зафиксирован на участке "${sourceSegment?.name}". Загрязнение распространяется ${getFlowDirectionText(currentFlows).toLowerCase()}. Рекомендуется принять меры по локализации.`
    );
    
    renderForecastChart(forecast, simulationData.sourceSegmentId);
    
    renderEvents([
        {
            time: 'сейчас',
            type: riskLevel === 'HIGH' || riskLevel === 'CRITICAL' ? 'danger' : 'warning',
            title: `Запущена симуляция: ${sourceSegment?.name}`,
            text: `Начальная концентрация ${simulationData.initialConcentration} ppm`
        },
        ...buildEventsFromMeasurements(previewMeasurements)
    ]);

    const savedSimulation = await saveSimulation({
        riverId: simulationData.riverId,
        sourceSegmentId: simulationData.sourceSegmentId,
        pollutantId: simulationData.pollutantId,
        initialConcentration: simulationData.initialConcentration,
        forecastHours: simulationData.forecastHours,
        probableSourceSegmentId: simulationData.sourceSegmentId,
        riskLevel,
        resultJson
    });

    console.log('Simulation data:', simulationData);
    console.log('Preview measurements:', previewMeasurements);
    console.log('Forecast:', forecast);
    console.log('Saved simulation:', savedSimulation);
}

function renderInitialSourceAnalysis() {
    const probableSource = findProbableSourceByJump(currentSegments, currentMeasurements);

    if (!probableSource) {
        hidePollutionMarker();
        return;
    }

    showPollutionMarker(probableSource.id);
}

function bindEvents() {
    const form = document.querySelector('.simulation-form');

    if (form) {
        form.addEventListener('submit', handleSimulationSubmit);
    }

    const sourceSelect = document.querySelector('.source-pollution');

    if (sourceSelect) {
        sourceSelect.addEventListener('change', event => {
            showPollutionMarker(Number(event.target.value));
        });
    }
}

async function init() {
    try {
        const rivers = await loadRivers();

        if (rivers.length === 0) {
            console.log('Rivers list is empty');
            return;
        }

        currentRiver = rivers[0];

        currentSegments = await loadRiverSegments(currentRiver.id);
        currentMeasurements = await loadMeasurements(currentRiver.id);
        currentPollutants = await loadPollutants();
        currentFlows = await loadFlows(currentRiver.id);

        renderSegmentsOption(currentSegments);
        renderPollutantsOption(currentPollutants);
        renderTimePollutionOption();

        renderRiverSegments(currentSegments, currentMeasurements);
        bindEvents();
        renderInitialSourceAnalysis();

        renderMetrics();

        const probableSource = findProbableSourceByJump(currentSegments, currentMeasurements);
        const maxConcentration = getMaxConcentrationFromMeasurements(currentMeasurements);
        const initialRiskLevel = getRiskLevel(maxConcentration);
        
        renderDiagnostics(
            probableSource,
            initialRiskLevel,
            probableSource
                ? `Вероятный источник загрязнения находится на участке "${probableSource.name}". Вывод сделан по резкому росту концентрации между соседними датчиками.`
                : 'Явный источник загрязнения по текущим показаниям не обнаружен.'
        );
        
        renderEvents(buildEventsFromMeasurements(currentMeasurements));

        console.log('Current river:', currentRiver);
        console.log('Segments:', currentSegments);
        console.log('Measurements:', currentMeasurements);
        console.log('Pollutants:', currentPollutants);
        console.log('Flows:', currentFlows);
    } catch (error) {
        console.log('Init error:', error);
    }
}

init();