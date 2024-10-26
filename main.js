// main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 935,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  console.log('Loading:', path.join(__dirname, 'index.html'))

  win.loadFile('index.html')
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

ipcMain.handle('select-source', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  return result.filePaths[0]
})

ipcMain.handle('select-destination', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  return result.filePaths[0]
})

ipcMain.handle('start-copy', async (event, { sourcePath, destPath, fileTypes }) => {
  const files = []
  
  function searchFiles(directory) {
    const items = fs.readdirSync(directory)
    
    for (const item of items) {
      const fullPath = path.join(directory, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        searchFiles(fullPath)
      } else {
        const ext = path.extname(item).toLowerCase()
        if (fileTypes.includes(ext)) {
          files.push({
            path: fullPath,
            name: item // Keep just the filename
          })
        }
      }
    }
  }
  
  try {
    searchFiles(sourcePath)
    let copiedCount = 0
    let skippedCount = 0
    
    for (const file of files) {
      const destFilePath = path.join(destPath, file.name)
      
      // If file already exists, add a number to the filename
      let finalDestPath = destFilePath
      let counter = 1
      while (fs.existsSync(finalDestPath)) {
        const ext = path.extname(file.name)
        const nameWithoutExt = path.basename(file.name, ext)
        finalDestPath = path.join(destPath, `${nameWithoutExt}_${counter}${ext}`)
        counter++
      }
      
      try {
        fs.copyFileSync(file.path, finalDestPath)
        copiedCount++
      } catch (err) {
        console.error(`Error copying ${file.name}: ${err.message}`)
        skippedCount++
      }
    }
    
    return { 
      success: true, 
      count: copiedCount,
      skipped: skippedCount,
      total: files.length 
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
})