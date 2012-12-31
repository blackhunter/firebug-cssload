var http = require('http'),
	fs = require('fs'),
	url = require('url');

//repolling
setInterval(function(){
	//command.reload();
},10000);

var data = {
	polling: null,
	save: null,
	trees: {},
	queue: []
};

var connect = {

}

//TODO ignore changes on off files(client site)
var sys = {
	loadSave: function(root){
		fs.exists('/save', function(exists){
			if(exists)
				fs.readFile('/save', function (err, data){
					if(err) throw err;
					data.save = JSON.parse(data);
					data.queue.push({save: data.save});
				});
			else
				data.queue.push({save: null});
		});
	},
	updateSave: function(){	//TODO lookup
		fs.writeFile(JSON.stringify(data.save), 'path', function (err) {
			if (err) throw err;
			//console.log('It\'s saved!');
		});
	},
	loadLoc: function(path){
		fs.exists(path, function(exists){
			if(exists)
				fs.readFile(path, function(path, err, data){
					if(err) throw err;
					var oldtree = JSON.parse(data);
					sys.mapLoc(path, oldtree);
				});
			else
				sys.mapLoc(path, {});
		});
	},
	saveLoc: function(path){	//TODO lookup
		fs.writeFile(JSON.stringify(data.tree), path, function (err) {
			if (err) throw err;
			//console.log('It\'s saved!');
		});
	},
	mapLoc: function(path, oldTree){
		var scan = function(err, files){
				this.progress[0]--;
				var i = files.length;
				while(i--){
					this.progress[1]++;
					fs.stat(this.path+'/'+files[i], stats.bind(this, files[i]));
				}
				isEnd(this);
			},
			stats = function(name, err, stats){
				if(stats.isDirectory()){
					this.progress[0]++;
					this.tree[name] = {tree: {}, watcher: null};
					sys.mapLoc(new scaner(this.path+name+'/', this.end, this.prev[name], this.tree[name].tree, this.progress));
				}else{
					this.tree[name] =(this.prev[name] || !(name in this.prev))? true : false;
				}
				this.progress[1]--;
				isEnd(this);
			},
			watch = function(event, file){
				if(event=='change'){
					if(!(this.tree[file] instanceof Object) && this.tree[file]){
						data.queue.push({'change': this.path+file});
					}
				}else if(file && !this.isNull){
					this.tree[file] = true;
					data.queue.push({'tree_change':{new: this.tree+file}})
				}else if(this.isNull){
					clearTimeout(this.interval);
					this.isNull = false;

					//rename
					fs.readdir(this.path, watchScan.bind(this,file));
				}else if(!file){
					this.isNull = true;
					this.interval = setTimeout((function(){
						this.isNull = false;

						//delete
						fs.readdir(this.path, watchScan.bind(this,null));
					}).bind(this),100);
				}
			},
			watchScan = function(prevFile, err, files){
				var list = Object.keys(this.tree),
					index,ele;

				while(true){
					ele = files.shift();
					if(ele==undefined)
						break;

					index = list.indexOf(ele);
					if(index!=-1)
						list.splice(index,1);
				}

				if(list.length>1)//TODO if more changes over watchScan process, there mybe problems
					console.log('ehh, error');

				if(!prevFile){
					delete this.tree[list[0]];
					data.queue.push({'tree_change': {delete: this.path+list[0]}});
				}else{
					this.tree[prevFile] = this.tree[list[0]];
					data.queue.push({'tree_change': {rename: {from: this.path+list[0], to:this.path+prevFile}}});
					delete this.tree[list[0]];
				}
			},
			isEnd = function(self){
				if(!self.progress[0] && !self.progress[1]){
					self.end();
				}
			},
			scaner = function(path, fuu, prev, tree, progress){
				this.path = path;
				this.tree = tree || {};
				this.end = fuu.bind(this);
				this.progress = progress || [1,0];
				this.prev = prev || {};
				this.isNull = false;
				this.interval = null;
				this.watcher = null;
			}

		var scanner;
		if(path instanceof scaner)
			scanner = path;
		else
			scanner = new scaner(path, function(){
				data.trees[path] = this;
				data.queue.push({localization: {tree: this.tree, path: this.path}});
			}, oldTree);

		scanner.watcher = fs.watch(scanner.path, watch.bind(scanner));
		fs.readdir(scanner.path, scan.bind(scanner));
	},
	unmapLoc: function(path){
		var loop = function(tree){
			for(var i in tree){
				if(tree[i].watcher){
					tree[i].watcher.close();
					loop(tree[i].tree);
				}
			}
		}

		if(path in data.trees){
			data.trees[path].watcher.close();
			loop(data.trees[path].tree);
			delete data.trees[path];
		}
	}
}

