#ifndef ECO_RIVER_ENGINE_HPP
#define ECO_RIVER_ENGINE_HPP

#include <string>
#include <vector>

struct RiverSegment {
    int id;
    int order;
    double lengthKm;
    double selfCleaningRate;
};

struct FlowCondition {
    int segmentId;
    int segmentOrder;
    int direction;
    double speedKmh;
};

struct SimulationInput {
    int sourceSegmentId;
    int pollutantId;
    double initialConcentration;
    int forecastHours;
    double dangerThreshold;

    std::vector<RiverSegment> segments;
    std::vector<FlowCondition> flows;
};

class EcoRiverEngine {
public:
    EcoRiverEngine() = default;

    std::string simulatePollution(const std::string& inputJson);

private:
    SimulationInput parseInput(const std::string& inputJson);

    FlowCondition findFlowForSegment(
        const std::vector<FlowCondition>& flows,
        int segmentId,
        int segmentOrder
    );

    std::string calculateRiskLevel(
        const std::vector<std::vector<double>>& forecast,
        double dangerThreshold
    );

    int findProbableSourceSegmentId(
        const SimulationInput& input
    );

    std::string buildResultJson(
        const SimulationInput& input,
        int probableSourceSegmentId,
        const std::string& riskLevel,
        const std::vector<std::vector<double>>& forecast
    );
};

#endif