import { createStore, applyMiddleware, combineReducers } from 'redux';
import thunk from 'redux-thunk';
import sceneReducer from './reducers/scenes';
import mainReducer from './reducers/main';
import { addSceneFromIndex } from './actions/scenes';


function parseQuery(query) {
  return new Map(query.split('&').map(item => item.split('=')));
}

const params = parseQuery(window.location.hash.slice(1));

const store = createStore(
  combineReducers({
    scenes: sceneReducer,
    main: mainReducer,
  }), {
    main: {
      longitude: params.has('long') ? parseFloat(params.get('long')) : 16.37,
      latitude: params.has('lat') ? parseFloat(params.get('lat')) : 48.21,
      zoom: params.has('zoom') ? parseFloat(params.get('zoom')) : 5,
    },
    scenes: [],
  },
  applyMiddleware(thunk),
);

const scene = params.get('scene');
if (scene && scene !== '') {
  store.dispatch(addSceneFromIndex(params.get('scene')));
}

export default store;
