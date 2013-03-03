var http = require('http'),
	fs = require('fs'),
	__path = require('path'),
	manipulator = require('./treeManipulator.js'),
	worm = require('../../earthworm/lib/main.js'),
	url = require('url'),
	util = require('util');

var db = {
	resolves: {},
	hrefs: {},
	poll: null,
	pollTimeout: null,
	pollQueue: [],
	masterTimeout: null
}

var command = {
	sendReload: function(href){
		db.pollQueue.push({
			reload: href,
			type: db.hrefs[href].type
		});
		this.checkPollQueue();
	},
	checkPollQueue: function(){
		if(db.poll != null && db.pollQueue.length){
			this.response(true, 200, JSON.stringify(db.pollQueue));
			db.pollQueue = [];
			console.log('pong Msg');
		}
	},
	response: function(res, status, data){
		var type;
		if(Array.isArray(status)){
			type = status[1];
			status = status[0];
		}

		if(res===true){
			if(db.pollTimeout)
				clearTimeout(db.pollTimeout);
			res = db.poll;
			db.poll = null;
		}

		if(data===undefined && status==200)
			status =204;
		else
			res.setHeader('Content-Length', data.length);

		res.setHeader('Content-Type', (type? type : 'text/plain'));
		res.setHeader('Cache-Control', 'no-cache, no-store');
		res.statusCode = status;
		res.end(data);
	}
}

var responses = {
	pooling: function(res){
		db.poll = res;
		command.checkPollQueue();

		db.pollTimeout = setTimeout(function(){
			command.response(true, 200);
			db.pollTimeout = null;
			console.log('pong ta');
		},15000);
	},
	register: function(res, data){
		for(var i in data){
			data[i].forEach(function(ele){
				if(!(ele in db.hrefs))
					sys.addHref(null, ele, i);
			});
		}

		command.response(res, 200);
	},
	/*
	unregister: function(res, data){
		data.forEach(function(ele){
			if(ele in db.hrefs){
				sys.deleteHref(ele);
			}
		});
		command.response(res, 200);
	},*/
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
			this.addHref(res, href, 'styleSheets');
	},
	addHref: function(load, href, type){
		var basename = __path.basename(href),
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
				this.set(fs.watchFile(path, (function(path){
					command.sendReload(path);
				}).bind(this, path)));

				if(load){
					this.cast(manipulator.loadStyle, path);
				}else
					this.jump(null);
			}).then(function(err, data){
				db.hrefs[href] = {
					href: href,
					path: this.get[0],
					watcher: this.get[1],
					sheet: data || null,
					type: type
				};

				command.response(load, [200,'text/css'], data.tree.toCSS());
			}).catch(function(err){
				console.log(err);
				if(load)
					command.response(load, 404, err.message);
				else
					console.log(err.message);
			})
	},
	deleteHref: function(href){
		db.hrefs[href].watcher.close();
		delete db.hrefs[href];
	}
}

//loadconfig
fs.readFile('config.json', function(err, data){
	if(err){
		console.log('Problem z wczytaniem pliku konfiguracji!');
		throw new Error(err)
	}else{
		db.resolves = JSON.parse(data);
		db.resolves['127.0.0.1:7000/'] = '';
	}
})

//addon handler
http.createServer(function(req, res){
	var uri = url.parse(req.url, true),
		path = uri.pathname.substring(1),
		data = '',
		i;

	console.log('coon');

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
		for(i in uri.query){
			uri.query[i] = decodeURIComponent(uri.query[i]);
		}

		console.log(uri.query[i]);
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
	sys.loadStyle(res, '127.0.0.1:7000'+req.url);
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

//ticktock();