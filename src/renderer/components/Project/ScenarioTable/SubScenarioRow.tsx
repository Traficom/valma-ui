import React from 'react';
import CopyIcon from '../../../icons/CopyIcon';
import Check from '../../../icons/Check';
import ErrorCircle from '../../../icons/ErrorCircle';
import { JSX } from 'react/jsx-runtime';
import { ScenarioData } from '../types/ScenarioData';
import { SubScenarioData } from '../types/SubScenarioData';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */


interface SubScenarioRowProps {
  scenarioData: ScenarioData;
  subScenario: SubScenarioData;

  runningScenarioID?: string;
  openScenarioID?: string;

  scenarioIDsToRun: string[];

  handleClickScenarioToActive: (id: string) => void;
  duplicateSubScenario: (subScenario: SubScenarioData) => void;
  modifySubScenario: (subScenario: SubScenarioData) => void;
  deleteSubScenario: (subScenario: SubScenarioData) => void;

  tooltipContent: string;

  projectFolder: string;
  parentScenarioIsRunOrSelectedForRunning: boolean;
  parentScenarioResultDataFolder: string;
}

/* ------------------------------------------------------------------ */

const SubScenarioRow: React.FC<SubScenarioRowProps> = ({
  scenarioData,
  subScenario,

  runningScenarioID,
  openScenarioID,

  scenarioIDsToRun,

  handleClickScenarioToActive,
  duplicateSubScenario,
  modifySubScenario,
  deleteSubScenario,
  tooltipContent,
  projectFolder,
  parentScenarioIsRunOrSelectedForRunning,
  parentScenarioResultDataFolder,
}) => {
  const scenarioLogFilePath = window.fsHelpers.join(
    projectFolder + subScenario.name,
    `${subScenario.name}.log`
  );
  const resultsExist = window.fsHelpers.exists(parentScenarioResultDataFolder);
  const scenarioLogExists = window.fsHelpers.exists(scenarioLogFilePath);

  const openResultDataFolder = () => {
    window.electron.openPath(parentScenarioResultDataFolder);
  };

  const openLogFile = () => {
    if (scenarioLogExists) {
      window.electron.openPath(scenarioLogFilePath);
    }
  };

  return (
    <tr id="my-sub-tooltip-anchor" className="Runtime__sub_scenario" key={"tooltip_wrapper_" + subScenario.id}>
      <td>
        <input
          className={
            "Runtime__scenario-activate-checkbox" +
            (scenarioIDsToRun.includes(subScenario.id)
              ? " Runtime__scenario-activate-checkbox--active"
              : "")
          }
          type="checkbox"
          checked={scenarioIDsToRun.includes(subScenario.id)}
          disabled={!parentScenarioIsRunOrSelectedForRunning || runningScenarioID == subScenario.id}
          onChange={e => handleClickScenarioToActive(subScenario.id)}
        />
      </td>
      <td data-tooltip-id="scenario-tooltip"
        data-tooltip-html={tooltipContent}
        data-tooltip-delay-show={150}
        data-tooltip-hidden={openScenarioID !== null}>
        <div>
          <span className="Runtime__sub_scenario-name">
            {subScenario.name
              ? subScenario.name
              : `Unnamed project (${subScenario.id})`}
          </span>
        </div>
      </td>
      <td data-tooltip-id="scenario-tooltip"
        data-tooltip-html={tooltipContent}
        data-tooltip-delay-show={150}
        data-tooltip-hidden={openScenarioID !== null}>
        <div className="Runtime__sub_scenario-type"></div>
      </td>
      <td className="Table_space_after">{resultsExist && subScenario.last_run && <span className="Runtime__scenario-name">
        {subScenario.last_run}
      </span>} </td>
      <td>{resultsExist && scenarioLogExists && (
        <div onClick={e => openLogFile()}>{subScenario.runSuccess ? <Check /> : <ErrorCircle />}</div>
      )}</td>
      <td className="Table_space_after">
        {resultsExist && <div
          className={"Runtime__scenario-open-folder"}
          onClick={e => openResultDataFolder()}
        >
          NÄYTÄ
        </div>}
      </td>
      <td className="Table_space_after">
      </td>
      <td>
        <div
          className={"Runtime__scenario-clone"}
          onClick={e => duplicateSubScenario(subScenario)}
        >
          <CopyIcon />
        </div>
        <div
          className={
            "Runtime__scenario-open-config"
          }
          onClick={e =>
            runningScenarioID ? undefined : modifySubScenario(subScenario)
          }
        ></div>

        <div
          className={"Runtime__scenario-delete"}
          onClick={e =>
            runningScenarioID ? undefined : deleteSubScenario(subScenario)
          }
        ></div>
      </td>
    </tr>
  );
}

export default SubScenarioRow;