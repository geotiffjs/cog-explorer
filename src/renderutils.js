function toMathArray(input) {
  // console.log(input.__proto__);
  const min = 0;
  let max;
  if (input instanceof Uint8Array || input instanceof Uint8ClampedArray) {
    max = 255;
  } else if (input instanceof Uint16Array) {
    max = 65535;
  } else if (input instanceof Uint32Array) {
    max = 4294967295;
  }
  // TODO: more types

  const out = new Float32Array(input.length);
  for (let i = 0; i < out.length; ++i) {
    out[i] = input[i] / max;
  }
  return out;
}

function toOriginalArray(input, Type) {
  let max = 0;
  switch (Type) {
    case Uint8Array:
    case Uint8ClampedArray:
      max = 255;
      break;
    case Uint16Array:
      max = 65535;
      break;
    case Uint32Array:
      max = 4294967295;
      break;
    default:
      throw new Error(`Unsupported array type ${Type}`);
  }

  const out = new Type(input.length);
  for (let i = 0; i < out.length; ++i) {
    out[i] = Math.round(input[i] * max);
  }
  return out;
}

function sigmoidalContrast(data, contrast, bias) {
  const alpha = bias;
  const beta = contrast;

  if (beta > 0) {
    const denominator = 1 / (1 + Math.exp(beta * (alpha - 1))) - 1 / (1 + Math.exp(beta * alpha));
    for (let i = 0; i < data.length; ++i) {
      const numerator = 1 / (1 + Math.exp(beta * (alpha - data[i]))) - 1 / (1 + Math.exp(beta * alpha));
      data[i] = numerator / denominator;
    }
  } else {
    for (let i = 0; i < data.length; ++i) {
      data[i] = (
        (beta * alpha) - Math.log(
          (
            1 / (
              (data[i] / (1 + Math.exp((beta * alpha) - beta))) -
              (data[i] / (1 + Math.exp(beta * alpha))) +
              (1 / (1 + Math.exp(beta * alpha)))
            )
          ) - 1)
      ) / beta;
    }
  }
  return data;
}

const fragSigmoidalContrastSrc = `
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

function gamma(data, g) {
  for (let i = 0; i < data.length; ++i) {
    data[i] **= (1 / g);
  }
  return data;
}

const fragGammaSrc = `
  float gamma(float v, float g) {
    return pow(v, 1.0 / g);
  }
`;

function blitChannels(canvas, width, height, red, green, blue) {
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

function renderData2d(canvas, pipeline, width, height, redData, greenData, blueData) {
  let [red, green, blue] = [
    toMathArray(redData),
    toMathArray(greenData),
    toMathArray(blueData),
  ];

  let bands = [red, green, blue];

  for (const step of pipeline) {
    let usedBands = [red, green, blue];
    if (step.bands === 'red') {
      usedBands = [red];
    } else if (step.bands === 'green') {
      usedBands = [green];
    } else if (step.bands === 'blue') {
      usedBands = [blue];
    }

    bands = bands.map((band) => {
      if (usedBands.indexOf(band) === -1) {
        return band;
      }
      if (step.operation === 'sigmoidal-contrast') {
        return sigmoidalContrast(band, step.contrast, step.bias);
      } else if (step.operation === 'gamma') {
        return gamma(band, step.value);
      }
      console.warning(`Unknown operation ${step.operation}`);
      return band;
    });
  }

  [red, green, blue] = bands.map(band => toOriginalArray(band, Uint8Array));
  blitChannels(canvas, width, height, red, green, blue);
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

function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
  // create the shader program
  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vertexShaderSource);
  gl.compileShader(vertexShader);
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(vertexShader));
  }

  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, fragmentShaderSource);
  gl.compileShader(fragmentShader);
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(fragmentShader));
  }

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  return program;
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

function createTexture(gl, data, width, height) {
  gl.viewport(0, 0, width, height);
  const textureData = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textureData);

  // Set the parameters so we can render any size image.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  // Upload the image into the texture.
  gl.texImage2D(gl.TEXTURE_2D, 0,
    gl.LUMINANCE,
    width, height, 0,
    gl.LUMINANCE, gl.FLOAT, new Float32Array(data),
  );
  return textureData;
}

const vertexShaderSource = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  uniform mat3 u_matrix;
  uniform vec2 u_resolution;
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
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    // pass the texCoord to the fragment shader
    // The GPU will interpolate this value between points.
    v_texCoord = a_texCoord;
  }
`;

