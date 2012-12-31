if(!Firebug)
	var Firebug = {};

FBL.ns(function(){
	//noinspection JSUnresolvedVariable,JSValidateTypes
	Firebug.MyModule = FBL.extend(Firebug.Module, {
		initialize: function(){
			Firebug.Module.initialize.apply(this, arguments);
			Firebug.CSSModule.addListener(this);
			this.polling();
		},

		shutdown: function(){
			Firebug.Module.shutdown.apply(this, arguments);
		},

		initContext: function(context, state){
			//this.polling();
		},

		// CSSModule Listener
		onCSSInsertRule: function(sheet, cssText){
			var filePath = sheet.href;

			this.send('new', cssText, filePath);
		},

		onCSSDeleteRule: function(sheet, ruleIndex){
			var cssText = sheet.cssRules[ruleIndex].selectorText,
				url = sheet.href;

			this.send('delete', cssText, url);
		},

		onCSSSetProperty: function(style, propName, propValue, propPriority, prevValue, prevPriority, parent){
			var cssText = parent.cssText,
				firstBracket = cssText.indexOf("{"),
				fullPath = cssText.substr(0, firstBracket),
				url = parent.parentStyleSheet.href;

			if(propPriority)
				propValue+=' !important';

			this.log(window);
			this.send('update', fullPath, url, propName, propValue);
		},

		onCSSRemoveProperty: function(style, propName, prevValue, prevPriority, parent){
			var cssText = parent.cssText,
				firstBracket = cssText.indexOf("{"),
				fullPath = cssText.substr(0, firstBracket),
				url = parent.parentStyleSheet.href;

			this.send('remove', fullPath, url, propName, prevValue);
		},

		send: function(type, path, url, css, value){
			if(!url)
				url = window.content.location.pathname;

			var querystring = "http://127.0.0.1:6776/"+type+"?path="+this.encode(path)+"&url="+this.encode(url)+(css? '&css='+css+'&val='+value : ''),
				xhr = new XMLHttpRequest();

			xhr.open("GET", querystring, true);
			xhr.send(null);
		},

	/*
		getIdeAddress: function() {
			var prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
			return prefManager.getCharPref("extensions.cssxfire@cssxfire.host") + ":" + prefManager.getIntPref("extensions.cssxfire@cssxfire.port");
		},*/

		polling: function(){
			var querystring = "http://127.0.0.1:6776/polling",
				xhr = new XMLHttpRequest();

			xhr.onreadystatechange = (function(){
				if(xhr.readyState==4){
					if(xhr.status == 200){
						this.log(xhr.responseText);
						if(xhr.responseText && xhr.responseText!='')
							this.reload(xhr.responseText);

						this.polling();	//interval TODO
					}else{
						//error, repolling
						this.polling();
					}
				}
			}).bind(this);
			xhr.open("GET", querystring, true);
			xhr.send(null);
		},

		reload: function(pathname){
			this.log(pathname);
			window.TabWatcher.contexts.forEach(function(ele){
				if(pathname==ele.global.location.pathname)
					ele.global.location.reload(true);
			})
		},

		encode: function(str) {
			return encodeURIComponent(str);
		},

		log: function(data){
			Firebug.Console.log(data);
		},

		register: function(){
			var doc =  window.TabWatcher.contexts[num].window.document,
				urls = [],
				i,url;

			//scripts
			i = doc.scripts.length;
			while(i--){
				url = doc.scripts.item(i).src;
				if(url != "")
					urls.push(url);
			}
			//styles
			i = doc.styleSheets.length;
			while(i--){
				url = doc.styleSheets.item(i).href;
				if(url)
					urls.push(url)
			}

			this.post('register',urls)

			//scan for files
			//save to file in localization
			//edit files
		}
	});

	function HelloWorldPanel() {}
	HelloWorldPanel.prototype = FBL.extend(Firebug.Panel, {
		name: "HelloWorld",
		title: "Hello World!",

		initialize: function() {
			Firebug.Panel.initialize.apply(this, arguments);
		}
	});

	Firebug.registerPanel(HelloWorldPanel);

	Firebug.registerModule(Firebug.MyModule);
	return Firebug.MyModule;
});

