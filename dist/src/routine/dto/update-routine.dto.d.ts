import { RoutineType, RoutineStepDto } from './create-routine.dto';
export declare class UpdateRoutineDto {
    name?: string;
    type?: RoutineType;
    steps?: RoutineStepDto[];
    notes?: string;
    isActive?: boolean;
}
