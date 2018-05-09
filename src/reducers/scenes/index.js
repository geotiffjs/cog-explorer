import types from '../../types';

const {
  SCENE_ADD, SCENE_REMOVE, SCENE_CHANGE_BANDS,
  SCENE_PIPELINE_ADD_STEP, SCENE_PIPELINE_REMOVE_STEP, SCENE_PIPELINE_INDEX_STEP,
  SCENE_PIPELINE_EDIT_STEP,
} = types;

const initialState = [];

function scenePipeline(state, action) {
  switch (action.type) {
    case SCENE_PIPELINE_ADD_STEP:
      return typeof action.index !== 'undefined' ? [
        ...state.slice(0, action.index),
        action.payload,
        ...state.slice(action.index),
      ] : [...state, action.payload];
    case SCENE_PIPELINE_REMOVE_STEP:
      console.log(state.filter((current, index) => index !== action.index));
      return state.filter((current, index) => index !== action.index);
    case SCENE_PIPELINE_INDEX_STEP: {
      const item = state[action.index];
      return scenePipeline(
        scenePipeline(state, { type: SCENE_PIPELINE_REMOVE_STEP, index: action.index }),
        { type: SCENE_PIPELINE_ADD_STEP, index: action.newIndex, payload: item },
      );
    }
    case SCENE_PIPELINE_EDIT_STEP: {
      const item = {
        ...state[action.index],
        ...action.payload,
      };
      return scenePipeline(
        scenePipeline(state, { type: SCENE_PIPELINE_REMOVE_STEP, index: action.index }),
        { type: SCENE_PIPELINE_ADD_STEP, index: action.index, payload: item },
      );
    }
    default:
      return state;
  }
}


export default function (state = initialState, action) {
  switch (action.type) {
    case SCENE_ADD:
      return [
        ...state.filter(scene => scene.id !== action.sceneId), {
          id: action.sceneId,
          bands: action.bands,
          redBand: action.redBand,
          greenBand: action.greenBand,
          blueBand: action.blueBand,
          isSingle: action.isSingle,
          hasOvr: action.hasOvr,
          isRGB: action.isRGB,
          attribution: action.attribution,
          pipeline: action.pipeline,
        },
      ];

      // return [{
      //   id: action.sceneId,
      //   bands: action.bands,
      //   redBand: action.redBand,
      //   greenBand: action.greenBand,
      //   blueBand: action.blueBand,
      //   pipeline: action.pipeline,
      // }];
    case SCENE_REMOVE:
      return state.filter(scene => scene.id !== action.sceneId);
    case SCENE_CHANGE_BANDS:
      return state.map(
        scene => (
          (scene.id === action.sceneId) ? {
            ...scene,
            ...action.newBands,
          } : scene
        ),
      );
    case SCENE_PIPELINE_ADD_STEP:
    case SCENE_PIPELINE_REMOVE_STEP:
    case SCENE_PIPELINE_INDEX_STEP:
    case SCENE_PIPELINE_EDIT_STEP:
      return state.map(
        scene => (
          (scene.id === action.sceneId) ? {
            ...scene,
            pipeline: scenePipeline(scene.pipeline, action),
          } : scene
        ),
      );
    default:
      return state;
  }
}
