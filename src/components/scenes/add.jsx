import React, { Component } from 'react';
import { connect } from 'react-redux';

import { addSceneFromIndex } from '../../actions/scenes/index';
import '../../styles.css';

const urlPattern = new RegExp('^(https?:\\/\\/)?' + // protocol
  '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|' + // domain name
  '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
  '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
  '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
  '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator

const mapStateToProps = ({ scenes, main }) => ({ scenes, isLoading: main.isLoading });

const mapDispatchToProps = (dispatch) => {
  return {
    addSceneFromIndex: (...args) => dispatch(addSceneFromIndex(...args)),
  };
};

const examplePipeline = [
  {
    operation: 'sigmoidal-contrast',
    contrast: 50,
    bias: 0.16,
  }, {
    operation: 'gamma',
    bands: 'red',
    value: 1.03,
  }, {
    operation: 'gamma',
    bands: 'blue',
    value: 0.925,
  },
];

class ConnectedAddSceneForm extends Component {
  constructor() {
    super();

    this.state = {
      url: '',
    };

    this.handleUrlChange = this.handleUrlChange.bind(this);
    this.handleAddClick = this.handleAddClick.bind(this);
  }

  handleUrlChange(event) {
    this.setState({ url: event.target.value });
  }

  handleAddClick() {
    this.props.addSceneFromIndex(this.state.url, examplePipeline);
  }

  checkUrl(url) {
    return urlPattern.test(url) && !this.props.scenes.find(scene => scene.id === url);
  }

  isLoading() {
    return this.props.isLoading;
  }

  render() {
    const { url } = this.state;

    // const example1Url = 'https://landsat-pds.s3.amazonaws.com/L8/139/045/LC81390452014295LGN00/index.html';
    const example1Url = 'https://landsat-pds.s3.amazonaws.com/c1/L8/189/027/LC08_L1TP_189027_20180406_20180417_01_T1/index.html';
    const example2Url = 'https://landsat-pds.s3.amazonaws.com/c1/L8/139/045/LC08_L1TP_139045_20170304_20170316_01_T1/index.html';
    return (
      <React.Fragment>
        {/*  */}
        <input
          className="form-control form-control-sm"
          placeholder="Index URL"
          value={url}
          onChange={this.handleUrlChange}
        />
        {/* <i
          className="fas fa-spin fa-cog"
          style={{
            position: 'absolute',
            'margin-left': '5px',
            height: '25px',
            display: this.isLoading() ? 'none' : 'flex',
            'align-items': 'center',
          }}
        /> */}
        <div className="input-group-append">
          <button
            className="btn btn-primary btn-sm"
            value={url}
            onClick={this.handleAddClick}
            disabled={!this.checkUrl(url) || this.isLoading()}
          >
            Load URL
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => this.props.addSceneFromIndex(example1Url, examplePipeline)}
            disabled={!this.checkUrl(example1Url) || this.isLoading()}
          >
            Load example scene 1
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => this.props.addSceneFromIndex(example2Url, examplePipeline)}
            disabled={!this.checkUrl(example2Url) || this.isLoading()}
          >
            Load example scene 2
          </button>
        </div>
      </React.Fragment>
    );
  }
}

const AddSceneForm = connect(mapStateToProps, mapDispatchToProps)(ConnectedAddSceneForm);

export default AddSceneForm;
