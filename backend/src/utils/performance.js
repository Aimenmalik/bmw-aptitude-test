class PerformanceMonitor {
  static logPerformance(operation, startTime, additionalData = {}) {
    const duration = Date.now() - startTime;
    const logData = {
      operation,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      ...additionalData,
    };

    if (duration > 1000) {
      console.warn("Slow query detected:", logData);
    } else {
      console.log("Request completed:", logData);
    }
  }
}

module.exports = PerformanceMonitor;
