	var remote = require('remote');
    var path = require('path');
    var http = require('http');
    var globalShortcut = remote.require("global-shortcut");
    var BrowserWindow = remote.require('browser-window');
    var url = require('url');
    var fs = require("fs");
    var request = require('request');
    var semver = require('semver');
    var app = remote.require("app");
	var jsondir = path.dirname(app.getPath("exe"));
	var tempdir = path.dirname(app.getPath("temp"));
	var destinationDirectory = path.join(tempdir,'hzsckj');
	var del = require('del');
	var exec = require('child_process').exec;
	var spawn = require('child_process').spawn;
	var setting,serviceurl;
	
    $(function(){
    	//先读取本地配置文件
    	getSetting();
        //判断网络是否连接
        if(!navigator.onLine){
        	$('#loadingtext').text('').html("<font color='red'>网络连接异常，请连接网络后重试！</font>");
        	offlinefunc();
        	return;
        }
        //判断服务是否能够连接成功
        $.ajax({
			  url: serviceurl,
			  type: 'GET',
			  timeout : 15000,
			  complete: function(response) {
			   if(response.status == 200) {
			      init();
			   }else{
			   	  showToast({'stype':'error','message':'您请求的服务不存在或网络连接失败,请检查网络连接！','timeOut':'-1'});
			      return false;
			   }
			  },
			  error:function(err){
			  	 console.log(err);
			  	 return false;
			  }
	    });
    });

    var init = function(){
    	//处理自动更新
    	checkUpdate();
    	$('body').append("<webview id='foo' src='"+serviceurl+"' plugins nodeintegration disablewebsecurity style='position:absolute; width:100%; height:100%;;display:inline-block;' autosize='on' minwidth='576' minheight='432'></webview>");
    	//设置全局快捷键
    	setShortCut();
    	//监听webview中的新打开窗体事件
    	document.getElementById("foo").addEventListener('new-window', function(e) {
    		var size = remote.getCurrentWindow().getSize();
    		var swidth = size[0]*0.9;
    		var sheight = size[1]*0.9;
	    	var mainWindow = new BrowserWindow({
		    'width': parseInt(swidth),
		    'height': parseInt(sheight),
		    'web-preferences': {
		        'plugins': true,
		        'extra-plugin-dirs':path.join(jsondir, 'plugins')}
		    });
		 	mainWindow.loadUrl(e.url);
		});
    	document.getElementById("foo").addEventListener("did-stop-loading", loadstop);
    	remote.getCurrentWindow().on('resize',function(){
			var size = remote.getCurrentWindow().getSize();
			var ismaxsize = remote.getCurrentWindow().isMaximized();
    		updateWindowSize(size[1],size[0],ismaxsize,function(err){
    			if(err){
    				console.log(err);
    			}
    		});
    	});
    	

	  addCloseEvent();

      window.addEventListener('online', alertOnlineStatus);
      window.addEventListener('offline', alertOnlineStatus);

      document.getElementById("foo").addEventListener('ipc-message', 
   			function(event) {
			  switch(event.channel.type){
			  		case "getcompnyinfo":
			  			setcompnyinfo();
			  			break;
			  		case "savecompanyinfo":
			  			savecompanyinfo(event.channel);
			  			break;
			  };

   	  });
    }
    
    var addCloseEvent = function(){
    	window.onbeforeunload = function(e) {
		    if(!confirm("您正在关闭系统，是否继续？"))
    		{
    			return false;
    		}
		};
    }

    var removeCloseEvent = function(){
    	window.onbeforeunload = null;
    }

    var getSetting = function(){
    	try{
		    setting = JSON.parse(fs.readFileSync(path.join(jsondir, 'setting.json')));
			serviceurl = setting.service_url+"?qybm="+setting.company_code;
		}catch(err){
		    alert("解析本地配置文件出错：" + err.message+",请下载最新版本程序！");
		}
    }
    //设置登录页，登录的企业编码和企业名称
	var setcompnyinfo = function(){
		console.log('设置登录的企业编码和企业名称:'+setting.company_code+'#'+setting.company_name);
		//先获取企业编码和企业名称
		if(setting.company_code&&setting.company_name){
			document.getElementById("foo").executeJavaScript("setcompnyinfo('"+setting.company_code+"','"+setting.company_name+"')");			
		}
	}
	
	///更新公司名称和ID
	var savecompanyinfo = function(cmpinfo){
		console.log('更新本地配置企业编码和企业名称:'+cmpinfo.company_code+'#'+cmpinfo.company_name);
		updateCmpnyInfo(cmpinfo.company_code,cmpinfo.company_name);
	}
	
	var alertOnlineStatus = function() {
        window.alert(navigator.onLine ? onlinefunc(): offlinefunc());
    };
    
    //断线
    var offlinefunc = function() {
    	showToast({'stype':'error','message':'您的网络连接已断开,请检查网络！','timeOut':'-1'})
    }

    var onlinefunc = function(){
    	showToast({'stype':'info','message':'网络已重新连接,连接状态已经被重置,请您重新登录系统！','timeOut':'-1'});
    }

    var loadstop = function() {
    	setpageFocus();
        $("#layer").addClass('animated fadeOutDown');
		$("#loading").addClass('animated fadeOutDown');
		setTimeout(function() {
			$("#layer,#loading").hide();
			  document.getElementById("foo").send('ping');
		}, 1000);
    }

    var setpageFocus = function(){
    	document.getElementById("foo").focus();
    	document.getElementById("foo").executeJavaScript("showFocus();");
    }

    function refeshCache(func){
    	remote.getCurrentWindow().webContents.session.clearCache(function(){
   		  func();
   		})
    }

    function setShortCut(){
    	//F5刷新
    	globalShortcut.register('F5', function() {
    		
    		$('#loadingtext').text("数据加载中,请稍后...");
    		$("#loading").removeClass('animated fadeOutDown').addClass('animated fadeInUp').show();
	       	document.getElementById("foo").reload();	
	    })

    	//F8刷新
    	globalShortcut.register('shift+F5', function() {
    		if(confirm("您正在深度刷新系统，系统缓存将被清除，等待时间较长，是否继续？"))
    		{
    			$('#loadingtext').text("正在清除系统缓存，请稍后...");
    			$("#layer,#loading").removeClass('animated fadeOutDown').addClass('animated fadeInUp').show();
    			refeshCache(function(){
			   		document.getElementById("foo").reload();
    			});
    		}
	    });
    	//打开全局调试工具
	    globalShortcut.register('ctrl+shift+i', function() {
	      var focusedWindow = BrowserWindow.getFocusedWindow();
	      if (focusedWindow){
	        focusedWindow.toggleDevTools();
	      }
	    })

	    //打开webview的调试工具
	    globalShortcut.register('ctrl+alt+i', function() {
	        document.getElementById("foo").openDevTools();
	    })

	    //全屏
	    globalShortcut.register('F11', function() {
	       var focusedWindow = BrowserWindow.getFocusedWindow();
	      if (focusedWindow){
	        focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
	      }
	    })
    }

    var updateCmpnyInfo = function(cmpny_code,cmpny_name,callback){
	  var file = path.join(jsondir, 'setting.json');
      setting.company_code=cmpny_code;
      setting.company_name=cmpny_name;
	  fs.writeFile(file, JSON.stringify(setting), 'UTF-8', callback);
	  serviceurl = setting.service_url+"?qybm="+setting.company_code;
    }

    var updateWindowSize = function(height, width,ismaxsize, callback) {
      var file = path.join(jsondir, 'setting.json');
      setting.window_height=height;
      setting.window_width=width;
      setting.ismaxsize=ismaxsize;
	  fs.writeFile(file, JSON.stringify(setting), 'UTF-8', callback);
	}

	var showToast = function(option){
		var msg=option.message;
		var title=option.title;
		var shortCutFunction = option.stype;
		toastr.options = $.extend({
		  "closeButton": true,
		  "debug": false,
		  "newestOnTop": true,
		  "progressBar": true,
		  "positionClass": "toast-top-right",
		  "preventDuplicates": false,
		  "onclick": null,
		  "showDuration": "300",
		  "hideDuration": "1000",
		  "timeOut": "5000",
		  "extendedTimeOut": "1000",
		  "showEasing": "swing",
		  "hideEasing": "linear",
		  "showMethod": "fadeIn",
		  "hideMethod": "fadeOut"
		},option);
		var $toast = toastr[shortCutFunction](msg, title); // Wire up an event handler to a button in the 
		$toastlast = $toast;
        if(typeof $toast === 'undefined'){
            return;
        }
	}

    //自动更新处理，
    //原理，
    //1,启动检查自动更新，与服务器上的文件package.json比对,先判断是否需要做全版本更新，如果不做全版本，
    //  判断是否应用程序更新。
    //2,全版本更新办法
    // 2-1，下载全版本程序到零时目录，
    // 2-2，启动零时目录程序，传入启动参数，退出旧版本程序
	// 2-3，新版本程序启动时，根据启动参数，拷贝零时目录中的程序到旧版本的程序中覆盖。
	//      下次启动时就可以启动正式程序了。
	//3、只应用asar更新
		// 3-1，拷贝当前应用程序到零时目录
		// 3-2，下载新版本的asar程序，拷贝到零时程序的下。
		// 3-2，启动零时目录中的新程序，传入启动参数，退出就版本程序。
		// 3-4，零时目录中的程序启动是，拷贝当前目录下的asar文件到老的目录下替换，并更新版本号码。
		//      启动零时目录中的程序。
		// 3-5，下次启动程序时就已经是正式程序了。
	// 4、每次更新成功都需要

	var  checkUpdate = function(){
		console.log(setting.mainfestUrl);
		request.get(setting.mainfestUrl,function(err, res, data){
			var sdata = JSON.parse(data);
			console.log("内核版本信息："+sdata.electron+'@'+setting.electron);
			console.log("应用程序版本信息："+sdata.version+'@'+setting.version);
			if(semver.gt(sdata.electron, setting.electron)){
				alert("您的系统版本太低，无法进行自动更新。到官网重新下载安装！");
				quitApp();
			}else if(semver.gt(sdata.version, setting.version)){
				if(confirm("发现新版本程序，是否更新程序？")){
					updateAsarFile(sdata.asar_file,sdata.version);
				}
			}
		});
	}

	//应用程序更新
	var updateAsarFile = function(asarFileUrl,newversion){
		console.log(destinationDirectory);
		//先删除目录
		exec("rd /s/q "+destinationDirectory,function(err){
			if(err){
				console.log("删除目录失败："+err);
			}
			downloadApp(asarFileUrl,tempdir,function(err,durl){
				console.log("下载完毕:"+durl);
				//解压
				unpack(durl,function(err,zipurl){
					if(err)
					{
						console.log(err);
					}else{
					console.log("解压完毕："+zipurl);
						//启动零时目录中的程序
						startUpdate(app.getPath("exe"),
									path.join(tempdir,"hzsckj/app.asar"),
									path.join(jsondir,"resources/app.asar"),
									newversion);
					}
				});
			});
		});
	}
    //开始启动外部程序
	var startUpdate = function(newAppPath,fromPath,toPath,newversion){
		run(newAppPath, [fromPath,toPath,newversion],{});
		quitApp();
	}
    //启动程序
	function run(path, args, options){
		console.log(path);
		console.log(args);
	    var opts = {
	      detached: true
	    };
	    for(var key in options){
	      opts[key] = options[key];
	    }
	    var sp = spawn(path, args, opts);
	    sp.unref();
	    return sp;
  	}

  	var quitApp = function(){
  		removeCloseEvent();
		app.quit();
  	}


	var downloadApp = function(url,ddir,cb){
    	console.log("下载路径:"+url);
	    var pkg = request(url, function(err, response){
	    	console.log("下载返回："+err);
	        if(err){
	            cb(err);
	        }
	        if(response.statusCode == 404)
	        {
	        	cb(null, '');
	        }else if(response.statusCode < 200 || response.statusCode >= 300){
	            pkg.abort();
	            return cb(new Error(response.statusCode));
	        }
	    });
	    pkg.on('response', function(response){
	      if(response && response.headers && response.headers['content-length']){
	          pkg['content-length'] = response.headers['content-length'];
	        }
	    });
	    var filename = path.basename(url);
	    // var destinationPath = path.join(process.cwd()+'\\download', filename);
	    var destinationPath = path.join(tempdir, filename);
	    console.log(destinationPath);
	    // download the package to template folder
	    fs.unlink(destinationPath, function(){
	      pkg.pipe(fs.createWriteStream(destinationPath));
	      pkg.resume();
	    });
	    pkg.on('error', cb);
	    pkg.on('end', appDownloaded);
	    pkg.pause();

	    function appDownloaded(){
	      process.nextTick(function(){
	        if(pkg.response.statusCode >= 200 && pkg.response.statusCode < 300){
	          cb(null, destinationPath);
	        }
	      });
	    }
	    return pkg;
	}

	 var unpack = function(filename, cb){
	 	console.log('开始解压文件',filename);
        var unzip = function(){
            // unzip by C. Spieler (docs: https://www.mkssoftware.com/docs/man1/unzip.1.asp, issues: http://www.info-zip.org/)
            exec( '"' + path.join(jsondir, 'tools/unzip.exe') + '" -u -o "' +
                filename + '" -d "' + destinationDirectory + '" > NUL', function(err){
              if(err){
                return cb(err);
              }
              //解压成功，删除压缩包
              del(filename, {force: true}, function (err) {
	            if (err) {
	              cb(err);
	            }
	            else {
              		cb(null, destinationDirectory);
	            }
	          });
            });
        };
        unzip();
    }