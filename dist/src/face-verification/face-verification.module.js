"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FaceVerificationModule = void 0;
const common_1 = require("@nestjs/common");
const face_verification_controller_1 = require("./face-verification.controller");
const face_verification_service_1 = require("./face-verification.service");
const prisma_module_1 = require("../prisma/prisma.module");
const analysis_module_1 = require("../analysis/analysis.module");
let FaceVerificationModule = class FaceVerificationModule {
};
exports.FaceVerificationModule = FaceVerificationModule;
exports.FaceVerificationModule = FaceVerificationModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, analysis_module_1.AnalysisModule],
        controllers: [face_verification_controller_1.FaceVerificationController],
        providers: [face_verification_service_1.FaceVerificationService],
        exports: [face_verification_service_1.FaceVerificationService],
    })
], FaceVerificationModule);
//# sourceMappingURL=face-verification.module.js.map