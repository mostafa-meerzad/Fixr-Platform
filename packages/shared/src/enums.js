"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Language = exports.NotificationType = exports.CreditTransactionType = exports.DisputeReason = exports.VerificationStatus = exports.Urgency = exports.JobStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["HOMEOWNER"] = "HOMEOWNER";
    UserRole["EXPERT"] = "EXPERT";
    UserRole["ADMIN"] = "ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
var JobStatus;
(function (JobStatus) {
    JobStatus["DRAFT"] = "DRAFT";
    JobStatus["OPEN"] = "OPEN";
    JobStatus["ASSIGNED"] = "ASSIGNED";
    JobStatus["EN_ROUTE"] = "EN_ROUTE";
    JobStatus["ARRIVED"] = "ARRIVED";
    JobStatus["IN_PROGRESS"] = "IN_PROGRESS";
    JobStatus["COMPLETION_REQUESTED"] = "COMPLETION_REQUESTED";
    JobStatus["COMPLETED"] = "COMPLETED";
    JobStatus["CANCELLED"] = "CANCELLED";
    JobStatus["DISPUTED"] = "DISPUTED";
})(JobStatus || (exports.JobStatus = JobStatus = {}));
var Urgency;
(function (Urgency) {
    Urgency["EMERGENCY"] = "EMERGENCY";
    Urgency["TODAY"] = "TODAY";
    Urgency["SCHEDULED"] = "SCHEDULED";
})(Urgency || (exports.Urgency = Urgency = {}));
var VerificationStatus;
(function (VerificationStatus) {
    VerificationStatus["PENDING"] = "PENDING";
    VerificationStatus["VERIFIED"] = "VERIFIED";
    VerificationStatus["REJECTED"] = "REJECTED";
})(VerificationStatus || (exports.VerificationStatus = VerificationStatus = {}));
var DisputeReason;
(function (DisputeReason) {
    DisputeReason["PRICE_DISPUTE"] = "PRICE_DISPUTE";
    DisputeReason["WORK_QUALITY"] = "WORK_QUALITY";
    DisputeReason["NO_SHOW"] = "NO_SHOW";
    DisputeReason["COMMUNICATION_ISSUE"] = "COMMUNICATION_ISSUE";
    DisputeReason["OTHER"] = "OTHER";
})(DisputeReason || (exports.DisputeReason = DisputeReason = {}));
var CreditTransactionType;
(function (CreditTransactionType) {
    CreditTransactionType["WELCOME_GRANT"] = "WELCOME_GRANT";
    CreditTransactionType["PURCHASE"] = "PURCHASE";
    CreditTransactionType["BID_SPEND"] = "BID_SPEND";
    CreditTransactionType["BID_REFUND"] = "BID_REFUND";
    CreditTransactionType["ADMIN_ADJUSTMENT"] = "ADMIN_ADJUSTMENT";
})(CreditTransactionType || (exports.CreditTransactionType = CreditTransactionType = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType["JOB_POSTED"] = "JOB_POSTED";
    NotificationType["BID_RECEIVED"] = "BID_RECEIVED";
    NotificationType["BID_ACCEPTED"] = "BID_ACCEPTED";
    NotificationType["BID_WITHDRAWN"] = "BID_WITHDRAWN";
    NotificationType["NEW_MESSAGE"] = "NEW_MESSAGE";
    NotificationType["EXPERT_EN_ROUTE"] = "EXPERT_EN_ROUTE";
    NotificationType["EXPERT_ARRIVED"] = "EXPERT_ARRIVED";
    NotificationType["COMPLETION_REQUESTED"] = "COMPLETION_REQUESTED";
    NotificationType["JOB_COMPLETED"] = "JOB_COMPLETED";
    NotificationType["JOB_CANCELLED"] = "JOB_CANCELLED";
    NotificationType["REVIEW_REQUESTED"] = "REVIEW_REQUESTED";
    NotificationType["VERIFICATION_APPROVED"] = "VERIFICATION_APPROVED";
    NotificationType["VERIFICATION_REJECTED"] = "VERIFICATION_REJECTED";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var Language;
(function (Language) {
    Language["FA"] = "fa";
    Language["EN"] = "en";
})(Language || (exports.Language = Language = {}));
//# sourceMappingURL=enums.js.map