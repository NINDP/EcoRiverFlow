#include <emscripten/bind.h>
#include "EcoRiverEngine.hpp"

using namespace emscripten;

EMSCRIPTEN_BINDINGS(ecoriver_module) {
    class_<EcoRiverEngine>("EcoRiverEngine")
        .constructor<>()
        .function("simulatePollution", &EcoRiverEngine::simulatePollution);
}