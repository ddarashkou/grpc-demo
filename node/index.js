const express = require("express");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const packageDef = protoLoader.loadSync("./proto/analyzer.proto");
const grpcObject = grpc.loadPackageDefinition(packageDef);
const analyzerPackage = grpcObject.analyzer;

const client = new analyzerPackage.AnalyzerService(
  "python:50051",
  grpc.credentials.createInsecure()
);

const benchmark = require("./benchmark");

const app = express();

// serve UI
app.use(express.static(path.join(__dirname, "public")));

// REST → gRPC
app.get("/api/analyze/:number", (req, res) => {
  const number = parseInt(req.params.number);

  client.Analyze({ number }, (err, response) => {
    if (err) return res.status(500).send(err);
    res.json(response);
  });
});

// STREAMING endpoint
app.get("/api/stream/:number", (req, res) => {
  const number = parseInt(req.params.number);
  const call = client.StreamFactors({ number });

  res.writeHead(200, {
    "Content-Type": "text/plain",
    "Transfer-Encoding": "chunked"
  });

  call.on("data", (chunk) => {
    res.write(chunk.factor + "\n");
  });

  call.on("end", () => res.end());
});

app.get("/api/benchmark", async (req, res) => {
  try {
    const result = await benchmark.runBenchmark();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || "Benchmark failed" });
  }
});

app.listen(3000, () => {
  console.log("Node running on 3000");
});