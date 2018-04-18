import types from '../types';

const { START_LOADING, STOP_LOADING } = types;

export function startLoading() {
  return { type: START_LOADING };
}

export function stopLoading() {
  return { type: STOP_LOADING };
}
