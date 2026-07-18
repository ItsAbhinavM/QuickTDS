import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

async function run() {
  console.log('Connecting to MCP server...');
  const transport = new SSEClientTransport(new URL('http://127.0.0.1:3100/sse'));
  const client = new Client(
    { name: 'test-client', version: '1.0.0' },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log('Connected! Reading resource...');

  try {
    const result = await client.request(
      {
        method: 'resources/read',
        params: {
          uri: 'ui://widget/next-upload-summary.html'
        }
      },
      Object
    );
    console.log('Resource read successfully!');
    const text = result.contents[0].text;
    console.log('HTML Length:', text.length);
    console.log('Contains <style> tag with Inter font?', text.includes('font-family:Inter'));
    console.log('Contains inlined stylesheet?', text.includes(':root{color-scheme'));
  } catch (err) {
    console.error('Error reading resource:', err);
  } finally {
    await client.close();
  }
}

run().catch(console.error);
