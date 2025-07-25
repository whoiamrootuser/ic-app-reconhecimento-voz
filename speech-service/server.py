import asyncio
import websockets
import json
from vosk import Model, KaldiRecognizer

# --- Configuration ---
# Make sure the model path is correct
MODEL_PATH = "vosk-model-small-pt-0.3" 
WEBSOCKET_HOST = "localhost"
WEBSOCKET_PORT = 8765
# The sample rate must match the frontend (16000)
SAMPLE_RATE = 16000.0

# Load the Vosk model
# If the model is not found, a FileNotFoundError will be raised.
print("Loading Vosk model...")
try:
    model = Model(MODEL_PATH)
except Exception as e:
    print(f"Error loading model from '{MODEL_PATH}': {e}")
    print("Please make sure the model path is correct and the model files are accessible.")
    exit(1)
print("Vosk model loaded successfully.")

# This function handles a single WebSocket connection from a client.
async def recognize(websocket):
    """
    Handles a WebSocket connection, receives audio, and sends back transcripts.
    """
    client_address = websocket.remote_address
    print(f"Client connected: {client_address}")

    # Create a recognizer instance for this connection
    recognizer = KaldiRecognizer(model, SAMPLE_RATE)
    
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
                
                print(f"Sent partial result to {client_address}: {response['transcript']}")

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
    # Start the WebSocket server
    print(f"Starting WebSocket server on ws://{WEBSOCKET_HOST}:{WEBSOCKET_PORT}")
    async with websockets.serve(recognize, WEBSOCKET_HOST, WEBSOCKET_PORT):
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nServer shutting down.")