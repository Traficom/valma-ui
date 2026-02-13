import React, { Fragment } from "react"
import { Tooltip } from 'react-tooltip'
import { renderToStaticMarkup } from 'react-dom/server';
const { shell  } = require('electron');
const fs = require('fs');

const ScenarioTableRow = ({
  scenarioData,
  runningScenarioID,
  openScenarioID,
  scenarioIDsToRun,
  handleClickScenarioToActive,
  duplicateScenario,
  handleClickCreateSubScenario,
  setOpenScenarioID,
  deleteScenario,
  tooltipContent,
  projectFolder,
  duplicateSubScenario,
  modifySubScenario,
  deleteSubScenario,
}) => {

  const scenarioProjectFolder = isOverriddenProjectFolderSet(scenarioData) ?
    scenarioData.overriddenProjectSettings.projectFolder : projectFolder + "\\" + scenarioData.name;

  const scenarioLogFilePath = scenarioProjectFolder + "\\" + scenarioData.name + ".log";

  const resultsExist = fs.existsSync(scenarioProjectFolder);
  const scenarioLogExists = fs.existsSync(scenarioLogFilePath);

  const openResultsFolder = () => {
    shell.openPath(scenarioProjectFolder);
  }

  const openLogFile = () => {
    if(scenarioLogExists){
      shell.openPath(scenarioLogFilePath);
    }
  }

  function isOverriddenProjectFolderSet(scenarioData) {
    return scenarioData.overriddenProjectSettings &&
      scenarioData.overriddenProjectSettings.projectFolder &&
      scenarioData.overriddenProjectSettings.projectFolder !== null;
  }

  return (
    <Fragment>
    <tr id="my-tooltip-anchor" className="Runtime__scenario" key={"tooltip_wrapper_" + scenarioData.id}
      data-tooltip-id="scenario-tooltip"
      data-tooltip-html={renderToStaticMarkup(tooltipContent(scenarioData))}
      data-tooltip-delay-show={150}
      data-tooltip-hidden={openScenarioID !== null}>
      <td>
        <Tooltip anchorSelect="#my-tooltip-anchor" key={"tooltip_" + scenarioData.id} place={"bottom"} offset={-20} id="scenario-tooltip"
        style={{ borderRadius: "1rem", maxWidth: "40rem", backgroundColor: "#e3e3e3", color: "#000000", zIndex: 9999, fontSize: "11px", lineHeight: "80%"}} />
        <input
          className={
            "Runtime__scenario-activate-checkbox" +
            (scenarioIDsToRun.includes(scenarioData.id)
              ? " Runtime__scenario-activate-checkbox--active"
              : "")
          }
          type="checkbox"
          checked={scenarioIDsToRun.includes(scenarioData.id)}
          disabled={runningScenarioID == scenarioData.id}
          onChange={e => handleClickScenarioToActive(scenarioData)}
        />
      </td>
      <td>
        <div>
          <span className="Runtime__scenario-name">
            {scenarioData.name
              ? scenarioData.name
              : `Unnamed project (${scenarioData.id})`}
          </span>
        </div>
      </td>
      <td>
        <div>
          <span className="Runtime__scenario-type">
            {(() => {
              switch (scenarioData.scenarioType) {
                case SCENARIO_TYPES.GOODS_TRANSPORT:
                  return "Tavaraliikenne";
                case SCENARIO_TYPES.PASSENGER_TRANSPORT:
                  return "Henkilöliikenne";
                case SCENARIO_TYPES.LONG_DISTANCE:
                  return "Pitkät matkat";
                default:
                  return "Henkilöliikenne";
              }
            })()}
          </span>
        </div>
      </td>
      <td className="Table_space_after">{resultsExist && scenarioData.last_run && <span className="Runtime__scenario-name">
        {scenarioData.last_run}
      </span>} </td>
      <td>{resultsExist && scenarioLogExists && <div onClick={e => openLogFile()}>{scenarioData.run_success? <Check /> : <ErrorCircle /> }</div>}</td>
      <td className="Table_space_after">
        {resultsExist && <div
          className={"Runtime__scenario-open-folder"}
          onClick={e => openResultsFolder()}
        >
          NÄYTÄ
        </div>}
      </td>

      <td className="Table_space_after">
      {scenarioData.scenarioType != SCENARIO_TYPES.GOODS_TRANSPORT &&
        <div
          className={"Runtime__scenario-sub_scenario"}
          onClick={e => handleClickCreateSubScenario(scenarioData.id)}
        >
          <span><Plus />Luo aliskenaario</span>
        </div>
      }
      </td>
      <td>
        <div
          className={"Runtime__scenario-clone"}
          onClick={e => duplicateScenario(scenarioData)}
        >
          <CopyIcon />
        </div>
        <div
          className={
            "Runtime__scenario-open-config" +
            (openScenarioID === scenarioData.id
              ? " Runtime__scenario-open-config-btn--active"
              : "")
          }
          onClick={e =>
            runningScenarioID ? undefined : setOpenScenarioID(scenarioData.id)
          }
        ></div>

        <div
          className={"Runtime__scenario-delete"}
          onClick={e =>
            runningScenarioID ? undefined : deleteScenario(scenarioData)
          }
        ></div>
      </td>
    </tr>
      {scenarioData.subScenarios && scenarioData.subScenarios.map((subScenario) => (
        <SubScenarioRow
          key={"SubRow_" + subScenario.id}
          scenarioData={scenarioData}
          subScenario={subScenario}
          runningScenarioID={runningScenarioID}
          openScenarioID={openScenarioID}
          scenarioIDsToRun={scenarioIDsToRun}
          handleClickScenarioToActive={handleClickScenarioToActive}
          duplicateScenario={duplicateScenario}
          deleteScenario={deleteScenario}
          tooltipContent={tooltipContent}
          projectFolder={projectFolder}
          duplicateSubScenario={duplicateSubScenario}
          deleteSubScenario={deleteSubScenario}
          modifySubScenario={modifySubScenario}
          parentScenarioIsRunOrSelectedForRunning={(resultsExist && scenarioLogExists && (scenarioData.run_success == true && scenarioData.last_run != "")) || scenarioIDsToRun.includes(scenarioData.id)}
          parentScenarioResultDataFolder={scenarioProjectFolder}/>
      ))}
    </Fragment>
  );
}