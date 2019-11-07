import React, { Component } from 'react';
import { connect } from 'react-redux';

import { addSceneFromIndex } from '../../actions/scenes/index';
import { addSceneFromBucket } from '../../actions/scenes/index';
import '../../styles.css';

const urlPattern = new RegExp('^(https?:\\/\\/)?' + // protocol
  '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|' + // domain name
  '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
  '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
  '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
  '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator

const mapStateToProps = ({ scenes, stacitems, main }) => ({ scenes, stacitems: main.stacitems, isLoading: main.isLoading });

const mapDispatchToProps = (dispatch) => {
  return {
    addSceneFromIndex: (...args) => dispatch(addSceneFromIndex(...args)),
    addSceneFromBucket: (...args) => dispatch(addSceneFromBucket(...args)),
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

    const items = this.props.stacitems.map((item, key) =>
      <button
        key={key}
        className="btn btn-secondary dropdown-item"
        onClick={() => this.props.addSceneFromBucket(item)}
        disabled={this.isLoading()}
      >
        {item}
      </button>
    );

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
              {items}
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  }
}

const AddSceneForm = connect(mapStateToProps, mapDispatchToProps)(ConnectedAddSceneForm);

export default AddSceneForm;
