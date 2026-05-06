"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PredictiveRoutineModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_module_1 = require("../prisma/prisma.module");
const predictive_routine_controller_1 = require("./predictive-routine.controller");
const predictive_routine_service_1 = require("./predictive-routine.service");
const digital_twin_module_1 = require("../digital-twin/digital-twin.module");
let PredictiveRoutineModule = class PredictiveRoutineModule {
};
exports.PredictiveRoutineModule = PredictiveRoutineModule;
exports.PredictiveRoutineModule = PredictiveRoutineModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, config_1.ConfigModule, digital_twin_module_1.DigitalTwinModule],
        controllers: [predictive_routine_controller_1.PredictiveRoutineController],
        providers: [predictive_routine_service_1.PredictiveRoutineService],
        exports: [predictive_routine_service_1.PredictiveRoutineService],
    })
], PredictiveRoutineModule);
//# sourceMappingURL=predictive-routine.module.js.map