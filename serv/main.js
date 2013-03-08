var http = require('http'),
	fs = require('fs'),
	__path = require('path'),
	manipulator = require('lessTree'),
	worm = require('earthworm'),
	url = require('url');

var db = {
	resolves: {},
	hrefs: {},
	poll: null,
	pollTimeout: null,
	pollQueue: [],
	masterTimeout: null
}

//TODO watch reloadfilter

var command = {
	sheet: function(href, path, watcher, data, type){
		this.href = href;
		this.path =path;
		this.watcher = watcher;
		this.sheet =  data || null;
		this.type = type;
		this.changed = false;
	},
	sendReload: function(href){
		var finish = function(){
			db.pollQueue.push({
				reload: href,
				type: db.hrefs[href].type
			});
			command.checkPollQueue();
		};

		if(db.hrefs[href].sheet)	//reload style
			command.reloadStyle(href, function(){
				finish();
			});
		else
			finish();
	},
	checkPollQueue: function(){
		if(db.poll != null && db.pollQueue.length){
			responses.response(true, JSON.stringify(db.pollQueue));
			db.pollQueue = [];
			console.log('pong Msg');
		}
	},
	loadStyle: function(res, href){
		if(href in db.hrefs)
			responses.response(res, db.hrefs[href].sheet.toCSS(), {type: 'text/css'});
		else
			this.addHref(res, href, 'styleSheets');
	},
	addHref: function(load, href, type){
		var basename = __path.basename(href),
			self = this,
			paths, i;

		//TODO pobieraj najdlusza pasujaca sciezke
		for(i in db.resolves){
			if((new RegExp(i)).test(href)){
				paths = href.replace(i, db.resolves[i]);
				break;
			}
		}

		if(!paths)
			paths = href;

		if(basename=='')
			paths = [paths+'index.php', paths+'index.html'];
		else
			paths = [paths];

		worm().then(function(){
			this.casts(fs.exists, paths, function(exists){
				if(exists){
					this.jump();
					return this.params[0];
				}
			})
		}).then(function(path){
				if(path==undefined)
					throw new Error('Nie znaleziono sciezki dla adresu: '+href);

				this.set(path);
				this.set(fs.watchFile(path, command.sendReload.bind(this, href)));

				if(load)
					this.cast(manipulator.load, path);
			}).then(function(err, data){
				db.hrefs[href] = new self.sheet(href, this.get[0], this.get[1], data, type);

				if(load)
					responses.response(load, db.hrefs[href].sheet.toCSS(), {type: 'text/css'});
			}).catch(function(err){
				console.log(err);
				if(load)
					responses.response(load, err.message, {status: 404});
				else
					console.log(err.message);
			})
	},
	reloadStyle: function(href, cb){
		manipulator.load(db.hrefs[href].path, function(err, sheet){
			if(err)
				this.addHref(null, href, db.hrefs[href].type);
			else{
				db.hrefs[href].sheet = sheet;
				cb();
			}
		})
	},
	deleteHref: function(href){
		db.hrefs[href].watcher.close();
		delete db.hrefs[href];
	}
}

var responses = {
	pooling: function(res){
		db.poll = res;
		command.checkPollQueue();

		db.pollTimeout = setTimeout(function(){
			responses.response(true, 200);
			db.pollTimeout = null;
			console.log('pong ta');
		},15000);
	},
	register: function(res, data){
		for(var i in data){
			data[i].forEach(function(ele){
				if(!(ele in db.hrefs))
					command.addHref(null, ele, i);
			});
		}

		responses.response(res);
	},
	/*
	unregister: function(res, data){
		data.forEach(function(ele){
			if(ele in db.hrefs){
	 command.deleteHref(ele);
			}
		});
		command.response(res, 200);
	},*/
	new: function(res, query){
		if(query.href in db.hrefs){
			db.hrefs[query.href].changed = true;
			db.hrefs[query.href].sheet.editRule(query.css, query.fromFile);
		}
	},
	delete: function(res, query){
		if(query.href in db.hrefs){
			db.hrefs[query.href].changed = true;
			db.hrefs[query.href].sheet.editRule(query.index, query.fromFile);
		}
	},
	remove: function(res, query){
		if(query.href in db.hrefs){
			db.hrefs[query.href].changed = true;
			db.hrefs[query.href].sheet.editProp(query.selector, null, query.oldCss);
		}
	},
	update: function(res, query){
		if(query.href in db.hrefs){
			db.hrefs[query.href].changed = true;
			db.hrefs[query.href].sheet.editProp(query.selector, query.nowCss, query.oldCss);
		}
	},
	save: function(){
		var i;
		for(i in db.hrefs){
			if(db.hrefs[i].type=='styleSheets' && db.hrefs[i].changed)
				db.hrefs[i].sheet.save();
		}
	},
	response: function(res, data, setStats){
		var
			status,
			type;

		if(setStats){
			status = setStats.status || 200;
			type = setStats.type || 'text/plain';
		}

		if(data==null){
			status = 204;
			data=null;
		}else{
			if(data instanceof Object)
				data = JSON.stringify(data);

			res.setHeader('Content-Length', data.length);
		}

		if(res===true){
			if(db.pollTimeout)
				clearTimeout(db.pollTimeout);
			res = db.poll;
			db.poll = null;
		}

		res.setHeader('Content-Type',type);
		res.setHeader('Cache-Control', 'no-cache, no-store');
		res.statusCode = status;
		res.end(data);
	}
}

//loadconfig
fs.readFile(__dirname+'config.json', function(err, data){
	if(err){
		console.log('Problem z wczytaniem pliku konfiguracji!');
		throw new Error(err)
	}else{
		db.resolves = JSON.parse(data);
		db.resolves['http://127.0.0.1:7000/'] = '';
		db.resolves['file:///'] = '';
	}
})

//addon handler
http.createServer(function(req, res){
	var uri = url.parse(req.url, true),
		path = uri.pathname.substring(1),
		data = '',
		i;

	if(req.method=="POST"){
		req.on('data', function(chunk){
			data += chunk;
		});

		req.on('end', function(){
			console.log(data);
			if(path in responses)
				responses[path](res, JSON.parse(data));
			else{
				res.writeHead(404);
				res.end();
			}
		});
	}else{
		if(path in responses)
			responses[path](res, uri.query);
		else{
			res.writeHead(404);
			res.end();
		}
	}
}).listen(7001);

//less loader
http.createServer(function(req, res){
	command.loadStyle(res, 'http://127.0.0.1:7000'+req.url);
}).listen(7000);

//master watcher
function ticktock(){
	db.masterTimeout = setTimeout(function(){
		//wyjscie
		process.exit();
	},2000);
}

process.on('message', function(){
	clearTimeout(db.masterTimeout);
	ticktock();
});

ticktock();