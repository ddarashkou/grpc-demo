import grpc
from concurrent import futures
import analyzer_pb2
import analyzer_pb2_grpc
import math
import threading
from flask import Flask, jsonify
from transformers import AutoTokenizer, AutoModelForCausalLM, TextIteratorStreamer
import torch
import os

app = Flask(__name__)

# Global model variables
model = None
tokenizer = None

def load_model():
    global model, tokenizer
    hf_token = os.getenv("HUGGINGFACE_API_TOKEN", None)
    print("Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen2-0.5B-Instruct", token=hf_token)
    print("Loading model...")
    model = AutoModelForCausalLM.from_pretrained("Qwen/Qwen2-0.5B-Instruct", token=hf_token)
    print("Model loaded successfully")

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
        for factor in self.get_factors(n):
            yield analyzer_pb2.FactorResponse(factor=factor)

    def ExplainText(self, request, context):
        topic = request.text
        
        prompt = f"""
            <|im_start|>system
            You are a senior backend engineer explaining concepts to JavaScript developers.
            Rules:
            - keep responses concise
            - keep responses accurate
            - use simple language
            - include one practical example
            - maximum 120 words
            <|im_end|>

            <|im_start|>user
            Explain this concept:

            {topic}
            <|im_end|>

            <|im_start|>assistant
          """

        inputs = tokenizer(prompt, return_tensors="pt")
        
        streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)
        
        generation_kwargs = dict(
            **inputs,
            streamer=streamer,
            max_new_tokens=300,
            temperature=0.5,
            top_p=0.9,
            do_sample=True,
            repetition_penalty=1.1,
            pad_token_id=tokenizer.eos_token_id
        )
        
        # Start generation in a separate thread
        thread = threading.Thread(target=model.generate, kwargs=generation_kwargs)
        thread.start()
        
        # Stream tokens as they arrive
        token_count = 0
        for token in streamer:
            if token is not None and len(token) > 0:
                token_count += 1
                yield analyzer_pb2.TextChunk(content=str(token))
        
        if token_count == 0:
            print(f"Warning: No tokens generated for number {n}")

    def is_prime(self, n):
        if n < 2:
            return False
        if n % 2 == 0:
            return n == 2
        limit = int(math.sqrt(n))
        for i in range(3, limit + 1, 2):
            if n % i == 0:
                return False
        return True

    def get_factors(self, n):
        if n <= 0:
            return []

        small = []
        large = []
        limit = int(math.sqrt(n))

        for i in range(1, limit + 1):
            if n % i == 0:
                small.append(i)
                other = n // i
                if other != i:
                    large.append(other)

        return small + large[::-1]

    def is_fibonacci(self, n):
        def is_perfect_square(x):
            s = int(math.sqrt(x))
            return s * s == x
        return is_perfect_square(5 * n * n + 4) or is_perfect_square(5 * n * n - 4)


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
    # Load model on startup
    print("Loading model, please wait...", flush=True)
    load_model()
    print("model loaded, starting gRPC server...", flush=True)
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    analyzer_pb2_grpc.add_AnalyzerServiceServicer_to_server(Analyzer(), server)
    server.add_insecure_port('[::]:50051')
    server.start()
    print("gRPC running on 50051", flush=True)
    server.wait_for_termination()


if __name__ == '__main__':
    threading.Thread(target=run_rest).start()
    serve_grpc()
