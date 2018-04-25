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
      this.dispatchEvent('tileloadstart');
      await this.tileRenderFunction(tile.getCanvas(), z, x, y);
      done();
      this.dispatchEvent('tileloadend');
    } catch (err) {
      error();
      this.dispatchEvent('tileloaderror');
    }
  }
}

export class ProgressBar {
  constructor(el, source = null) {
    this.loaded = 0;
    this.loading = 0;
    this.setSource(source);

    this.loadingListener = () => {
      this.addLoading();
    };

    this.loadedListener = () => {
      this.addLoaded();
    };
  }

  setSource(source = null) {
    if (this.source) {
      this.source.un('tileloadstart', this.loadingListener);
      this.source.un('tileloadend', this.loadedListener);
      this.source.un('tileloaderror', this.loadedListener);
    }
    this.source = source;
    if (this.source) {
      this.source.on('tileloadstart', this.loadingListener);
      this.source.on('tileloadend', this.loadedListener);
      this.source.on('tileloaderror', this.loadedListener);
    }
  }

  setElement(el = null) {
    this.el = el;
  }

  show() {
    this.el.style.visibility = 'visible';
  }

  hide() {
    if (this.loading === this.loaded) {
      this.el.style.visibility = 'hidden';
      this.el.style.width = 0;
    }
  }

  addLoading() {
    if (this.loading === 0) {
      this.show();
    }
    ++this.loading;
    this.update();
  }

  addLoaded() {
    setTimeout(() => {
      ++this.loaded;
      this.update();
    }, 100);
  }

  isLoading() {
    return this.loading > this.loaded;
  }

  update() {
    if (!this.el) {
      return;
    }
    const width = `${(this.loaded / this.loading * 100).toFixed(1)}%`;
    this.el.style.width = width;
    if (this.loading === this.loaded) {
      this.loading = 0;
      this.loaded = 0;
      setTimeout(() => {
        this.hide();
      }, 500);
    }
  }
}
