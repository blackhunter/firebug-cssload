var http = require('http'),
	fs = require('fs'),
	__path = require('path'),
	manipulator = require('../../lessTreeEdit/lib/main.js'),
	worm = require('earthworm'),
	url = require('url');

var db = {
	resolves: {},
	hrefs: {},
	pages: {},
	poll: null,
	pollTimeout: null,
	pollQueue: [],
	pollDate: (new Date())*1,
	masterTimeout: null
}

var command = {
	page: function(){
		this.sheets = [];
		this.changes = [];
		this.change = function(change){
			if(change===null)
				this.changes = [];
			else
				this.changes.push(change);
		}
		this.save = function(toSave){
			if(toSave===undefined){
				toSave = this.changes;
				this.changes = [];
			}else
				toSave = [toSave];

			toSave.forEach(function(ele){
				if(ele.href in db.hrefs){
					db.hrefs[ele.href].changed = true;
					switch(ele.operation){
						case 'remove':
						case 'update':
							db.hrefs[ele.href].loadSheet(function(data){
								data.editProp(ele.selector.trim(), (ele.now || null), ele.old);
							})
							break;
						default:
							db.hrefs[ele.href].loadSheet(function(data){
								data.editRule(ele.selector, ele.fromFile);
							})
							break;
					}
				}
			});
		}
	},
	sheet: function(href, path, watcher, type){
		this.href = href;
		this.path =path;
		this.watcher = watcher;
		this.sheet = null;
		this.type = type;
		this.pages = 1;
		this.changed = false;
		this.loadSheet = function(fuu){
			if(!this.sheet){
				var self = this;
				manipulator.load(this.path, function(err, data){
					self.sheet = data;
					fuu(data);
				});
			}else{
				fuu(this.sheet);
			}
		}
	},
	sendReload: function(href){
		var finish = function(){
			db.pollQueue.push({
				operation: 'reload',
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
			responses.response(true, db.pollQueue);
			db.pollQueue = [];
		}
	},
	loadStyle: function(res, href){
		if(href in db.hrefs){
			db.hrefs[href].loadSheet(function(data){
				responses.response(res, data.toCSS(), {type: 'text/css'});
			});
		}else{
			this.addHref(res, href, 'styleSheets');
		}
	},
	addHref: function(load, href, type){
		var basename = __path.basename(href),
			self = this,
			longest = '',
			paths, i;

		//TODO
		for(i in db.resolves){
			if((new RegExp(i)).test(href) && i.length>longest.length){
				longest = i
			}
		}

		if(longest==='')
			paths = href;
		else
			paths = href.replace(longest, db.resolves[longest]);

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

				//this.set(path);
				//this.set(fs.watchFile(path, command.sendReload.bind(this, href)));

				//TODO watch reloadfilter
				db.hrefs[href] = new self.sheet(href, path, fs.watchFile(path, command.sendReload.bind(this, href)), type);

				if(load)
					db.hrefs[href].loadSheet(function(data){
						responses.response(load, data.toCSS(), {type: 'text/css'});
					})
					//this.cast(manipulator.load, path);
			}).catch(function(err){
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
	},
	saveAll: function(){
		var i;
		for(i in db.hrefs){
			if(db.hrefs[i].changed)
				db.hrefs[i].sheet.save();
		}
	}
}

var responses = {
	pooling: function(res, data){
		db.poll = res;
		command.checkPollQueue();

		if(data.pollDate!=db.pollDate)
			responses.response(true);
		else
			db.pollTimeout = setTimeout(function(){
				responses.response(true);
				db.pollTimeout = null;
			},15000);
	},
	register: function(res, data){
		if(!(data.page in db.pages))
			db.pages[data.page] = new command.page();

		for(var i in data.comp){
			data.comp[i].forEach(function(ele){
				db.pages[data.page].sheets.push(ele);

				if(!(ele in db.hrefs))
					command.addHref(null, ele, i);
			});
		}

		responses.response(res);
	},
	unregister: function(res, data){
		/*
		if(data.page in db.pages){
			db.pages[data.page].sheets.forEach(function(href){
				if(href in db.hrefs){
					db.hrefs[href].pages--;
					if(!db.hrefs[href].pages)
						command.deleteHref(href);
				}
			});

			delete db.pages[data.page];
		}*/

		responses.response(res);
	},
	save: function(res, query){
		if(query.page in db.pages)
			db.pages[query.page].save();

		this.response(res);
	},
	refresh: function(res, query){
		if(query.page in db.pages)
			db.pages[query.page].change(null);

		this.response(res);
	},
	css: function(res, query){
		if(query.page in db.pages){
			if(query.autoSave){
				db.pages[query.page].save(query.change);
			}else
				db.pages[query.page].change(query.change);
		}

		this.response(res);
	},
	response: function(res, data, setStats){
		var
			status =(setStats && setStats.status)? setStats.status : 200,
			type =(setStats && setStats.type)?  setStats.type : 'text/plain';

		if(res===true){
			if(db.pollTimeout)
				clearTimeout(db.pollTimeout);
			res = db.poll;
			db.poll = null;

			if(data==null)
				data = {};

			data.pollDate = db.pollDate;
		}

		if(data==null){
			status =(status==200? 204 : status);
			data=null;
		}else{
			if(data instanceof Object)
				data = JSON.stringify(data);

			res.setHeader('Content-Length', data.length);
		}

		res.setHeader('Content-Type',type);
		res.setHeader('Cache-Control', 'no-cache, no-store');
		res.statusCode = status;
		res.end(data);
	}
}

//loadconfig
fs.readFile(__dirname+'/config.json', function(err, data){
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
		data = '';

	console.log(path);
	if(req.method=="POST"){
		req.on('data', function(chunk){
			data += chunk;
		});

		req.on('end', function(){
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

//ticktock();