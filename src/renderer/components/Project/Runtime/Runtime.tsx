import React, { useEffect, useRef, useState } from 'react';
import './Runtime.css'
import ScenariosToRun from './ScenariosToRun';
import RunStatus from './RunStatus/RunStatus';
import ScenarioTableRow from '../ScenarioTable/ScenarioTableRow';
import { Tooltip } from 'react-tooltip';
import PlusLabel from '../../PageElements/PlusLabel';
import OuterLink from '../../../icons/OuterLink';
import { Pagination } from '../../Pagination/Pagination';
import { SCENARIO_STATUS_STATE, SCENARIO_TYPES, SORT_TYPES, SortType } from '../../../../enums';
import { RunnableScenarioData, ScenarioData } from '../types/ScenarioData';
import { SubScenarioData } from '../types/SubScenarioData';
import ArrowDownWhite from '../../../icons/ArrowDownWhite';
import ArrowUpWhite from '../../../icons/ArrowUpWhite';

interface RuntimeProps {
  projectFolder: string;
  scenarios: ScenarioData[];
  scenarioIDsToRun: string[];
  runningScenarioID: string | null;
  openScenarioID: string | null;
  deleteScenario: (id: string) => void;
  setOpenScenarioID: (id: string | null) => void;
  reloadScenarios: () => void;
  handleClickScenarioToActive: (id: string) => void;
  handleClickNewScenario: (scenarioType: string) => void;
  handleClickStartStop: () => void;
  logArgs: any;
  duplicateScenario: (id: string) => void;
  handleClickCreateSubScenario: (scenarioId: string) => void;
  openCreateEmmeBank: () => void;
  duplicateSubScenario: (subScenario: SubScenarioData) => void;
  modifySubScenario: (subScenario: SubScenarioData) => void;
  deleteSubScenario: (subScenario: SubScenarioData) => void;
  activeScenarios: RunnableScenarioData[];
  sortScenarios: (sort: SortType) => void;
  sort: SortType;
  handleClickOpenProject: () => void;
}

