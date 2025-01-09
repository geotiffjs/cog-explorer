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
    const example1Url = 'https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/36/Q/WD/2020/7/S2A_36QWD_20200701_0_L2A/TCI.tif';
    const example2Url = 'https://oin-hotosm.s3.amazonaws.com/56f9b5a963ebf4bc00074e70/0/56f9c2d42b67227a79b4faec.tif';
    const example3Url = 'https://oin-hotosm.s3.amazonaws.com/59c66c5223c8440011d7b1e4/0/7ad397c0-bba2-4f98-a08a-931ec3a6e943.tif';
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
                Sentinel-2 RGB sample
              </button>
              <button
                className="btn btn-secondary dropdown-item"
                onClick={() => this.props.addSceneFromIndex(example2Url)}
                disabled={!this.checkUrl(example2Url) || this.isLoading()}
              >
                OpenAerialMap sample 1
              </button>
              <button
                className="btn btn-secondary dropdown-item"
                onClick={() => this.props.addSceneFromIndex(example3Url)}
                disabled={!this.checkUrl(example3Url) || this.isLoading()}
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
