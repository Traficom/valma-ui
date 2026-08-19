export interface RunStatus{
    statusIterationsTotal?: number | null;
	statusIterationsCurrent?: number | null;
    statusIterationsCompleted?: number | null;
    statusIterationsFailed?: number | null;
    statusLogfilePath?: string | null;
    statusReadyScenariosLogfile?: ScenarioLogfile | null;
    statusRunStartTime?: string | null;
    statusRunFinishTime?: string | null;
    demandConvergenceArray?:  [] | null;
    statusState?: string | null;
}

export interface ScenarioLogfile {
  name?: string;
  logfile?: string;
  resultDataFolder?: string;
}