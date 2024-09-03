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

import { fromUrl, fromUrls, Pool } from 'geotiff';

import CanvasTileImageSource, { ProgressBar } from '../maputil';
import { renderData } from '../renderutils';

import { tileStartLoading, tileStopLoading, setPosition } from '../actions/main';
import { type } from 'os';


proj.setProj4(proj4);

async function all(promises) {
  return await Promise.all(promises);
}

const mapStateToProps = ({ scenes, main }) => {
  return { scenes, longitude: main.longitude, latitude: main.latitude, zoom: main.zoom };
};

const mapDispatchToProps = {
  tileStartLoading,
  tileStopLoading,
  setPosition,
};

class MapView extends Component {
  constructor() {
    super();
    this.mapRef = createRef();
    this.progressBarRef = createRef();

    this.map = new Map({
      layers: [
        new TileLayer({
          extent: [-180, -90, 180, 90],
          source: new TileWMS({
            url: 'https://tiles.maps.eox.at/wms',
            params: { LAYERS: 's2cloudless-2023' },
            projection: 'EPSG:4326',
            attributions: [
              '<a xmlns: dct="http://purl.org/dc/terms/" href="https://s2maps.eu" property="dct:title">Sentinel-2 cloudless - https://s2maps.eu</a> by <a xmlns:cc="http://creativecommons.org/ns#" href="https://eox.at" property="cc:attributionName" rel="cc:attributionURL">EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data 2023)',
            ],
          }),
        }),
      ],
      view: new View({
        projection: 'EPSG:4326',
        center: [0, 0],
        zoom: 5,
        // maxZoom: 13,
        minZoom: 3,
        maxZoom: 23,
      }),
    });
    this.sceneLayers = {};
    this.sceneSources = {};
    this.tileCache = {};
    this.renderedTileCache = {};

    this.progressBar = new ProgressBar();

    this.map.on('moveend', () => {
      const view = this.map.getView();
      this.props.setPosition(...view.getCenter(), view.getZoom());
    });

    this.pool = new Pool();
  }

