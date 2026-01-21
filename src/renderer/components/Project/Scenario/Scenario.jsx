import React, { useState, useEffect } from 'react';
import path from 'path';
import _ from 'lodash';
const { dialog } = require('@electron/remote');
const classNames = require('classnames');

const Scenario = ({ scenario, updateScenario, closeScenario, existingOtherNames, inheritedGlobalProjectSettings }) => {

  const longDistDemandForecastCalc = "calc";
  const projectFolder = inheritedGlobalProjectSettings.projectFolder;
  const [goodsTransportFreightMatrixSource, setGoodsTransportFreightMatrixSource] = useState("base");
  const [nameError, setNameError] = useState("");
  const [errorShown, setErrorShown] = useState(false); // whether LemError -dialog is open
  const [errorInfo, setErrorInfo] = useState(''); // Error info
  const isPassengerTransportScenario = !scenario.scenarioType || scenario.scenarioType ==  SCENARIO_TYPES.PASSENGER_TRANSPORT;
  const isFreightScenario = scenario.scenarioType ==  SCENARIO_TYPES.GOODS_TRANSPORT;


  const hasOverriddenSettings = (scenario) => {
    const overriddenSetting = _.find(scenario.overriddenProjectSettings, (setting) => {
      return setting;
    })
    return overriddenSetting !== undefined ? true : false;
  }

  function isSet(value) {
    return value && value != null && value != undefined && value != '';
  }

  function longDistDemandForecastIsCalc() {
    return scenario.long_dist_demand_forecast == longDistDemandForecastCalc;
  }

  useEffect(() => {
    if(!isPassengerTransportScenario){
      // For goods transport and long distance, lets set submodel to koko_suomi
      updateScenario({...scenario, submodel: "koko_suomi"})
    }
  }, [isPassengerTransportScenario]);

  useEffect(() => {
    if (isSet(scenario.freight_matrix_path)) {
      setGoodsTransportFreightMatrixSource("path")
    }
  }, [scenario.freight_matrix_path]);

  useEffect(() => {
    if (isSet(scenario.stored_speed_assignment) && !isSet(scenario.storedSpeedAssignmentInputs)) {
      updateScenario({...scenario, storedSpeedAssignmentInputs: []})
    }
  }, [scenario.stored_speed_assignment]);

  function setStoredSpeedAssignment(value) {
     updateScenario({ ...scenario, stored_speed_assignment: !scenario.stored_speed_assignment, storedSpeedAssignmentInputs: [] })
  }

  const showError = (errorInfo) => {
    setErrorInfo(errorInfo);
    setErrorShown(true);
  };

  const closeError = () => {
    setErrorShown(false);
    setErrorInfo('');
  };
 
  function setStoredSpeedAssignmentInput(index, input) {
    const firstScenarioIdIsSet = isSet(input) && isSet(input.firstScenarioId) && input.firstScenarioId != 0;
    const newInput = firstScenarioIdIsSet? input : null;
    let inputs = [...scenario.storedSpeedAssignmentInputs];
    inputs[index] = newInput;
    updateScenario({ ...scenario, storedSpeedAssignmentInputs: inputs })
  }

  const baseDataFolder = scenario.overriddenProjectSettings.baseDataFolder ? scenario.overriddenProjectSettings.baseDataFolder : inheritedGlobalProjectSettings.baseDataFolder;

  //Open override settings by default if atleast one of the settings is overridden
  const [showOverrides, setShowOverrides] = useState(hasOverriddenSettings(scenario));

  return (
    <div className="Scenario" key={scenario.id}>

      <div className="Scenario__close"
        onClick={(e) => {
          closeScenario();
        }}
      ></div>

      <div className="Scenario__section Scenario__heading">
        Skenaarion asetukset
      </div>

      {/* Name field (updates the filename live as well) */}
      <div className="Scenario__section">
        <label className="Scenario__pseudo-label"
          htmlFor="scenario-name">Skenaarion nimi</label>
        <input id="scenario-name"
          className="Scenario__name"
          type="text"
          placeholder="esim. 2030_v1"
          value={scenario.name}
          onChange={(e) => {
            const newName = cutUnvantedCharacters(e.target.value);
            if (!existingOtherNames.includes(newName)) {
              updateScenario({ ...scenario, name: newName });
              setNameError("");
            } else {
              setNameError(`Invalid name. Scenario "${newName}" already exists.`);
            }
          }}
        />
        {nameError ? <span className="Scenario-error">{nameError}</span> : ""}
      </div>

      {/* Number of first EMME-scenario ID (of 4) - NOTE: EMME-scenario is different from HELMET-scenario (ie. this config) */}
      <div className="Scenario__section">
        <label className="Scenario__pseudo-label"
          htmlFor="first-scenario-id">Liikenneverkon sis&auml;lt&auml;v&auml; Emme-skenaario</label>
        <input id="first-scenario-id"
          className="Scenario__number"
          type="number"
          min="1"
          max="999"
          step="1"
          value={scenario.first_scenario_id}
          onChange={(e) => {
            updateScenario({ ...scenario, first_scenario_id: cutUnvantedCharacters(e.target.value) });
          }}
        />
      </div>

      {/* Folder path to variable input data (input data with variables sent to EMME) */}
      <div className="Scenario__section">
        <span className="Scenario__pseudo-label">Sy&ouml;tt&ouml;tiedot</span>
        <label className="Scenario__pseudo-file-select" htmlFor="data-folder-select" title={scenario.zone_data_file}>
          {scenario.zone_data_file ? path.basename(scenario.zone_data_file) : "Valitse.."}
        </label>
        <input className="Scenario__hidden-input"
          id="data-folder-select"
          type="text"
          onClick={() => {
            dialog.showOpenDialog({
              defaultPath: scenario.zone_data_file ? scenario.zone_data_file : projectFolder,
              filters: [
                { name: 'GeoPackage', extensions: ['gpkg'] },
                { name: 'All Files', extensions: ['*'] }
              ],
              properties: ['openFile']
            }).then((e) => {
              if (!e.canceled) {
                updateScenario({ ...scenario, zone_data_file: e.filePaths[0] });
              }
            })
          }}
        />
        {!scenario.zone_data_file ? <span className="Scenario-error">{"Syöttötiedot on pakollinen tieto."}</span> : ""}
      </div>

      {/* File path to cost data */}
      <div className="Scenario__section">
        <span className="Scenario__pseudo-label">Liikenteen hintadata</span>
        <label className="Scenario__pseudo-file-select" htmlFor="cost-data-file-select" title={scenario.cost_data_file}>
          {scenario.cost_data_file ? path.basename(scenario.cost_data_file) : "Valitse.."}
        </label>
        <input className="Scenario__hidden-input"
          id="cost-data-file-select"
          type="text"
          onClick={() => {
            dialog.showOpenDialog({
              defaultPath: scenario.cost_data_file ? scenario.cost_data_file : projectFolder,
              filters: [
                { name: 'Json', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
              ],
              properties: ['openFile']
            }).then((e) => {
              if (!e.canceled) {
                updateScenario({ ...scenario, cost_data_file: e.filePaths[0] });
              }
            })
          }}
        />
        {!scenario.cost_data_file ? <span className="Scenario-error">{"Liikenteen hintadata on pakollinen tieto."}</span> : ""}
      </div>

       {/* Import and export data */}
      { isFreightScenario && <div className="Scenario__section">
        <span className="Scenario__pseudo-label">Vienti- ja tuontidata</span>
        <label className="Scenario__pseudo-file-select" htmlFor="import-and-export-data-file-select" title={scenario.trade_demand_data_path}>
          {scenario.trade_demand_data_path ? path.basename(scenario.trade_demand_data_path) : "Valitse.."}
        </label>
        <input className="Scenario__hidden-input"
          id="import-and-export-data-file-select"
          type="text"
          onClick={() => {
            dialog.showOpenDialog({
              defaultPath: scenario.trade_demand_data_path ? scenario.trade_demand_data_path : projectFolder,
              filters: [
                { name: 'OMX', extensions: ['omx'] },
                { name: 'All Files', extensions: ['*'] }
              ],
              properties: ['openFile']
            }).then((e) => {
              if (!e.canceled) {
                updateScenario({ ...scenario, trade_demand_data_path: e.filePaths[0] });
              }
            })
          }}
        />
        {!scenario.trade_demand_data_path ? <span className="Scenario-error">{"Vienti- ja tuontidata on pakollinen tieto."}</span> : ""}
      </div>}

      {/* Choice how to use long distance demand forecast */}
      { isPassengerTransportScenario && <div className="Scenario__section Scenario_radio_select_section">
        <h4 className="Scenario_radio_label">Pitkien matkojen kysyntäennuste</h4>
        <div>
          <input type="radio" value="base" name="long_dist_demand_forecast"
            checked={!scenario.long_dist_demand_forecast || scenario.long_dist_demand_forecast == "base"}
            onChange={(e) => {
              updateScenario({ ...scenario, long_dist_demand_forecast: e.target.value, long_dist_demand_forecast_path: "" });
            }} /> Ota projektin lähtödatasta<br />
          <input type="radio" value="path" name="long_dist_demand_forecast"
            checked={scenario.long_dist_demand_forecast == "path"}
            onChange={(e) => {
              updateScenario({ ...scenario, long_dist_demand_forecast: e.target.value, long_dist_demand_forecast_path: baseDataFolder });
            }} /> Ota malliajon tuloskansiosta<br />
          <input id="long_dist_demand_forecast_path_input"
            className="Scenario__pseudo-file-select Scenario__inline"
            type="text"
            disabled={scenario.long_dist_demand_forecast != "path"}
            readOnly={true}
            title={scenario.long_dist_demand_forecast_path}
            value={scenario.long_dist_demand_forecast_path || ""}
            placeholder={scenario.long_dist_demand_forecast == "path" ? scenario.long_dist_demand_forecast_path : "..."}
            onClick={() => {
              dialog.showOpenDialog({
                defaultPath: scenario.long_dist_demand_forecast_path ? scenario.long_dist_demand_forecast_path : baseDataFolder,
                properties: ['openDirectory']
              }).then((e) => {
                if (!e.canceled) {
                  updateScenario({ ...scenario, long_dist_demand_forecast_path: cutUnvantedCharacters(e.filePaths[0]) });
                }
              })
            }}
          />
        </div>
      </div>}

      {isPassengerTransportScenario && <div className="Scenario__section">
        {/* Number of iterations to run */}
        <label className="Scenario__pseudo-label"
          htmlFor="iterations">Iteraatioiden enimm&auml;ism&auml;&auml;r&auml;</label>

        <input id="iterations"
          className="Scenario__number Scenario__inline Scenario__pseudo-file-select"
          type="number"
          min="1"
          max="99"
          step="1"
          disabled={scenario.end_assignment_only || longDistDemandForecastIsCalc()}
          value={scenario.iterations}
          onChange={(e) => {
            updateScenario({ ...scenario, iterations: cutUnvantedCharacters(e.target.value) });
          }}
        />

        {/* Choice whether to delete strategy files at the end of a model run */}
        <label className="Scenario__pseudo-label  Scenario__inline Scenario__pseudo-label--inline Scenario__pseudo-label--right"
          htmlFor="end-assignment-only">
          <input id="end-assignment-only"
            type="checkbox"
            checked={scenario.end_assignment_only}
            onChange={(e) => {
              updateScenario({ ...scenario, end_assignment_only: e.target.checked });
            }}
          />
          <span>Aja vain loppusijoittelu</span>
        </label>
      </div>}

      {/* Sub model selection */}
      <label className="Scenario__pseudo-label"
        htmlFor="submodel">Osamalli</label>
      <div className="Submodel_select">
        <select id="submodel" disabled={isPassengerTransportScenario == false || longDistDemandForecastIsCalc() }
        value={scenario.submodel} onChange={e => updateScenario({ ...scenario, submodel: e.target.value })}>
          <option key={"submodel_select"} value={""}>--- valitse ---</option>
          {submodels && submodels.map((submodel) =>
            <option key={submodel.id} value={submodel.id}>{submodel.name}</option>)
          }
        </select>
      </div>

      {/* Choice for goods transport freight matrix path */}
      { isPassengerTransportScenario && <div className="Scenario__section Scenario_radio_select_section">
        <h4 className="Scenario_radio_label">Tavaraliikenteen kysyntäennuste</h4>
        <div>
          <input type="radio" value="base" name="freight_matrix_path"
            checked={goodsTransportFreightMatrixSource == "base"}
            onChange={(e) => {
              setGoodsTransportFreightMatrixSource(e.target.value);
              updateScenario({ ...scenario, freight_matrix_path: "" });
            }} /> Ota projektin lähtödatasta<br />
          <input type="radio" value="path" name="freight_matrix_path"
            checked={goodsTransportFreightMatrixSource == "path"}
            onChange={(e) => {
              setGoodsTransportFreightMatrixSource(e.target.value);
              updateScenario({ ...scenario, freight_matrix_path: baseDataFolder });
            }} /> Ota malliajon tuloskansiosta<br />
          <input id="freight_matrix_path_input"
            className="Scenario__pseudo-file-select Scenario__inline"
            type="text"
            title={scenario.freight_matrix_path}
            disabled={goodsTransportFreightMatrixSource != "path"}
            readOnly={true}
            value={scenario.freight_matrix_path || ""}
            placeholder={goodsTransportFreightMatrixSource == "path" ? scenario.freight_matrix_path : "..."}
            onClick={() => {
              dialog.showOpenDialog({
                defaultPath: scenario.freight_matrix_path ? scenario.freight_matrix_path : baseDataFolder,
                properties: ['openDirectory']
              }).then((e) => {
                if (!e.canceled) {
                  updateScenario({ ...scenario, freight_matrix_path: cutUnvantedCharacters(e.filePaths[0]) });
                }
              })
            }}
          />
        </div>
      </div>}

      {errorShown && <LemError
        info={errorInfo}
        close={closeError}
      />}

      <div className="Scenario__section Scenario__title">
        Lisävalinnat
      </div>

      {/* Choice whether to use stored speed assignment */}
      { isPassengerTransportScenario && <div className="Scenario__section">
        <label className="Scenario__pseudo-label Scenario__pseudo-label--inline"
          htmlFor="stored_speed_assignment">
          <input id="stored_speed_assignment"
            type="checkbox"
            checked={scenario.stored_speed_assignment}
            onChange={(e) => {
              setStoredSpeedAssignment(!scenario.stored_speed_assignment);
            }}
          />
          <span>Tallennetun nopeuden sijoittelu</span>
        </label>
      </div>}

      {/*Stored speed assignment inputs*/}
      {isPassengerTransportScenario && scenario.stored_speed_assignment && scenario.storedSpeedAssignmentInputs && (
        <div className="Scenario__section flexContainer space_after">
          <div>
            {storedSpeedAssignmentInput(0, "ita_suomi", scenario.storedSpeedAssignmentInputs[0])}
            {storedSpeedAssignmentInput(1, "lounais_suomi", scenario.storedSpeedAssignmentInputs[1])}
            {storedSpeedAssignmentInput(2, "pohjois_suomi", scenario.storedSpeedAssignmentInputs[2])}
            {storedSpeedAssignmentInput(3, "uusimaa", scenario.storedSpeedAssignmentInputs[3])}
          </div>
        </div>
      )}

      {/* Choice whether to delete strategy files at the end of a model run */}
      <div className="Scenario__section">
        <label className="Scenario__pseudo-label Scenario__pseudo-label--inline"
          htmlFor="delete-strategy-files">
          <input id="delete-strategy-files"
            type="checkbox"
            /* If flag is not written to JSON (= null), box is checked (= true). */
            checked={scenario.delete_strategy_files == true | scenario.delete_strategy_files == null}
            onChange={(e) => {
              updateScenario({ ...scenario, delete_strategy_files: e.target.checked });
            }}
          />
          <span>Poista sijoittelun strategiatiedostot malliajon j&auml;lkeen</span>
        </label>
      </div>

      {/* Choice whether to save matrices in Emme */}
      { isPassengerTransportScenario && <div className="Scenario__section">
        <label className="Scenario__pseudo-label Scenario__pseudo-label--inline"
          htmlFor="separate-emme-scenarios">
          <input id="separate-emme-scenarios"
            type="checkbox"
            /* If flag is not written to JSON (= null), box is unchecked (= false). */
            checked={scenario.separate_emme_scenarios == true}
            onChange={(e) => {
              updateScenario({ ...scenario, separate_emme_scenarios: e.target.checked });
            }}
          />
          <span>Tallenna ajanjaksot erillisiin Emme-skenaarioihin {parseInt(scenario.first_scenario_id) + 1}&ndash;{parseInt(scenario.first_scenario_id) + 4}</span>
        </label>
      </div>}

      {/* Choice whether to save matrices in Emme */}
      <div className="Scenario__section">
      { isPassengerTransportScenario && <label className="Scenario__pseudo-label Scenario__pseudo-label--inline"
          htmlFor="save-matrices-in-emme">
          <input id="save-matrices-in-emme"
            type="checkbox"
            /* If flag is not written to JSON (= null), box is unchecked (= false). */
            checked={scenario.save_matrices_in_emme == true}
            onChange={(e) => {
              updateScenario({ ...scenario, save_matrices_in_emme: e.target.checked });
            }}
          />
          <span>Tallenna ajanjaksojen matriisit Emme-projektin Database-kansioon</span>
        </label>}

        {/* Number of first matrix ID */}
        { isPassengerTransportScenario && <div className="Scenario__section Scenario__section--indentation">
          <label className="Scenario__pseudo-label"
            style={{ color: scenario.save_matrices_in_emme == false ? "#666666" : "inherit" }}
            htmlFor="first-matrix-id">Matriisit tallennetaan numeroille</label>
          <input id="first-matrix-id"
            className="Scenario__number Scenario__inline"
            type="number"
            min="1"
            max="999"
            step="1"
            disabled={!scenario.save_matrices_in_emme}
            /* If value is not written to JSON (= null), write default value 100. */
            value={scenario.first_matrix_id == null ? 100 : scenario.first_matrix_id}
            onChange={(e) => {
              updateScenario({ ...scenario, first_matrix_id: cutUnvantedCharacters(e.target.value) });
            }}
          />
          <span style={{ color: !scenario.save_matrices_in_emme ? "#666666" : "inherit" }}
            className=" Scenario__inline">&ndash;{parseInt(scenario.first_matrix_id == null ? 100 : scenario.first_matrix_id) + 299}</span>
        </div>}

        <hr className="override-setting-divider" />
        <div>
          <h4 className="inline-element">Skenaariokohtaiset yliajot</h4> <div onClick={() => setShowOverrides(!showOverrides)} className="override-dropdown-icon inline-block-element"> {showOverrides ? <ArrowUp /> : <ArrowDown />} </div>
          {showOverrides &&
            <div>
              {/* File path to EMME project reference-file (generally same in all scenarios of a given VLEM project) */}
              <div className="Scenario__section">
                <label className="Scenario__pseudo-label Scenario__pseudo-label--inline project-override-setting">
                  <span className="inline-element override-setting">Projektikansio</span>
                  {scenario.overriddenProjectSettings.projectFolder &&
                    <label className="inline-element override-reset-button" onClick={(event) => {
                      event.preventDefault();
                      updateScenario({ ...scenario, overriddenProjectSettings: { ...scenario.overriddenProjectSettings, projectFolder: null } });
                    }}>
                      <ResetIcon className="override-reset-icon" />
                    </label>
                  }
                  <label className={classNames('Settings__pseudo-file-select', 'override-file-select-input', { 'override-is-default': scenario.overriddenProjectSettings.projectFolder ? false : true })} htmlFor="override-project-folder" title={'Project folder'}>
                    {scenario.overriddenProjectSettings.projectFolder ? scenario.overriddenProjectSettings.projectFolder : inheritedGlobalProjectSettings.projectFolder}
                  </label>
                  <input id="override-project-folder"
                    className="override-input"
                    type="text"
                    hidden={true}
                    placeholder={inheritedGlobalProjectSettings.projectFolder}
                    onClick={() => {
                      dialog.showOpenDialog({
                        defaultPath: scenario.overriddenProjectSettings.projectFolder ? scenario.overriddenProjectSettings.projectFolder : inheritedGlobalProjectSettings.projectFolder,
                        properties: ['openDirectory']
                      }).then((e) => {
                        if (!e.canceled) {
                          updateScenario({ ...scenario, overriddenProjectSettings: { ...scenario.overriddenProjectSettings, projectFolder: e.filePaths[0] } });
                        }
                      })
                    }}
                  />
                </label>
              </div>
              <div className="Scenario__section">
                <label className="Scenario__pseudo-label Scenario__pseudo-label--inline project-override-setting">
                  <span className="inline-element override-setting">EMME Python polku</span>
                  {scenario.overriddenProjectSettings.emmePythonPath &&
                    <label className="inline-element override-reset-button" onClick={(event) => {
                      event.preventDefault();
                      updateScenario({ ...scenario, overriddenProjectSettings: { ...scenario.overriddenProjectSettings, emmePythonPath: null } });
                    }}>
                      <ResetIcon className="override-reset-icon" />
                    </label>
                  }
                  <label className={classNames('Settings__pseudo-file-select', 'override-file-select-input', { 'override-is-default': scenario.overriddenProjectSettings.emmePythonPath ? false : true })} htmlFor="override-emme-python-path" title={'Emme python path'}>
                    {scenario.overriddenProjectSettings.emmePythonPath ? scenario.overriddenProjectSettings.emmePythonPath : inheritedGlobalProjectSettings.emmePythonPath}
                  </label>
                  <input id="override-emme-python-path"
                    className="override-input"
                    type="text"
                    hidden={true}
                    placeholder={inheritedGlobalProjectSettings.emmePythonPath}
                    onClick={() => {
                      dialog.showOpenDialog({
                        defaultPath: scenario.overriddenProjectSettings.emmePythonPath ? scenario.overriddenProjectSettings.emmePythonPath : inheritedGlobalProjectSettings.emmePythonPath,
                        filters: [
                          { name: 'Executable', extensions: ['exe'] },
                          { name: 'All Files', extensions: ['*'] }
                        ],
                        properties: ['openFile']
                      }).then((e) => {
                        if (!e.canceled) {
                          updateScenario({ ...scenario, overriddenProjectSettings: { ...scenario.overriddenProjectSettings, emmePythonPath: e.filePaths[0] } });
                        }
                      })
                    }}
                  />
                </label>
              </div>
              <div className="Scenario__section">
                <label className="Scenario__pseudo-label Scenario__pseudo-label--inline">
                  <span className="inline-element override-setting">Lem-model-system</span>
                  {scenario.overriddenProjectSettings.helmetScriptsPath &&
                    <label className="inline-element override-reset-button" onClick={(event) => {
                      event.preventDefault();
                      updateScenario({ ...scenario, overriddenProjectSettings: { ...scenario.overriddenProjectSettings, helmetScriptsPath: null } });
                    }}>
                      <ResetIcon className="override-reset-icon" />
                    </label>
                  }
                  <label className={classNames('Settings__pseudo-file-select', 'override-file-select-input', { 'override-is-default': scenario.overriddenProjectSettings.helmetScriptsPath ? false : true })} htmlFor="override-helmet-scripts-path" title={'Lem-model-system'}>
                    {scenario.overriddenProjectSettings.helmetScriptsPath ? scenario.overriddenProjectSettings.helmetScriptsPath : inheritedGlobalProjectSettings.helmetScriptsPath}
                  </label>
                  <input id="override-helmet-scripts-path"
                    className="override-input"
                    type="text"
                    hidden={true}
                    placeholder={inheritedGlobalProjectSettings.helmetScriptsPath}
                    onClick={() => {
                      dialog.showOpenDialog({
                        defaultPath: scenario.overriddenProjectSettings.helmetScriptsPath ? scenario.overriddenProjectSettings.helmetScriptsPath : inheritedGlobalProjectSettings.helmetScriptsPath,
                        properties: ['openDirectory']
                      }).then((e) => {
                        if (!e.canceled) {
                          updateScenario({ ...scenario, overriddenProjectSettings: { ...scenario.overriddenProjectSettings, helmetScriptsPath: e.filePaths[0] } });
                        }
                      })
                    }}
                  />
                </label>
              </div>
              <div className="Scenario__section">
                <label className="Scenario__pseudo-label Scenario__pseudo-label--inline project-override-setting">
                  <span className="inline-element override-setting">Lähtödatakansion polku</span>
                  {scenario.overriddenProjectSettings.baseDataFolder &&
                    <label className="inline-element override-reset-button" onClick={(event) => {
                      event.preventDefault();
                      updateScenario({ ...scenario, overriddenProjectSettings: { ...scenario.overriddenProjectSettings, baseDataFolder: null } });
                    }}>
                      <ResetIcon className="override-reset-icon" />
                    </label>
                  }
                  <label className={classNames('Settings__pseudo-file-select', 'override-file-select-input', { 'override-is-default': scenario.overriddenProjectSettings.baseDataFolder ? false : true })} htmlFor="override-base-data-path" title={'Base data path'}>
                    {scenario.overriddenProjectSettings.baseDataFolder ? scenario.overriddenProjectSettings.baseDataFolder : inheritedGlobalProjectSettings.baseDataFolder}
                  </label>
                  <input id="override-base-data-path"
                    className="override-input"
                    type="text"
                    hidden={true}
                    placeholder={inheritedGlobalProjectSettings.baseDataFolder}
                    onClick={() => {
                      dialog.showOpenDialog({
                        defaultPath: scenario.overriddenProjectSettings.baseDataFolder ? scenario.overriddenProjectSettings.baseDataFolder : inheritedGlobalProjectSettings.baseDataFolder,
                        properties: ['openDirectory']
                      }).then((e) => {
                        if (!e.canceled) {
                          updateScenario({ ...scenario, overriddenProjectSettings: { ...scenario.overriddenProjectSettings, baseDataFolder: e.filePaths[0] } });
                        }
                      })
                    }}
                  />
                </label>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  )

  function storedSpeedAssignmentInput(index, submodel, input) {
    const firstScenarioIdIsSet = input && input.firstScenarioId && input.firstScenarioId != 0;
    return (
      <span className="stored_speed_assignment_fields">
        <label className='stored_speed_assignment_labels'>
           {submodels.filter(model => model.id == submodel)[0].name}, Emme skenaario
        </label>

        <input id={"stored_speed_assignment_input_" + index}
          className="stored_speed_assignment_id_input Scenario__inline"
          type="number"
          min="0"
          max="999"
          step="1"
          disabled={!scenario.stored_speed_assignment}
          value={firstScenarioIdIsSet? input.firstScenarioId : ''}
          placeholder={""}
          onChange={(e) => {
            const newValue = e.target.value;
              setStoredSpeedAssignmentInput( index, {submodel, 'firstScenarioId': newValue});
          }}
        /></span>);
  }
};