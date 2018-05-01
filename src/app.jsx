import React, { Component } from 'react';
import { connect } from 'react-redux';
import { hot } from 'react-hot-loader'

import AddSceneForm from './components/scenes/add';
import ListScenes from './components/scenes/list';
import SceneDetails from './components/scenes/details';
import MapView from './components/mapview';

const mapStateToProps = ({ scenes, main }) => ({ scenes, ...main });

class ConnectedApp extends Component {
  constructor() {
    super();
    this.state = {
      currentSceneId: null,
      showList: false,
    };

    this.handleSceneShowClicked = this.handleSceneShowClicked.bind(this);
  }

  handleSceneShowClicked(id = null) {
    this.setState({ currentSceneId: id });
  }

  render() {
    const { currentSceneId, showList } = this.state;
    const { scenes, isLoading, tilesLoading, longitude, latitude, zoom } = this.props;

    window.location.hash = `#long=${longitude.toFixed(3)}&lat=${latitude.toFixed(3)}&zoom=${Math.round(zoom)}&scene=${scenes.length ? scenes[0].id : ''}`;

    return (
      <div>
        <nav className="navbar navbar-expand-lg navbar-light bg-light">
          <div className="container-fluid">
            <div className="navbar-header">
              <a className="navbar-brand" href="https://eox.at/" target="_blank" rel="noopener noreferrer">
                <img alt="" src="images/EOX_Logo_white.svg" />
              </a>

              <span className="navbar-brand" style={{ color: 'white' }}>
                COG-Explorer
              </span>
              <i
                className="navbar-brand fas fa-spin fa-cog text-light"
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '50px',
                  visibility: (isLoading || tilesLoading > 0) ? 'visible' : 'hidden',
                  zIndex: 99,
                }}
              />
            </div>
          </div>
        </nav>

        <div
          style={{
            position: 'absolute',
            top: '60px',
            right: '10px',
            maxWidth: 'calc(100% - 58px)',
            zIndex: 50,
          }}
        >
          <form className="form-inline my-2 my-lg-0">
            <AddSceneForm />
            {/* <input class="form-control mr-sm-2" type="search" placeholder="Search" aria-label="Search" />
            <button class="btn btn-outline-success my-2 my-sm-0" type="submit">Search</button> */}
          </form>
        </div>

        <div style={{ height: 'calc(100% - 50px)' }}>
          <MapView />
        </div>
        <div className="container">
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
            <i className="fas fa-wrench" />
          </button>
          {
            showList && scenes.length > 0 &&
            <div
              className="card card-body"
              style={{
                position: 'absolute',
                top: '10px',
                right: '60px',
                maxWidth: 'calc(100% - 108px)',
                maxHeight: 'calc(100% - 20px)',
                overflowY: 'scroll',
                zIndex: 100,
              }}
            >
              {/* { <ListScenes onSceneClicked={this.handleSceneShowClicked} /> } */}
              { scenes.length > 0 &&
                <SceneDetails id={scenes[0].id} onSceneHide={this.handleSceneShowClicked} />
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
