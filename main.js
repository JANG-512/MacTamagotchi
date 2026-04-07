const { app, BrowserWindow } = require('electron');
const path = require('path');
const os = require('os');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 250,
    height: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  let prevCpus = os.cpus();
  setInterval(() => {
    const currentCpus = os.cpus();
    let totalIdle = 0, totalTick = 0;
    
    for (let i = 0, len = currentCpus.length; i < len; i++) {
        const cpu = currentCpus[i];
        const prevCpu = prevCpus[i];
        for (const type in cpu.times) {
            totalTick += cpu.times[type] - prevCpu.times[type];
        }
        totalIdle += cpu.times.idle - prevCpu.times.idle;
    }
    const idle = totalIdle / currentCpus.length;
    const total = totalTick / currentCpus.length;
    let usage = 100 - ~~(100 * idle / total);
    
    if (usage < 0) usage = 0;
    if (usage > 100) usage = 100;
    
    prevCpus = currentCpus;
    
    if (mainWindow) {
        mainWindow.webContents.send('cpu-update', usage);
    }
  }, 1000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
