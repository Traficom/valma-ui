import React from 'react';
import outer_link from './outer_link.svg';


const OuterLink: React.FC = () => {
  return (
       <span style={{ paddingTop: "10px" }}><img src={outer_link} alt="link" width="24" height="24"/></span>
  );
};

export default OuterLink;