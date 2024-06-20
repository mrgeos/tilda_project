import React from 'react';
import './SiteCard.css';

const SiteCard = ({ site, onClick, isSelected }) => (
  <div
    className={`site-card ${isSelected ? 'selected' : ''}`}
    onClick={onClick}
  >
    <h2>{site.title}</h2>
  </div>
);

export default SiteCard;
