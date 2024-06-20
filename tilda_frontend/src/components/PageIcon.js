import React from 'react';
import { FaFileAlt } from 'react-icons/fa';
import './PageIcon.css';

const PageIcon = ({ img }) => (
  <div className="page-icon">
    {img ? <img src={img} alt="Thumbnail" /> : <FaFileAlt />}
  </div>
);

export default PageIcon;
