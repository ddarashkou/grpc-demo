const axios = require("axios");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const packageDef = protoLoader.loadSync("../proto/analyzer.proto");
const grpcObject = grpc.loadPackageDefinition(packageDef);
const client = new grpcObject.analyzer.AnalyzerService(
  "python:50051",
  grpc.credentials.createInsecure()
);

const TEST_NUMBER = 123456;

async function testREST() {
  const start = Date.now();
  for (let i = 0; i < 50; i++) {
    await axios.get(`http://python:5000/analyze/${TEST_NUMBER}`);
  }
  console.log("REST time:", Date.now() - start, "ms");
}

function testGRPC() {
  return new Promise((resolve) => {
    const start = Date.now();
    let completed = 0;

    for (let i = 0; i < 50; i++) {
      client.Analyze({ number: TEST_NUMBER }, () => {
        completed++;
        if (completed === 50) {
          console.log("gRPC time:", Date.now() - start, "ms");
          resolve();
        }
      });
    }
  });
}

(async () => {
  await testREST();
  await testGRPC();
})();