var command = {
	/*
	new: function(res, query){

	},
	delete: function(res, query){

	},
	remove: function(res, query){

	},
	update: function(res, query){

	},*/
	polling: function(res){
		//var path = url.parse(query.url).pathname;

		//this.reload(null);
		data.polling = res;
		res.writeHead(200);
	},
	reload: function(msg){
		data.polling.end(msg? msg : '');
	},
	test: function(res){
		this.reload("/leki/html/");
		res.end()
		res.writeHead(200);
		res.end();
	},
	register: function(){
		//dostajemy pathname + root
		//dodajemy zwiazek do listy node.js
		//jezeli jest to pobieramy save i sprawdzamy za zmianami w katalogu
		//szukamy w podanych lokalizacjach i zracamy jezeli brak
		var uriList = [],
			uriBase,
			pathname;

		urlList.forEach(function(ele){
			pathname = url.parse(ele).pathname;

		});
	}
}

function scaner(path, fuu, prev,  tree, progress){
	this.path = path;
	this.tree = tree || {};
	this.end = fuu.bind(this);
	this.progress = progress || [1,0];
	this.prev = prev || {};
	this.inNull = false;
	this.interval = null;
}

var scanDIR =  function(scanner){
	var scan = function(err, files){
			this.progress[0]--;
			var i = files.length;
			while(i--){
				this.progress[1]++;
				fs.stat(this.path+'/'+files[i], stats.bind(this, files[i]));
			}
			isEnd(this);
		},
		stats = function(name, err, stats){
			if(stats.isDirectory()){
				this.progress[0]++;
				this.tree[name] = {};
				scanDIR(new scaner(this.path+name+'/', this.end, this.prev[name], this.tree[name], this.progress));
			}else{
				this.tree[name] =(this.prev[name] || !(name in this.prev))? true : false;
			}
			this.progress[1]--;
			isEnd(this);
		},
		watch = function(event, file){
			if(event=='change'){
				if(!(this.tree[file] instanceof Object) && this.tree[file]){
					console.log('reload: '+this.path+file);
					//filechange, send reload this.path+'/'+file
				}
			}else if(file && !this.isNull){
				this.tree[file] = true;

				//send, new
				console.log('new: '+file);
			}else if(this.isNull){
				clearTimeout(this.interval);
				this.isNull = false;

				//send reload, rename
				fs.readdir(this.path, watchScan.bind(this));
			}else if(!file){
				this.isNull = true;
				this.interval = setTimeout((function(){
					this.isNull = false;

					//send reload, delete
					fs.readdir(this.path, watchScan.bind(this));
				}).bind(this),100);
			}
		},
		watchScan = function(err, files){
			var list = Object.keys(this.tree),
				newList = [],
				index,ele,i;

			while(true){
				ele = files.shift();
				if(ele==undefined)
					break;

				index = list.indexOf(ele);
				if(index==-1){
					newList.push(ele);
					this.tree[ele] = true;
				}else
					list.splice(index,1);
			}

			i = list.length;
			while(i--){
				delete this.tree[list[i]];
			}
		},
		isEnd = function(self){
			if(!self.progress[0] && !self.progress[1]){
				self.end();
			}
		}

	fs.watch(scanner.path, watch.bind(scanner));
	fs.readdir(scanner.path, scan.bind(scanner));
}
//scanDIR(new scaner('c://test/', function(){
	//console.log(this);
//}));
//scanDIR('c://test/',tress,[1,0]);

/*
var list = ['c://test/doc1.txt','c://test/doc2.txt'];
list.forEach(function(ele){
	test(ele);
})
function test(path){
	fs.watch(path,function(){
		fs.watch(path,function(){
			console.log(arguments, path);
		});
	});
}*/

var handle = function(req, res){
	var uri = url.parse(req.url, true),
		path = uri.pathname.substring(1),
		i;

	for(i in uri.query){
		uri.query[i] = decodeURIComponent(uri.query[i]);
	}

	console.log(path);
	console.log(uri.query);

	if(path in command)
		command[path](res, uri.query);
	else{
		res.writeHead(200);
		res.end();
	}
}

//http.createServer( handle ).listen(6776);