  componentDidMount() {
    this.map.setTarget(this.mapRef.current);
    this.progressBar.setElement(this.progressBarRef.current);
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

      if (changedScene) {
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
  }

  componentWillUnmount() {
    this.map.setTarget(null);
  }

  async getImage(sceneId, url, hasOvr = true) {
    if (!this.sceneSources[sceneId]) {
      this.sceneSources[sceneId] = {};
    }
    if (!this.sceneSources[sceneId][url]) {
      if (hasOvr) {
        this.sceneSources[sceneId][url] = fromUrls(url, [`${url}.ovr`]);
      } else {
        this.sceneSources[sceneId][url] = fromUrl(url);
      }
    }
    return this.sceneSources[sceneId][url];
  }

  async getRawTile(tiff, url, z, x, y, isRGB = false, samples) {
    const id = `${url}-${samples ? samples.join(',') : 'all'}-${z}-${x}-${y}`;

    if (!this.tileCache[id]) {
      const image = await tiff.getImage(await tiff.getImageCount() - z - 1);

      // const poolSize = image.fileDirectory.Compression === 5 ? 4 : null;
      // const poolSize = null;

      const wnd = [
        x * image.getTileWidth(),
        image.getHeight() - ((y + 1) * image.getTileHeight()),
        (x + 1) * image.getTileWidth(),
        image.getHeight() - (y * image.getTileHeight()),
      ];

      if (isRGB) {
        this.tileCache[id] = image.readRGB({
          window: wnd,
          pool: image.fileDirectory.Compression === 5 ? this.pool : null,
        });
      } else {
        this.tileCache[id] = image.readRasters({
          window: wnd,
          samples,
          pool: image.fileDirectory.Compression === 5 ? this.pool : null,
        });
      }
    }

    return this.tileCache[id];
  }

  async addSceneLayer(scene) {
    this.sceneSources[scene.id] = {
      [scene.redBand]: this.getImage(scene.id, scene.bands.get(scene.redBand), scene.hasOvr),
      [scene.greenBand]: this.getImage(scene.id, scene.bands.get(scene.greenBand), scene.hasOvr),
      [scene.blueBand]: this.getImage(scene.id, scene.bands.get(scene.blueBand), scene.hasOvr),
    };
    const tiff = await this.getImage(scene.id, scene.bands.get(scene.redBand), scene.hasOvr);

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

    const code = first.geoKeys.ProjectedCSTypeGeoKey || first.geoKeys.GeographicTypeGeoKey;
    if (typeof code === 'undefined') {
      throw new Error('No ProjectedCSTypeGeoKey or GeographicTypeGeoKey provided');
    }

    const epsg = `EPSG:${code}`;
    if (!proj4.defs(epsg)) {
      const response = await fetch(`//epsg.io/${code}.proj4`);
      proj4.defs(epsg, await response.text());
    }

    const layer = new TileLayer({
      source: new CanvasTileImageSource({
        projection: epsg,
        tileGrid,
        tileRenderFunction: (...args) => this.renderTile(scene.id, ...args),
        attributions: scene.attribution,
      }),
    });

    this.map.addLayer(layer);
    this.sceneLayers[scene.id] = layer;

    const view = this.map.getView();
    const lonLatExtent = proj.transformExtent(
      first.getBoundingBox(), epsg, this.map.getView().getProjection(),
    );

    // only animate to new bounds when center is not already inside image
    if (!extent.containsCoordinate(lonLatExtent, view.getCenter())) {
      view.fit(
        lonLatExtent, {
          duration: 1000,
          padding: [0, this.map.getSize()[0] / 2, 0, 0],
        },
      );
    }

    const source = layer.getSource();
    this.progressBar.setSource(source);

    source.on('tileloadstart', this.props.tileStartLoading);
    source.on('tileloadend', this.props.tileStopLoading);
    source.on('tileloaderror', this.props.tileStopLoading);
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

    if (scene.isRGB) { // && scene.isSingle) {
      const tiff = await this.getImage(sceneId, scene.bands.get(scene.redBand), scene.hasOvr);
      tiff.baseUrl = sceneId;
      console.time(`parsing ${sceneId + z + x + y}`);
      const data = await this.getRawTile(tiff, tiff.baseUrl, z, x, y, true);
      console.timeEnd(`parsing ${sceneId + z + x + y}`);
      const { width, height } = data;
      canvas.width = width;
      canvas.height = height;

      console.time(`rendering ${sceneId + z + x + y}`);
      // const ctx = canvas.getContext('2d');
      // const imageData = ctx.createImageData(width, height);
      // const out = imageData.data;
      // let o = 0;

      // let shift = 0;
      // if (data instanceof Uint16Array) {
      //   shift = 8;
      // }

      // for (let i = 0; i < data.length; i += 3) {
      //   out[o] = data[i] >> shift;
      //   out[o + 1] = data[i + 1] >> shift;
      //   out[o + 2] = data[i + 2] >> shift;
      //   out[o + 3] = data[i] || data[i + 1] || data[i + 2] ? 255 : 0;
      //   o += 4;
      // }
      // ctx.putImageData(imageData, 0, 0);

      renderData(canvas, scene.pipeline, width, height, data, null, null, true);
      console.timeEnd(`rendering ${sceneId + z + x + y}`);
    } else if (scene.isSingle) {
      const tiff = await this.getImage(sceneId, scene.bands.get(scene.redBand), scene.hasOvr);
      tiff.baseUrl = sceneId;
      console.time(`parsing ${sceneId + z + x + y}`);
      const data = await this.getRawTile(tiff, tiff.baseUrl, z, x, y, false, [
        scene.redBand, scene.greenBand, scene.blueBand,
      ]);
      console.timeEnd(`parsing ${sceneId + z + x + y}`);

      const { width, height } = data;
      canvas.width = width;
      canvas.height = height;

      console.time(`rendering ${sceneId + z + x + y}`);
      const [red, green, blue] = data;
      // const [red, green, blue] = [redArr, greenArr, blueArr].map(arr => arr[0]);
      renderData(canvas, scene.pipeline, width, height, red, green, blue, false);
      console.timeEnd(`rendering ${sceneId + z + x + y}`);
    } else {
      const [redImage, greenImage, blueImage] = await all([
        this.getImage(sceneId, scene.bands.get(scene.redBand), scene.hasOvr),
        this.getImage(sceneId, scene.bands.get(scene.greenBand), scene.hasOvr),
        this.getImage(sceneId, scene.bands.get(scene.blueBand), scene.hasOvr),
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
      renderData(canvas, scene.pipeline, width, height, red, green, blue, false);
      console.timeEnd(`rendering ${sceneId + z + x + y}`);
    }
  }

  render() {
    const { longitude, latitude, zoom } = this.props;
    this.map.getView().setCenter([longitude, latitude]);
    this.map.getView().setZoom(zoom);
    return (
      <div ref={this.mapRef}>
        <div ref={this.progressBarRef} className="map-progress-bar" />
      </div>
    );
  }
}

const ConnectedMapView = connect(mapStateToProps, mapDispatchToProps)(MapView);
export default ConnectedMapView;