const Runtime: React.FC<RuntimeProps> = ({
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
  duplicateSubScenario,
  modifySubScenario,
  deleteSubScenario,
  activeScenarios,
  sortScenarios,
  sort,
  handleClickOpenProject
}) => {
  const scenariosPerPage = 4;
  const runningScenario = activeScenarios.filter((s: any) => s.id === runningScenarioID)[0];
  const [currentPage, setCurrentPage] = useState(1);
  const [pages, setPages] = useState(2);
  const [scenarioTableVisibleRows, setScenarioTableVisibleRows] = useState([]);
  const renderableScenarios = activeScenarios.map(activeScenario => {
    if (activeScenario?.id === runningScenario?.id) {
      return runningScenario;
    }
    return activeScenario;
  });

  const openProjecFolder = () => {
    window.electron.openPath(projectFolder);
  };
  const [arrow, setArrow] = useState(<ArrowDownWhite/>);
  function determineSortType(fieldName: string): SortType {
    switch (fieldName) {
      case "name":
        return isSortedBy("name") ? (isSortDesc(sort) ? SORT_TYPES.NAME_ASC : SORT_TYPES.NAME_DESC) : SORT_TYPES.NAME_DESC;
      case "type":
        return isSortedBy("type") ? (isSortDesc(sort) ? SORT_TYPES.TYPE_ASC : SORT_TYPES.TYPE_DESC) : SORT_TYPES.TYPE_DESC;
    }
  }

  function handleScenarioSort(fieldName: string) {
    const sortType = determineSortType(fieldName);
    setArrow(isSortDesc(sortType) ?  <ArrowDownWhite/> : <ArrowUpWhite/> )
    sortScenarios(sortType);
    setCurrentPage(1); // change page to 1
  }

  function isSortedBy(fieldName: string): boolean {
    return sort.includes(fieldName);
  }

  function isSortDesc(sortToEvaluate: SortType): boolean {
    return sortToEvaluate.includes("desc");
  }

  function changePage(page: number) {
    setCurrentPage(page);
    setVisibleRows(page);
  };

  function setVisibleRows(page: number) {
    var visibleRowsStart = (page - 1) * scenariosPerPage;
    var tempLastToShow = visibleRowsStart + scenariosPerPage;
    var visibleRowsEnd = tempLastToShow >= scenarios.length ? scenarios.length : tempLastToShow;
    setScenarioTableVisibleRows([...scenarios.slice(visibleRowsStart, visibleRowsEnd)]);
  }

  useEffect(() => {
    setPages(scenarios.length / scenariosPerPage);
    setVisibleRows(currentPage);
  }, [scenarios]);

  const parseDemandConvergenceLogMessage = (message) => {
    const stringMsgArray = message.split(' ');
    return { iteration: stringMsgArray[stringMsgArray.length - 3], value: stringMsgArray[stringMsgArray.length - 1] };
  };

  //Parse log contents into the currently running scenario so we can show each one individually
  const parseLogArgs = (runStatus, logArgs) => {
    if (logArgs.status) {
      runStatus.statusIterationsTotal = logArgs.status['total'];
      runStatus.statusIterationsCurrent = logArgs.status['current'];
      runStatus.statusIterationsCompleted = logArgs.status['completed'];
      runStatus.statusIterationsFailed = logArgs.status['failed'];
      runStatus.statusState = logArgs.status['state'];
      runStatus.statusLogfilePath = logArgs.status['log'];

      if (logArgs.status.state === SCENARIO_STATUS_STATE.FINISHED) {
        runStatus.statusReadyScenariosLogfiles = { name: logArgs.status.name, logfile: logArgs.status.log, resultDataFolder: getResultDataFolderFromLogfilePath(logArgs.status.log) }
        runStatus.statusRunFinishTime = logArgs.time;
      }

      if (logArgs.status.state === SCENARIO_STATUS_STATE.STARTING) {
        runStatus.statusRunStartTime = logArgs.time;
        runStatus.statusRunFinishTime = logArgs.time;
        runStatus.demandConvergenceArray = [];
        runStatus.statusIterationsTotal = 0;
      }
    }

    if (logArgs.level === 'INFO') {
      if (logArgs.message.includes('Demand model convergence in')) {
        const currentDemandConvergenceValueAndIteration = parseDemandConvergenceLogMessage(logArgs.message);
        runStatus.demandConvergenceArray = [...runStatus.demandConvergenceArray, currentDemandConvergenceValueAndIteration];
      }
    }
  }

  if (runningScenario != undefined) {
    const runStatus = runningScenario.runStatus;
    parseLogArgs(runStatus, logArgs);
  }

  const getResultDataFolderFromLogfilePath = (logfilePath) => {
    console.log(logfilePath.replace(/\/[^\/]+$/, ''));
    return logfilePath.replace(/\/[^\/]+$/, '');
  }

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
                  statusReadyScenariosLogfile={scenarioToRender.runStatus.statusReadyScenariosLogfile}
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
  };

  return (
    <div className="Runtime">
      <div className="Runtime__valma-project-controls">
        <div className="Runtime__project-path">
          <span>
            Valma-skenaarioiden tallennuspolku:
          </span>
          <div className="Runtime_link"
            onClick={e => openProjecFolder()}
          >
            {projectFolder}
          </div>
          <button className="Emme_project_button"
            onClick={e => handleClickOpenProject()}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>Emmeprojekti <OuterLink /></span>
          </button>
        </div>

        <div className="Runtime__buttons">
          <button
            className="Runtime__button"
            onClick={e => openCreateEmmeBank()}
            disabled={runningScenarioID != null}
          >Luo Emmepankki
          </button>
          <button
            className="Runtime__button Table_space_after"
            onClick={e => reloadScenarios()}
            disabled={runningScenarioID != null}
          >
            Lataa uudelleen projektin skenaariot
          </button>
        </div>
      </div>
      <div className="Runtime__scenarios-controls">
        <div className="Runtime__scenarios-heading">Ladatut skenaariot</div>
        <div className="Runtime__scenario-buttons">
          <button
            className="Runtime__button"
            disabled={runningScenarioID != null}
            onClick={e => handleClickNewScenario(SCENARIO_TYPES.PASSENGER_TRANSPORT)}>
            <PlusLabel label='Uusi lyhyiden matkojen skenaario' />
          </button>
          <button
            className="Runtime__button"
            disabled={runningScenarioID != null}
            onClick={e => handleClickNewScenario(SCENARIO_TYPES.LONG_DISTANCE)}>
            <PlusLabel label='Uusi pitkien matkojen skenaario' />
          </button>
          <button
            className="Runtime__button"
            disabled={runningScenarioID != null}
            onClick={e => handleClickNewScenario(SCENARIO_TYPES.GOODS_TRANSPORT)}>
            <PlusLabel label='Uusi tavaraliikenteen skenaario' />
          </button>
        </div>
        <div className="Runtime__scenarios">
          <Tooltip
            id="scenario-tooltip"
            style={{ borderRadius: "1rem", maxWidth: "40rem", backgroundColor: "#e3e3e3", color: "#000000", zIndex: 9999, fontSize: "11px", lineHeight: "80%" }}
            place="right"
          />
          {/* Create table of all scenarios "<Button-To-Add-As-Runnable> <Button-To-Open-Configuration>" */}
          <table className="Runtime__scenario_table" key="scenario_table" cellSpacing="0">
            <thead>
              <tr>
                <th scope="col"></th>
                <th scope="col" className={isSortedBy("name") ? "SortedByColumn" : ""} onClick={e => handleScenarioSort("name")}><span>Nimi {isSortedBy("name") ? arrow : ""}</span></th>
                <th scope="col" className={isSortedBy("type") ? "SortedByColumn" : ""} onClick={e => handleScenarioSort("type")}><span>Tyyppi {isSortedBy("type") ? arrow : ""}</span></th>
                <th scope="col" colSpan={5}>Laskettu tulos</th>
              </tr>
            </thead>
            <tbody key="scenario_table_body">
              {scenarioTableVisibleRows.map(s => {
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
          <Pagination ariaLabel='Skenaariot' currentPage={currentPage} setPage={changePage} pages={pages} paginationId='pagination_1' />
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
  )
};
export default Runtime;

