const axios = require("axios");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const packageDef = protoLoader.loadSync("./proto/analyzer.proto");
const grpcObject = grpc.loadPackageDefinition(packageDef);
const client = new grpcObject.analyzer.AnalyzerService(
  "python:50051",
  grpc.credentials.createInsecure()
);

const TEST_NUMBER = 123456789;
const ITERATIONS = 50;

async function testREST() {
  const start = Date.now();
  for (let i = 0; i < ITERATIONS; i++) {
    await axios.get(`http://python:5000/analyze/${TEST_NUMBER}`);
  }
  return Date.now() - start;
}

function testGRPC() {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    let completed = 0;

    for (let i = 0; i < ITERATIONS; i++) {
      client.Analyze({ number: TEST_NUMBER }, (err) => {
        if (err) return reject(err);
        completed++;
        if (completed === ITERATIONS) {
          resolve(Date.now() - start);
        }
      });
    }
  });
}

async function runBenchmark() {
  const restMs = await testREST();
  const grpcMs = await testGRPC();

  return {
    number: TEST_NUMBER,
    iterations: ITERATIONS,
    restMs,
    grpcMs,
    restPerCallMs: restMs / ITERATIONS,
    grpcPerCallMs: grpcMs / ITERATIONS,
  };
}

if (require.main === module) {
  (async () => {
    try {
      const result = await runBenchmark();
      console.log("Benchmark result:", result);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  })();
}

module.exports = { runBenchmark };