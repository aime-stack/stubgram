
import os
import subprocess

def check_env():
    print("--- Environment Check ---")
    path = os.environ.get('PATH', '')
    print(f"PATH: {path[:200]}...")
    
    system32_found = "System32" in path
    print(f"System32 in PATH: {system32_found}")
    
    try:
        subprocess.run(["cmd.exe", "/c", "echo hello"], capture_output=True)
        print("cmd.exe: FOUND and WORKING")
    except FileNotFoundError:
        print("cmd.exe: NOT FOUND in PATH!")
    
    try:
        subprocess.run(["npx", "expo", "-v"], capture_output=True)
        print("expo cli: FOUND and WORKING")
    except Exception as e:
        print(f"expo cli: ERROR: {e}")

if __name__ == "__main__":
    check_env()
