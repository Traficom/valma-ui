import React, { Fragment } from 'react';
import _ from 'lodash';

import { SCENARIO_TYPES } from '../../../../enums';
import { ScenarioData } from '../types/ScenarioData';
import { SubScenarioData } from '../types/SubScenarioData';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

interface StoredSpeedAssignmentInput {
  submodel: string;
  firstScenarioId: number;
}

interface OverriddenProjectSettings {
  projectFolder?: string | null;
  emmePythonPath?: string | null;
  valmaScriptsPath?: string | null;
  baseDataFolder?: string | null;
}

interface ScenarioTooltipProps {
  scenario: ScenarioData;
  subScenario?: SubScenarioData;
}

/* ------------------------------------------------------------------ */

const ScenarioTooltip: React.FC<ScenarioTooltipProps> = ({
  scenario,
  subScenario,
}) => {
  const isSubScenarioTooltip = Boolean(subScenario && subScenario.id);
  const tooltipId = isSubScenarioTooltip ? subScenario!.id : scenario.id;

  /* ---------------------- Scenario-type fields --------------------- */

  let tooltipTypeSpecificProperties: string[] = [];

  switch (scenario.scenarioType) {
    case SCENARIO_TYPES.GOODS_TRANSPORT:
      tooltipTypeSpecificProperties = ['trade_demand_file'];
      break;

    case SCENARIO_TYPES.PASSENGER_TRANSPORT:
      tooltipTypeSpecificProperties = [
        'iterations',
        'end_assignment_only',
        'save_matrices_in_emme',
        'separate_emme_scenarios',
        'first_matrix_id',
        'first_scenario_id',
        'trade_demand_file',
        'freight_matrix_path',
      ]
        .concat(
          scenario.long_dist_demand_forecast_path
            ? ['long_dist_demand_forecast_path']
            : ['long_dist_demand_forecast']
        )
        .concat(
          !scenario.stored_speed_assignment
            ? ['stored_speed_assignment']
            : ['storedSpeedAssignmentInputs']
        );
      break;

    case SCENARIO_TYPES.LONG_DISTANCE:
      tooltipTypeSpecificProperties = [
        'iterations',
        'end_assignment_only',
        'save_matrices_in_emme',
        'separate_emme_scenarios',
        'first_matrix_id',
        'first_scenario_id',
      ];
      break;
  }

  /* ---------------------- Visible properties ----------------------- */

  const visibleTooltipProperties = [
    'zone_data_file',
    'cost_data_file',
    'delete_strategy_files',
    'id',
    'scenarioType',
    'name',
    'submodel',
    'overriddenProjectSettings',
  ].concat(tooltipTypeSpecificProperties);

  const propertiesUsedFromSubScenario = [
    'id',
    'name',
    'cost_data_file',
  ];

  const replacedTooltipHeadings: Record<string, string> = {
    trade_demand_file: 'trade-demand-data-path',
    storedSpeedAssignmentInputs: 'stored_speed_assignments',
  };

  const filteredScenarioSettings = _.pickBy(
    scenario,
    (_value, key) => visibleTooltipProperties.includes(key)
  );

  /* --------------------------- Helpers ----------------------------- */

  const areGlobalSettingsOverridden = (
    settings: OverriddenProjectSettings
  ): boolean => {
    return _.filter(settings, v => v != null).length > 0;
  };

  const getPropertyForDisplayString = (
    settingProperty: [string, any]
  ): string => {
    const [key, value] = settingProperty;

    let valueToShow = value;
    let keyToShow = replacedTooltipHeadings[key] ?? key;

    if (
      isSubScenarioTooltip &&
      subScenario &&
      propertiesUsedFromSubScenario.includes(key) &&
      (subScenario as any)[key]
    ) {
      valueToShow = (subScenario as any)[key];
    }

    if (key === 'storedSpeedAssignmentInputs' && Array.isArray(value)) {
      const storedSpeedAssignments = value
        .filter(Boolean)
        .map(
          (input: StoredSpeedAssignmentInput) =>
            ` ${input.submodel}(${input.firstScenarioId})`
        );

      return `${keyToShow} : ${storedSpeedAssignments}`;
    }

    if (typeof valueToShow === 'string') {
      const trimmed =
        valueToShow.length > 30
          ? '...' + valueToShow.substring(valueToShow.length - 30)
          : valueToShow;

      return `${keyToShow} : ${trimmed}`;
    }

    return `${keyToShow} : ${valueToShow}`;
  };

  const getSubScenarioSettingElement = (key: string, value?: number) => (
    <p
      key={key}
      style={{
        marginLeft: '1rem',
        overflow: 'hidden',
        fontWeight: 'bold',
      }}
    >
      {key} : {value}
    </p>
  );

  const getAdditionalSubScenarioProperties = () => (
    <Fragment>
      <h3>Sub scenario settings:</h3>
      {subScenario &&
        getSubScenarioSettingElement(
          'emme_scenario_number',
          subScenario.emmeScenarioNumber
        )}
    </Fragment>
  );

  /* ---------------------------- Render ----------------------------- */

  return (
    <div key={"tooltip_wrapper_" + tooltipId }>
      {Object.entries(filteredScenarioSettings).map(property => {
        if (property[0] === 'overriddenProjectSettings') {
          const overridden = property[1] as OverriddenProjectSettings;

          return areGlobalSettingsOverridden(overridden) ? (
            <div key={`overriden_settings_${tooltipId}`}>
              <h3>Overridden settings:</h3>
              {Object.entries(overridden).map(overrideSetting =>
                overrideSetting[1] != null ? (
                  <p
                    key={`${overrideSetting[0]}_${tooltipId}`}
                    style={{
                      marginLeft: '1rem',
                      overflow: 'hidden',
                      fontWeight: 'bold',
                      lineHeight: '95%',
                    }}
                  >
                    {getPropertyForDisplayString(overrideSetting)}
                  </p>
                ) : null
              )}
            </div>
          ) : null;
        }

        return (
          <p key={`${property[0]}_${tooltipId}`}>
            {getPropertyForDisplayString(property)}
          </p>
        );
      })}

      {isSubScenarioTooltip && getAdditionalSubScenarioProperties()}
    </div>
  );
};

export default ScenarioTooltip;