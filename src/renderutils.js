import WebGLRenderer from './webglrenderer';

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

// const fragSigmoidalContrastSrc = `
//   float sigmoidalContrast(float v, float contrast, float bias) {
//     float alpha = bias;
//     float beta = contrast;

//     if (beta > 0.0) {
//       float denominator = 1.0 / (1.0 + exp(beta * (alpha - 1.0))) - 1.0 / (1.0 + exp(beta * alpha));
//       float numerator = 1.0 / (1.0 + exp(beta * (alpha - v))) - 1.0 / (1.0 + exp(beta * alpha));
//       return numerator / denominator;
//     } else {
//       return (
//         (beta * alpha) - log(
//           (
//             1.0 / (
//               (v / (1.0 + exp((beta * alpha) - beta))) -
//               (v / (1.0 + exp(beta * alpha))) +
//               (1.0 / (1.0 + exp(beta * alpha)))
//             )
//           ) - 1.0)
//       ) / beta;
//     }
//   }
// `;

function gamma(data, g) {
  for (let i = 0; i < data.length; ++i) {
    data[i] **= (1 / g);
  }
  return data;
}

// const fragGammaSrc = `
//   float gamma(float v, float g) {
//     return pow(v, 1.0 / g);
//   }
// `;

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

// function create3DContext(canvas, optAttribs) {
//   const names = ['webgl', 'experimental-webgl'];
//   let context = null;
//   for (let ii = 0; ii < names.length; ++ii) {
//     try {
//       context = canvas.getContext(names[ii], optAttribs);
//     } catch (e) { }  // eslint-disable-line
//     if (context) {
//       break;
//     }
//   }
//   if (!context || !context.getExtension('OES_texture_float')) {
//     return null;
//   }
//   return context;
// }

// function addLines(source) {
//   return source
//     .split('\n')
//     .map((line, i) => `${(i + 1).toString().padStart(3)}\t${line}`)
//     .join('\n');
// }

// function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
//   // create the shader program
//   const vertexShader = gl.createShader(gl.VERTEX_SHADER);
//   gl.shaderSource(vertexShader, vertexShaderSource);
//   gl.compileShader(vertexShader);
//   if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
//     throw new Error(gl.getShaderInfoLog(vertexShader) + addLines(vertexShaderSource));
//   }

//   const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
//   gl.shaderSource(fragmentShader, fragmentShaderSource);
//   gl.compileShader(fragmentShader);
//   if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
//     throw new Error(gl.getShaderInfoLog(fragmentShader) + addLines(fragmentShaderSource));
//   }

//   const program = gl.createProgram();
//   gl.attachShader(program, vertexShader);
//   gl.attachShader(program, fragmentShader);
//   gl.linkProgram(program);
//   return program;
// }

// function setRectangle(gl, x, y, width, height) {
//   const x1 = x;
//   const x2 = x + width;
//   const y1 = y;
//   const y2 = y + height;
//   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
//     x1, y1,
//     x2, y1,
//     x1, y2,
//     x1, y2,
//     x2, y1,
//     x2, y2]), gl.STATIC_DRAW);
// }

// function createTexture(gl, data, width, height) {
//   gl.viewport(0, 0, width, height);
//   const texture = gl.createTexture();
//   gl.bindTexture(gl.TEXTURE_2D, texture);

//   // Set the parameters so we can render any size image.
//   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
//   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
//   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
//   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

//   // Upload the image into the texture.
//   gl.texImage2D(gl.TEXTURE_2D, 0,
//     gl.LUMINANCE,
//     width, height, 0,
//     gl.LUMINANCE, gl.FLOAT, data ? new Float32Array(data) : null,
//   );
//   return texture;
// }

