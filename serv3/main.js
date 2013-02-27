var http = require('http'),
	fs = require('fs'),
	__path = require('path'),
	manipulator = require('./treeManipulator.js'),
	worm = require('earthworm'),
	url = require('url'),
	util = require('util');

var db = {
	resolves: {},
	hrefs: {},
	poll: null,
	pollTimeout: null,
	pollQueue: []
}

var command = {
	sendReload: function(href){
		var data = JSON.stringify([{reload: href}]);
		if(db.poll)
			this.response(true, 200, data);
		else
			db.pollQueue.push(data);
	},
	checkPollQueue: function(){
		if(db.pollQueue.length){
			this.response(true, 200, JSON.stringify(db.pollQueue));
			db.pollQueue = [];
		}
	},
	response: function(res, status, data){
		if(res===true){
			if(db.pollTimeout)
				clearTimeout(db.pollTimeout);
			res = db.poll;
			db.poll = null;
		}
		//TODO if no data

		res.writeHead(status, {
			'Content-Length': data.length,
			'Content-Type': 'text/css',
			'Cache-Control': 'no-cache, no-store'
		});
		res.end(data);
	}
}

var responses = {
	polling: function(res){
		db.poll = res;
		command.checkPollQueue();

		db.pollTimeout = setTimeout(function(){
			command.response(true, 200);
			db.pollTimeout = null;
		},15000);
	},
	register: function(res, data){
		data.forEach(function(ele){
			if(!(ele in db.hrefs))
				sys.addHref(ele);
		});
		command.response(res, 200);
	},
	unregister: function(res, data){
		data.forEach(function(ele){
			if(ele in db.hrefs){
				sys.deleteHref(ele);
			}
		});
		command.response(res, 200);
	},
	new: function(res, query){

	},
	delete: function(res, query){

	},
	remove: function(res, query){

	},
	update: function(res, query){

	}
}

var sys = {
	loadStyle: function(res, href){
		if(href in db.hrefs){
			var css = db.hrefs[href].tree.toCSS();
			this.response(res, 200, css);
		}else
			this.addHref(res, href);
	},
	addHref: function(load, href){
		var basename = __path.basename(href),
			paths, i;

		if(!load){
			for(i in db.resolves){
				if((new RegExp(i)).test(href)){
					paths = href.replace(i, db.resolves[i]);
					break;
				}
			}
		}

		if(basename=='')
			paths = [paths+'index.php', paths+'index.html'];
		else
			paths = [paths];

		worm().then(function(){
			href.forEach((function(){}).bind(this))
				this.casts(fs.exists, paths, function(exists){
					if(exists){
						this.jump();
						return this.params[0];
					}
				})
			}).then(function(path){
				if(!path.length)
					throw new Error(href);

				this.set(path);
				this.set(fs.watchFile(path, (function(path){
					command.sendReload(path);
				}).bind(this, path)));

				if(load){
					this.cast(manipulator.loadStyle, [path, 'utf-8']);
				}else
					this.jump(null);
			}).then(function(err, data){
				db.hrefs.push({
					href: href,
					path: this.get[0],
					watcher: this.get[1],
					tree: data || null
				});

				command.response(load, 200, data);
			}).catch(function(err){
				var msg = 'Brak arkuszu: '+err.message;
				command.response(load, 404, msg);
			})
	},
	deleteHref: function(href){
		db.hrefs[href].watcher.close();
		delete db.hrefs[href];
	}
}

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
			if(path in command)
				command[path](res, JSON.parse(data));
			else{
				res.writeHead(404);
				res.end();
			}
		});
	}else{
		for(i in uri.query){
			uri.query[i] = decodeURIComponent(uri.query[i]);
		}

		if(path in command)
			command[path](res, uri.query);
		else{
			res.writeHead(404);
			res.end();
		}
	}
}).listen(7001);

//file handler
http.createServer(function(req, res){
	var uri = url.parse(req.url),
		path = uri.pathname.substring(1);

	sys.loadStyle(res, path);
}).listen(7000);