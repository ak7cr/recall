"""Upload bundled demo transcripts to a running local API and await processing."""
import time
from pathlib import Path
import httpx
BASE="http://localhost:8000/api"
def main():
    with httpx.Client(timeout=60) as client:
        for path in sorted(Path('sample_data').glob('*.txt')):
            with path.open('rb') as f:r=client.post(BASE+'/meetings',files={'file':(path.name,f,'text/plain')})
            r.raise_for_status();mid=r.json()['id'];print(f'Uploaded {path.name}: {mid}')
            for _ in range(300):
                status=client.get(f'{BASE}/meetings/{mid}/status').json()
                if status['status'] in {'ready','failed'}:print(status);break
                time.sleep(2)
if __name__=='__main__':main()
