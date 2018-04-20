import React from 'react';
import { connect } from 'react-redux';

import { editStep } from '../../actions/scenes';

const mapDispatchToProps = {
  editStep,
};

const Sigmoidal = connect(null, mapDispatchToProps)(({ step, sceneId, index, editStep }) => {
  return (
    <React.Fragment>
      <div className="form-group">
        <label>Contrast:</label>
        <input className="form-control form-control-sm" value={step.contrast} min="-100" max="100" type="range" onChange={e => editStep(sceneId, index, { contrast: e.target.value })} />{step.contrast}
      </div>
      <div className="form-group">
        <label>Bias:</label>
        <input className="form-control form-control-sm" value={step.bias} min="0" max="0.2" step="0.01" type="range" onChange={e => editStep(sceneId, index, { bias: e.target.value })} />{step.bias}
      </div>
    </React.Fragment>
  );
});

const Gamma = connect(null, mapDispatchToProps)(({ step, sceneId, index, editStep }) => {
  return (
    <React.Fragment>
      <div className="form-group">
        <label>Value:</label>
        <input className="form-control form-control-sm" value={step.value} min="0" max="2" step="0.01" type="range" onChange={e => editStep(sceneId, index, { value: e.target.value })} />{step.value}<br />
      </div>
    </React.Fragment>
  );
});


export default connect(null, mapDispatchToProps)(({ sceneId, step, index, editStep }) => {
  let sub;

  if (step.operation === 'sigmoidal-contrast') {
    sub = <Sigmoidal sceneId={sceneId} step={step} index={index} />;
  } else if (step.operation === 'gamma') {
    sub = <Gamma sceneId={sceneId} step={step} index={index} />;
  }

  return (
    <div className="card card-body">
      <div className="form-group">
        <h3>{step.operation}</h3>
      </div>
      <div className="form-group">
        <label>Channels:</label>
        <select className="form-control form-control-sm" defaultValue={step.bands} onChange={e => editStep(sceneId, index, { bands: e.target.value })}>
          <option value="all">all</option>
          <option value="red">red</option>
          <option value="green">green</option>
          <option value="blue">blue</option>
        </select>
      </div>
      {sub}
    </div>
  );
});
