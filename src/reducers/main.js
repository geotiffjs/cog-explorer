import types from '../types';

const { START_LOADING, STOP_LOADING } = types;

const initialState = { isLoading: false };

export default function (state = initialState, action) {
  switch (action.type) {
    case START_LOADING:
      return { ...state, isLoading: true };
    case STOP_LOADING:
      return { ...state, isLoading: false };
    default:
      return state;
  }
}
