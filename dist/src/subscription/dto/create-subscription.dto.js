"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateSubscriptionDto = exports.SubscriptionStatus = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["ACTIVE"] = "active";
    SubscriptionStatus["CANCELLED"] = "cancelled";
    SubscriptionStatus["EXPIRED"] = "expired";
    SubscriptionStatus["PENDING"] = "pending";
})(SubscriptionStatus || (exports.SubscriptionStatus = SubscriptionStatus = {}));
class CreateSubscriptionDto {
    constructor() {
        this.plan = 'free';
        this.status = SubscriptionStatus.ACTIVE;
        this.currency = 'TND';
    }
}
exports.CreateSubscriptionDto = CreateSubscriptionDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "Code du plan d'abonnement",
        default: 'free',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateSubscriptionDto.prototype, "plan", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Alias rétro-compatible (préférer plan)',
        default: 'free',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateSubscriptionDto.prototype, "planCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "Statut de l'abonnement",
        enum: SubscriptionStatus,
        default: 'active',
    }),
    (0, class_validator_1.IsEnum)(SubscriptionStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateSubscriptionDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "Montant de l'abonnement",
        example: 29.99,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateSubscriptionDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Devise',
        default: 'TND',
        example: 'TND',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateSubscriptionDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "Date de début de l'abonnement",
        example: '2026-02-04T00:00:00.000Z',
    }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateSubscriptionDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "Date de fin de l'abonnement",
        example: '2026-03-04T00:00:00.000Z',
    }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateSubscriptionDto.prototype, "endDate", void 0);
//# sourceMappingURL=create-subscription.dto.js.map