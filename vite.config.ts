import { defineConfig, ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { IncomingForm } from 'formidable'

let sseClients: any[] = [];
let currentLiveState: any = null;

// Send a ping every 10 seconds to keep the SSE connection alive in OBS
// We send a named event 'ping' so the client can listen for it and verify connection health.
setInterval(() => {
  sseClients.forEach(client => {
    client.write('event: ping\ndata: {}\n\n');
    if (client.flush) {
      client.flush();
    }
  });
}, 5000);

function localMediaServer() {
  return {
    name: 'local-media-server',
    configureServer(server: ViteDevServer) {
      // WebSocket integration for ultra-fast, limit-free syncing
      server.ws.on('bible-song-pro:update', (data) => {
        currentLiveState = data;
        server.ws.send('bible-song-pro:state', currentLiveState);
        
        // Also sync to any SSE clients just in case
        sseClients.forEach(client => {
          client.write(`data: ${JSON.stringify(currentLiveState)}\n\n`);
          if (client.flush) client.flush();
        });
      });

      server.ws.on('bible-song-pro:request-state', () => {
        if (currentLiveState) {
          server.ws.send('bible-song-pro:state', currentLiveState);
        }
      });

      server.middlewares.use('/api/state', (req, res, next) => {
        if (req.method === 'GET') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
            'Access-Control-Allow-Origin': '*'
          });
          if (res.flushHeaders) {
            res.flushHeaders();
          }
          
          sseClients.push(res);
          
          if (currentLiveState) {
            res.write(`data: ${JSON.stringify(currentLiveState)}\n\n`);
          }
          
          req.on('close', () => {
            sseClients = sseClients.filter(c => c !== res);
          });
          return;
        }
        
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              currentLiveState = JSON.parse(body);
              sseClients.forEach(client => {
                client.write(`data: ${JSON.stringify(currentLiveState)}\n\n`);
                if ((client as any).flush) {
                  (client as any).flush();
                }
              });
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (e) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
          });
          return;
        }
        next();
      });

      server.middlewares.use('/api/upload', (req, res, next) => {
        if (req.method === 'POST') {
          // Use process.cwd() or import.meta.dirname to avoid the Vite warning
          const uploadDir = path.resolve(process.cwd(), 'public/uploads');
          const form = new IncomingForm({
            uploadDir,
            keepExtensions: true,
            maxFileSize: 500 * 1024 * 1024, // 500MB
          });

          // Ensure directory exists
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }

          form.parse(req, (err, fields, files) => {
            if (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
              return;
            }
            
            // Get the first uploaded file (could be an array depending on formidable version)
            const fileArray = Array.isArray(files.file) ? files.file : [files.file];
            const file = fileArray[0];
            
            if (file) {
              const fileName = path.basename(file.filepath);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ url: `/uploads/${fileName}` }));
            } else {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'No file uploaded' }));
            }
          });
        }
      });

      server.middlewares.use('/api/local-ip', (req, res) => {
        const interfaces = os.networkInterfaces();
        let localIp = '127.0.0.1';
        
        for (const devName in interfaces) {
          const iface = interfaces[devName];
          if (!iface) continue;
          for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
              localIp = alias.address;
              break;
            }
          }
        }
        
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ip: localIp }));
      });
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localMediaServer()],
  server: {
    host: true, // Listen on all local IPs (needed for mobile phone to connect)
    open: true, // Automatically open the browser when started
  }
})
