

const globalVertexShaderSource = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  uniform mat3 u_matrix;
  uniform vec2 u_resolution;
  uniform float u_flipY;
  varying vec2 v_texCoord;
  void main() {
    // apply transformation matrix
    vec2 position = (u_matrix * vec3(a_position, 1)).xy;
    // convert the rectangle from pixels to 0.0 to 1.0
    vec2 zeroToOne = position / u_resolution;
    // convert from 0->1 to 0->2
    vec2 zeroToTwo = zeroToOne * 2.0;
    // convert from 0->2 to -1->+1 (clipspace)
    vec2 clipSpace = zeroToTwo - 1.0;
    gl_Position = vec4(clipSpace * vec2(1, u_flipY), 0, 1);
    // pass the texCoord to the fragment shader
    // The GPU will interpolate this value between points.
    v_texCoord = a_texCoord;
  }
`;


function getMaxValue(input) {
  if (input instanceof Uint8Array || input instanceof Uint8ClampedArray) {
    return 255;
  } else if (input instanceof Uint16Array) {
    return 65535;
  } else if (input instanceof Uint32Array) {
    return 4294967295;
  }
  return 0;
}


function create3DContext(canvas, optAttribs) {
  const names = ['webgl', 'experimental-webgl'];
  let context = null;
  for (let ii = 0; ii < names.length; ++ii) {
    try {
      context = canvas.getContext(names[ii], optAttribs);
    } catch (e) { }  // eslint-disable-line
    if (context) {
      break;
    }
  }
  if (!context || !context.getExtension('OES_texture_float')) {
    return null;
  }
  return context;
}


function addLines(source) {
  return source
    .split('\n')
    .map((line, i) => `${(i + 1).toString().padStart(3)}\t${line}`)
    .join('\n');
}

function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
  // create the shader program
  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vertexShaderSource);
  gl.compileShader(vertexShader);
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(vertexShader) + addLines(vertexShaderSource));
  }

  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, fragmentShaderSource);
  gl.compileShader(fragmentShader);
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(fragmentShader) + addLines(fragmentShaderSource));
  }

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  return program;
}

class StepBase {
  static get name() {
    return null;
  }

  constructor(gl, prefix, bands = 'all') {
    this.gl = gl;
    this.prefix = prefix;
    this.bands = bands;
  }
}


class SigmoidalContrastStep extends StepBase {
  static get name() {
    return 'sigmoidal-contrast';
  }

  static getFragmentSourceLib() {
    return `
      float sigmoidalContrast(float v, float contrast, float bias) {
        float alpha = bias;
        float beta = contrast;

        if (beta > 0.0) {
          float denominator = 1.0 / (1.0 + exp(beta * (alpha - 1.0))) - 1.0 / (1.0 + exp(beta * alpha));
          float numerator = 1.0 / (1.0 + exp(beta * (alpha - v))) - 1.0 / (1.0 + exp(beta * alpha));
          return numerator / denominator;
        } else {
          return (
            (beta * alpha) - log(
              (
                1.0 / (
                  (v / (1.0 + exp((beta * alpha) - beta))) -
                  (v / (1.0 + exp(beta * alpha))) +
                  (1.0 / (1.0 + exp(beta * alpha)))
                )
              ) - 1.0)
          ) / beta;
        }
      }
    `;
  }

  getUniformIds() {
    return [`u_${this.prefix}_contrast`, `u_${this.prefix}_bias`];
  }

  getCall(variableName) {
    return `sigmoidalContrast(${variableName}, u_${this.prefix}_contrast, u_${this.prefix}_bias)`;
  }

  bindUniforms(gl, program, values) {
    gl.uniform1f(
      gl.getUniformLocation(program, `u_${this.prefix}_contrast`),
      values.contrast,
    );
    gl.uniform1f(
      gl.getUniformLocation(program, `u_${this.prefix}_bias`),
      values.bias,
    );
  }
}

class GammaStep extends StepBase {
  static get name() {
    return 'gamma';
  }

  static getFragmentSourceLib() {
    return `
      float gamma(float v, float g) {
        return pow(v, 1.0 / g);
      }
    `;
  }

  getUniformIds() {
    return [`u_${this.prefix}_gamma`];
  }

  getCall(variableName) {
    return `gamma(${variableName}, u_${this.prefix}_gamma)`;
  }

  bindUniforms(gl, program, values) {
    gl.uniform1f(
      gl.getUniformLocation(program, `u_${this.prefix}_gamma`),
      values.value,
    );
  }
}

const stepClasses = {
  'sigmoidal-contrast': SigmoidalContrastStep,
  gamma: GammaStep,
};


function getPipelineId(pipeline) {
  return pipeline.map(stepDef => `${stepDef.operation}#${stepDef.bands}`).join('/');
}


function setRectangle(gl, x, y, width, height) {
  const x1 = x;
  const x2 = x + width;
  const y1 = y;
  const y2 = y + height;
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    x1, y1,
    x2, y1,
    x1, y2,
    x1, y2,
    x2, y1,
    x2, y2]), gl.STATIC_DRAW);
}

class PipelineProgramWrapper {
  constructor(gl, pipeline) {
    this.buildSteps = pipeline.map((step, i) => {
      return new stepClasses[step.operation](this.gl, i, step.bands);
    });
    const program = this.buildPipelineProgram(gl);
    this.program = program;
  }

