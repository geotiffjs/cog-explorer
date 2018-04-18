import React, { Component, createRef } from 'react';
import { connect } from 'react-redux';

import proj4 from 'proj4';

import 'ol/ol.css';
import Map from 'ol/map';
import View from 'ol/view';
import TileLayer from 'ol/layer/tile';
import TileWMS from 'ol/source/tilewms';
import TileGrid from 'ol/tilegrid/tilegrid';
import proj from 'ol/proj';
import extent from 'ol/extent';

import { fromUrls } from 'geotiff';

import CanvasTileImageSource from '../maputil';
import { toMathArray, toOriginalArray, sigmoidalContrast, gamma } from '../renderutils';


proj.setProj4(proj4);

async function all(promises) {
  return await Promise.all(promises);
}

const mapStateToProps = ({ scenes }) => {
  return { scenes };
};

class MapView extends Component {
  constructor() {
    super();
    this.mapRef = createRef();
    this.map = new Map({
      layers: [
        new TileLayer({
          extent: [-180, -90, 180, 90],
          source: new TileWMS({
            url: 'https://tiles.maps.eox.at/wms',
            params: { LAYERS: 's2cloudless' },
            projection: 'EPSG:4326',
          }),
        }),
      ],
      view: new View({
        projection: 'EPSG:4326',
        center: [0, 0],
        zoom: 5,
      }),
    });
    this.sceneLayers = {};
    this.sceneSources = {};
  }

  componentDidMount() {
    this.map.setTarget(this.mapRef.current);
  }

  componentDidUpdate(prevProps, prevState) {
    const { scenes: prevScenes } = prevProps;
    const { scenes } = this.props;

    console.log(prevScenes, scenes);

    if (prevScenes.length > scenes.length) {
      // TODO find scene and remove layer
      const removedScene = prevScenes.find(scene => scenes.indexOf(scene) === -1);
      this.map.removeLayer(this.sceneLayers[removedScene.id]);
    } else if (prevScenes.length < scenes.length) {
      this.addSceneLayer(scenes[scenes.length - 1]);
    } else {
      const changedScene = scenes.find((scene, index) => scene !== prevScenes[index]);
      console.log('changed', changedScene);

      const layer = this.sceneLayers[changedScene.id];
      const source = layer.getSource();
      // refresh the source cache
      source.setTileUrlFunction(
        source.getTileUrlFunction(),
        (new Date()).getTime(),
      );
    }
  }

  componentWillUnmount() {
    this.map.setTarget(null);
  }

  async getImage(sceneId, url) {
    if (!this.sceneSources[sceneId]) {
      this.sceneSources[sceneId] = {};
    }
    if (!this.sceneSources[sceneId][url]) {
      this.sceneSources[sceneId][url] = fromUrls(url, [`${url}.ovr`]);
    }
    return this.sceneSources[sceneId][url];
  }

  async addSceneLayer(scene) {
    this.sceneSources[scene.id] = {
      [scene.redBand]: this.getImage(scene.id, scene.redBand),
      [scene.greenBand]: this.getImage(scene.id, scene.greenBand),
      [scene.blueBand]: this.getImage(scene.id, scene.blueBand),
    };
    const tiff = await this.getImage(scene.id, scene.redBand);

    // calculate tilegrid from the 'red' image
    const images = [];
    const count = await tiff.getImageCount();
    for (let i = 0; i < count; ++i) {
      images.push(await tiff.getImage(i));
    }

    const first = images[0];
    const resolutions = images.map((image => image.getResolution(first)[0]));
    const tileSizes = images.map((image => [image.getTileWidth(), image.getTileHeight()]));

    const tileGrid = new TileGrid({
      extent: first.getBoundingBox(),
      origin: [first.getOrigin()[0], first.getBoundingBox()[1]],
      resolutions: resolutions.reverse(),
      tileSizes: tileSizes.reverse(),
    });

    // proj setup?

    const epsg = `EPSG:${first.geoKeys.ProjectedCSTypeGeoKey}`;

    if (!proj4.defs(epsg)) {
      const response = await fetch(`//epsg.io/${first.geoKeys.ProjectedCSTypeGeoKey}.proj4`);
      proj4.defs(epsg, await response.text());
    }

    const layer = new TileLayer({
      source: new CanvasTileImageSource({
        projection: epsg,
        tileGrid,
        tileRenderFunction: (...args) => this.renderTile(scene.id, ...args),
      }),
    });

    this.map.addLayer(layer);
    this.sceneLayers[scene.id] = layer;

    this.map.getView().animate({
      center: proj.transform(
        extent.getCenter(first.getBoundingBox()), epsg, this.map.getView().getProjection()
      ),
    });
  }

  async renderTile(sceneId, canvas, z, x, y) {
    const scene = this.props.scenes.find(s => s.id === sceneId);

    if (!scene) {
      return;
    }

    const [redImage, greenImage, blueImage] = await all([
      this.getImage(sceneId, scene.redBand),
      this.getImage(sceneId, scene.greenBand),
      this.getImage(sceneId, scene.blueBand),
    ]);

    const [redArr, greenArr, blueArr] = await all([redImage, greenImage, blueImage].map(
      async (tiff, index) => {
        const image = await tiff.getImage(await tiff.getImageCount() - z - 1);

        // const numXTiles = Math.ceil(image.getWidth() / image.getTileWidth());
        // const numYTiles = Math.ceil(image.getHeight() / image.getTileHeight());

        const wnd = [
          x * image.getTileWidth(),
          image.getHeight() - ((y + 1) * image.getTileHeight()),
          (x + 1) * image.getTileWidth(),
          image.getHeight() - (y * image.getTileHeight()),
        ];

        const response = await image.readRasters({
          window: wnd,
          fillValue: index === 3 ? 1 : 0,
        });
        return response;
      },
    ));

    const { width, height } = redArr;
    canvas.width = width;
    canvas.height = height;

    let [red, green, blue] = [redArr, greenArr, blueArr].map(arr => arr[0]);

    [red, green, blue] = [
      toMathArray(red),
      toMathArray(green),
      toMathArray(blue),
    ];

    const contrast = 50;
    const bias = 0.16;

    [red, green, blue] = [
      sigmoidalContrast(red, contrast, bias),
      sigmoidalContrast(green, contrast, bias),
      sigmoidalContrast(blue, contrast, bias),
    ];

    red = gamma(red, 1.03);
    blue = gamma(blue, 0.925);

    [red, green, blue] = [
      toOriginalArray(red, Uint8Array),
      toOriginalArray(green, Uint8Array),
      toOriginalArray(blue, Uint8Array),
    ];

    const ctx = canvas.getContext('2d');
    const id = ctx.createImageData(width, height);
    const o = id.data;

    for (let i = 0; i < id.data.length / 4; ++i) {
      o[i * 4] = red[i];
      o[(i * 4) + 1] = green[i];
      o[(i * 4) + 2] = blue[i];
      o[(i * 4) + 3] = (!red[i] && !green[i] && !blue[i]) ? 0 : 255;
    }
    ctx.putImageData(id, 0, 0);
  }

  render() {
    return (
      <div ref={this.mapRef} />
    );
  }
}

const ConnectedMapView = connect(mapStateToProps)(MapView);
export default ConnectedMapView;
