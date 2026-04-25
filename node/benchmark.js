const axios = require("axios");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const protobuf = require("protobufjs");
const { promisify } = require("util");
const { performance } = require("perf_hooks");

const TEST_NUMBER = 123456;
const ITERATIONS = 100;

const packageDef = protoLoader.loadSync("./proto/analyzer.proto", {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const grpcObject = grpc.loadPackageDefinition(packageDef);
const client = new grpcObject.analyzer.AnalyzerService(
  "python:50051",
  grpc.credentials.createInsecure()
);
const analyzeGrpc = promisify(client.Analyze.bind(client));

const protoRoot = protobuf.loadSync("./proto/analyzer.proto");
const NumberResponseType = protoRoot.lookupType("analyzer.NumberResponse");

function formatNumber(value, decimals = 2) {
  return Number(value).toFixed(decimals);
}

function formatBytes(bytes) {
  return `${bytes} bytes`;
}

function measureTime() {
  return performance.now();
}

async function callRest() {
  const response = await axios.get(`http://python:5000/analyze/${TEST_NUMBER}`);
  return response.data;
}

async function callGrpc() {
  return analyzeGrpc({ number: TEST_NUMBER });
}

async function benchmarkRequests(label, fn) {
  const start = measureTime();
  let lastResponse;

  for (let i = 0; i < ITERATIONS; i++) {
    lastResponse = await fn();
  }

  const totalMs = measureTime() - start;
  const avgMs = totalMs / ITERATIONS;
  const rps = (ITERATIONS * 1000) / totalMs;

  return {
    label,
    totalMs,
    avgMs,
    rps,
    lastResponse,
  };
}

function computePayloadSizes(response) {
  const jsonString = JSON.stringify(response);
  const jsonSize = Buffer.byteLength(jsonString, "utf8");
  const message = NumberResponseType.create(response);
  const protobufBuffer = NumberResponseType.encode(message).finish();
  const protobufSize = protobufBuffer.length;
  const reduction = ((jsonSize - protobufSize) / jsonSize) * 100;

  return {
    jsonSize,
    protobufSize,
    reduction,
  };
}

function printBenchmarkSection(sectionLabel, result) {
  console.log(sectionLabel);
  console.log("-------------------------------------");
  console.log(`* total time: ${formatNumber(result.totalMs, 2)} ms`);
  console.log(`* avg latency: ${formatNumber(result.avgMs, 2)} ms`);
  console.log(`* requests/sec: ${formatNumber(result.rps, 1)}`);
  console.log();
}

function printPayloadSection(payloadSizes) {
  console.log("PAYLOAD SIZE");
  console.log("============");
  console.log(`JSON: ${formatBytes(payloadSizes.jsonSize)}`);
  console.log(`PROTOBUF: ${formatBytes(payloadSizes.protobufSize)}`);
  console.log(`REDUCTION: ${formatNumber(payloadSizes.reduction, 1)}%`);
}

async function runBenchmark() {
  const restResult = await benchmarkRequests("REST", callRest);
  const grpcResult = await benchmarkRequests("gRPC", callGrpc);

  const sampleResponse = restResult.lastResponse || grpcResult.lastResponse;
  const payloadSizes = computePayloadSizes(sampleResponse);

  console.log("=====================================");
  console.log("BENCHMARK RESULTS");
  console.log("=====================================");
  console.log();

  printBenchmarkSection("REST", restResult);
  printBenchmarkSection("gRPC", grpcResult);
  printPayloadSection(payloadSizes);
  console.log("=====================================");

  return {
    testNumber: TEST_NUMBER,
    iterations: ITERATIONS,
    restResult,
    grpcResult,
    payloadSizes,
  };
}

if (require.main === module) {
  (async () => {
    try {
      await runBenchmark();
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  })();
}

module.exports = { runBenchmark };
