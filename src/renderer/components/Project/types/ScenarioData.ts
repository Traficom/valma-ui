import { RunStatus } from './RunStatus';
import { SubScenarioData } from './SubScenarioData';

export interface ScenarioData {
  id: string;
  name: string;
  scenarioType: string;

  first_scenario_id: number;
  iterations: number;
  last_run?: string,

  submodel: string;

  zone_data_file?: string;
  cost_data_file?: string;
  trade_demand_file?: string;

  freight_matrix_path?: string;

  long_dist_demand_forecast?: string;
  long_dist_demand_forecast_path?: string;

  end_assignment_only?: boolean;

  stored_speed_assignment?: boolean;
  storedSpeedAssignmentInputs?: (StoredSpeedAssignmentInput | null)[];

  delete_strategy_files?: boolean | null;
  separate_emme_scenarios?: boolean;
  save_matrices_in_emme?: boolean;
  first_matrix_id?: number | null;

  overriddenProjectSettings: OverriddenProjectSettings;
  subScenarios?: SubScenarioData[] | null;
  runStatus?: RunStatus | null;
}

export interface OverriddenProjectSettings {
  projectFolder: string | null;
  emmePythonPath: string | null;
  valmaScriptsPath: string | null;
  baseDataFolder: string | null;
}


export interface StoredSpeedAssignmentInput {
  submodel: string;
  firstScenarioId: number;
}
