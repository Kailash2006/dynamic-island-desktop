import { island } from '../activityManager.js';
import { showStatus } from './status.js';

let ticker = null;

export const download = {
  startDemo(fileName = 'project-assets.zip', totalMB = 148) {
    clearInterval(ticker);
    let received = 0;
    island.show({ id: 'download', type: 'download', kind: 'live', fileName, totalMB, receivedMB: 0, speed: 0 });
    ticker = setInterval(() => {
      const speed = 3.2 + Math.random() * 4.6; // MB per tick-second
      received = Math.min(totalMB, received + speed * 0.5);
      island.update('download', { receivedMB: received, speed });
      if (received >= totalMB) {
        clearInterval(ticker);
        setTimeout(() => {
          island.remove('download');
          showStatus('success', 'Download complete', fileName);
        }, 450);
      }
    }, 500);
  },
  cancel() {
    clearInterval(ticker);
    island.remove('download');
  },
};
