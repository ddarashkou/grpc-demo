const runButton = document.getElementById("runBenchmark");
const statusText = document.getElementById("status");
const restTime = document.getElementById("restTime");
const grpcTime = document.getElementById("grpcTime");
const restPerCall = document.getElementById("restPerCall");
const grpcPerCall = document.getElementById("grpcPerCall");
const benchmarkLog = document.getElementById("benchmarkLog");

async function runBenchmark() {
  statusText.textContent = "Running benchmark...";
  benchmarkLog.textContent = "Sending requests to /api/benchmark...";
  restTime.textContent = "—";
  grpcTime.textContent = "—";
  restPerCall.textContent = "—";
  grpcPerCall.textContent = "—";

  try {
    const response = await fetch("/api/benchmark");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Benchmark failed");
    }

    const logLines = [
      `Benchmark finished for number: ${data.number}`,
      `Iterations: ${data.iterations}`,
      `REST total: ${data.restMs} ms`,
      `gRPC total: ${data.grpcMs} ms`,
      `REST per call: ${data.restPerCallMs.toFixed(2)} ms`,
      `gRPC per call: ${data.grpcPerCallMs.toFixed(2)} ms`
    ];

    benchmarkLog.textContent = logLines.join("\n");
    restTime.textContent = `${data.restMs} ms`;
    grpcTime.textContent = `${data.grpcMs} ms`;
    restPerCall.textContent = `${data.restPerCallMs.toFixed(2)} ms`;
    grpcPerCall.textContent = `${data.grpcPerCallMs.toFixed(2)} ms`;
    statusText.textContent = "Benchmark complete.";
  } catch (error) {
    benchmarkLog.textContent = error.message || "Benchmark error.";
    statusText.textContent = "Failed to run benchmark.";
  }
}

runButton.addEventListener("click", runBenchmark);
