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
import { ScenarioLogfile } from '../../types/RunStatus';

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

interface RunStatusProps {
  id: string;
  isScenarioRunning: boolean;

  statusIterationsTotal: number;
  statusIterationsCompleted: number;

  statusReadyScenariosLogfile?: ScenarioLogfile;

  statusRunStartTime?: string;
  statusRunFinishTime?: string;

  statusState?: string;

  demandConvergenceArray: DemandConvergenceEntry[];
}

/* ------------------------------------------------------------------ */

const RunStatus: React.FC<RunStatusProps> = ({
  isScenarioRunning,
  statusIterationsTotal,
  statusIterationsCompleted,
  statusReadyScenariosLogfile,
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
    runFinishTime?: string,
    runStartTime?: string
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

      {statusReadyScenariosLogfile &&
        !isScenarioRunning &&
        statusReadyScenariosLogfile.name && (
          <div className="RunStatus__results">
            <span>
              {statusReadyScenariosLogfile.name} valmis
            </span>

            {statusReadyScenariosLogfile.logfile && (
              <button
                onClick={() =>
                  window.electron.openPath(
                    statusReadyScenariosLogfile.logfile!
                  )
                }
              >
                Lokit
              </button>
            )}

            {statusReadyScenariosLogfile.resultDataFolder && (
              <button
                onClick={() =>
                  window.electron.openPath(
                    statusReadyScenariosLogfile.resultDataFolder!
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