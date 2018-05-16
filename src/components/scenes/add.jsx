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
    this.props.addSceneFromIndex(this.state.url);
  }

  checkUrl(url) {
    return urlPattern.test(url) && !this.props.scenes.find(scene => scene.id === url);
  }

  isLoading() {
    return this.props.isLoading;
  }

  render() {
    const { url } = this.state;
    const example1Url = 'https://landsat-pds.s3.amazonaws.com/c1/L8/189/027/LC08_L1TP_189027_20170403_20170414_01_T1/index.html';
    const example2Url = 'https://landsat-pds.s3.amazonaws.com/c1/L8/139/045/LC08_L1TP_139045_20170304_20170316_01_T1/index.html';
    const example3Url = 'https://s3-us-west-2.amazonaws.com/planet-disaster-data/hurricane-harvey/SkySat_Freeport_s03_20170831T162740Z3.tif';
    const example3Attribution = 'cc-by-sa, downloaded from https://www.planet.com/disaster/hurricane-harvey-2017-08-28/';
    const example4Url = 'https://oin-hotosm.s3.amazonaws.com/56f9b5a963ebf4bc00074e70/0/56f9c2d42b67227a79b4faec.tif';
    const example5Url = 'https://oin-hotosm.s3.amazonaws.com/59c66c5223c8440011d7b1e4/0/7ad397c0-bba2-4f98-a08a-931ec3a6e943.tif';
    return (
      <React.Fragment>
        <div className="form-group input-group">
          <input
            className="form-control span6"
            placeholder="Custom URL"
            value={url}
            onChange={this.handleUrlChange}
          />
          <div className="input-group-append">
            <button
              className="btn btn-primary"
              value={url}
              onClick={this.handleAddClick}
              disabled={!this.checkUrl(url) || this.isLoading()}
            >
              Load URL or sample
            </button>
            <button
              className="btn btn-primary dropdown-toggle dropdown-toggle-split"
              data-toggle="dropdown"
              aria-haspopup="true"
              aria-expanded="false"
            >
              <span className="sr-only">Toggle Dropdown</span>
            </button>
            <div className="dropdown-menu">
              <button
                className="btn btn-secondary dropdown-item"
                onClick={() => this.props.addSceneFromIndex(example1Url)}
                disabled={!this.checkUrl(example1Url) || this.isLoading()}
              >
                Landsat 8 sample 1
              </button>
              <button
                className="btn btn-secondary dropdown-item"
                onClick={() => this.props.addSceneFromIndex(example2Url)}
                disabled={!this.checkUrl(example2Url) || this.isLoading()}
              >
                Landsat 8 sample 2
              </button>
              <button
                className="btn btn-secondary dropdown-item"
                onClick={() => this.props.addSceneFromIndex(example3Url, example3Attribution)}
                disabled={!this.checkUrl(example3Url) || this.isLoading()}
              >
                SkySat sample
              </button>
              <button
                className="btn btn-secondary dropdown-item"
                onClick={() => this.props.addSceneFromIndex(example4Url)}
                disabled={!this.checkUrl(example4Url) || this.isLoading()}
              >
                OpenAerialMap sample 1
              </button>
              <button
                className="btn btn-secondary dropdown-item"
                onClick={() => this.props.addSceneFromIndex(example5Url)}
                disabled={!this.checkUrl(example5Url) || this.isLoading()}
              >
                OpenAerialMap sample 2
              </button>
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  }
}

const AddSceneForm = connect(mapStateToProps, mapDispatchToProps)(ConnectedAddSceneForm);

export default AddSceneForm;
