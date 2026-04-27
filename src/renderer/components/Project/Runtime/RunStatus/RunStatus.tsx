import React from 'react';
import './RunStatus.css';
import {
  Chart as ChartJS,
  LinearScale,
  LineElement,
  PointElement,
  CategoryScale,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import dayjs from 'dayjs';

import { SCENARIO_STATUS_STATE } from '../../../../../enums';

import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import { DemandConvergenceEntry } from '../../types/DemandConvergenceEntry';

dayjs.extend(duration);
dayjs.extend(relativeTime);

ChartJS.register(
  LinearScale,
  LineElement,
  CategoryScale,
  PointElement,
  Tooltip,
  Legend,
  Title
);

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

interface ReadyScenarioLogfiles {
  name?: string;
  logfile?: string;
  resultDataFolder?: string;
}

interface RunStatusProps {
  isScenarioRunning: boolean;

  statusIterationsTotal: number;
  statusIterationsCompleted: number;

  statusReadyScenariosLogfiles?: ReadyScenarioLogfiles;

  statusRunStartTime?: number;
  statusRunFinishTime?: number;

  statusState?: string;

  demandConvergenceArray: DemandConvergenceEntry[];
}

/* ------------------------------------------------------------------ */

const RunStatus: React.FC<RunStatusProps> = ({
  isScenarioRunning,
  statusIterationsTotal,
  statusIterationsCompleted,
  statusReadyScenariosLogfiles,
  statusRunStartTime,
  statusRunFinishTime,
  statusState,
  demandConvergenceArray,
}) => {
  /* ---------------------------- Graph ----------------------------- */

  const graphConfig = {
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Convergence',
          align: 'center' as const,
        },
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          title: {
            display: true,
            text: 'Rel_Gap [ % ]',
            font: { size: 16 },
          },
        },
        x: {
          title: {
            display: true,
            text: 'Iteration [ # ]',
            font: { size: 16 },
          },
        },
      },
    },
    animation: { duration: 0 },
  };

  const graphData = {
    labels: demandConvergenceArray.map(e => e.iteration),
    datasets: [
      {
        label: 'Rel_Gap (%)',
        data: demandConvergenceArray.map(e =>
          (e.value * 100).toFixed(4)
        ),
        backgroundColor: '#ffffff',
        borderColor: '#026273',
      },
    ],
  };

  /* ---------------------------- Helpers --------------------------- */

  const formatRunStatusTime = (
    runFinishTime?: number,
    runStartTime?: number
  ): string => {
    if (!runFinishTime || !runStartTime) return '-';

    const formatted = dayjs
      .duration(dayjs(runFinishTime).diff(dayjs(runStartTime)))
      .format('HH[h]:mm[m]:ss[s]');

    return formatted !== 'NaNh:NaNm:NaNs' ? formatted : '-';
  };

  /* ----------------------------- Render --------------------------- */

  return (
    <div className="RunStatus">
      {(statusState === SCENARIO_STATUS_STATE.RUNNING ||
        statusState === SCENARIO_STATUS_STATE.FINISHED) && (
        <Line data={graphData} options={graphConfig.options} />
      )}

      {(statusState === SCENARIO_STATUS_STATE.PREPARING ||
        statusState === SCENARIO_STATUS_STATE.STARTING) && (
        <div>Starting python shell...</div>
      )}

      {statusReadyScenariosLogfiles &&
        !isScenarioRunning &&
        statusReadyScenariosLogfiles.name && (
          <div className="RunStatus__results">
            <span>
              {statusReadyScenariosLogfiles.name} valmis
            </span>

            {statusReadyScenariosLogfiles.logfile && (
              <button
                onClick={() =>
                  window.electron.openPath(
                    statusReadyScenariosLogfiles.logfile!
                  )
                }
              >
                Lokit
              </button>
            )}

            {statusReadyScenariosLogfiles.resultDataFolder && (
              <button
                onClick={() =>
                  window.electron.openPath(
                    statusReadyScenariosLogfiles.resultDataFolder!
                  )
                }
              >
                Tulokset
              </button>
            )}

            <div>
              Ajoaika:{' '}
              {formatRunStatusTime(
                statusRunFinishTime,
                statusRunStartTime
              )}
            </div>
          </div>
        )}
    </div>
  );
};

export default RunStatus;