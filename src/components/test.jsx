import React, { Component } from 'react';

export default class Test extends Component {
  constructor() {
    super();
    this.state = {
      title: '',
    };
  }
  render() {
    return <div>Test {this.state.title}</div>;
  }
}
