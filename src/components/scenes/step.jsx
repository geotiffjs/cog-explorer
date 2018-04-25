import React from 'react';
import { connect } from 'react-redux';

import { editStep, indexStep, removeStep } from '../../actions/scenes';

const mapDispatchToProps = {
  editStep,
  indexStep,
  removeStep,
};

const Sigmoidal = connect(null, mapDispatchToProps)(({ step, sceneId, index, editStep }) => {
  return (
    <React.Fragment>
      <div className="form-group row">
        <label className="col-sm-3 col-form-label col-form-label-sm">Contrast:</label>
        <div className="input-group input-group-sm col-sm-9">
          <input
            className="form-control form-control-sm custom-range"
            value={step.contrast}
            min="1"
            max="100"
            step="1"
            type="range"
            onChange={e => editStep(sceneId, index, { contrast: e.target.value })}
          />
          <div className="input-group-append">
            <span className="input-group-text" style={{ width: '3.5em' }}>{step.contrast}</span>
          </div>
        </div>
      </div>
      <div className="form-group row">
        <label className="col-sm-3 col-form-label col-form-label-sm">Bias:</label>
        <div className="input-group input-group-sm col-sm-9">
          <input
            className="form-control form-control-sm custom-range"
            value={step.bias}
            min="0"
            max="0.2"
            step="0.01"
            type="range"
            onChange={e => editStep(sceneId, index, { bias: e.target.value })}
          />
          <div className="input-group-append">
            <span className="input-group-text" style={{ width: '3.5em' }}>{step.bias}</span>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
});

const Gamma = connect(null, mapDispatchToProps)(({ step, sceneId, index, editStep }) => {
  return (
    <React.Fragment>
      <div className="form-group row">
        <label className="col-sm-3 col-form-label col-form-label-sm">Value:</label>
        <div className="input-group input-group-sm col-sm-9">
          <input
            className="form-control form-control-sm custom-range"
            value={step.contrast}
            min="0"
            max="2"
            step="0.01"
            type="range"
            onChange={e => editStep(sceneId, index, { value: e.target.value })}
          />
          <div className="input-group-append">
            <span className="input-group-text" style={{ width: '3.5em' }}>{step.value}</span>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
});


export default connect(null, mapDispatchToProps)(({ sceneId, step, index, isLast, editStep, indexStep, removeStep }) => {
  let sub;

  if (step.operation === 'sigmoidal-contrast') {
    sub = <Sigmoidal sceneId={sceneId} step={step} index={index} />;
  } else if (step.operation === 'gamma') {
    sub = <Gamma sceneId={sceneId} step={step} index={index} />;
  }

  return (
    <div className="card">
      <div className="card-header">
        <span>{step.operation}</span>
        <span className="float-right btn-group">
          <button className="btn btn-sm" onClick={() => indexStep(sceneId, index, index - 1)} disabled={index === 0}>
            <i className="fa fa-angle-up"></i>
          </button>
          <button className="btn btn-sm" onClick={() => indexStep(sceneId, index, index + 1)} disabled={isLast}>
            <i className="fa fa-angle-down"></i>
          </button>
          <button className="btn btn-sm" onClick={() => removeStep(sceneId, index)}>
            <i className="fa fa-times"></i>
          </button>
        </span>
      </div>
      <div className="card-body">
        <div className="form-group row">
          <label className="col-sm-3 col-form-label col-form-label-sm">Channels:</label>
          <select
            className="col-sm-9 col-form-label form-control form-control-sm"
            value={step.bands}
            onChange={e => editStep(sceneId, index, { bands: e.target.value })}
          >
            <option value="all">all</option>
            <option value="red">red</option>
            <option value="green">green</option>
            <option value="blue">blue</option>
          </select>
        </div>
        {sub}
      </div>
    </div>
  );
});
