# OCR Service

FastAPI microservice used by the main backend to extract a Tunisian license plate number and VIN/chassis number from vehicle registration document images.

## Run Locally

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

API docs are available at:

```text
http://127.0.0.1:8000/docs
```
