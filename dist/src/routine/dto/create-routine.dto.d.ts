export declare enum RoutineType {
    AM = "AM",
    PM = "PM",
    WEEKLY = "weekly"
}
export declare class RoutineStepDto {
    order: number;
    name: string;
    productName?: string;
    productBrand?: string;
    productImage?: string;
    description?: string;
    duration?: number;
    category?: string;
    isCompleted?: boolean;
}
export declare class CreateRoutineDto {
    name: string;
    type: RoutineType;
    steps: RoutineStepDto[];
    notes?: string;
    isActive?: boolean;
}