// const vertexShaderSource = `
//   attribute vec2 a_position;
//   attribute vec2 a_texCoord;
//   uniform mat3 u_matrix;
//   uniform vec2 u_resolution;
//   uniform float u_flipY;
//   varying vec2 v_texCoord;
//   void main() {
//     // apply transformation matrix
//     vec2 position = (u_matrix * vec3(a_position, 1)).xy;
//     // convert the rectangle from pixels to 0.0 to 1.0
//     vec2 zeroToOne = position / u_resolution;
//     // convert from 0->1 to 0->2
//     vec2 zeroToTwo = zeroToOne * 2.0;
//     // convert from 0->2 to -1->+1 (clipspace)
//     vec2 clipSpace = zeroToTwo - 1.0;
//     gl_Position = vec4(clipSpace * vec2(1, u_flipY), 0, 1);
//     // pass the texCoord to the fragment shader
//     // The GPU will interpolate this value between points.
//     v_texCoord = a_texCoord;
//   }
// `;

// function createFragmentShaderSource(pipeline) {

//   return `
//   precision mediump float;

//   // our textures
//   uniform sampler2D u_textureRed;
//   uniform sampler2D u_textureGreen;
//   uniform sampler2D u_textureBlue;

//   // ${fragSigmoidalContrastSrc}
//   // ${fragGammaSrc}

//   // the texCoords passed in from the vertex shader.
//   varying vec2 v_texCoord;

//   void main() {
//     float red = texture2D(u_textureRed, v_texCoord)[0] / 65535.0;
//     float green = texture2D(u_textureGreen, v_texCoord)[0] / 65535.0;
//     float blue = texture2D(u_textureBlue, v_texCoord)[0] / 65535.0;

//     red = sigmoidalContrast(red, 50.0, 0.16);
//     green = sigmoidalContrast(green, 50.0, 0.16);
//     blue = sigmoidalContrast(blue, 50.0, 0.16);

//     red = gamma(red, 1.03);
//     blue = gamma(blue, 0.925);

//     if (red == 0.0 && green == 0.0 && blue == 0.0) {
//       discard;
//     }
//     gl_FragColor = vec4(
//       red, //red * 255.0,
//       green, //green * 255.0,
//       blue, //blue * 255.0,
//       1.0
//     );

//     // if (value == u_noDataValue)
//     //   gl_FragColor = vec4(0.0, 0, 0, 0.0);
//     // else if ((!u_clampLow && value < u_domain[0]) || (!u_clampHigh && value > u_domain[1]))
//     //   gl_FragColor = vec4(0, 0, 0, 0);
//     // else {
//     //   float normalisedValue = (value - u_domain[0]) / (u_domain[1] - u_domain[0]);
//     //   gl_FragColor = texture2D(u_textureScale, vec2(normalisedValue, 0));
//     // }
//   }`;
// }

// class StepRenderer {
//   constructor(gl, vertexShaderSource, fragmentShaderSource, parameterMapping) {
//     const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
//     this.program = program;
//     gl.useProgram(program);

//     // look up where the vertex data needs to go.
//     const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');

//     // provide texture coordinates for the rectangle.
//     const texCoordBuffer = gl.createBuffer();
//     gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
//     gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
//       0.0, 0.0,
//       1.0, 0.0,
//       0.0, 1.0,
//       0.0, 1.0,
//       1.0, 0.0,
//       1.0, 1.0]), gl.STATIC_DRAW);
//     gl.enableVertexAttribArray(texCoordLocation);
//     gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

//     // set the images
//     gl.uniform1i(gl.getUniformLocation(program, 'u_textureInput'), 0);

//     this.parameterMapping = parameterMapping;
//   }

//   render(gl, inputTexture, outputFramebuffer, unwrap, wrap, flipY, width, height, parameters) {
//     const { program } = this;
//     gl.useProgram(program);
//     for (const [paramName, shaderName] of Object.entries(this.parameterMapping)) {
//       gl.uniform1f(gl.getUniformLocation(program, shaderName), parameters[paramName]);
//     }

