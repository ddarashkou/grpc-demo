import grpc
from concurrent import futures
import analyzer_pb2
import analyzer_pb2_grpc
import math
import threading
from flask import Flask, jsonify

app = Flask(__name__)

class Analyzer(analyzer_pb2_grpc.AnalyzerServiceServicer):

    def Analyze(self, request, context):
        n = request.number
        return analyzer_pb2.NumberResponse(
            isPrime=self.is_prime(n),
            factors=self.get_factors(n),
            isFibonacci=self.is_fibonacci(n)
        )

    def StreamFactors(self, request, context):
        n = request.number
        for i in range(1, n + 1):
            if n % i == 0:
                yield analyzer_pb2.FactorResponse(factor=i)

    def is_prime(self, n):
        if n < 2:
            return False
        for i in range(2, int(math.sqrt(n)) + 1):
            if n % i == 0:
                return False
        return True

    def get_factors(self, n):
        return [i for i in range(1, n + 1) if n % i == 0]

    def is_fibonacci(self, n):
        def is_perfect_square(x):
            s = int(math.sqrt(x))
            return s*s == x
        return is_perfect_square(5*n*n + 4) or is_perfect_square(5*n*n - 4)


@app.route("/analyze/<int:n>")
def analyze_rest(n):
    analyzer = Analyzer()
    return jsonify({
        "isPrime": analyzer.is_prime(n),
        "factors": analyzer.get_factors(n),
        "isFibonacci": analyzer.is_fibonacci(n)
    })


def run_rest():
    app.run(host="0.0.0.0", port=5000)


def serve_grpc():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    analyzer_pb2_grpc.add_AnalyzerServiceServicer_to_server(Analyzer(), server)
    server.add_insecure_port('[::]:50051')
    server.start()
    print("gRPC running on 50051")
    server.wait_for_termination()


if __name__ == '__main__':
    threading.Thread(target=run_rest).start()
    serve_grpc()