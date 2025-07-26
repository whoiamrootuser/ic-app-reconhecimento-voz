import asyncio
import websockets
import json
import os
import sys
from vosk import Model, KaldiRecognizer

# --- Configuration ---
# Make sure the model path is correct
MODEL_PATH = "vosk-model-small-pt-0.3" 
WEBSOCKET_HOST = "0.0.0.0"
WEBSOCKET_PORT = 8765
# The sample rate must match the frontend (16000)
SAMPLE_RATE = 16000.0

# Global model variable
model = None

def load_vosk_model():
    """Load the Vosk model with detailed logging"""
    global model
    
    print(f"Loading Vosk model from: {MODEL_PATH}")
    print(f"Current working directory: {os.getcwd()}")
    print(f"Model path exists: {os.path.exists(MODEL_PATH)}")
    
    if os.path.exists(MODEL_PATH):
        print(f"Contents of model directory:")
        try:
            for item in os.listdir(MODEL_PATH):
                item_path = os.path.join(MODEL_PATH, item)
                if os.path.isfile(item_path):
                    size = os.path.getsize(item_path)
                    print(f"  File: {item} ({size} bytes)")
                else:
                    print(f"  Directory: {item}")
        except Exception as e:
            print(f"Error listing model directory: {e}")
    
    try:
        print("Initializing Vosk model...")
        model = Model(MODEL_PATH)
        print("Vosk model loaded successfully!")
        return True
    except Exception as e:
        print(f"Error loading model from '{MODEL_PATH}': {e}")
        print("Please make sure the model path is correct and the model files are accessible.")
        return False

# This function handles a single WebSocket connection from a client.
async def recognize(websocket):
    """
    Handles a WebSocket connection, receives audio, and sends back transcripts.
    """
    global model
    
    client_address = websocket.remote_address
    print(f"Client connected: {client_address}")

    # Check if model is loaded
    if model is None:
        print(f"Model not loaded, closing connection to {client_address}")
        await websocket.close(code=1003, reason="Model not loaded")
        return

    # Create a recognizer instance for this connection
    try:
        recognizer = KaldiRecognizer(model, SAMPLE_RATE)
    except Exception as e:
        print(f"Error creating recognizer for {client_address}: {e}")
        await websocket.close(code=1003, reason="Failed to create recognizer")
        return
    
    try:
        # Loop indefinitely, processing messages from the client
        async for message in websocket:
            # The frontend sends raw audio data (16-bit PCM)
            if recognizer.AcceptWaveform(message):
                # recognizer.Result() gives the final transcript for a segment
                result_json = recognizer.Result()
                result = json.loads(result_json)
                
                # Format the response for the frontend
                response = {
                    "is_final": True,
                    "transcript": result.get("text", "")
                }
                await websocket.send(json.dumps(response))
                print(f"Sent final result to {client_address}: {response['transcript']}")
            else:
                # recognizer.PartialResult() gives the interim transcript
                partial_result_json = recognizer.PartialResult()
                partial_result = json.loads(partial_result_json)
                
                # Format the response for the frontend
                response = {
                    "is_final": False,
                    "transcript": partial_result.get("partial", "")
                }
                await websocket.send(json.dumps(response))
                # Uncomment the line below for verbose logging of partial results
                # print(f"Sent partial result to {client_address}: {response['transcript']}")

    except websockets.exceptions.ConnectionClosedOK:
        print(f"Client disconnected cleanly: {client_address}")
    except websockets.exceptions.ConnectionClosedError as e:
        print(f"Client connection closed with error: {client_address} - {e}")
    except Exception as e:
        print(f"An unexpected error occurred with client {client_address}: {e}")
    finally:
        # On disconnect, get the final result from any remaining buffered audio
        final_result_json = recognizer.FinalResult()
        final_result = json.loads(final_result_json)
        response = {
            "is_final": True,
            "transcript": final_result.get("text", "")
        }
        if response["transcript"]:
            await websocket.send(json.dumps(response))
            print(f"Sent final buffered result to {client_address}: {response['transcript']}")
        print(f"Connection with {client_address} closed.")

# --- Main Server Execution ---
async def main():
    # Load the model before starting the server
    print("Initializing speech recognition service...")
    if not load_vosk_model():
        print("Failed to load Vosk model. Exiting.")
        sys.exit(1)
    
    # Start the WebSocket server
    print(f"Starting WebSocket server on ws://{WEBSOCKET_HOST}:{WEBSOCKET_PORT}")
    print("Server ready to accept connections!")
    async with websockets.serve(recognize, WEBSOCKET_HOST, WEBSOCKET_PORT):
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nServer shutting down.")
    except Exception as e:
        print(f"Server error: {e}")
        sys.exit(1)