import React, { useState } from 'react';
import './RunLog.css';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

interface RunLogEntry {
  time?: string | number;
  level: 'UI-event' | 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | string;
  message?: string;
}

interface RunLogProps {
  isScenarioRunning: boolean;
  entries: RunLogEntry[];
  closeRunLog: () => void;
}

/* ------------------------------------------------------------------ */

const RunLog: React.FC<RunLogProps> = ({
  isScenarioRunning,
  entries,
  closeRunLog,
}) => {
  const [showINFO, setShowINFO] = useState(true);
  const [showWARN, setShowWARN] = useState(true);
  const [showERROR, setShowERROR] = useState(true);
  const [showDEBUG, setShowDEBUG] = useState(false);

  const shouldShowEntry = (entry: RunLogEntry): boolean => {
    switch (entry.level) {
      case 'UI-event':
      case 'INFO':
        return showINFO;
      case 'WARN':
        return showWARN;
      case 'ERROR':
        return showERROR;
      case 'DEBUG':
        return showDEBUG;
      default:
        return true;
    }
  };

  return (
    <div className="RunLog">
      <div className="RunLog__header">
        <h2>Loki</h2>

        {!isScenarioRunning && (
          <button onClick={closeRunLog}>Sulje</button>
        )}
      </div>

      <div className="RunLog__filters">
        <button onClick={() => setShowINFO(prev => !prev)}>
          INFO
        </button>
        <button onClick={() => setShowERROR(prev => !prev)}>
          ERROR
        </button>
        <button onClick={() => setShowWARN(prev => !prev)}>
          WARNING
        </button>
        <button onClick={() => setShowDEBUG(prev => !prev)}>
          DEBUG
        </button>
      </div>

      <div className="RunLog__entries">
        {entries
          .filter(shouldShowEntry)
          .map((entry, index) => (
            <div
              key={index}
              className={`RunLog__entry RunLog__entry--${entry.level}`}
            >
              {entry.time && (
                <span className="RunLog__time">
                  {entry.time}
                </span>
              )}
              <span className="RunLog__level">
                {entry.level}
              </span>
              <span className="RunLog__message">
                {entry.message}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
};

export default RunLog;