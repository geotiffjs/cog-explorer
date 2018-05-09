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
    this.state = {
      newStepType: '',
    };
  }

  onScenarioChange(sceneId, newBands) {
    const { scene } = this.props;
    if (newBands !== '') {
      const [redBand, greenBand, blueBand] = newBands.split(',').map(i => parseInt(i, 10));
      this.props.sceneChangeBands(scene.id, { redBand, greenBand, blueBand });
    }
  }

  render() {
    const { scene, onSceneHide, removeScene, sceneChangeBands, addStep } = this.props;
    const bandIds = Array.from(Uint8Array.from(scene.bands.keys()).sort());

    const isLandsat = Array.from(scene.bands.values()).find(file => /LC0?8.*B[0-9]+.TIF$/.test(file));

    return (
      <div className="card">
        <div className="card-header">Details for {scene.id}</div>
        <div className="card-body row">
          {
            scene.isRGB ||
            <div className="col-sm">
              <form>
                <div className="form-group">
                  <label htmlFor="">Red Band</label>
                  <select
                    className="form-control form-control-sm"
                    value={scene.redBand}
                    onChange={event => sceneChangeBands(scene.id, { redBand: parseInt(event.target.value, 10) })}
                  >
                    {
                      bandIds.map(i => <option value={i} key={i}>B{i}</option>)
                    }
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="">Green Band</label>
                  <select
                    className="form-control form-control-sm"
                    value={scene.greenBand}
                    onChange={event => sceneChangeBands(scene.id, { greenBand: parseInt(event.target.value, 10) })}
                  >
                    {
                      bandIds.map(i => <option value={i} key={i}>B{i}</option>)
                    }
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="">Blue Band</label>
                  <select
                    className="form-control form-control-sm"
                    value={scene.blueBand}
                    onChange={event => sceneChangeBands(scene.id, { blueBand: parseInt(event.target.value, 10) })}
                  >
                    {
                      bandIds.map(i => <option value={i} key={i}>B{i}</option>)
                    }
                  </select>
                </div>

                {
                  isLandsat &&
                  <div className="form-group">
                    <label htmlFor="">Scenarios</label>
                    <select
                      value={`${scene.redBand},${scene.greenBand},${scene.blueBand}`}
                      defaultValue=""
                      className="form-control form-control-sm"
                      onChange={event => this.onScenarioChange(scene.id, event.target.value)}
                    >
                      <option value="4,3,2">Natural Color (4,3,2)</option>
                      <option value="7,6,4">False Color Urban (7,6,4)</option>
                      <option value="5,4,3">Color Infrared Vegetation (5,4,3)</option>
                      <option value="6,5,2">Agriculture (6,5,2)</option>
                      <option value="7,6,5">Atmospheric Penetration (7,6,5)</option>
                      <option value="5,6,2">Healthy Vegetation (5,6,2)</option>
                      <option value="7,5,2">Forest Burn (7,5,2)</option>
                      <option value="5,6,4">Land/Water (5,6,4)</option>
                      <option value="7,5,3">Natural With Atmo Removal (7,5,3)</option>
                      <option value="7,5,4">Shortwave Infrared (7,5,4)</option>
                      <option value="5,7,1">False color 2 (5,7,1)</option>
                      <option value="6,5,4">Vegetation Analysis (6,5,4)</option>
                      <option value="">Custom</option>
                    </select>
                  </div>
                }

                {/* <button className="btn btn-secondary btn-sm" onClick={() => onSceneHide()}>Hide</button>
                <button className="btn btn-secondary btn-sm" onClick={() => removeScene(scene.id)}>Remove</button> */}
              </form>
            </div>
          }
          <div className="col-sm">
            {scene.pipeline.map(
              (step, index) => (
                <Step
                  sceneId={scene.id}
                  step={step}
                  index={index}
                  key={index}
                  isLast={index === scene.pipeline.length - 1}
                />
              ),
            )}
            <div className="card bg-light">
              <div className="card-header">Add step</div>
              <div className="card-body">
                <div className="form-group">
                  <div className="input-group">
                    <select
                      className="custom-select"
                      onChange={event => this.setState({ newStepType: event.target.value })}
                    >
                      <option disabled="true" selected="selected">---</option>
                      <option value="sigmoidal-contrast">sigmoidal-contrast</option>
                      <option value="gamma">gamma</option>
                    </select>
                    <div className="input-group-append">
                      <button
                        className="btn btn-outline-secondary"
                        type="button"
                        onClick={() => addStep(scene.id, this.state.newStepType)}
                        disabled={this.state.newStepType === ''}
                      >Add</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

const SceneDetails = connect(mapStateToProps, mapDispatchToProps)(ConnectedSceneDetails);
export default SceneDetails;
