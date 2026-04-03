import React from 'react';

const PlaceholderTab = ({ title, icon: Icon }) => {
  return (
    <div>
      <h2>{Icon && <Icon className="icon" size={28} />} {title}</h2>
      <div className="card" style={{minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-text)'}}>
        <p>This component is under construction.</p>
      </div>
    </div>
  );
};

export default PlaceholderTab;
