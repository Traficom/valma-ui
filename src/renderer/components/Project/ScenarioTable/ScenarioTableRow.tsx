import React, { Fragment, JSX, useMemo } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { SCENARIO_TYPES } from '../../../../enums';
import SubScenarioRow from './SubScenarioRow';
import CopyIcon from '../../../icons/CopyIcon';
import Check from '../../../icons/Check';
import ErrorCircle from '../../../icons/ErrorCircle';
import Plus from '../../../icons/Plus';
import ScenarioTooltip from '../ScenarioTable/ScenarioTooltip';
import { ScenarioData } from '../types/ScenarioData';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

interface OverriddenProjectSettings {
  projectFolder?: string | null;
}

interface SubScenario {
  id: string;
  name: string;
}


interface ScenarioTableRowProps {
  scenarioData: ScenarioData;

  runningScenarioID?: string;
  openScenarioID?: string;
  scenarioIDsToRun: string[];

  handleClickScenarioToActive: (id: string) => void;
  duplicateScenario: (id: string) => void;
  handleClickCreateSubScenario: (id: string) => void;
  setOpenScenarioID: (id: string) => void;
  deleteScenario: (scenario: ScenarioData) => void;

  projectFolder: string;

  duplicateSubScenario: (sub: SubScenario) => void;
  modifySubScenario: (sub: SubScenario) => void;
  deleteSubScenario: (sub: SubScenario) => void;
}

/* ------------------------------------------------------------------ */

const ScenarioTableRow: React.FC<ScenarioTableRowProps> = ({
  scenarioData,
  runningScenarioID,
  openScenarioID,
  scenarioIDsToRun,

  handleClickScenarioToActive,
  duplicateScenario,
  handleClickCreateSubScenario,
  setOpenScenarioID,
  deleteScenario,
  projectFolder,

  duplicateSubScenario,
  modifySubScenario,
  deleteSubScenario,
}) => {
  const fsHelpers = window.fsHelpers;
  const isOverriddenProjectFolderSet =
    scenarioData.overriddenProjectSettings &&
    scenarioData.overriddenProjectSettings.projectFolder != null;

  const scenarioProjectFolder = isOverriddenProjectFolderSet
    ? scenarioData.overriddenProjectSettings!.projectFolder!
    : fsHelpers.join(projectFolder, scenarioData.name);

  const scenarioLogFilePath = fsHelpers.join(
    scenarioProjectFolder,
    `${scenarioData.name}.log`
  );

  const resultsExist = window.fsHelpers.exists(scenarioProjectFolder);
  const scenarioLogExists = window.fsHelpers.exists(scenarioLogFilePath);

  const openResultsFolder = () => {
    window.electron.openPath(scenarioProjectFolder);
  };

  const openLogFile = () => {
    if (scenarioLogExists) {
      window.electron.openPath(scenarioLogFilePath);
    }
  };

  const scenarioTypeLabel = (() => {
    switch (scenarioData.scenarioType) {
      case SCENARIO_TYPES.GOODS_TRANSPORT:
        return 'Tavaraliikenne';
      case SCENARIO_TYPES.PASSENGER_TRANSPORT:
        return 'Henkilöliikenne';
      case SCENARIO_TYPES.LONG_DISTANCE:
        return 'Pitkät matkat';
      default:
        return 'Henkilöliikenne';
    }
  })();


const tooltipContent = useMemo(() => {
  return renderToStaticMarkup(
    <ScenarioTooltip scenario={scenarioData} subScenario={undefined} />
  );
}, [scenarioData]);

  return (
    <Fragment>
      <tr id={"row_" + scenarioData.id} className="Runtime__scenario">
        <td>
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
            onChange={e => handleClickScenarioToActive(scenarioData.id)}
          />
        </td>
        <td data-tooltip-id="scenario-tooltip"
        data-tooltip-html={tooltipContent}
        data-tooltip-delay-show={150}
        data-tooltip-hidden={openScenarioID !== null}>
          <div>
            <span className="Runtime__scenario-name">
              {scenarioData.name
                ? scenarioData.name
                : `Unnamed project (${scenarioData.id})`}
            </span>
          </div>
        </td>
        <td data-tooltip-id="scenario-tooltip"
        data-tooltip-html={tooltipContent}
        data-tooltip-delay-show={150}
        data-tooltip-hidden={openScenarioID !== null}>
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
        <td>{resultsExist && scenarioLogExists && <div onClick={e => openLogFile()}>{scenarioData.run_success ? <Check /> : <ErrorCircle />}</div>}</td>
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
            onClick={e => duplicateScenario(scenarioData.id)}
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
      {
        scenarioData.subScenarios &&
        scenarioData.subScenarios.map((subScenario) => {
          // Component for the tooltip showing scenario settings
          const subTooltipContent = () => {
            return (
              <ScenarioTooltip scenario={scenarioData} subScenario={subScenario} />
            );
          };

          return (
            <SubScenarioRow
              key={"SubRow_" + subScenario.id}
              scenarioData={scenarioData}
              subScenario={subScenario}
              runningScenarioID={runningScenarioID}
              openScenarioID={openScenarioID}
              scenarioIDsToRun={scenarioIDsToRun}
              handleClickScenarioToActive={handleClickScenarioToActive}
              deleteSubScenario={deleteSubScenario}
              tooltipContent={renderToStaticMarkup(subTooltipContent())}
              projectFolder={projectFolder}
              duplicateSubScenario={duplicateSubScenario}
              modifySubScenario={modifySubScenario}
              parentScenarioIsRunOrSelectedForRunning={
                (resultsExist &&
                  scenarioLogExists &&
                  scenarioData.run_success == true &&
                  scenarioData.last_run != "") ||
                scenarioIDsToRun.includes(scenarioData.id)
              }
              parentScenarioResultDataFolder={scenarioProjectFolder}
            />
          );
        })}
    </Fragment>
  );
}

export default ScenarioTableRow;