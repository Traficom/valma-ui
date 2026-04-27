import './Loading.css';
import React from 'react';

interface LoadingProps {
  heading: string;
  info: string;
  close: () => void;
}

const Loading: React.FC<LoadingProps> = ({ heading, info, close }) => {
  return (
    <div className="Loading">
      {/* Dark background overlay */}
      <div className="Loading__overlay" onClick={close} />

      <div className="Loading__content">
        <h2>{heading}</h2>
        <p>{info}</p>
        <button onClick={close}>OK</button>
      </div>
    </div>
  );
};

export default Loading;