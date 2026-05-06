export declare enum ChangeType {
    REORDER = "reorder",
    ADD_STEP = "add_step",
    REMOVE_STEP = "remove_step"
}
export declare class AdviseRoutineDto {
    changeType: ChangeType;
    currentSteps: string[];
    changeDescription?: string;
    addedStepName?: string;
}
