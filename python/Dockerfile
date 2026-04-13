FROM python:3.11

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
COPY ../proto ../proto

RUN python -m grpc_tools.protoc -I../proto --python_out=. --grpc_python_out=. ../proto/analyzer.proto

CMD ["python", "server.py"]