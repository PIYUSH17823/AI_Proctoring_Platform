import requests
import json
import os

BASE_URL = "http://127.0.0.1:8000"

def test_start_interview():
    print("Testing /api/interviews/start...")
    payload = {"candidate_name": "Test Candidate"}
    response = requests.post(f"{BASE_URL}/api/interviews/start", json=payload)
    if response.status_code == 200:
        data = response.json()
        print(f"Success! Session ID: {data['session_id']}")
        return data['session_id']
    else:
        print(f"Failed! Status: {response.status_code}, Response: {response.text}")
        return None

def test_submit_interview(session_id):
    print(f"\nTesting /api/interviews/{session_id}/submit...")
    
    # Create a dummy video file
    video_path = "test_video.webm"
    with open(video_path, "wb") as f:
        f.write(b"this is a dummy video content")
    
    logs = [
        {"timestamp": 5000, "type": "NO_FACE"},
        {"timestamp": 15000, "type": "MULTIPLE_FACES"}
    ]
    
    files = {
        'video': (video_path, open(video_path, 'rb'), 'video/webm')
    }
    data = {
        'logsJson': json.dumps(logs)
    }
    
    response = requests.post(f"{BASE_URL}/api/interviews/{session_id}/submit", files=files, data=data)
    
    # Cleanup dummy file
    files['video'][1].close()
    if os.path.exists(video_path):
        os.remove(video_path)
        
    if response.status_code == 200:
        print("Success! Interview submitted.")
        print(response.json())
    else:
        print(f"Failed! Status: {response.status_code}, Response: {response.text}")

def test_get_sessions():
    print("\nTesting /api/sessions...")
    response = requests.get(f"{BASE_URL}/api/sessions")
    if response.status_code == 200:
        sessions = response.json()
        print(f"Success! Found {len(sessions)} sessions.")
        if sessions:
            print(f"Last session ID: {sessions[-1]['session_id']}")
    else:
        print(f"Failed! Status: {response.status_code}, Response: {response.text}")

if __name__ == "__main__":
    try:
        session_id = test_start_interview()
        if session_id:
            test_submit_interview(session_id)
            test_get_sessions()
    except requests.exceptions.ConnectionError:
        print("Could not connect to the server. Please make sure the backend is running at http://127.0.0.1:8000")