//     gl.uniform1i(gl.getUniformLocation(program, 'u_unwrap'), unwrap);
//     gl.uniform1i(gl.getUniformLocation(program, 'u_wrap'), wrap);
//     gl.uniform1f(gl.getUniformLocation(program, 'u_flipY'), flipY ? -1 : 1);

//     gl.activeTexture(gl.TEXTURE0);
//     gl.bindTexture(gl.TEXTURE_2D, inputTexture);

//     const positionLocation = gl.getAttribLocation(program, 'a_position');
//     const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
//     const matrixLocation = gl.getUniformLocation(program, 'u_matrix');

//     gl.uniform2f(resolutionLocation, width, height);
//     const matrix = [
//       1, 0, 0,
//       0, 1, 0,
//       0, 0, 1,
//     ];
//     gl.uniformMatrix3fv(matrixLocation, false, matrix);

//     const positionBuffer = gl.createBuffer();
//     gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
//     gl.enableVertexAttribArray(positionLocation);
//     gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

//     setRectangle(gl, 0, 0, width, height);

//     // define output framebuffer
//     gl.bindFramebuffer(gl.FRAMEBUFFER, outputFramebuffer);
//     gl.viewport(0, 0, width, height);

//     gl.drawArrays(gl.TRIANGLES, 0, 6);
//   }
// }

// function createAndSetupTexture(gl) {
//   const texture = gl.createTexture();
//   gl.bindTexture(gl.TEXTURE_2D, texture);

//   // Set up texture so we can render any size image and so we are
//   // working with pixels.
//   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
//   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
//   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
//   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

//   return texture;
// }

// const common = `
//   precision highp float;
//   uniform bool u_unwrap;
//   uniform bool u_wrap;
//   uniform sampler2D u_textureData;
//   // the texCoords passed in from the vertex shader.
//   varying vec2 v_texCoord;
// `;

// const lib = `
//   ${common}
//   vec4 packFloat(float v) {
//     vec4 enc = vec4(1.0, 255.0, 65025.0, 16581375.0) * v;
//     enc = fract(enc);
//     enc -= enc.yzww * vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0);
//     return enc;
//   }

//   float unpackFloat(vec4 rgba) {
//     return dot(rgba, vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0));
//   }

//   /*
//   const vec4 bitSh = vec4(256. * 256. * 256., 256. * 256., 256., 1.);
//   const vec4 bitMsk = vec4(0., vec3(1. / 256.0));
//   const vec4 bitShifts = vec4(1.) / bitSh;

//   vec4 packFloatY(float value) {
//     vec4 comp = fract(value * bitSh);
//     comp -= comp.xxyz * bitMsk;
//     return comp;
//   }

//   float unpackFloatY(vec4 color) {
//     return dot(color, bitShifts);
//   }
//   */

//   /*
//   vec4 packFloat(const float value)
//   {
//     const vec4 bitSh = vec4(256.0*256.0*256.0, 256.0*256.0, 256.0, 1.0);
//     const vec4 bitMsk = vec4(0.0, 1.0/256.0, 1.0/256.0, 1.0/256.0);
//     vec4 res = fract(value * bitSh);
//     res -= res.xxyz * bitMsk;
//     return res;
//   }

//   float unpackFloat(const vec4 value)
//   {
//     const vec4 bitSh = vec4(1.0/(256.0*256.0*256.0), 1.0/(256.0*256.0), 1.0/256.0, 1.0);
//     return(dot(value, bitSh));
//   }
//   vec4 packFloat(const in float depth)
//   {
//       const vec4 bit_shift = vec4(256.0*256.0*256.0, 256.0*256.0, 256.0, 1.0);
//       const vec4 bit_mask  = vec4(0.0, 1.0/256.0, 1.0/256.0, 1.0/256.0);
//       vec4 res = fract(depth * bit_shift);
//       res -= res.xxyz * bit_mask;
//       return res;
//   }