function createFragmentShaderSource(pipeline) {

  return `
  precision mediump float;

  // our textures
  uniform sampler2D u_textureRed;
  uniform sampler2D u_textureGreen;
  uniform sampler2D u_textureBlue;

  ${fragSigmoidalContrastSrc}
  ${fragGammaSrc}

  // the texCoords passed in from the vertex shader.
  varying vec2 v_texCoord;

  void main() {
    float red = texture2D(u_textureRed, v_texCoord)[0] / 65535.0;
    float green = texture2D(u_textureGreen, v_texCoord)[0] / 65535.0;
    float blue = texture2D(u_textureBlue, v_texCoord)[0] / 65535.0;

    red = sigmoidalContrast(red, 50.0, 0.16);
    green = sigmoidalContrast(green, 50.0, 0.16);
    blue = sigmoidalContrast(blue, 50.0, 0.16);

    red = gamma(red, 1.03);
    blue = gamma(blue, 0.925);

    if (red == 0.0 && green == 0.0 && blue == 0.0) {
      discard;
    }
    gl_FragColor = vec4(
      red, //red * 255.0,
      green, //green * 255.0,
      blue, //blue * 255.0,
      1.0
    );

    // if (value == u_noDataValue)
    //   gl_FragColor = vec4(0.0, 0, 0, 0.0);
    // else if ((!u_clampLow && value < u_domain[0]) || (!u_clampHigh && value > u_domain[1]))
    //   gl_FragColor = vec4(0, 0, 0, 0);
    // else {
    //   float normalisedValue = (value - u_domain[0]) / (u_domain[1] - u_domain[0]);
    //   gl_FragColor = texture2D(u_textureScale, vec2(normalisedValue, 0));
    // }
  }`;
}


const renderCanvas = document.createElement('canvas');
const gl = create3DContext(renderCanvas);
let program;
if (gl) {
  program = createProgram(gl, vertexShaderSource, createFragmentShaderSource());
  gl.useProgram(program);

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

  gl.useProgram(program);
  // set the images
  gl.uniform1i(gl.getUniformLocation(program, 'u_textureRed'), 0);
  gl.uniform1i(gl.getUniformLocation(program, 'u_textureGreen'), 1);
  gl.uniform1i(gl.getUniformLocation(program, 'u_textureBlue'), 2);
}

function renderDataWebGl(canvas, gl, pipeline, width, height, redData, greenData, blueData) {
  try {
    renderCanvas.width = width;
    renderCanvas.height = height;
    
    gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

    gl.viewport(0, 0, width, height);

    const textureRed = createTexture(gl, redData, width, height);
    const textureGreen = createTexture(gl, greenData, width, height);
    const textureBlue = createTexture(gl, blueData, width, height);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textureRed);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textureGreen);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, textureBlue);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    // const domainLocation = gl.getUniformLocation(program, 'u_domain');
    // const noDataValueLocation = gl.getUniformLocation(program, 'u_noDataValue');
    // const clampLowLocation = gl.getUniformLocation(program, 'u_clampLow');
    // const clampHighLocation = gl.getUniformLocation(program, 'u_clampHigh');
    const matrixLocation = gl.getUniformLocation(program, 'u_matrix');

    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    // gl.uniform2fv(domainLocation, domain);
    // gl.uniform1i(clampLowLocation, clampLow);
    // gl.uniform1i(clampHighLocation, clampHigh);
    // gl.uniform1f(noDataValueLocation, noDataValue);
    const matrix = [
      1, 0, 0,
      0, 1, 0,
      0, 0, 1,
    ];
    gl.uniformMatrix3fv(matrixLocation, false, matrix);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    setRectangle(gl, 0, 0, canvas.width, canvas.height);

    // Draw the rectangle.
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // cleanup
    gl.deleteTexture(textureRed);
    gl.deleteTexture(textureGreen);
    gl.deleteTexture(textureBlue);

    // blit the current canvas on the output canvas
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(renderCanvas, 0, 0);
  } catch (e) {
    console.error(e);
    return;
  }
}

export function renderData(canvas, ...args) {
  // TODO: prefer rendering via webgl
  // const gl = create3DContext(canvas);
  if (gl) {
    return renderDataWebGl(canvas, gl, ...args);
  }
  return renderData2d(canvas, ...args);
}
