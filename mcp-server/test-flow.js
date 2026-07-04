const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:7865');

function sendRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const handler = (dataStr) => {
      try {
        const msg = JSON.parse(dataStr.toString());
        if (msg.type === 'route_test_response') {
          ws.off('message', handler);
          if (msg.success) {
            console.log(`[PASS] ${method}:`, msg.result);
            resolve(msg.result);
          } else {
            console.error(`[FAIL] ${method}:`, msg.error);
            reject(new Error(msg.error));
          }
        }
      } catch (e) {
        console.error('Error parsing response:', e);
      }
    };
    ws.on('message', handler);

    ws.send(JSON.stringify({
      type: 'route_test_request',
      method,
      params
    }));
  });
}

ws.on('open', async () => {
  console.log('Connected to NodeNaut companion bridge!');
  
  // 1. Register as dashboard client to get access
  ws.send(JSON.stringify({ type: 'register_dashboard' }));
  
  // Wait a moment for registration to settle
  await new Promise(r => setTimeout(r, 1000));

  try {
    console.log('Executing test flow...');

    // Step A: Spawn a tab to Google
    console.log('\n--- Step 1: SPAWN Tab ---');
    await sendRequest('SPAWN', { url: 'https://www.google.com' });

    // Step B: Wait for load stability
    console.log('\n--- Step 2: WAIT 3000ms ---');
    await sendRequest('WAIT', { duration: 3000 });

    // Step C: Type search query into Google input 'q'
    console.log('\n--- Step 3: TYPE Search Query ---');
    try {
      await sendRequest('TYPE', { selector: 'textarea[name="q"]', text: 'NodeNaut Chrome Extension', clearFirst: true });
    } catch (e) {
      console.log('Retrying with input[name="q"]...');
      await sendRequest('TYPE', { selector: 'input[name="q"]', text: 'NodeNaut Chrome Extension', clearFirst: true });
    }

    // Step D: Submit search
    console.log('\n--- Step 4: Submit search ---');
    try {
      await sendRequest('TYPE', { selector: 'textarea[name="q"]', text: '\n', clearFirst: false });
    } catch (e) {
      await sendRequest('TYPE', { selector: 'input[name="q"]', text: '\n', clearFirst: false });
    }

    // Step E: Wait for search results
    console.log('\n--- Step 5: WAIT 3000ms ---');
    await sendRequest('WAIT', { duration: 3000 });

    // Step F: Capture a screenshot
    console.log('\n--- Step 6: Capture Screenshot ---');
    const screenshotRes = await sendRequest('take_screenshot', {});
    if (screenshotRes && screenshotRes.screenshot) {
      console.log('[SUCCESS] Screenshot captured! Length:', screenshotRes.screenshot.length);
    }

    console.log('\n======================================');
    console.log('✓ TEST FLOW COMPLETED SUCCESSFULLY!');
    console.log('======================================');

  } catch (error) {
    console.error('\nFlow execution failed:', error.message);
  } finally {
    ws.close();
  }
});

ws.on('error', (err) => {
  console.error('WebSocket connection error:', err.message);
});
