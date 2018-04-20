import urlJoin from 'url-join';

import types from '../../types';
import { startLoading, stopLoading } from '../main';

const {
  SCENE_ADD, SCENE_REMOVE, SCENE_CHANGE_BANDS,
  SCENE_PIPELINE_ADD_STEP, SCENE_PIPELINE_REMOVE_STEP, SCENE_PIPELINE_INDEX_STEP,
  SCENE_PIPELINE_EDIT_STEP,
} = types;

export function addScene(url, bands, redBand, greenBand, blueBand, pipeline = []) {
  return {
    type: SCENE_ADD,
    sceneId: url,
    bands,
    redBand,
    greenBand,
    blueBand,
    pipeline,
  };
}

export function sceneChangeBands(url, newBands) {
  return {
    type: SCENE_CHANGE_BANDS,
    sceneId: url,
    newBands,
  };
}

export function removeScene(url) {
  return {
    type: SCENE_REMOVE,
    sceneId: url,
  };
}

export function addSceneFromIndex(url, pipeline = []) {
  return async (dispatch) => {
    dispatch(startLoading());
    try {
      const relUrl = url.endsWith('/') ? url : url.substring(0, url.lastIndexOf('/'));
      const response = await fetch(url);
      const doc = (new DOMParser()).parseFromString(await response.text(), 'text/html');
      const files = Array.from(doc.querySelectorAll('a[href]'))
        .map(a => a.getAttribute('href'))
        .map(file => urlJoin(relUrl, file));

      const red = files.filter(file => /LC0?8.*B4.TIF$/.test(file))[0];
      const green = files.filter(file => /LC0?8.*B3.TIF$/.test(file))[0];
      const blue = files.filter(file => /LC0?8.*B2.TIF$/.test(file))[0];
      const bands = files.filter(file => /LC0?8.*B[0-9]+.TIF$/.test(file));

      // TODO unset loading
      dispatch(addScene(url, bands, red, green, blue, pipeline));
    } catch (e) {
      console.error(e);
    } finally {
      dispatch(stopLoading());
    }
  };
}

export function addStep(url, operation) {
  return {
    type: SCENE_PIPELINE_ADD_STEP,
    sceneId: url,
    payload: {
      operation,
    },
  };
}

export function editStep(url, index, payload) {
  return {
    type: SCENE_PIPELINE_EDIT_STEP,
    sceneId: url,
    index,
    payload,
  };
}
