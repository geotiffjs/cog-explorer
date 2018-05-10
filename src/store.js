import { createStore, applyMiddleware, combineReducers } from 'redux';
import thunk from 'redux-thunk';
import sceneReducer from './reducers/scenes';
import mainReducer from './reducers/main';
import { addSceneFromIndex, sceneChangeBands } from './actions/scenes';


function parseQuery(query) {
  return new Map(query.split('&').map(item => item.split('=')));
}

const params = parseQuery(window.location.hash.slice(1));

const pipeline = params.has('pipeline') ? params.get('pipeline').split(';').map((item) => {
  const sigmoidalRe = /sigmoidal\(([a-z]+),([0-9.]+),([0-9.]+)\)$/i;
  const gammaRe = /gamma\(([a-z]+),([0-9.]+)\)$/i;
  if (sigmoidalRe.test(item)) {
    const match = item.match(sigmoidalRe);
    return {
      operation: 'sigmoidal-contrast',
      bands: match[1],
      contrast: parseFloat(match[2]),
      bias: parseFloat(match[3]),
    };
  } else if (gammaRe.test(item)) {
    const match = item.match(gammaRe);
    return {
      operation: 'gamma',
      bands: match[1],
      value: parseFloat(match[2]),
    };
  }
  return null;
}).filter(item => item) : undefined;

const bands = params.has('bands') ? params.get('bands')
  .split(',')
  .map(b => parseInt(b, 10))
  .filter(b => !Number.isNaN(b))
  : [];

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
  const request = store.dispatch(addSceneFromIndex(scene, undefined, pipeline));
  if (bands.length === 3) {
    request.then(() => store.dispatch(sceneChangeBands(scene, {
      redBand: bands[0],
      greenBand: bands[1],
      blueBand: bands[2],
    })));
  }
}

export default store;
