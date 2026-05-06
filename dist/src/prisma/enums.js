"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkinSensitivity = exports.SkinConcern = exports.SubscriptionStatus = exports.SubscriptionPlan = exports.AnalysisStatus = exports.RoutineType = exports.UserRole = exports.NotificationType = exports.SkinType = void 0;
var SkinType;
(function (SkinType) {
    SkinType["DRY"] = "dry";
    SkinType["OILY"] = "oily";
    SkinType["COMBINATION"] = "combination";
    SkinType["NORMAL"] = "normal";
    SkinType["SENSITIVE"] = "sensitive";
})(SkinType || (exports.SkinType = SkinType = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType["INFO"] = "info";
    NotificationType["SUCCESS"] = "success";
    NotificationType["WARNING"] = "warning";
    NotificationType["ERROR"] = "error";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "admin";
    UserRole["USER"] = "user";
})(UserRole || (exports.UserRole = UserRole = {}));
var RoutineType;
(function (RoutineType) {
    RoutineType["AM"] = "AM";
    RoutineType["PM"] = "PM";
    RoutineType["WEEKLY"] = "weekly";
})(RoutineType || (exports.RoutineType = RoutineType = {}));
var AnalysisStatus;
(function (AnalysisStatus) {
    AnalysisStatus["PENDING"] = "pending";
    AnalysisStatus["PROCESSING"] = "processing";
    AnalysisStatus["COMPLETED"] = "completed";
    AnalysisStatus["FAILED"] = "failed";
})(AnalysisStatus || (exports.AnalysisStatus = AnalysisStatus = {}));
var SubscriptionPlan;
(function (SubscriptionPlan) {
    SubscriptionPlan["FREE"] = "free";
    SubscriptionPlan["PREMIUM"] = "premium";
    SubscriptionPlan["PREMIUM_YEARLY"] = "premium_yearly";
})(SubscriptionPlan || (exports.SubscriptionPlan = SubscriptionPlan = {}));
var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["ACTIVE"] = "active";
    SubscriptionStatus["CANCELLED"] = "cancelled";
    SubscriptionStatus["EXPIRED"] = "expired";
    SubscriptionStatus["PENDING"] = "pending";
})(SubscriptionStatus || (exports.SubscriptionStatus = SubscriptionStatus = {}));
var SkinConcern;
(function (SkinConcern) {
    SkinConcern["ACNE"] = "acne";
    SkinConcern["WRINKLES"] = "wrinkles";
    SkinConcern["HYPERPIGMENTATION"] = "hyperpigmentation";
    SkinConcern["DRYNESS"] = "dryness";
    SkinConcern["REDNESS"] = "redness";
    SkinConcern["DARK_CIRCLES"] = "dark_circles";
    SkinConcern["PORES"] = "pores";
    SkinConcern["FINE_LINES"] = "fine_lines";
    SkinConcern["UNEVEN_TEXTURE"] = "uneven_texture";
    SkinConcern["DULLNESS"] = "dullness";
})(SkinConcern || (exports.SkinConcern = SkinConcern = {}));
var SkinSensitivity;
(function (SkinSensitivity) {
    SkinSensitivity["FRAGRANCES"] = "fragrances";
    SkinSensitivity["ALCOHOL"] = "alcohol";
    SkinSensitivity["ESSENTIAL_OILS"] = "essential_oils";
    SkinSensitivity["SULFATES"] = "sulfates";
    SkinSensitivity["PARABENS"] = "parabens";
    SkinSensitivity["RETINOIDS"] = "retinoids";
    SkinSensitivity["VITAMIN_C"] = "vitamin_c";
    SkinSensitivity["AHA"] = "aha";
    SkinSensitivity["BHA"] = "bha";
})(SkinSensitivity || (exports.SkinSensitivity = SkinSensitivity = {}));
//# sourceMappingURL=enums.js.map