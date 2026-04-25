const runButton = document.getElementById("runBenchmark");
const statusText = document.getElementById("status");
const restTime = document.getElementById("restTime");
const grpcTime = document.getElementById("grpcTime");
const restAvg = document.getElementById("restAvg");
const grpcAvg = document.getElementById("grpcAvg");
const restRps = document.getElementById("restRps");
const grpcRps = document.getElementById("grpcRps");
const jsonSize = document.getElementById("jsonSize");
const protobufSize = document.getElementById("protobufSize");
const reduction = document.getElementById("reduction");
const benchmarkLog = document.getElementById("benchmarkLog");

function resetStats() {
  restTime.textContent = "—";
  grpcTime.textContent = "—";
  restAvg.textContent = "—";
  grpcAvg.textContent = "—";
  restRps.textContent = "—";
  grpcRps.textContent = "—";
  jsonSize.textContent = "—";
  protobufSize.textContent = "—";
  reduction.textContent = "—";
}

async function runBenchmark() {
  statusText.textContent = "Running benchmark...";
  benchmarkLog.textContent = "Sending requests to /api/benchmark...";
  resetStats();

  try {
    const response = await fetch("/api/benchmark");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Benchmark failed");
    }

    const logLines = [
      `Benchmark finished for number: ${data.testNumber}`,
      `Iterations: ${data.iterations}`,
      `REST total: ${data.restResult.totalMs.toFixed(2)} ms`,
      `gRPC total: ${data.grpcResult.totalMs.toFixed(2)} ms`,
      `REST avg: ${data.restResult.avgMs.toFixed(2)} ms`,
      `gRPC avg: ${data.grpcResult.avgMs.toFixed(2)} ms`,
      `REST rps: ${data.restResult.rps.toFixed(1)}`,
      `gRPC rps: ${data.grpcResult.rps.toFixed(1)}`,
      `JSON payload: ${data.payloadSizes.jsonSize} bytes`,
      `Protobuf payload: ${data.payloadSizes.protobufSize} bytes`,
      `Reduction: ${data.payloadSizes.reduction.toFixed(1)}%`
    ];

    benchmarkLog.textContent = logLines.join("\n");
    restTime.textContent = `${data.restResult.totalMs.toFixed(2)} ms`;
    grpcTime.textContent = `${data.grpcResult.totalMs.toFixed(2)} ms`;
    restAvg.textContent = `${data.restResult.avgMs.toFixed(2)} ms`;
    grpcAvg.textContent = `${data.grpcResult.avgMs.toFixed(2)} ms`;
    restRps.textContent = `${data.restResult.rps.toFixed(1)}`;
    grpcRps.textContent = `${data.grpcResult.rps.toFixed(1)}`;
    jsonSize.textContent = `${data.payloadSizes.jsonSize} bytes`;
    protobufSize.textContent = `${data.payloadSizes.protobufSize} bytes`;
    reduction.textContent = `${data.payloadSizes.reduction.toFixed(1)}%`;
    statusText.textContent = "Benchmark complete.";
  } catch (error) {
    benchmarkLog.textContent = error.message || "Benchmark error.";
    statusText.textContent = "Failed to run benchmark.";
  }
}

runButton.addEventListener("click", runBenchmark);
