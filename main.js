var app = require('app');
var path = require('path');
var dialog = require('dialog');
var fs = require('fs');
var fsextra = require('fs-extra');
var BrowserWindow = require('browser-window');
var jsondir = path.dirname(app.getPath("exe"));
var mainWindow = null;

app.on('window-all-closed', function() {
  if (process.platform != 'darwin')
    app.quit();
});
var crashReporter = require('crash-reporter');
crashReporter.start();
console.log(crashReporter.getLastCrashReport());
var setting;
try{
    setting = JSON.parse(fs.readFileSync(path.join(jsondir, 'setting.json')));
}catch(err){
    console.log("解析本地配置文件出错：" + err.message+",请下载最新版本程序！");
}

app.on('ready', function() {
  mainWindow = new BrowserWindow({
    'width': setting.window_width,
    'height': setting.window_height,
    'show': false,
    'web-preferences': {
        'plugins': true,
        'extra-plugin-dirs':path.join(jsondir, 'plugins')}
  });

  // mainWindow.loadUrl('http://c.youku.com/2015tjbz?ev=1');
  mainWindow.loadUrl('file://' + __dirname + '/index.html');
  //mainWindow.openDevTools();
  mainWindow.webContents.on('did-finish-load', function () {
    if(setting.ismaxsize){
      mainWindow.maximize();
    }
    mainWindow.show();
    if(setting.debug_mode){
      mainWindow.openDevTools();
    }
  });

  mainWindow.on('closed', function () {
      mainWindow = null; 
  });
});