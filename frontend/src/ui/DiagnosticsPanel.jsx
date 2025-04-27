import React, { useEffect, useState } from 'react';

async function getDiagnostics() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl');
  const ext = gl?.getExtension('WEBGL_debug_renderer_info');
  const renderer = ext
    ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
    : 'unknown';
  const usingIGPU = /intel|uhd/i.test(renderer);

  const batteryInfo = await (navigator.getBattery ? navigator.getBattery() : Promise.resolve({ charging: true }));
  const onBattery = !batteryInfo.charging;

  let fps = 0;
  await new Promise(resolve => {
    let count = 0;
    const start = performance.now();
    function loop() {
      count++;
      if (performance.now() - start < 1000) {
        requestAnimationFrame(loop);
      } else {
        fps = count;
        resolve();
      }
    }
    loop();
  });

  const memGB = navigator.deviceMemory || 'unknown';
  const cores = navigator.hardwareConcurrency || 'unknown';

  return { renderer, usingIGPU, onBattery, fps, memGB, cores };
}

export default function DiagnosticsPanel() {
  const [diag, setDiag] = useState(null);

  useEffect(() => {
    getDiagnostics().then(setDiag);
  }, []);

  useEffect(() => {
    if (diag) {
      console.group('System Diagnostics');
      console.log('Renderer:', diag.renderer);
      if (diag.usingIGPU) console.warn('Using integrated GPU');
      console.log('Power:', diag.onBattery ? 'Battery' : 'AC');
      if (diag.onBattery) console.warn('Running on battery');
      console.log('FPS (1s):', diag.fps);
      if (diag.fps < 30) console.warn('Low FPS');
      console.log('Memory (GB):', diag.memGB);
      console.log('CPU Cores:', diag.cores);
      console.groupEnd();
    }
  }, [diag]);

  if (!diag) return <div>Running diagnostics...</div>;

  return (
    <div style={{ padding: '1rem', background: '#fafafa', border: '1px solid #ddd', margin: '1rem 0' }}>
      <h3>System Diagnostics</h3>
      <p><strong>Renderer:</strong> {diag.renderer}</p>
      {diag.usingIGPU && <p style={{color:'orange'}}>Warning: Using integrated GPU</p>}
      <p><strong>Power:</strong> {diag.onBattery ? 'Battery' : 'AC connected'}</p>
      {diag.onBattery && <p style={{color:'orange'}}>Warning: Running on battery</p>}
      <p><strong>FPS (1s test):</strong> {diag.fps}</p>
      {diag.fps < 30 && <p style={{color:'red'}}>Warning: Low FPS</p>}
      <p><strong>Memory (GB):</strong> {diag.memGB}</p>
      <p><strong>CPU Cores:</strong> {diag.cores}</p>
    </div>
  );
}
