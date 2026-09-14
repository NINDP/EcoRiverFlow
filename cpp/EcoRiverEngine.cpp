#include "EcoRiverEngine.hpp"

#include <algorithm>
#include <cmath>
#include <sstream>
#include <stdexcept>
#include <cctype>

namespace {
    double clamp(double value, double minValue, double maxValue) {
        return std::max(minValue, std::min(value, maxValue));
    }

    double extractNumberAfterKey(
        const std::string& json,
        const std::string& key,
        double defaultValue = 0.0
    ) {
        const std::string pattern = "\"" + key + "\"";
        std::size_t keyPosition = json.find(pattern);

        if (keyPosition == std::string::npos) {
            return defaultValue;
        }

        std::size_t colonPosition = json.find(':', keyPosition);

        if (colonPosition == std::string::npos) {
            return defaultValue;
        }

        std::size_t valueStart = colonPosition + 1;

        while (
            valueStart < json.size() &&
            std::isspace(static_cast<unsigned char>(json[valueStart]))
        ) {
            valueStart++;
        }

        std::size_t valueEnd = valueStart;

        while (
            valueEnd < json.size() &&
            (
                std::isdigit(static_cast<unsigned char>(json[valueEnd])) ||
                json[valueEnd] == '-' ||
                json[valueEnd] == '+' ||
                json[valueEnd] == '.'
            )
        ) {
            valueEnd++;
        }

        if (valueStart == valueEnd) {
            return defaultValue;
        }

        return std::stod(json.substr(valueStart, valueEnd - valueStart));
    }
}

std::string EcoRiverEngine::simulatePollution(const std::string& inputJson) {
    SimulationInput input = parseInput(inputJson);

    if (input.segments.empty()) {
        throw std::runtime_error("No river segments provided");
    }

    int sourceIndex = -1;

    for (int i = 0; i < static_cast<int>(input.segments.size()); i++) {
        if (input.segments[i].id == input.sourceSegmentId) {
            sourceIndex = i;
            break;
        }
    }

    if (sourceIndex == -1) {
        throw std::runtime_error("Source segment not found");
    }

    std::vector<std::vector<double>> forecast;

    std::vector<double> current(input.segments.size(), 0.0);
    current[sourceIndex] = input.initialConcentration;

    forecast.push_back(current);

    for (int hour = 1; hour <= input.forecastHours; hour++) {
        std::vector<double> next(input.segments.size(), 0.0);

        for (int i = 0; i < static_cast<int>(current.size()); i++) {
            double concentration = current[i];

            if (concentration <= 0.0001) {
                continue;
            }

            const RiverSegment& segment = input.segments[i];

            FlowCondition flow = findFlowForSegment(
                input.flows,
                segment.id,
                segment.order
            );

            double cleaned = concentration * (1.0 - segment.selfCleaningRate);
            cleaned = std::max(0.0, cleaned);

            double flowFactor = flow.speedKmh / segment.lengthKm;
            flowFactor = clamp(flowFactor, 0.0, 1.0);

            double moved = cleaned * flowFactor;
            double remaining = cleaned - moved;

            next[i] += remaining;

            int nextIndex = i + flow.direction;

            if (nextIndex >= 0 && nextIndex < static_cast<int>(next.size())) {
                next[nextIndex] += moved;
            } else {
                next[i] += moved;
            }
        }

        forecast.push_back(next);
        current = next;
    }

    int probableSourceSegmentId = findProbableSourceSegmentId(input);
    std::string riskLevel = calculateRiskLevel(forecast, input.dangerThreshold);

    return buildResultJson(
        input,
        probableSourceSegmentId,
        riskLevel,
        forecast
    );
}

SimulationInput EcoRiverEngine::parseInput(const std::string& inputJson) {
    SimulationInput input;

    input.sourceSegmentId = static_cast<int>(
        extractNumberAfterKey(inputJson, "sourceSegmentId", 3)
    );

    input.pollutantId = static_cast<int>(
        extractNumberAfterKey(inputJson, "pollutantId", 1)
    );

    input.initialConcentration = extractNumberAfterKey(
        inputJson,
        "initialConcentration",
        80.0
    );

    input.forecastHours = static_cast<int>(
        extractNumberAfterKey(inputJson, "forecastHours", 6)
    );

    input.dangerThreshold = extractNumberAfterKey(
        inputJson,
        "dangerThreshold",
        75.0
    );

    input.segments = {
        {1, 1, 2.0, 0.05},
        {2, 2, 2.0, 0.06},
        {3, 3, 1.5, 0.08},
        {4, 4, 2.2, 0.07},
        {5, 5, 1.8, 0.06}
    };

    input.flows = {
        {1, 1, 1, 1.0},
        {2, 2, 1, 1.1},
        {3, 3, 1, 1.3},
        {4, 4, 1, 1.0},
        {5, 5, 1, 0.8}
    };

    return input;
}

FlowCondition EcoRiverEngine::findFlowForSegment(
    const std::vector<FlowCondition>& flows,
    int segmentId,
    int segmentOrder
) {
    for (const FlowCondition& flow : flows) {
        if (flow.segmentId == segmentId) {
            return flow;
        }
    }

    return {
        segmentId,
        segmentOrder,
        1,
        1.0
    };
}

std::string EcoRiverEngine::calculateRiskLevel(
    const std::vector<std::vector<double>>& forecast,
    double dangerThreshold
) {
    double maxConcentration = 0.0;

    for (const auto& hourState : forecast) {
        for (double concentration : hourState) {
            maxConcentration = std::max(maxConcentration, concentration);
        }
    }

    if (maxConcentration >= dangerThreshold * 1.25) {
        return "CRITICAL";
    }

    if (maxConcentration >= dangerThreshold) {
        return "HIGH";
    }

    if (maxConcentration >= dangerThreshold * 0.6) {
        return "MEDIUM";
    }

    return "LOW";
}

int EcoRiverEngine::findProbableSourceSegmentId(
    const SimulationInput& input
) {
    return input.sourceSegmentId;
}

std::string EcoRiverEngine::buildResultJson(
    const SimulationInput& input,
    int probableSourceSegmentId,
    const std::string& riskLevel,
    const std::vector<std::vector<double>>& forecast
) {
    std::ostringstream json;

    json << "{";
    json << "\"mode\":\"KNOWN_SOURCE_FORECAST\",";
    json << "\"sourceSegmentId\":" << input.sourceSegmentId << ",";
    json << "\"pollutantId\":" << input.pollutantId << ",";
    json << "\"probableSourceSegmentId\":" << probableSourceSegmentId << ",";
    json << "\"riskLevel\":\"" << riskLevel << "\",";
    json << "\"forecast\":[";

    for (std::size_t hour = 0; hour < forecast.size(); hour++) {
        if (hour > 0) {
            json << ",";
        }

        json << "{";
        json << "\"hour\":" << hour << ",";
        json << "\"concentrations\":[";

        for (std::size_t i = 0; i < forecast[hour].size(); i++) {
            if (i > 0) {
                json << ",";
            }

            double rounded = std::round(forecast[hour][i] * 100.0) / 100.0;
            json << rounded;
        }

        json << "]";
        json << "}";
    }

    json << "]";
    json << "}";

    return json.str();
}