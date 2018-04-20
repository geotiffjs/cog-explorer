import React, { Component } from 'react';
import { connect } from 'react-redux';
import { hot } from 'react-hot-loader'

import AddSceneForm from './components/scenes/add';
import ListScenes from './components/scenes/list';
import SceneDetails from './components/scenes/details';
import MapView from './components/mapview';

const mapStateToProps = ({ scenes }) => ({ scenes });

class ConnectedApp extends Component {
  constructor() {
    super();
    this.state = {
      currentSceneId: null,
    };

    this.handleSceneShowClicked = this.handleSceneShowClicked.bind(this);
  }

  handleSceneShowClicked(id = null) {
    this.setState({ currentSceneId: id });
  }

  render() {
    const { currentSceneId } = this.state;
    const { scenes } = this.props;
    return (
      <div>
        <div style={{ height: '50%' }}>
          <MapView />
        </div>
        <div className="container">
          <AddSceneForm />
          <ListScenes onSceneClicked={this.handleSceneShowClicked} />
          { currentSceneId && scenes.find(scene => scene.id === currentSceneId) &&
            <SceneDetails id={currentSceneId} onSceneHide={this.handleSceneShowClicked} />
          }
        </div>
      </div>
    );
  }
}

const App = hot(module)(connect(mapStateToProps)((ConnectedApp)));

export default App;