  render(gl, pipeline, width, height, redData, greenData, blueData, isRGB) {
    const { program } = this;
    gl.useProgram(program);
    gl.viewport(0, 0, width, height);

    // look up where the vertex data needs to go.
    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');

    // provide texture coordinates for the rectangle.
    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0.0, 0.0,
      1.0, 0.0,
      0.0, 1.0,
      0.0, 1.0,
      1.0, 0.0,
      1.0, 1.0]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform1f(gl.getUniformLocation(program, 'u_flipY'), true ? -1 : 1);


    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const matrixLocation = gl.getUniformLocation(program, 'u_matrix');

    gl.uniform2f(resolutionLocation, width, height);
    const matrix = [
      1, 0, 0,
      0, 1, 0,
      0, 0, 1,
    ];
    gl.uniformMatrix3fv(matrixLocation, false, matrix);

    gl.uniform1i(gl.getUniformLocation(program, 'u_singleTexture'), isRGB ? 1 : 0);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    setRectangle(gl, 0, 0, width, height);

    let textureRed;
    let textureGreen;
    let textureBlue;
    if (isRGB) {
      gl.uniform1f(gl.getUniformLocation(program, 'u_maxValue'), 1.0);
      textureRed = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, textureRed);

      gl.uniform1i(gl.getUniformLocation(program, 'u_textureRed'), 0);

      // Set the parameters so we can render any size image.
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGB,
        width,
        height,
        0,
        gl.RGB,
        gl.UNSIGNED_BYTE,
        (redData instanceof Uint8Array) ? redData : new Uint8Array(redData),
      );

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textureRed);
    } else {
      gl.uniform1f(gl.getUniformLocation(program, 'u_maxValue'), getMaxValue(redData));

      [textureRed, textureGreen, textureBlue] = [redData, greenData, blueData].map((data) => {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.uniform1i(gl.getUniformLocation(program, 'u_textureRed'), 0);
        gl.uniform1i(gl.getUniformLocation(program, 'u_textureGreen'), 1);
        gl.uniform1i(gl.getUniformLocation(program, 'u_textureBlue'), 2);

        // Set the parameters so we can render any size image.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        // Upload the image into the texture.
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.LUMINANCE,
          width,
          height,
          0,
          gl.LUMINANCE,
          gl.FLOAT,
          data ? new Float32Array(data) : null,
        );
        return texture;
      });
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textureRed);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, textureGreen);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, textureBlue);
    }

    this.buildSteps.forEach((step, i) => step.bindUniforms(gl, program, pipeline[i]));

    gl.viewport(0, 0, width, height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (isRGB) {
      gl.deleteTexture(textureRed);
    } else {
      // cleanup
      gl.deleteTexture(textureRed);
      gl.deleteTexture(textureGreen);
      gl.deleteTexture(textureBlue);
    }
  }

  buildPipelineProgram(gl) {
    const fragmentShaderSource = `
      precision mediump float;
      // our textures
      uniform bool u_singleTexture;
      uniform float u_minValue;
      uniform float u_maxValue;
      uniform sampler2D u_textureRed;
      uniform sampler2D u_textureGreen;
      uniform sampler2D u_textureBlue;
      ${this.buildSteps.map(step =>
        step.getUniformIds().map(uid => `    uniform float ${uid};`).join('\n'),
      ).join('\n')}
      // the texCoords passed in from the vertex shader.
      varying vec2 v_texCoord;

      ${Object.values(stepClasses).map(cls => cls.getFragmentSourceLib()).join('\n')}

      void main() {
        float red;
        float green;
        float blue;
        if (u_singleTexture) {
          vec4 value = texture2D(u_textureRed, v_texCoord);
          red = value.r / u_maxValue;
          green = value.g / u_maxValue;
          blue = value.b / u_maxValue;
        } else {
          red = texture2D(u_textureRed, v_texCoord)[0] / u_maxValue;
          green = texture2D(u_textureGreen, v_texCoord)[0] / u_maxValue;
          blue = texture2D(u_textureBlue, v_texCoord)[0] / u_maxValue;
        }

        ${this.buildSteps.map((step) => {
        if (step.bands === 'all') {
          return `
              red = ${step.getCall('red')};
              green = ${step.getCall('green')};
              blue = ${step.getCall('blue')};
            `;
        }
        return `${step.bands} = ${step.getCall(step.bands)};`;
      }).join('\n')}

        if (red == 0.0 && green == 0.0 && blue == 0.0) {
          discard;
        }
        gl_FragColor = vec4(
          red,
          green,
          blue,
          1.0
        );
      }`;
    return createProgram(gl, globalVertexShaderSource, fragmentShaderSource);
  }
}

export default class WebGLRenderer {
  static isSupported() {
    return create3DContext(document.createElement('canvas')) !== null;
  }

  constructor() {
    this.renderCanvas = document.createElement('canvas');
    this.gl = create3DContext(this.renderCanvas);
    this.wrappers = {};
  }

  render(canvas, pipeline, width, height, redData, greenData, blueData, isRGB) {
    try {
      const pipelineId = getPipelineId(pipeline);
      if (!this.wrappers[pipelineId]) {
        this.wrappers[pipelineId] = new PipelineProgramWrapper(this.gl, pipeline);
      }
      this.renderCanvas.width = width;
      this.renderCanvas.height = height;
      this.gl.clear(this.gl.DEPTH_BUFFER_BIT | this.gl.COLOR_BUFFER_BIT);

      this.wrappers[pipelineId].render(
        this.gl, pipeline, width, height, redData, greenData, blueData, isRGB,
      );

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(this.renderCanvas, 0, 0);
    } catch (e) {
      console.error(e);
    }
  }
}
