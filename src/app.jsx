import React, { Component } from 'react';
import { connect } from 'react-redux';
import { hot } from 'react-hot-loader'

import AddSceneForm from './components/scenes/add';
import ListScenes from './components/scenes/list';
import SceneDetails from './components/scenes/details';
import MapView from './components/mapview';

import { setError } from './actions/scenes';

import { Authenticator, Greetings, withAuthenticator } from 'aws-amplify-react';
import Amplify, { Auth, Storage } from 'aws-amplify';


Amplify.configure({
  Auth: {
    // REQUIRED only for Federated Authentication - Amazon Cognito Identity Pool ID
    identityPoolId: 'eu-central-1:c3676457-0c2f-454a-877a-e7b0a85afb21',
    // REQUIRED - Amazon Cognito Region
    region: 'eu-central-1',
    // OPTIONAL - Amazon Cognito User Pool ID
    userPoolId: 'eu-central-1_PVzQoPPhy',
    // OPTIONAL - Amazon Cognito Web Client ID (26-char alphanumeric string)
    userPoolWebClientId: '6edih15optkvute0crfkl9lc2a',
  },
  Storage: {
    bucket: 'eoxhub-dev',
    region: 'eu-central-1',
  },
});


const mapStateToProps = ({ scenes, stacitems, main }) => ({ scenes, stacitems, ...main });
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
    const { order, scenes, isLoading, tilesLoading, longitude, latitude, zoom, errorMessage } = this.props;
    const scene = scenes[0];
    const pipelineStr = scene ? scene.pipeline.map((step) => {
      switch (step.operation) {
        case 'sigmoidal-contrast':
          return `sigmoidal(${step.bands || 'all'},${step.contrast},${step.bias})`;
        case 'gamma':
          return `gamma(${step.bands || 'all'},${step.value})`;
        case 'linear':
          return `linear(${step.bands || 'all'},${step.min},${step.max})`;
        default:
          return '';
      }
    }).join(';') : '';

    const bands = scene && !scene.isRGB ? [scene.redBand, scene.greenBand, scene.blueBand].join(',') : '';

    window.location.hash = `#order=${order}&long=${longitude.toFixed(3)}&lat=${latitude.toFixed(3)}&zoom=${Math.round(zoom)}&scene=${scene ? scene.id : ''}&bands=${bands}&pipeline=${pipelineStr}`;

    return (
      <div>
        <nav className="navbar navbar-expand-lg navbar-light bg-light" >
          <div className="container-fluid">
            <div className="navbar-header">
              <a className="navbar-brand" href="https://www.eurodatacube.com/" target="_blank" rel="noopener noreferrer">
                <img alt="" src="images/EOX_Logo_white.svg"/>
              </a>

              <span className="navbar-brand" style={{ color: '#fff' }}>
                Data Explorer
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
                top: '42px',
                right: '8px',
                maxWidth: 'calc(100% - 108px)',
                maxHeight: 'calc(100% - 50px)',
                overflowY: 'auto',
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

/*
class AppWithAuth extends Component {
  render(){
    return (
      <div>
      <Authenticator
      hide={
        [
            Greetings
        ]
    }>
        <App />
      </Authenticator>
      </div>
    );
  }
}
export default AppWithAuth;
*/


export default withAuthenticator(App);
