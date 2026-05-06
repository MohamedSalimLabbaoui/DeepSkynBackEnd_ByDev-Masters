import { RoutineType } from './create-routine.dto';
export declare class GenerateRoutineDto {
    type: RoutineType;
    skinType?: string;
    concerns?: string[];
    sensitivities?: string[];
    budget?: string;
    preferredBrands?: string;
    additionalNotes?: string;
}
