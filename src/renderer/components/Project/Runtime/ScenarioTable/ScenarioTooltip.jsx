import React, { Fragment } from "react"
import { Tooltip } from 'react-tooltip'
import { renderToStaticMarkup } from 'react-dom/server';
const { shell } = require('electron');
const fs = require('fs');

const ScenarioTooltip = ({
  scenario,
  subScenario,
}) => {
  const isSubScenarioTooltip = subScenario != undefined && subScenario.id;
  const tooltipId = isSubScenarioTooltip ? subScenario.id : scenario.id;

     let tooltipTypeSpecificProperties;
      switch (scenario.scenarioType) {
            case SCENARIO_TYPES.GOODS_TRANSPORT: tooltipTypeSpecificProperties =
            ['trade_demand_data_path'];
            break;
            case SCENARIO_TYPES.PASSENGER_TRANSPORT: tooltipTypeSpecificProperties =
            ['iterations',
              'end_assignment_only',
              'save_matrices_in_emme',
              'separate_emme_scenarios',
              'first_matrix_id',
              'first_scenario_id',
              'trade_demand_data_path',
              'freight_matrix_path'
            ].concat(scenario.long_dist_demand_forecast_path ? ['long_dist_demand_forecast_path'] : ['long_dist_demand_forecast'])
            .concat(!scenario.stored_speed_assignment ? ['stored_speed_assignment'] : ['storedSpeedAssignmentInputs']);
            break;
            case SCENARIO_TYPES.LONG_DISTANCE: tooltipTypeSpecificProperties =
            ['iterations',
              'end_assignment_only',
              'save_matrices_in_emme',
              'separate_emme_scenarios',
              'first_matrix_id',
              'first_scenario_id',
            ];
            break;
      };
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
    'cost_data_file'
  ];

  const replacedTooltipHeadings = {trade_demand_data_path: 'trade-demand-data-path', 'storedSpeedAssignmentInputs': 'stored_speed_assignments'};

  const filteredScenarioSettings = _.pickBy(
    scenario,
    (settingValue, settingKey) => {
      return visibleTooltipProperties.includes(settingKey);
    }
  );


  const areGlobalSettingsOverridden = (settings) => {
    return _.filter(settings, settingValue => settingValue != null).length > 0;
  }

  const getPropertyForDisplayString = (settingProperty) => {
    const [key, value] = settingProperty
    var valueToShow = value;
    var keyToShow = key;
    if (isSubScenarioTooltip && propertiesUsedFromSubScenario.includes(key) && subScenario[key]) {
      valueToShow = subScenario[key];
    }

    if(replacedTooltipHeadings[key]){
      keyToShow = replacedTooltipHeadings[key];
    }

    if(key == 'storedSpeedAssignmentInputs'){
      const storedSpeedAssignments = value.filter(Boolean).map((input) => " " + input.submodel + "(" + input.firstScenarioId + ")");
      return `${keyToShow} : ${storedSpeedAssignments}`
    }

    if (typeof valueToShow === 'string') {
      const trimmedStringValue = valueToShow.length > 30 ? "..." + valueToShow.substring(valueToShow.length - 30) : valueToShow;
      return `${keyToShow} : ${trimmedStringValue}`
    }

    return `${keyToShow} : ${valueToShow}`
  };

  const getAdditionallSubScenarioProperties = () => {
    return (
      <Fragment>
        <h3>Sub scenario settings:</h3>
        {getSubScenarioSettingElement("emme_scenario_number", subScenario.emmeScenarioNumber)}
      </Fragment>
    )
  }

  const getSubScenarioSettingElement = (key, value) => {
    return (<p key="emme_scenario_number"
      style={{
        marginLeft: "1rem",
        overflow: "hidden",
        fontWeight: "bold",
      }}>{key} : {value}</p>
    )
  }

  return (
    <div key={"tooltip_body_" + tooltipId}>
      {Object.entries(filteredScenarioSettings).map(property => {
        if (property[0] === "overriddenProjectSettings") {
          return areGlobalSettingsOverridden(property[1]) ? (
            <div key={"overriden_settings_" + tooltipId}>
              <h3>Overridden settings:</h3>
              {Object.entries(property[1]).map(overrideSetting => {
                return overrideSetting[1] != null ? (
                  <p key={property}
                    style={{
                      marginLeft: "1rem",
                      overflow: "hidden",
                      fontWeight: "bold",
                      lineHeight: "95%"
                    }}
                  >
                    {getPropertyForDisplayString(overrideSetting)}
                  </p>
                ) : (
                  ""
                );
              })}
            </div>
          ) : (
            ""
          ); // Return empty if global settings are all default
        }

        return (
          <p key={property}>
            {getPropertyForDisplayString(property)}
          </p>
        );
      })}
      {isSubScenarioTooltip && getAdditionallSubScenarioProperties()}
    </div>
  );
}