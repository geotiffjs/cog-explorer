import types from '../types';

const { START_LOADING, STOP_LOADING, TILE_START_LOADING, TILE_STOP_LOADING } = types;

const initialState = { isLoading: false, tilesLoading: 0 };

export default function (state = initialState, action) {
  switch (action.type) {
    case START_LOADING:
      return { ...state, isLoading: true };
    case STOP_LOADING:
      return { ...state, isLoading: false };
    case TILE_START_LOADING:
      return { ...state, tilesLoading: state.tilesLoading + 1 };
    case TILE_STOP_LOADING:
      return { ...state, tilesLoading: state.tilesLoading - 1 };
    default:
      return state;
  }
}
