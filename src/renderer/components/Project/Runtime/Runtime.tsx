import React from 'react';
import './Runtime.css';

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

  return (
    <div className="Runtime">
      <div className="Runtime__valma-project-controls">
        <div className="Runtime__heading">Projektin alustaminen</div>
        <p className="Runtime__project-path">
          Valma-skenaarioiden tallennuspolku: {projectFolder}
        </p>
        <button className="Runtime__button" onClick={() => addNewSetting()}>
          Luo uusi VALMA-projekti
        </button>
        <div className="Runtime__buttons">
          <button onClick={() => reloadScenarios()} disabled={runningScenarioID}>
            Lataa uudelleen projektin skenaariot
          </button>
          <button onClick={() => openCreateEmmeBank()} disabled={runningScenarioID}>
            Luo Emmepankki
          </button>
        </div>
      </div>

      <div className="Runtime__scenarios-controls">
        <div className="Runtime__scenarios-heading">Ladatut skenaariot</div>
        <table className="Runtime__scenario_table">
          <tbody>
            {scenarios.map((s: any) => (
              <tr key={s.id}>
                <td onClick={() => handleClickScenarioToActive(s)}>▶</td>
                <td onClick={() => setOpenScenarioID(s.id)}>{s.name}</td>
                <td>{s.scenarioType}</td>
                <td>
                  <button onClick={() => duplicateScenario(s)}>⎘</button>
                  <button onClick={() => deleteScenario(s)}>✖</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="Runtime__scenarios-footer">
          <button onClick={() => handleClickNewScenario(SCENARIO_TYPES.PASSENGER_TRANSPORT)}>
            Uusi lyhyiden matkojen skenaario
          </button>
          <button onClick={() => handleClickNewScenario(SCENARIO_TYPES.LONG_DISTANCE)}>
            Uusi pitkien matkojen skenaario
          </button>
          <button onClick={() => handleClickNewScenario(SCENARIO_TYPES.GOODS_TRANSPORT)}>
            Uusi tavaraliikenteen skenaario
          </button>
        </div>
      </div>

      <div className="Runtime__start-stop-controls">
        <button
          disabled={scenarioIDsToRun.length === 0}
          onClick={() => handleClickStartStop()}
        >
          {!runningScenarioID
            ? `Käynnistä (${scenarioIDsToRun.length}) skenaariota`
            : `Keskeytä loput skenaariot`}
        </button>
      </div>
    </div>
  );
};

export default Runtime;