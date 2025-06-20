# 🎯 pic2tool Usage Guide

## 🚀 Quick Start

### For Web Interface (Browser Access)
```bash
# Start the web development server
npm run dev:web

# Access the application:
# - Local: http://localhost:3000/
# - Network: http://192.168.178.105:3000/
```

### For Desktop Application (Electron)
```bash
# Build and start the desktop app
npm start

# Or for development with debugging
npm run start:dev
```

### For Full Development (Both Web + Desktop)
```bash
# Start both web server and desktop app
npm run dev
```

## 🔧 Available Scripts

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `npm start` | Production desktop app | Final testing, production use |
| `npm run start:dev` | Development desktop app | Desktop development with debugging |
| `npm run dev` | Both web + desktop | Full development environment |
| `npm run dev:web` | Web server only | Web interface development |
| `npm run dev:electron` | Desktop app only | Desktop-only development |
| `npm run build` | Build all targets | Before deployment |

## 🌐 Web Interface Access

The web interface is available at:
- **Local**: `http://localhost:3000/`
- **Network**: `http://192.168.178.105:3000/` (accessible from other devices)

## 🖥️ Desktop Application

The Electron desktop application provides:
- Native OS integration
- File system access
- Screen recording capabilities
- Offline functionality

## 🐛 Troubleshooting

### White Screen Issues
1. Check console for errors (F12 in browser/Electron)
2. Verify all files are built: `npm run build`
3. Try clearing cache and rebuilding

### Web Interface Not Loading
1. Ensure dev server is running: `npm run dev:web`
2. Check if port 3000 is available
3. Try accessing via localhost first

### Desktop App Issues
1. Rebuild the application: `npm run build`
2. Check for missing dependencies: `npm install`
3. Try development mode: `npm run start:dev`

## 📋 Development Workflow

1. **Setup**: `npm install && npm run setup:advanced`
2. **Web Development**: `npm run dev:web`
3. **Desktop Development**: `npm run start:dev`
4. **Full Development**: `npm run dev`
5. **Testing**: `npm start`
6. **Production**: `npm run build && npm start`
