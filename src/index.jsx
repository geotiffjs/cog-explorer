import React, { Component } from 'react';
import { render } from 'react-dom';
import { Provider, connect } from 'react-redux';

import store from './store';
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
        <AddSceneForm />
        <ListScenes onSceneClicked={this.handleSceneShowClicked} />
        { currentSceneId && scenes.find(scene => scene.id === currentSceneId) &&
          <SceneDetails id={currentSceneId} onSceneHide={this.handleSceneShowClicked} />
        }
      </div>
    );
  }
}

const App = connect(mapStateToProps)(ConnectedApp);

render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('app'),
);