//   float unpackFloat(const in vec4 rgba_depth)
//   {
//       const vec4 bit_shift = vec4(1.0/(256.0*256.0*256.0), 1.0/(256.0*256.0), 1.0/256.0, 1.0);
//       float depth = dot(rgba_depth, bit_shift);
//       return depth;
//   }
//   */

//   /*
//   const float c_precision = 128.0;
//   const float c_precisionp1 = c_precision + 1.0;

//   vec4 packFloat(float value) {
//     vec3 color;
//     color.r = mod(value, c_precisionp1) / c_precision;
//     color.b = mod(floor(value / c_precisionp1), c_precisionp1) / c_precision;
//     color.g = floor(value / (c_precisionp1 * c_precisionp1)) / c_precision;
//     return vec4(color, 1);
//   }

//   float unpackFloat(vec4 color) {
//     color = clamp(color, 0.0, 1.0);
//     return floor(color.r * c_precision + 0.5) 
//         + floor(color.b * c_precision + 0.5) * c_precisionp1
//         + floor(color.g * c_precision + 0.5) * c_precisionp1 * c_precisionp1;
//   }
//   */
// `;


// const stretchShaderSource = `
//   ${lib}
//   uniform float u_max;

//   void main() {
//     float value;
//     if (u_unwrap) {
//       value = unpackFloat(texture2D(u_textureData, v_texCoord));
//     } else {
//       value = texture2D(u_textureData, v_texCoord)[0];
//     }

//     gl_FragColor = packFloat(value / u_max);
//   }
// `;

// const sigmoidalContrastShaderSource = `
//   ${lib}
//   uniform float u_contrast;
//   uniform float u_bias;

//   float sigmoidalContrast(float v, float contrast, float bias) {
//     float alpha = bias;
//     float beta = contrast;

//     if (beta > 0.0) {
//       float denominator = 1.0 / (1.0 + exp(beta * (alpha - 1.0))) - 1.0 / (1.0 + exp(beta * alpha));
//       float numerator = 1.0 / (1.0 + exp(beta * (alpha - v))) - 1.0 / (1.0 + exp(beta * alpha));
//       return numerator / denominator;
//     } else {
//       return (
//         (beta * alpha) - log(
//           (
//             1.0 / (
//               (v / (1.0 + exp((beta * alpha) - beta))) -
//               (v / (1.0 + exp(beta * alpha))) +
//               (1.0 / (1.0 + exp(beta * alpha)))
//             )
//           ) - 1.0)
//       ) / beta;
//     }
//   }

//   void main() {
//     float value;
//     if (u_unwrap) {
//       value = unpackFloat(texture2D(u_textureData, v_texCoord));
//     } else {
//       value = texture2D(u_textureData, v_texCoord)[0];
//     }

//     gl_FragColor = packFloat(sigmoidalContrast(value, u_contrast, u_bias));
//   }

// `;

// const gammaShaderSource = `
//   ${lib}
//   uniform float u_gamma;

//   float gamma(float v, float g) {
//     return pow(v, 1.0 / g);
//   }

//   void main() {
//     float value;
//     if (u_unwrap) {
//       value = unpackFloat(texture2D(u_textureData, v_texCoord));
//     } else {
//       value = texture2D(u_textureData, v_texCoord)[0];
//     }

//     gl_FragColor = packFloat(gamma(value, u_gamma));
//   }
// `;

// const combineShaderSource = `
//   precision mediump float;
//   uniform bool u_unwrap;
//   uniform bool u_wrap;
//   uniform sampler2D u_textureRed;
//   uniform sampler2D u_textureGreen;
//   uniform sampler2D u_textureBlue;
//   // the texCoords passed in from the vertex shader.
//   varying vec2 v_texCoord;

//   float unpackFloat(vec4 rgba) {
//     return dot(rgba, vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0));
//   }

