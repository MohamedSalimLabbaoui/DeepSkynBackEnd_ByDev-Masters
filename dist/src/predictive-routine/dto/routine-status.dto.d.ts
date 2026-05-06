export declare enum PredictiveRoutineStatus {
    PENDING = "PENDING",
    VIEWED = "VIEWED",
    ACCEPTED = "ACCEPTED",
    DISMISSED = "DISMISSED",
    IMPLEMENTED = "IMPLEMENTED",
    EXPIRED = "EXPIRED"
}
export declare class UpdateRoutineStatusDto {
    status: PredictiveRoutineStatus;
    feedback?: string;
}
export declare class GetUserRoutinesQueryDto {
    status?: PredictiveRoutineStatus;
    includeExpired?: boolean;
}
