import Tile from 'ol/tile';
import TileImageSource from 'ol/source/tileimage';
import TileState from 'ol/tilestate';


class CanvasTile extends Tile {
  constructor(tileCoord, state, src, crossOrigin, tileLoadFunction, options) {
    super(tileCoord, state, options);
    this.canvas = document.createElement('canvas');
    this.tileLoadFunction = tileLoadFunction;
    this.src = src;
  }

  getCanvas() {
    return this.canvas;
  }

  getImage() {
    return this.getCanvas();
  }

  load() {
    this.tileLoadFunction(this, this.src,
      () => this.setState(TileState.LOADED),
      () => this.setState(TileState.ERROR),
    );
  }
}

export default class CanvasTileImageSource extends TileImageSource {
  constructor(opts) {
    super(Object.assign({}, opts, {
      tileUrlFunction: (...args) => this.customTileUrlFunction(...args),
      tileLoadFunction: (...args) => this.customTileLoadFunction(...args),
      tileClass: CanvasTile,
    }));

    this.tileRenderFunction = opts.tileRenderFunction;
  }

  customTileUrlFunction([z, x, y], pixelRatio) {
    return JSON.stringify({ z, x, y, pixelRatio });
  }

  async customTileLoadFunction(tile, url, done, error) {
    const { z, x, y } = JSON.parse(url);
    try {
      await this.tileRenderFunction(tile.getCanvas(), z, x, y);
      done();
    } catch (err) {
      error();
    }
  }
}