//   void main() {
//     float red = unpackFloat(texture2D(u_textureRed, v_texCoord));
//     float green = unpackFloat(texture2D(u_textureGreen, v_texCoord));
//     float blue = unpackFloat(texture2D(u_textureBlue, v_texCoord));

//     if (red == 0.0 && green == 0.0 && blue == 0.0) {
//       discard;
//     }
//     gl_FragColor = vec4(red, green, blue, 1.0);
//   }
// `;

// const renderCanvas = document.createElement('canvas');
// const gl = create3DContext(renderCanvas);
// let combineProgram;
// if (gl) {
//   combineProgram = createProgram(gl, vertexShaderSource, combineShaderSource);
//   gl.useProgram(combineProgram);

//   // look up where the vertex data needs to go.
//   const texCoordLocation = gl.getAttribLocation(combineProgram, 'a_texCoord');

//   // provide texture coordinates for the rectangle.
//   const texCoordBuffer = gl.createBuffer();
//   gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
//   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
//     0.0, 0.0,
//     1.0, 0.0,
//     0.0, 1.0,
//     0.0, 1.0,
//     1.0, 0.0,
//     1.0, 1.0]), gl.STATIC_DRAW);
//   gl.enableVertexAttribArray(texCoordLocation);
//   gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

//   // set the images
//   gl.uniform1i(gl.getUniformLocation(combineProgram, 'u_textureRed'), 0);
//   gl.uniform1i(gl.getUniformLocation(combineProgram, 'u_textureGreen'), 1);
//   gl.uniform1i(gl.getUniformLocation(combineProgram, 'u_textureBlue'), 2);
// }

// const stretchRenderer = new StepRenderer(gl, vertexShaderSource, stretchShaderSource, { max: 'u_max' });
// const stepRenderers = {
//   'sigmoidal-contrast': new StepRenderer(gl, vertexShaderSource, sigmoidalContrastShaderSource, { contrast: 'u_contrast', bias: 'u_bias' }),
//   gamma: new StepRenderer(gl, vertexShaderSource, gammaShaderSource, { value: 'u_gamma' }),
// };


// function checkFB(gl) {
//   var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
//   switch (status) {
//     case gl.FRAMEBUFFER_COMPLETE:
//       break;
//     case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
//       throw ("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_ATTACHMENT");
//       break;
//     case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
//       throw ("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT");
//       break;
//     case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
//       throw ("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_DIMENSIONS");
//       break;
//     case gl.FRAMEBUFFER_UNSUPPORTED:
//       throw ("Incomplete framebuffer: FRAMEBUFFER_UNSUPPORTED");
//       break;
//     default:
//       throw ("Incomplete framebuffer: " + status);
//   }
// }

// function renderDataWebGl(canvas, gl, pipeline, width, height, redData, greenData, blueData) {
//   try {
//     gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

//     renderCanvas.width = width;
//     renderCanvas.height = height;

//     const fboTextures = [];
//     const framebuffers = [];
//     for (let ii = 0; ii < 2; ++ii) {
//       const texture = createAndSetupTexture(gl);
//       fboTextures.push(texture);

//       // make the texture the same size as the image
//       gl.texImage2D(
//         gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0,
//         gl.RGBA, gl.UNSIGNED_BYTE, null,
//       );

//       // Create a framebuffer
//       const fbo = gl.createFramebuffer();
//       framebuffers.push(fbo);
//     }

//     const [textureRed, textureGreen, textureBlue] = [['red', redData], ['green', greenData], ['blue', blueData]].map(
//       ([color, data]) => {
//         const usedSteps = pipeline.filter(step => (step.bands === color || step.bands === 'all' || !step.bands));

//         const texture = createTexture(gl, data, width, height);
//         const outputTexture = createAndSetupTexture(gl);
//         // make the texture the same size as the image
//         gl.texImage2D(
//           gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0,
//           gl.RGBA, gl.UNSIGNED_BYTE, null,
//         );

