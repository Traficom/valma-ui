import React from 'react';
import Plus from '../../icons/Plus';

interface PlusLabelProps {
  label: string;
}

const PlusLabel: React.FC<PlusLabelProps> = ({ label }) => {
  return (
   <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><Plus />{label}</span>
  );
};

export default PlusLabel;

