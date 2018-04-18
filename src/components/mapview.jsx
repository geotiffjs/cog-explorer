import React, { Component, createRef } from 'react';
import { connect } from 'react-redux';

import 'ol/ol.css';
import Map from 'ol/map';
import View from 'ol/view';
import TileLayer from 'ol/layer/tile';
import TileWMS from 'ol/source/tilewms';
import TileGrid from 'ol/tilegrid';
import { transform } from 'ol/proj';
import { getCenter } from 'ol/extent';

// import GeoTIFF from '../../../src/main';

import CanvasTileImageSource from '../maputil';


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
        // center: transform(
        //   //[-0.1275, 51.507222], 'EPSG:4326', 'EPSG:3857'),

        //   getCenter(imageExtent), 'EPSG:32645', 'EPSG:4326'),
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
    } else if (prevScenes.length < scenes.length) {
      // TODO add layer
    } else {
      const changedScene = scenes.find((scene, index) => scene !== prevScenes[index]);
      console.log('changed', changedScene);
    }
  }

  componentWillUnmount() {
    this.map.setTarget(null);
  }

  async addSceneLayer(scene) {
    this.sceneSources[scene.id] = {
      [scene.redBand]: GeoTIFF.fromUrls(scene.redBand, [`${scene.redBand}.ovr`]),
      [scene.greenBand]: GeoTIFF.fromUrls(scene.greenBand, [`${scene.greenBand}.ovr`]),
      [scene.blueBand]: GeoTIFF.fromUrls(scene.redBand, [`${scene.blueBand}.ovr`]),
    };
    const tiff = await this.sceneSources[scene.id][scene.redBand];

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
      // to account for north up?
      origin: [first.getOrigin()[0], first.getBoundingBox()[1]],
      resolutions: resolutions.reverse(),
      tileSizes: tileSizes.reverse(),
    });

    this.map.addLayer(
      new TileLayer({
        source: new CanvasTileImageSource({
          projection: 'EPSG:32645',
          tileGrid,
        }),
      }),
    );
  }

  render() {
    return (
      <div ref={this.mapRef} />
    );
  }
}


const ConnectedMapView = connect(mapStateToProps)(MapView);
export default ConnectedMapView;
