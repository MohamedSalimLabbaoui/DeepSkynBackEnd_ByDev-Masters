export declare class CreateSnapshotDto {
    imageUrl?: string;
    healthScore: number;
    skinAge?: number;
    conditions?: Record<string, any>;
    metrics?: Record<string, any>;
    environmental?: Record<string, any>;
    lifestyle?: Record<string, any>;
    productsUsed?: string[];
    notes?: string;
    isBaseline?: boolean;
}
export declare class SimulateProductDto {
    productName: string;
    productCategory: string;
    productIngredients: string[];
    simulationPeriod?: number;
    notes?: string;
}
export declare class GetPredictionDto {
    daysAhead?: number;
}
export declare class UpdateSimulationDto {
    status: 'TESTING' | 'CONFIRMED' | 'REJECTED';
    actualResults?: Record<string, any>;
    feedback?: string;
}
