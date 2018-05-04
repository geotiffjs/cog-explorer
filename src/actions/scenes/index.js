import urlJoin from 'url-join';
import { fromUrl } from 'geotiff';

import types from '../../types';
import { startLoading, stopLoading } from '../main';

const {
  SCENE_ADD, SCENE_REMOVE, SCENE_CHANGE_BANDS,
  SCENE_PIPELINE_ADD_STEP, SCENE_PIPELINE_REMOVE_STEP, SCENE_PIPELINE_INDEX_STEP,
  SCENE_PIPELINE_EDIT_STEP,
} = types;

export function addScene(url, bands, redBand, greenBand, blueBand, isSingle, hasOvr, isRGB, pipeline = []) {
  return {
    type: SCENE_ADD,
    sceneId: url,
    bands,
    redBand,
    greenBand,
    blueBand,
    isSingle,
    hasOvr,
    isRGB,
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

const examplePipeline = [
  {
    operation: 'sigmoidal-contrast',
    contrast: 50,
    bias: 0.16,
  }, {
    operation: 'gamma',
    bands: 'red',
    value: 1.03,
  }, {
    operation: 'gamma',
    bands: 'blue',
    value: 0.925,
  },
];

export function addSceneFromIndex(url, pipeline = examplePipeline) {
  return async (dispatch, getState) => {
    const { scenes } = getState();

    // remove old scenes
    for (const scene of scenes) {
      dispatch(removeScene(scene.id));
    }

    dispatch(startLoading());
    try {
      // find out type of data the URL is pointing to
      const headerResponse = await fetch(url, { method: 'HEAD' });

      if (!headerResponse.ok) {
        throw new Error(`Failed to fetch ${url}`);
      }

      const contentType = headerResponse.headers.get('content-type');

      if (contentType === 'text/html') {
        const relUrl = url.endsWith('/') ? url : url.substring(0, url.lastIndexOf('/'));
        const response = await fetch(url, {});
        const content = await response.text();
        const doc = (new DOMParser()).parseFromString(content, 'text/html');
        const files = Array.from(doc.querySelectorAll('a[href]'))
          .map(a => a.getAttribute('href'))
          .map(file => urlJoin(relUrl, file));

        const red = 4;
        const green = 3;
        const blue = 2;
        const bands = new Map(
          files
            .filter(file => /LC0?8.*B[0-9]+.TIF$/.test(file))
            .map(file => [parseInt(/.*B([0-9]+).TIF/.exec(file)[1], 10), file]),
        );

        dispatch(addScene(url, bands, red, green, blue, false, true, false, pipeline));
      } else if (contentType === 'image/tiff') {
        const tiff = await fromUrl(url);
        const image = await tiff.getImage();

        const samples = image.getSamplesPerPixel();
        const bands = new Map();
        for (let i = 0; i < samples; ++i) {
          bands.set(i, url);
        }

        let [red, green, blue] = [];
        if (samples !== 3) {
          red = 0;
          green = 0;
          blue = 0;
        } else {
          red = 0;
          green = 1;
          blue = 2;
        }

        const isRGB = (typeof image.fileDirectory.PhotometricInterpretation !== 'undefined');

        dispatch(addScene(url, bands, red, green, blue, true, false, isRGB, pipeline));
      }
    } catch (e) {
      // TODO: set error somewhere to present to user
      console.error(e);
    } finally {
      dispatch(stopLoading());
    }
  };
}

export function addStep(url, operation) {
  let values;
  switch (operation) {
    case 'sigmoidal-contrast':
      values = {
        contrast: 50,
        bias: 0.15,
      };
      break;
    case 'gamma':
      values = { value: 1.0 };
      break;
    default:
      values = {};
      break;
  }
  return {
    type: SCENE_PIPELINE_ADD_STEP,
    sceneId: url,
    payload: {
      operation,
      ...values,
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

export function indexStep(url, index, newIndex) {
  return {
    type: SCENE_PIPELINE_INDEX_STEP,
    sceneId: url,
    index,
    newIndex,
  };
}

export function removeStep(url, index) {
  return {
    type: SCENE_PIPELINE_REMOVE_STEP,
    sceneId: url,
    index,
  };
}
