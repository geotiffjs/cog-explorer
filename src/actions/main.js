import types from '../types';

const { START_LOADING, STOP_LOADING, TILE_START_LOADING, TILE_STOP_LOADING } = types;

export function startLoading() {
  return { type: START_LOADING };
}

export function stopLoading() {
  return { type: STOP_LOADING };
}

export function tileStartLoading() {
  return { type: TILE_START_LOADING };
}

export function tileStopLoading() {
  return { type: TILE_STOP_LOADING };
}
