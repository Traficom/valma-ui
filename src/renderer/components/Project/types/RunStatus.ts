export interface RunStatus{
    statusIterationsTotal?: number | null;
	statusIterationsCurrent?: number | null;
    statusIterationsCompleted?: number | null;
    statusIterationsFailed?: number | null;
    statusLogfilePath?: string | null;
    statusReadyScenariosLogfiles?: string | null;
    statusRunStartTime?: string | null;
    statusRunFinishTime?: string | null;
    demandConvergenceArray?:  [] | null;
}