//         if (usedSteps.length > 0) {
//           for (let i = 0; i < 2; ++i) {
//             gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[i]);
//             gl.framebufferTexture2D(
//               gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTextures[i], 0);
//             checkFB(gl);
//           }
//         } else {
//           gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[0]);
//           gl.framebufferTexture2D(
//             gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outputTexture, 0);
//           checkFB(gl);
//         }

//         // stretch to 0-1
//         stretchRenderer.render(gl, texture, framebuffers[0], false, true, false, width, height, { max: 65535 });

//         for (let i = 0; i < usedSteps.length; ++i) {
//           const step = usedSteps[i];
//           const renderer = stepRenderers[step.operation];

//           // if we are in the last step, set the target for the framebuffer to the output texture
//           if (i === usedSteps.length - 1) {
//             gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[(i + 1) % 2]);
//             gl.framebufferTexture2D(
//               gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outputTexture, 0);
//             checkFB(gl);
//           }

//           renderer.render(
//             gl,
//             fboTextures[i % 2], // input texture
//             framebuffers[(i + 1) % 2], // output framebuffer
//             i > 0, // whether float unwrapping is necessary
//             true, // whether to wrap float as rgba
//             false, // flip
//             width, height,
//             step,
//           );
//         }
//         return outputTexture;
//       });

//     gl.viewport(0, 0, width, height);

//     // const textureRed = createTexture(gl, redData, width, height);
//     // const textureGreen = createTexture(gl, greenData, width, height);
//     // const textureBlue = createTexture(gl, blueData, width, height);

//     gl.useProgram(combineProgram);

//     gl.activeTexture(gl.TEXTURE0);
//     gl.bindTexture(gl.TEXTURE_2D, textureRed);
//     gl.activeTexture(gl.TEXTURE1);
//     gl.bindTexture(gl.TEXTURE_2D, textureGreen);
//     gl.activeTexture(gl.TEXTURE2);
//     gl.bindTexture(gl.TEXTURE_2D, textureBlue);

//     const positionLocation = gl.getAttribLocation(combineProgram, 'a_position');
//     const resolutionLocation = gl.getUniformLocation(combineProgram, 'u_resolution');
//     const matrixLocation = gl.getUniformLocation(combineProgram, 'u_matrix');

//     gl.uniform1f(gl.getUniformLocation(combineProgram, 'u_flipY'), -1);

//     gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
//     const matrix = [
//       1, 0, 0,
//       0, 1, 0,
//       0, 0, 1,
//     ];
//     gl.uniformMatrix3fv(matrixLocation, false, matrix);

//     const positionBuffer = gl.createBuffer();
//     gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
//     gl.enableVertexAttribArray(positionLocation);
//     gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

//     setRectangle(gl, 0, 0, canvas.width, canvas.height);

//     // Draw the rectangle.
//     gl.bindFramebuffer(gl.FRAMEBUFFER, null);
//     gl.viewport(0, 0, width, height);
//     gl.drawArrays(gl.TRIANGLES, 0, 6);

//     // cleanup
//     gl.deleteTexture(textureRed);
//     gl.deleteTexture(textureGreen);
//     gl.deleteTexture(textureBlue);

//     // blit the current canvas on the output canvas
//     canvas.width = width;
//     canvas.height = height;
//     const ctx = canvas.getContext('2d');
//     ctx.drawImage(renderCanvas, 0, 0);
//   } catch (e) {
//     console.error(e);
//     return;
//   }
// }

let webGLRenderer = null;
if (WebGLRenderer.isSupported()) {
  webGLRenderer = new WebGLRenderer();
}

export function renderData(canvas, ...args) {
  // TODO: prefer rendering via webgl
  // const gl = create3DContext(canvas);
  if (webGLRenderer) {
    // return renderDataWebGl(canvas, gl, ...args);
    return webGLRenderer.render(canvas, ...args);
  }
  return renderData2d(canvas, ...args);
}
