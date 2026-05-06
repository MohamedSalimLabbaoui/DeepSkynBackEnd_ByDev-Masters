"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextualAnalysisModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const contextual_analysis_controller_1 = require("./contextual-analysis.controller");
const contextual_analysis_service_1 = require("./contextual-analysis.service");
const prisma_module_1 = require("../prisma/prisma.module");
let ContextualAnalysisModule = class ContextualAnalysisModule {
};
exports.ContextualAnalysisModule = ContextualAnalysisModule;
exports.ContextualAnalysisModule = ContextualAnalysisModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, config_1.ConfigModule],
        controllers: [contextual_analysis_controller_1.ContextualAnalysisController],
        providers: [contextual_analysis_service_1.ContextualAnalysisService],
        exports: [contextual_analysis_service_1.ContextualAnalysisService],
    })
], ContextualAnalysisModule);
//# sourceMappingURL=contextual-analysis.module.js.map