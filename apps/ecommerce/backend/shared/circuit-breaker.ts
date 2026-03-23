type CircuitState = "closed" | "open" | "half-open";

interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  halfOpenMaxCalls: number;
}

const DEFAULTS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeout: 30_000,
  halfOpenMaxCalls: 3,
};

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private lastFailureTime = 0;
  private halfOpenCalls = 0;
  private options: CircuitBreakerOptions;

  constructor(
    private name: string,
    options?: Partial<CircuitBreakerOptions>
  ) {
    this.options = { ...DEFAULTS, ...options };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime >= this.options.resetTimeout) {
        this.state = "half-open";
        this.halfOpenCalls = 0;
      } else {
        throw new Error(`Circuit breaker "${this.name}" is open`);
      }
    }

    if (
      this.state === "half-open" &&
      this.halfOpenCalls >= this.options.halfOpenMaxCalls
    ) {
      throw new Error(`Circuit breaker "${this.name}" half-open limit reached`);
    }

    try {
      if (this.state === "half-open") this.halfOpenCalls++;
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = "closed";
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.options.failureThreshold) {
      this.state = "open";
      console.warn(`Circuit breaker "${this.name}" opened after ${this.failureCount} failures`);
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}
