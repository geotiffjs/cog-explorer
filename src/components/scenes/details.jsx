import React, { Component } from 'react';
import { connect } from 'react-redux';

import { removeScene, sceneChangeBands } from '../../actions/scenes';

const mapStateToProps = ({ scenes }, { id, onSceneHide }) => {
  return { scene: scenes.find(scene => scene.id === id), onSceneHide };
};

const mapDispatchToProps = {
  removeScene,
  sceneChangeBands,
};

class ConnectedSceneDetails extends Component {
  constructor() {
    super();
    this.state = {};
  }

  render() {
    const { scene, onSceneHide, removeScene, sceneChangeBands } = this.props;
    return (
      <React.Fragment>
        <h1>{scene.id}</h1>
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
      </React.Fragment>
    );
  }
}

const SceneDetails = connect(mapStateToProps, mapDispatchToProps)(ConnectedSceneDetails);
export default SceneDetails;
