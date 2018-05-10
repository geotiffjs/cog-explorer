import React, { Component } from 'react';
import { connect } from 'react-redux';
import { hot } from 'react-hot-loader'

import AddSceneForm from './components/scenes/add';
import ListScenes from './components/scenes/list';
import SceneDetails from './components/scenes/details';
import MapView from './components/mapview';

import { setError } from './actions/scenes';

const mapStateToProps = ({ scenes, main }) => ({ scenes, ...main });
const mapDispatchToProps = { setError };

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
    const { scenes, isLoading, tilesLoading, longitude, latitude, zoom, errorMessage } = this.props;
    const scene = scenes[0];
    const pipelineStr = scene ? scene.pipeline.map((step) => {
      switch (step.operation) {
        case 'sigmoidal-contrast':
          return `sigmoidal(${step.bands || 'all'},${step.contrast},${step.bias})`;
        case 'gamma':
          return `gamma(${step.bands || 'all'},${step.value})`;
        default:
          return '';
      }
    }).join(';') : '';

    const bands = scene && !scene.isRGB ? [scene.redBand, scene.greenBand, scene.blueBand].join(',') : '';

    window.location.hash = `#long=${longitude.toFixed(3)}&lat=${latitude.toFixed(3)}&zoom=${Math.round(zoom)}&scene=${scene ? scene.id : ''}&bands=${bands}&pipeline=${pipelineStr}`;

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
              {
                errorMessage &&
                <div
                  className="alert alert-warning fade show"
                  role="alert"
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '90px',
                    padding: '5px 4rem 5px 5px',
                  }}
                >{errorMessage}
                  <button type="button" className="close" aria-label="Close" style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    padding: '5px',
                  }} onClick={() => this.props.setError()}>
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
              }
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
            top: '58px',
            right: '8px',
            maxWidth: 'calc(100% - 58px)',
            zIndex: 50,
          }}
        >
          <form className="form-inline my-lg-0">
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
              right: '8px',
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

const App = hot(module)(connect(mapStateToProps, mapDispatchToProps)((ConnectedApp)));

export default App;
