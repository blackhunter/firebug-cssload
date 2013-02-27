if(!Firebug)
	var Firebug = {};

FBL.ns(function(){
	//noinspection JSUnresolvedVariable,JSValidateTypes
	Firebug.MyModule = FBL.extend(Firebug.Module, {
		initialize: function(){
			Firebug.Module.initialize.apply(this, arguments);
			Firebug.CSSModule.addListener(this);

			this.con.pool(function(){
				this.log('Watching start');
				//locking for changes in tabs
				this.interval = setInterval((function(){
					var tabs = window.TabWatcher.contexts,
						i = tabs.length,
						hrefs = Object.keys(this.pathes),
						href, index;

					while(i--){
						href = tabs[i].window.document.location.href;
						index = hrefs.indexOf(href);

						if(index!=-1){
							this.pathes[href] = true;
							this.mapTab(tabs[i].window.document);
						}else{
							hrefs.splice(index,1);
						}
					}

					this.con.send('unregister',hrefs);
				}).bind(this),100);
			});
		},
		shutdown: function(){
			Firebug.Module.shutdown.apply(this, arguments);

			clearInterval(this.interval);
			this.con.close();
		},
		con: {
			connect: false,
			xhr: true,
			send: function(name, data){
				var querystring = "http://127.0.0.1:7001/"+name,
					xhr = new XMLHttpRequest();

				xhr.onreadystatechange = (function(){
					if(xhr.readyState==4){
						if(xhr.status != 200){
							//this.log("CSSave: can't comunicate with server!");
						}
					}
				}).bind(this);

				xhr.open("POST", querystring, true);
				xhr.send(JSON.stringify(data));
			},
			close: function(){
				this.con.xhr = false;
			},
			pool: function(success){
				if(!this.con.xhr)
					return;

				var querystring = "http://127.0.0.1:7001/polling",
					xhr = this.con.xhr = new XMLHttpRequest();

				xhr.onreadystatechange = (function(){
					if(xhr.readyState==4){
						if(xhr.status == 200){
							if(xhr.responseText && xhr.responseText!=''){
								this.command(JSON.parse(xhr.responseText));
							}

							if(success)
								success();

							this.con.polling();
						}else{
							setTimeout(this.con.pool,5000);
						}
					}
				}).bind(this);

				xhr.open("GET", querystring, true);
				xhr.send(null);
			},
			queue: null
		},
		pathes: {},
		command: function(obj){
			var com = Object.keys(obj)[0],
				data = obj[com];

			if(data in this.pathes){
				switch(com){
					case 'reload':
						window.TabWatcher.contexts.some(function(ele){
							if(data.href==ele.document.location.href){
								ele.document.location.reload(true);
								return true;
							}
							return false;
						});
						break;
					case 'reloadImg':
						window.TabWatcher.contexts.some(function(ele){
							if(data.href==ele.document.location.href){
								ele.document.images.some(function(img){
									if(img.src==data.src){
										img.src = data.src;
										return true;
									}
									return false;
								});
								return true;
							}
							return false;
						});
						break;
					case 'register':
						this.log('No path found for: '+data.href);
						break;
				}
			}
		},
		mapTab: function(doc){
			var urls = {
					scripts: [],
					styles: [],
					imgs: []
				},
				i,url;

			//scripts
			i = doc.scripts.length;
			while(i--){
				url = doc.scripts.item(i).src;
				if(url != "")
					urls.scripts.push(url);
			}
			//styles
			i = doc.styleSheets.length;
			while(i--){
				url = doc.styleSheets.item(i).href;
				if(url)
					urls.styles.push(url);
			}
			//images
			i = doc.images.length;
			while(i--){
				url = doc.images.item(i).src;
				if(url)
					urls.imgs.push(url);
			}

			this.con.send('register',urls);
		},
		initContext: function(context, state){

		},

		// CSSModule Listener
		onCSSInsertRule: function(sheet, cssText){
			var filePath = sheet.href;

			//this.send('new', cssText, filePath);
		},

		onCSSDeleteRule: function(sheet, ruleIndex){
			var cssText = sheet.cssRules[ruleIndex].selectorText,
				url = sheet.href;

			//this.send('delete', cssText, url);
		},

		onCSSSetProperty: function(style, propName, propValue, propPriority, prevValue, prevPriority, parent){
			var cssText = parent.cssText,
				firstBracket = cssText.indexOf("{"),
				fullPath = cssText.substr(0, firstBracket),
				url = parent.parentStyleSheet.href;

			if(propPriority)
				propValue+=' !important';

			this.log(window);
			//this.send('update', fullPath, url, propName, propValue);
		},

		onCSSRemoveProperty: function(style, propName, prevValue, prevPriority, parent){
			var cssText = parent.cssText,
				firstBracket = cssText.indexOf("{"),
				fullPath = cssText.substr(0, firstBracket),
				url = parent.parentStyleSheet.href;

			//this.send('remove', fullPath, url, propName, prevValue);
		},

		send: function(type, path, url, css, value){
			if(!url)
				url = window.content.location.pathname;

			var querystring = "http://127.0.0.1:6776/"+type+"?path="+this.encode(path)+"&url="+this.encode(url)+(css? '&css='+css+'&val='+value : ''),
				xhr = new XMLHttpRequest();

			//xhr.open("GET", querystring, true);
			//xhr.send(null);
		},
		log: function(data){
			Firebug.Console.log(data);
		}
	});

	/*
	function HelloWorldPanel() {}
	HelloWorldPanel.prototype = FBL.extend(Firebug.Panel, {
		name: "HelloWorld",
		title: "Hello World!",

		initialize: function() {
			Firebug.Panel.initialize.apply(this, arguments);
		}
	});
	*/
	Firebug.registerPanel(HelloWorldPanel);

	Firebug.registerModule(Firebug.MyModule);
	return Firebug.MyModule;
});

