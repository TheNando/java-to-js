const MAX_VALUES = 5000;
const THRESHOLD = MAX_VALUES * 0.7;

let instance = Symbol();

class Random {
  constructor(instanceSymbol) {
    if (instanceSymbol !== instance) {
      throw new Error('Must use Random.instance to get instance.');
    }

    this.values = window.crypto.getRandomValues(new Uint8Array(MAX_VALUES));
    this.position = 0;
    this.valuesBuffer = null;

    // Watch the threshold to repopulate buffer
    // TODO: This doesn't work because game loop locks thread
    window.setInterval(() => {
      this.checkThreshold();
    }, 200);
  }

  static get instance() {
    if (!this[instance]) {
      this[instance] = new Random(instance);
    }
    return this[instance];
  }

  bufferValues() {
    this.valuesBuffer = window.crypto.getRandomValues(
      new Uint8Array(MAX_VALUES)
    );
  }

  bufferSwap() {
    this.values = this.valuesBuffer;
    this.position = 0;
  }

  checkThreshold() {
    if (this.position > THRESHOLD) {
      this.bufferValues();
    }
  }

  // Only works when divisor is a power of 2
  highPerfModulo(dividend, divisor) {
    return dividend & (divisor - 1);
  }

  // Doesn't work for 0, but luckily, we won't need to check for 0
  isPowerOfTwo(num) {
    return (num & (num - 1)) == 0;
  }

  nextInt(number) {
    if (this.isPowerOfTwo(number)) {
      return this.highPerfModulo(this.nextValue(), number);
    }
    return this.nextValue() % number;
  }

  nextValue() {
    let value = this.values[this.position];
    this.position += 1;
    if (this.position === THRESHOLD) {
      this.bufferSwap();
    }
    return value;
  }
}

class SeededRandom {
  constructor(max, min, seed) {
    this.max = max || 1;
    this.min = min || 0;
    this.seed = seed || 1;
  }

  next() {
    let rnd;

    this.seed = (this.seed * 9301 + 49297) % 233280;
    rnd = this.seed / 233280;

    return this.min + rnd * (this.max - this.min);
  }
}

export default Random;
