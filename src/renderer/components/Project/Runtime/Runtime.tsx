import React from 'react';
import './Runtime.css'
import ScenariosToRun from './ScenariosToRun';
import RunStatus from './RunStatus/RunStatus';
import ScenarioTableRow from '../ScenarioTable/ScenarioTableRow';
import { Tooltip } from 'react-tooltip';

declare const SCENARIO_TYPES: any;
declare const SCENARIO_STATUS_STATE: any;

const Runtime = ({
  projectFolder,
  scenarios,
  scenarioIDsToRun,
  runningScenarioID,
  openScenarioID,
  deleteScenario,
  setOpenScenarioID,
  reloadScenarios,
  handleClickScenarioToActive,
  handleClickNewScenario,
  handleClickStartStop,
  logArgs,
  duplicateScenario,
  handleClickCreateSubScenario,
  openCreateEmmeBank,
  addNewSetting,
  duplicateSubScenario,
  modifySubScenario,
  deleteSubScenario,
  activeScenarios
}: any) => {

  const runningScenario = activeScenarios.filter((s: any) => s.id === runningScenarioID);
  const renderableScenarios = activeScenarios.map(activeScenario => {
    if (activeScenario.id === runningScenario.id) {
      return runningScenario;
    }
    return activeScenario;
  })

  const RunStatusList = () => {
    if (renderableScenarios.length > 0) {
      return (
        <div key="RunStatusList">
          {
            renderableScenarios.map(scenarioToRender => {
              return (
                <RunStatus
                  id={scenarioToRender.id}
                  key={scenarioToRender.id}
                  isScenarioRunning={scenarioToRender.id === runningScenarioID}
                  statusIterationsTotal={scenarioToRender.runStatus.statusIterationsTotal}
                  statusIterationsCompleted={scenarioToRender.runStatus.statusIterationsCompleted}
                  statusReadyScenariosLogfiles={scenarioToRender.runStatus.statusReadyScenariosLogfiles}
                  statusRunStartTime={scenarioToRender.runStatus.statusRunStartTime}
                  statusRunFinishTime={scenarioToRender.runStatus.statusRunFinishTime}
                  statusState={scenarioToRender.runStatus.statusState}
                  demandConvergenceArray={scenarioToRender.runStatus.demandConvergenceArray}
                />)
            })
          }
        </div>
      )
    }
    return <div />
  }

  return (
    <div className="Runtime">
      <div className="Runtime__valma-project-controls">
        <div className="Runtime__heading">Projektin alustaminen</div>
        <p className="Runtime__project-path">
          Valma-skenaarioiden tallennuspolku: {projectFolder}
        </p>
        <button
          className="Runtime__button Table_space_after"
          onClick={() => addNewSetting()}
        >
          <span>Luo uusi VALMA-projekti</span>
        </button>

        <div className="Runtime__buttons">
          <button
            className="Runtime__button Table_space_after"
            onClick={e => reloadScenarios()}
            disabled={runningScenarioID}
          >
            Lataa uudelleen projektin skenaariot
          </button>
          <button
            className="Runtime__button"
            onClick={e => openCreateEmmeBank()}
            disabled={runningScenarioID}
          >Luo Emmepankki
          </button>
        </div>
      </div>
      <div className="Runtime__scenarios-controls">
        <div className="Runtime__scenarios-heading">Ladatut skenaariot</div>
        <div className="Runtime__scenarios">
          <Tooltip
            id="scenario-tooltip"
            style={{ borderRadius: "1rem", maxWidth: "40rem", backgroundColor: "#e3e3e3", color: "#000000", zIndex: 9999, fontSize: "11px", lineHeight: "80%"}} 
            place="bottom"
          />
          {/* Create table of all scenarios "<Button-To-Add-As-Runnable> <Button-To-Open-Configuration>" */}
          <table className="Runtime__scenario_table" key="scenario_table" cellSpacing="0">
            <thead>
              <tr>
                <th scope="col"></th>
                <th scope="col">NIMI</th>
                <th scope="col">TYYPPI</th>
                <th scope="col">LASKETTU</th>
                <th scope="col" colSpan={2}>TULOS</th>
                <th scope="col"></th>
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody key="scenario_table_body">
              {scenarios.map(s => {
                // Component for the tooltip showing scenario settings
                return (
                  <ScenarioTableRow
                    key={"row_" + s.id}
                    scenarioData={s}
                    runningScenarioID={runningScenarioID}
                    openScenarioID={openScenarioID}
                    scenarioIDsToRun={scenarioIDsToRun}
                    handleClickScenarioToActive={handleClickScenarioToActive}
                    duplicateScenario={duplicateScenario}
                    handleClickCreateSubScenario={handleClickCreateSubScenario}
                    setOpenScenarioID={setOpenScenarioID}
                    deleteScenario={deleteScenario}
                    projectFolder={projectFolder}
                    duplicateSubScenario={duplicateSubScenario}
                    deleteSubScenario={deleteSubScenario}
                    modifySubScenario={modifySubScenario}
                  />
                );

              })}
            </tbody>
          </table>
        </div>
        <div className="Runtime__scenarios-footer">
          <button
            className="Runtime__add-new-scenario-btn"
            disabled={runningScenarioID}
            onClick={e => handleClickNewScenario(SCENARIO_TYPES.PASSENGER_TRANSPORT)}
          >
            <span className="Runtime__add-icon">Uusi lyhyiden matkojen skenaario</span>
          </button>
          <button
            className="Runtime__add-new-scenario-btn"
            disabled={runningScenarioID}
            onClick={e => handleClickNewScenario(SCENARIO_TYPES.LONG_DISTANCE)}
          >
            <span className="Runtime__add-icon">Uusi pitkien matkojen skenaario</span>
          </button>
          <button
            className="Runtime__add-new-scenario-btn"
            disabled={runningScenarioID}
            onClick={e => handleClickNewScenario(SCENARIO_TYPES.GOODS_TRANSPORT)}
          >
            <span className="Runtime__add-icon">Uusi tavaraliikenteen skenaario</span>
          </button>
        </div>
      </div>

      <div className="Runtime__start-stop-controls">
        <div className="Runtime__heading">Ajettavana</div>
        <ScenariosToRun scenariosToRun={activeScenarios} />
        <button
          className="Runtime__start-stop-btn"
          disabled={scenarioIDsToRun.length === 0}
          onClick={e => handleClickStartStop()}
        >
          {!runningScenarioID
            ? `K\u00e4ynnist\u00e4 (${scenarioIDsToRun.length}) skenaariota`
            : `Keskeyt\u00e4 loput skenaariot`}
        </button>
        <RunStatusList />
      </div>
    </div>
  );
};

export default Runtime;