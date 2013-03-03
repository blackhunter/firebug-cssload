if(!Firebug)
	var Firebug = {};

FBL.ns(function(){
	//noinspection JSUnresolvedVariable,JSValidateTypes
	Firebug.MyModule = FBL.extend(Firebug.Module, {
		initialize: function(){
			Firebug.Module.initialize.apply(this, arguments);
			Firebug.CSSModule.addListener(this);

			this.pool();
		},
		shutdown: function(){
			Firebug.Module.shutdown.apply(this, arguments);

			this.closePoll();
		},
		initContext: function(tab){
			if(!('window' in tab) || tab.window.location.href==='about:newtab')
				setTimeout(this.initContext.bind(this, tab), 1000);
			else{
				if(tab.window.document.readyState=='complete')
					this.send('register',this.mapTab(tab.window.document));
				else
					tab.window.onload = (function(tab){
						this.send('register',this.mapTab(tab.window.document));
					}).bind(this, tab)
			}
		},
		xhr: true,
		send: function(name, data, success, error){
			var querystring = "http://127.0.0.1:7001/"+name,
				xhr = new XMLHttpRequest(),
				post = true;

			if(data===null || data==='')
				post = false;
			else
				data = JSON.stringify(data);

			xhr.onreadystatechange = (function(){
				if(xhr.readyState==4){
					if(xhr.status == 200 || xhr.status == 204){
						if(success)
							success.call(this, xhr.responseText);
					}else{
						if(error)
							error.call(this);
					}
				}
			}).bind(this, success, error);

			xhr.open((post? "POST" : "GET"), querystring, true);
			xhr.send(data);
		},
		closePoll: function(){
			this.xhr = false;
		},
		pool: function(){
			if(!this.xhr)
				return;

			this.send('pooling', null, function(data){
				if(data!=''){
					this.command(JSON.parse(data));
				}
				this.pool();
			},
			function(){
				setTimeout(this.pool.bind(this),5000);
			});
		},
		command: function(obj){
			this.log('command');
			this.log(obj);
			return;

			var i, src, doc;

			window.TabWatcher.contexts.forEach(function(ele){
				doc = ele.document;
				if(obj.some(function(href){
					if(href.type=='document'){
						if(href.reload==doc.location.href)
							return true;
					}else{
						src = (href.type=='styleSheets'? 'href' : 'src');
						i = doc[href.type].length;
						//petla po elementach dom danego typu np: styleSheets
						while(i--){
							if(doc[href.type].item(i)[src] == href.reload){
								if(href.type=='images')
									doc[href.type].item(i)[src] = href.reload;
								else
									return true;
							}
						}
						//jezeli nic nie pasuje to return false
					}
					return false;
				})){
					doc.location.reload(true);
				}
			});
		},
		mapTab: function(doc){
			var urls = {
					scripts: [],
					styleSheets: [],
					images: [],
					document: []
				},
				i,url;

			//doc
			urls.document.push(doc.location.href)

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
					urls.styleSheets.push(url);
			}
			//images
			i = doc.images.length;
			while(i--){
				url = doc.images.item(i).src;
				if(url)
					urls.images.push(url);
			}

			return urls;
		},	//TODO iframes

		// CSSModule Listener
		onCSSInsertRule: function(sheet, cssText){
			var url = sheet.href;

			this.send('new', {href: url, css: cssText});
		},

		onCSSDeleteRule: function(sheet, ruleIndex){
			var cssText = sheet.cssRules[ruleIndex].selectorText,
				url = sheet.href;

			this.send('delete', {href: url, css: cssText});
		},

		onCSSSetProperty: function(style, propName, propValue, propPriority, prevValue, prevPriority, parent){
			var cssText = parent.cssText,
				firstBracket = cssText.indexOf("{"),
				fullPath = cssText.substr(0, firstBracket),
				url = parent.parentStyleSheet.href;

			if(propPriority)
				propValue+=' !important';

			this.send('update', {
				href: url, selector: fullPath, css: {
					name: propName, value: propValue
				}
			});
		},

		onCSSRemoveProperty: function(style, propName, prevValue, prevPriority, parent){
			var cssText = parent.cssText,
				firstBracket = cssText.indexOf("{"),
				fullPath = cssText.substr(0, firstBracket),
				url = parent.parentStyleSheet.href;

			this.send('update', {
				href: url, selector: fullPath, css: null
			});
		},
		log: function(data){
			Firebug.Console.log(data);
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

