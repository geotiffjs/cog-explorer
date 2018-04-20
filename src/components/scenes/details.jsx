import React, { Component } from 'react';
import { connect } from 'react-redux';

import { removeScene, sceneChangeBands, addStep } from '../../actions/scenes';
import Step from './step';

const mapStateToProps = ({ scenes }, { id, onSceneHide }) => {
  return { scene: scenes.find(scene => scene.id === id), onSceneHide };
};

const mapDispatchToProps = {
  removeScene,
  sceneChangeBands,
  addStep,
};

class ConnectedSceneDetails extends Component {
  constructor() {
    super();
    this.state = {};
  }

  render() {
    const { scene, onSceneHide, removeScene, sceneChangeBands, addStep } = this.props;
    return (
      <React.Fragment>
        <h3>{scene.id}</h3>
        <div className="row">
          <div className="col-sm">
            <form>
              <div className="form-group">
                <label htmlFor="">Red Band</label>
                <select
                  className="form-control form-control-sm"
                  defaultValue={scene.redBand}
                  onChange={event => sceneChangeBands(scene.id, { redBand: event.target.value })}
                >
                  {scene.bands.map(band => <option value={band} key={band}>{band}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="">Green Band</label>
                <select
                  className="form-control form-control-sm"
                  defaultValue={scene.greenBand}
                  onChange={event => sceneChangeBands(scene.id, { greenBand: event.target.value })}
                >
                  {scene.bands.map(band => <option value={band} key={band}>{band}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="">Blue Band</label>
                <select
                  className="form-control form-control-sm"
                  defaultValue={scene.blueBand}
                  onChange={event => sceneChangeBands(scene.id, { blueBand: event.target.value })}
                >
                  {scene.bands.map(band => <option value={band} key={band}>{band}</option>)}
                </select>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => onSceneHide()}>Hide</button>
              <button className="btn btn-secondary btn-sm" onClick={() => removeScene(scene.id)}>Remove</button>
            </form>
          </div>
          <div className="col-sm">
            {scene.pipeline.map(
              (step, index) =>
                <Step sceneId={scene.id} step={step} index={index} />,
            )}
            <div className="card card-body">
              <div className="form-group">
                <h3>Add step</h3>
              </div>
              <div className="form-group">
                <label htmlFor="">Add step</label>
                <select
                  className="form-control form-control-sm"
                  onChange={event => addStep(scene.id, event.target.value)}
                >
                  <option disabled="true" selected="selected">---</option>
                  <option value="sigmoidal-contrast">sigmoidal-contrast</option>
                  <option value="gamma">gamma</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  }
}

const SceneDetails = connect(mapStateToProps, mapDispatchToProps)(ConnectedSceneDetails);
export default SceneDetails;
