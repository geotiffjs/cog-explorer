import React, { Component } from 'react';
import { connect } from 'react-redux';

const mapDispatchToProps = dispatch => {
  return {
    addArticle: article => dispatch(addArticle(article))
  };
};

class ConnectedSigmoidalContrastEditComponent extends Component {
  constructor() {
    super();
    this.x = '';

    this.handleChangeContrast = this.handleChangeContrast.bind(this);
    this.handleChangeBias = this.handleChangeBias.bind(this);
  }

  handleChangeContrast(event) {
    console.log(event.target.value);
  }

  handleChangeBias(event) {
    console.log(event.target.value);
  }

  render() {
    return (
      <div className="edit-comp">
        Contrast: <input type="range" onChange={this.handleChangeContrast} /><div></div>
        <br />
        Bias: <input type="range" onChange={this.handleChangeBias} /><div></div>
      </div>
    );
  }
}

const SigmoidalContrastEditComponent = connect(null, mapDispatchToProps)(ConnectedSigmoidalContrastEditComponent);

export default SigmoidalContrastEditComponent;
