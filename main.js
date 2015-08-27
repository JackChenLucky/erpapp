var app = require('app');
var path = require('path');
var fs = require('fs');
var BrowserWindow = require('browser-window');
var jsondir = path.dirname(app.getPath("exe"));
var dialog = require('dialog');
var exec = require('child_process').exec;
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

// 解析命令行选项
var argv = process.argv.slice(1);
var option = {frompath : null,destpath : null,newversion : null};
for (var i in argv) {
  if(i==='0'){
      option.frompath = argv[i];
  }else if(i==='1'){
      option.destpath = argv[i];
  }else if(i==='2'){
      option.newversion = argv[i];
  }
}
if(option.frompath&&option.destpath){
  // dialog.showErrorBox("111",option.frompath);
  // dialog.showErrorBox("222",option.destpath);
  // dialog.showErrorBox("333",option.newversion);
  exec('copy /y '+option.frompath+' '+option.destpath,function(err){
     if(err){
        dialog.showErrorBox("更新提示","更新下载成功,覆盖旧目录失败!"+err);
        console.error(err);
     }
     //更新成功修改当前版本
     updateVersion(option.newversion,function(err){
        if(err){
          dialog.showErrorBox("更新提示","软件更新成功,修改版本号码失败！请手动修改setting.json中的version号码"+err);
          console.error(err);
        }
     });
  })
}

var updateVersion = function(version,callback){
    var file = path.join(jsondir, 'setting.json');
    setting.version=version;
    fs.writeFile(file, JSON.stringify(setting), 'UTF-8', callback);
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