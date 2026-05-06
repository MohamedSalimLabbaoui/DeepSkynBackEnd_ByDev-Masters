"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductScanModule = void 0;
const common_1 = require("@nestjs/common");
const product_scan_service_1 = require("./product-scan.service");
const product_scan_controller_1 = require("./product-scan.controller");
const prisma_service_1 = require("../prisma/prisma.service");
const analysis_module_1 = require("../analysis/analysis.module");
let ProductScanModule = class ProductScanModule {
};
exports.ProductScanModule = ProductScanModule;
exports.ProductScanModule = ProductScanModule = __decorate([
    (0, common_1.Module)({
        imports: [analysis_module_1.AnalysisModule],
        providers: [product_scan_service_1.ProductScanService, prisma_service_1.PrismaService],
        controllers: [product_scan_controller_1.ProductScanController],
        exports: [product_scan_service_1.ProductScanService],
    })
], ProductScanModule);
//# sourceMappingURL=product-scan.module.js.map