import React from 'react';
import { STORED_SPEED_ASSIGNMENT_PREFIX } from '../../../../constants';

/* ----------------------------- Types ----------------------------- */

interface ScenarioSummary {
  id: string;
  name: string;
}

interface ScenariosToRunProps {
  scenariosToRun?: ScenarioSummary[];
}

/* --------------------------- Component --------------------------- */

const ScenariosToRun: React.FC<ScenariosToRunProps> = ({ scenariosToRun }) => {
  return (
    <div className="ScenariosToRun">
      {scenariosToRun && scenariosToRun.length > 0 && Array.isArray(scenariosToRun) ? (
        scenariosToRun
          .filter(s => !s.id.includes(STORED_SPEED_ASSIGNMENT_PREFIX))
          .map(s => s.name)
          .join(', ')
      ) : (
        'Ei ajettavaksi valittuja skenaarioita'
      )}
    </div>
  );
};

export default ScenariosToRun;