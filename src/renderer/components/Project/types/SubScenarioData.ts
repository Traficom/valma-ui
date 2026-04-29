import { RunStatus } from './RunStatus';

export interface SubScenarioData {
  id: string | null;
  parentScenarioId: string;
  name: string;
  emmeScenarioNumber: number | null;
  cost_data_file: string;
  last_run?: string,
  parentCostDataFile: string;
  runSuccess?: boolean;
  runStatus?: RunStatus | null;
}
