/**
 * Records a short, silent clip in the browser, a dot crossing a field, and returns its URL.
 * Stories load it, so the repository holds no video files.
 */
export async function recordClip(seconds = 1): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 180;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No 2D canvas to record');
  const recorder = new MediaRecorder(canvas.captureStream(30), {
    mimeType: 'video/webm',
  });
  const chunks: Blob[] = [];
  recorder.addEventListener('dataavailable', (event) => {
    chunks.push(event.data);
  });
  const stopped = new Promise((resolve) => {
    recorder.addEventListener('stop', resolve);
  });
  recorder.start();
  const start = performance.now();
  await new Promise<void>((resolve) => {
    const draw = (now: number) => {
      const progress = Math.min(1, (now - start) / (seconds * 1000));
      context.fillStyle = '#c6daec';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#0a6fbf';
      context.beginPath();
      context.arc(40 + progress * 240, 90, 30, 0, Math.PI * 2);
      context.fill();
      if (progress < 1) requestAnimationFrame(draw);
      else resolve();
    };
    requestAnimationFrame(draw);
  });
  recorder.stop();
  await stopped;
  return URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
}
