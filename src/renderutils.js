export function toMathArray(input) {
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

export function toOriginalArray(input, Type) {
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

export function sigmoidalContrast(data, contrast, bias) {
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

export function gamma(data, g) {
  for (let i = 0; i < data.length; ++i) {
    data[i] **= (1 / g);
  }
  return data;
}

