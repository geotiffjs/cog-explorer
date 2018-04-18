import { createStore, applyMiddleware, combineReducers } from 'redux';
import thunk from 'redux-thunk';
import sceneReducer from './reducers/scenes';
import mainReducer from './reducers/main';

const store = createStore(combineReducers({
  scenes: sceneReducer,
  main: mainReducer,
}), applyMiddleware(thunk));

export default store;
