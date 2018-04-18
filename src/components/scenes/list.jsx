import React, { Component } from 'react';
import { connect } from 'react-redux';

const mapStateToProps = ({ scenes }, { onSceneClicked }) => {
  return { scenes, onSceneClicked };
};


// class ConnectedSceneList extends Component {
//   constructor()
//   render() {
//     const { order } = props;
//     return (
//       <ul>
//         {order.map(id => <li key={id}>{id}</li>)}
//       </ul>
//     ); 
//   }
// }

export default connect(mapStateToProps)((props) => {
  const { scenes, onSceneClicked } = props;
  return (
    <ul>
      {scenes.map(scene => <li key={scene.id}><a href="#" onClick={() => onSceneClicked(scene.id)}>{scene.id}</a></li>)}
    </ul>
  ); 
});
