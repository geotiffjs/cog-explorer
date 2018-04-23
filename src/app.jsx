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
      showList: true,
    };

    this.handleSceneShowClicked = this.handleSceneShowClicked.bind(this);
  }

  handleSceneShowClicked(id = null) {
    this.setState({ currentSceneId: id });
  }

  render() {
    const { currentSceneId, showList } = this.state;
    const { scenes } = this.props;

    return (
      <div>
        <div style={{ height: '100%' }}>
          <MapView />
        </div>
        <div className="container">
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '50px',
            }}
          >
            <AddSceneForm />
          </div>
          <button
            className="btn btn-large"
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
            }}
            onClick={() => this.setState({ showList: !showList })}
            disabled={scenes.length === 0}
          >
            <i className="fas fa-bars" />
          </button>
          {
            showList && scenes.length > 0 && <div
              className="card card-body"
              style={{
                position: 'absolute',
                top: '10px',
                right: '60px',
                width: '50%',
                maxHeight: 'calc(100% - 20px)',
                overflowY: 'scroll',
              }}
            >
              { <ListScenes onSceneClicked={this.handleSceneShowClicked} /> }
              { currentSceneId && scenes.find(scene => scene.id === currentSceneId) &&
                <SceneDetails id={currentSceneId} onSceneHide={this.handleSceneShowClicked} />
              }
            </div>
          }
        </div>
      </div>
    );
  }
}

const App = hot(module)(connect(mapStateToProps)((ConnectedApp)));

export default App;
