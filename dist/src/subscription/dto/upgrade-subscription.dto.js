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
exports.UpgradeSubscriptionDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class UpgradeSubscriptionDto {
}
exports.UpgradeSubscriptionDto = UpgradeSubscriptionDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Plan vers lequel upgrader',
        example: 'premium',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpgradeSubscriptionDto.prototype, "plan", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Alias rétro-compatible (préférer plan)',
        example: 'premium',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpgradeSubscriptionDto.prototype, "planCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Méthode de paiement (pour intégration future)',
        example: 'card_visa_4242',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpgradeSubscriptionDto.prototype, "paymentMethod", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Code promotionnel',
        example: 'DEEPSKYN20',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpgradeSubscriptionDto.prototype, "promoCode", void 0);
//# sourceMappingURL=upgrade-subscription.dto.js.map