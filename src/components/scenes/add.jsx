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
    addSceneFromIndex: url => dispatch(addSceneFromIndex(url)),
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
    const example1Url = 'https://landsat-pds.s3.amazonaws.com/L8/139/045/LC81390452014295LGN00/index.html';
    const example2Url = 'https://landsat-pds.s3.amazonaws.com/c1/L8/139/045/LC08_L1TP_139045_20170304_20170316_01_T1/index.html';
    return (
      <div className="add-scene-comp">
        <input value={url} onChange={this.handleUrlChange} />
        <button
          value={url}
          onClick={this.handleAddClick}
          disabled={!this.checkUrl(url) || this.isLoading()}  
        >
          Add
        </button>

        <button
          onClick={() => this.props.addSceneFromIndex(example1Url)}
          disabled={!this.checkUrl(example1Url) || this.isLoading()}
        >
          Load example scene 1
        </button>
        <button
          onClick={() => this.props.addSceneFromIndex(example2Url)}
          disabled={!this.checkUrl(example2Url) || this.isLoading()}
        >
          Load example scene 2
        </button>
        <i className={`fas fa-spin fa-cog ${this.isLoading() ? 'show' : 'hide'}`} />
      </div>
    );
  }
}

const AddSceneForm = connect(mapStateToProps, mapDispatchToProps)(ConnectedAddSceneForm);

export default AddSceneForm;
