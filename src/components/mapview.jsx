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
import { renderData } from '../renderutils';


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
            attributions: [
              '<a xmlns: dct="http://purl.org/dc/terms/" href="https://s2maps.eu" property="dct:title">Sentinel-2 cloudless - https://s2maps.eu</a> by <a xmlns:cc="http://creativecommons.org/ns#" href="https://eox.at" property="cc:attributionName" rel="cc:attributionURL">EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data 2016 & amp; 2017)',
            ],
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
    this.tileCache = {};
    this.renderedTileCache = {};
  }

  componentDidMount() {
    this.map.setTarget(this.mapRef.current);
  }

  componentDidUpdate(prevProps, prevState) {
    const { scenes: prevScenes } = prevProps;
    const { scenes } = this.props;

    if (prevScenes.length > scenes.length) {
      // TODO find scene and remove layer
      const removedScene = prevScenes.find(scene => scenes.indexOf(scene) === -1);
      delete this.renderedTileCache[removedScene.id];
      this.map.removeLayer(this.sceneLayers[removedScene.id]);
    } else if (prevScenes.length < scenes.length) {
      this.addSceneLayer(scenes[scenes.length - 1]);
    } else {
      const changedScene = scenes.find((scene, index) => scene !== prevScenes[index]);

      delete this.renderedTileCache[changedScene.id];

      const layer = this.sceneLayers[changedScene.id];
      if (layer) {
        const source = layer.getSource();
        // refresh the source cache
        source.setTileUrlFunction(
          source.getTileUrlFunction(),
          (new Date()).getTime(),
        );
      }
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

  async getRawTile(tiff, url, z, x, y) {
    const id = `${url}-${z}-${x}-${y}`;
    if (!this.tileCache[id]) {
      const image = await tiff.getImage(await tiff.getImageCount() - z - 1);

      const wnd = [
        x * image.getTileWidth(),
        image.getHeight() - ((y + 1) * image.getTileHeight()),
        (x + 1) * image.getTileWidth(),
        image.getHeight() - (y * image.getTileHeight()),
      ];

      this.tileCache[id] = image.readRasters({
        window: wnd,
      });
    }

    return this.tileCache[id];
  }

  async addSceneLayer(scene) {
    this.sceneSources[scene.id] = {
      [scene.redBand]: this.getImage(scene.id, scene.bands.get(scene.redBand)),
      [scene.greenBand]: this.getImage(scene.id, scene.bands.get(scene.greenBand)),
      [scene.blueBand]: this.getImage(scene.id, scene.bands.get(scene.blueBand)),
    };
    const tiff = await this.getImage(scene.id, scene.bands.get(scene.redBand));

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
        extent.getCenter(first.getBoundingBox()),
        epsg, this.map.getView().getProjection(),
      ),
    });
  }

  async renderTile(sceneId, canvas, z, x, y) {
    const id = `${z}-${x}-${y}`;

    if (!this.renderedTileCache[sceneId]) {
      this.renderedTileCache[sceneId] = {};
    }

    if (!this.renderedTileCache[sceneId][id]) {
      this.renderedTileCache[sceneId][id] = this.renderTileInternal(sceneId, canvas, z, x, y);
    }
    return this.renderedTileCache[sceneId][id];
  }

  async renderTileInternal(sceneId, canvas, z, x, y) {
    const scene = this.props.scenes.find(s => s.id === sceneId);

    if (!scene) {
      return;
    }

    const [redImage, greenImage, blueImage] = await all([
      this.getImage(sceneId, scene.bands.get(scene.redBand)),
      this.getImage(sceneId, scene.bands.get(scene.greenBand)),
      this.getImage(sceneId, scene.bands.get(scene.blueBand)),
    ]);

    redImage.baseUrl = scene.bands.get(scene.redBand);
    greenImage.baseUrl = scene.bands.get(scene.greenBand);
    blueImage.baseUrl = scene.bands.get(scene.blueBand);

    const [redArr, greenArr, blueArr] = await all([redImage, greenImage, blueImage].map(
      tiff => this.getRawTile(tiff, tiff.baseUrl, z, x, y),
    ));

    const { width, height } = redArr;
    canvas.width = width;
    canvas.height = height;

    console.time(`rendering ${sceneId + z + x + y}`);
    const [red, green, blue] = [redArr, greenArr, blueArr].map(arr => arr[0]);
    renderData(canvas, scene.pipeline, width, height, red, green, blue);
    console.timeEnd(`rendering ${sceneId + z + x + y}`);

    // const ctx = canvas.getContext('2d');
    // const id = ctx.createImageData(width, height);
    // const o = id.data;

    // console.time(`blitting ${sceneId + z + x + y}`);
    // for (let i = 0; i < id.data.length / 4; ++i) {
    //   o[i * 4] = red[i];
    //   o[(i * 4) + 1] = green[i];
    //   o[(i * 4) + 2] = blue[i];
    //   o[(i * 4) + 3] = (!red[i] && !green[i] && !blue[i]) ? 0 : 255;
    // }
    // ctx.putImageData(id, 0, 0);
    // console.timeEnd(`blitting ${sceneId + z + x + y}`);
  }

  render() {
    return (
      <div ref={this.mapRef} />
    );
  }
}

const ConnectedMapView = connect(mapStateToProps)(MapView);
export default ConnectedMapView;
