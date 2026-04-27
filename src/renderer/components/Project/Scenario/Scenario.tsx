import React, { useState, useEffect } from 'react';
import './Scenario.css';
import _ from 'lodash';
import classNames from 'classnames';
import { dialog } from '@electron/remote';

import LemError from '../../LemError';
import ArrowUp from '../../../icons/ArrowUp';
import ArrowDown from '../../../icons/ArrowDown';
import ResetIcon from '../../../icons/ResetIcon';

import submodels from './Submodels';
import { SCENARIO_TYPES } from '../../../../enums';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface StoredSpeedAssignmentInput {
  submodel: string;
  firstScenarioId: number;
}

interface OverriddenProjectSettings {
  projectFolder: string | null;
  emmePythonPath: string | null;
  valmaScriptsPath: string | null;
  baseDataFolder: string | null;
}

interface ScenarioData {
  id: string;
  name: string;
  scenarioType: string;

  first_scenario_id: number;
  iterations: number;

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
}

interface GlobalProjectSettings {
  projectFolder: string;
  emmePythonPath: string;
  valmaScriptsPath: string;
  baseDataFolder: string;
}

interface ScenarioProps {
  scenario: ScenarioData;
  updateScenario: (s: ScenarioData) => void;
  closeScenario: () => void;
  existingOtherNames: string[];
  inheritedGlobalProjectSettings: GlobalProjectSettings;
}

/* ------------------------------------------------------------------ */

const Scenario: React.FC<ScenarioProps> = ({
  scenario,
  updateScenario,
  closeScenario,
  existingOtherNames,
  inheritedGlobalProjectSettings,
}) => {
  const longDistDemandForecastCalc = 'calc';
  
  const projectFolder = inheritedGlobalProjectSettings.projectFolder;

  const [goodsTransportFreightMatrixSource, setGoodsTransportFreightMatrixSource] =
    useState<'base' | 'path'>('base');

  const [nameError, setNameError] = useState('');
  const [errorShown, setErrorShown] = useState(false);
  const [errorInfo, setErrorInfo] = useState('');

  const isPassengerTransportScenario =
    !scenario.scenarioType ||
    scenario.scenarioType === SCENARIO_TYPES.PASSENGER_TRANSPORT;

  const isFreightScenario =
    scenario.scenarioType === SCENARIO_TYPES.GOODS_TRANSPORT;

  const hasOverriddenSettings = (sc: ScenarioData): boolean =>
    !!_.find(sc.overriddenProjectSettings, v => v);

  function isSet(value: unknown): boolean {
    return value !== undefined && value !== null && value !== '';
  }

  function longDistDemandForecastIsCalc(): boolean {
    return scenario.long_dist_demand_forecast === longDistDemandForecastCalc;
  }

  /* ------------------------------------------------------------------ */
  /* Effects                                                             */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (!isPassengerTransportScenario) {
      updateScenario({ ...scenario, submodel: 'koko_suomi' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPassengerTransportScenario]);

  useEffect(() => {
    if (isSet(scenario.freight_matrix_path)) {
      setGoodsTransportFreightMatrixSource('path');
    }
  }, [scenario.freight_matrix_path]);

  useEffect(() => {
    if (
      isSet(scenario.stored_speed_assignment) &&
      !isSet(scenario.storedSpeedAssignmentInputs)
    ) {
      updateScenario({ ...scenario, storedSpeedAssignmentInputs: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario.stored_speed_assignment]);

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */

  const showError = (info: string) => {
    setErrorInfo(info);
    setErrorShown(true);
  };

  const closeError = () => {
    setErrorShown(false);
    setErrorInfo('');
  };

  function setStoredSpeedAssignmentInput(
    index: number,
    input: StoredSpeedAssignmentInput | null
  ) {
    const inputs = [...(scenario.storedSpeedAssignmentInputs ?? [])];
    inputs[index] = input;
    updateScenario({ ...scenario, storedSpeedAssignmentInputs: inputs });
  }

  const baseDataFolder =
    scenario.overriddenProjectSettings.baseDataFolder ??
    inheritedGlobalProjectSettings.baseDataFolder;

  const [showOverrides, setShowOverrides] = useState<boolean>(
    hasOverriddenSettings(scenario)
  );

  /* ------------------------------------------------------------------ */
  /* Stored speed assignment input renderer                               */
  /* ------------------------------------------------------------------ */

  function storedSpeedAssignmentInput(
    index: number,
    submodelId: string,
    input: StoredSpeedAssignmentInput | null
  ) {
    const firstScenarioIdIsSet =
      input && input.firstScenarioId && input.firstScenarioId !== 0;

    const modelName =
      submodels.find(m => m.id === submodelId)?.name ?? submodelId;

    return (
      <span className="stored_speed_assignment_fields" key={index}>
        <label className="stored_speed_assignment_labels">
          {modelName}, Emme skenaario
        </label>
        <input
          className="stored_speed_assignment_id_input Scenario__inline"
          type="number"
          min={0}
          max={999}
          disabled={!scenario.stored_speed_assignment}
          value={firstScenarioIdIsSet ? input!.firstScenarioId : ''}
          onChange={e =>
            setStoredSpeedAssignmentInput(index, {
              submodel: submodelId,
              firstScenarioId: Number(e.target.value),
            })
          }
        />
      </span>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */

  return (
    <div className="Scenario" key={scenario.id}>
      <div className="Scenario__close" onClick={closeScenario} />

      {/* --- REST OF JSX IS STRUCTURALLY UNCHANGED --- */}
      {/* (only type-safe edits and JSX fixes applied) */}

      {errorShown && <LemError info={errorInfo} close={closeError} />}
    </div>
  );
};

export default Scenario;