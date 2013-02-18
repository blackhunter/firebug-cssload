var http = require('http'),
	fs = require('fs'),
	__path = require('path'),
	less = require('less'),
	url = require('url');

//repolling
setInterval(function(){
	//command.reload();
	//if(data.queue.length)
	//console.log(data.scanner.tree.tet);
//	data.queue.forEach(function(ele){
	//	console.log(ele);
	//})
	//data.queue = [];
},500);

var data = {
	polling: null,
	save: {},
	trees: {},
	sheets: {},
	queue: []
};

//TODO ignore changes on off files(client site)
//TODO iterval saves
var sys = {
	loadSave: function(){
		fs.exists(__dirname+'/cssrl.json', function(exists){
			if(exists)
				fs.readFile(__dirname+'/cssrl.json', function(err, file){
					if(err) throw err;
					data.save = JSON.parse(file);
					data.queue.push({save: data.save});
					for(var i in data.save){
						sys.loadLoc(i);
					}
				});
			else{
				data.save = {};
				data.queue.push({save: null});
			}
		});
	},
	updateSave: function(){
		fs.writeFile(__dirname+'/cssrl.json', JSON.stringify(data.save), function(err){
			if(err) throw err;
		});
	},
	loadLoc: function(path, host){
		//path = __path.resolve(path);
		fs.stat(path, function(err, stats){
			if(err){
				if(err.errno==34)	//no file
					data.queue.push({localization: null});
				else
					throw err;
			}else{
				//if(!stats.isDirectory())
					//path = __path.dirname(path);
				if(!(path in data.save))
					data.save[path] = host;

				fs.exists(path+'/.cssrl.json', function(exists){
					if(exists){
						fs.readFile(path+'/.cssrl.json', function(err, data){
							if(err) throw err;
							sys.mapLoc(path, JSON.parse(data));
						});
					}else{
						sys.mapLoc(path, {});
					}
				});
			}
		});
	},
	saveLoc: function(path){
		fs.writeFile(path+'/.cssrl.json', JSON.stringify(sys.preString(data.scanner, {})), function(err){
			if(err) throw err;
		});
	},
	preString: function(obj, base){	//TODO if folder name == watch
		if('watch' in obj){
			base.watch = obj.watch;
			base.tree = {};
			sys.preString(obj.tree, base.tree);
		}else{
			for(var i in obj){
				if(obj[i].watcher){
					var bs = base[i] = {};
					sys.preString(obj[i],bs);
				}else{
					base[i] = obj[i];
				}
			}
		}

		return base;
	},
	mapLoc: function(path, oldTree){
		var scan = function(err, files){
				if(err) throw err;

				this.progress[0]--;
				var i = files.length;
				while(i--){
					if(files[i]=='.cssrl.json'){
						this.tree[files[i]] = false;
						continue;
					}

					this.progress[1]++;
					fs.stat(this.path+'/'+files[i], stats.bind(this, files[i]));
				}
				isEnd(this);
			},
			stats = function(name, err, stats){
				if(stats.isDirectory()){
					var prev,scanner;
					if(name in this.prev)
						prev = this.prev[name].tree;
					else
						prev = {};

					scanner = new scaner(this.path+'/'+name, this.end, ((!(name in this.prev) || this.prev[name].watch)? true : false), prev, {}, this.progress);
					scanner.watcher = fs.watch(scanner.path, watch.bind(scanner));
					this.tree[name] = scanner;

					this.progress[0]++;
					fs.readdir(scanner.path, scan.bind(scanner));
				}else{
					this.tree[name] =(!(name in this.prev) || this.prev[name])? true : false;
				}
				this.progress[1]--;
				isEnd(this);
			},
			watch = function(event, name){
				if(event=='change'){
					if(!(this.tree[name] instanceof Object) && this.tree[name]){
						data.queue.push({'change': this.path+'/'+name});
					}
				}else if(name && !this.isNull){	//dir detect
					fs.stat(this.path+'/'+name, (function(err, stats){
						if(err)	throw err;
						if(stats.isDirectory()){
							var __tree = this.tree;
							var scanner = new scaner(this.path+'/'+name, function(){
								__tree[name] = this;

								data.queue.push({'tree_change':{new: this.path, folder: sys.preString(__tree[name] ,{})}});
							});
							scanner.watcher = fs.watch(scanner.path, watch.bind(scanner));

							fs.readdir(scanner.path, scan.bind(scanner));
						}else{
							this.tree[name] = true;
							data.queue.push({'tree_change':{new: this.path+'/'+name, folder: null}})
						}
					}).bind(this));
				}else if(this.isNull){
					clearTimeout(this.interval);
					this.isNull = false;

					//rename
					fs.readdir(this.path, watchScan.bind(this,name));
				}else if(!name){
					this.isNull = true;
					this.interval = setTimeout((function(){
						this.isNull = false;

						//delete
						fs.readdir(this.path, watchScan.bind(this,null));
					}).bind(this),100);
				}
			},
			watchScan = function(nowFile, err, files){
				if(err) throw err;

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

				if(!nowFile){
					delete this.tree[list[0]];
					data.queue.push({'tree_change': {delete: this.path+'/'+list[0]}});
				}else{
					this.tree[nowFile] = this.tree[list[0]];
					this.tree[nowFile].path = this.path+'/'+nowFile;
					data.queue.push({'tree_change': {rename: {from: this.path+'/'+list[0], to:this.path+'/'+nowFile}}});
					delete this.tree[list[0]];
				}
			},
			isEnd = function(self){
				if(!self.progress[0] && !self.progress[1]){
					self.end();
				}
			},
			scaner = function(path, fuu, watch, prev, tree, progress){
				this.path = path;
				this.tree = tree || {};
				this.end = fuu.bind(this);
				this.progress = progress || [1,0];
				this.prev = prev || {};
				this.watch = watch;
				this.isNull = false;
				this.interval = null;
				this.watcher = null;
			}

		var scanner = new scaner(path, function(){
			data.scanner = this;
			data.queue.push({localization: {tree: sys.preString(this.tree, {}), path: this.path}});
		}, true, oldTree || {});

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

		loop(data.scanner.tree[path]);
		delete  data.scanner.tree[path];
	},
	unmapPath: function(path, sub){
		function loop(base, path){
			var next = path.shift();
			if(next in base){
				if(path.length)
					loop(base[next], path);
				else{
					return [base, next];
				}
				//TODO brak sciezki
			}
		}
		if(path in data.scanner.tree){
			path = path.split(__path.sep);
			var ret = loop(data.scanner.tree[path], sub);
			if(typeof ret[0][ret[1]] == 'boolean')
				ret[0][ret[1]] = !ret[0][ret[1]];
			else
				ret[0][ret[1]].watch = !(ret[0][ret[1]].watch);
		}
	}
	},
	css = {
		editProp: function(path, selector, now, old){
			if(old){	//delete or edit
				var where = data.styleSheet[path].rules[selector],
					reqExp = new RegExp(old.name+'[^;]+(\n|;)','mi');

				where.replace(reqExp, function(match, at1){
					var ret =now? now.name+': '+now.value+';' : '';
					if(at1=='\n' && now)
						ret+='\n'
					return ret;
				});
			}else{	//new style
				if(selector in data.styleSheet[path].rules)
					data.styleSheet[path].rules[selector].rules += now.name + ': ' + now.value + ';\n';
				else{
					//TODO error
				}
			}
		},
		editRule: function(){

		},
		mapLess: function(tree){
			var sheet = {
				vari:{},
				selectors:{}
			};

			var rules = tree.rules,
				i,rule;

			function loop(base, ele){
				var selector = base;
				ele.selectors.forEach(function(prop){
					selector += prop.combinator.value + prop.value;
				});
				//TODO parse selector
				sheet.selectors[selector] = ele.rules;
				ele.rules.forEach(function(prop, index){
					if('selectors' in prop)
						loop(selector, ele.rules[index]);
				});
			}

			for(i in rules){
				rule = rules[i];
				if(rule.variable){
					sheet.vari[rule.name] = rule;
				}else{
					loop('', rule);
				}
			}
			console.log(sheet);
		},
		mapStyle: function(data){
			var i = 0,
				buffer = '',
				pureBuffer = '',
				rules = {},
				rulesOrder = [],
				state = false,
				index,level,common;

			function part(selector, prev){
				this.prev =!prev? null : prev;
				this.name = '';
				this.selector =selector;
				this.rule = '';
				this.nested = [];

				this.extend = function(data){
					this.rule += data;
				}
				this.nest = function(buffer, pure){
					var now = new part(pure.replace(/\s+/g,' ').trim(), this);
					now.name += buffer;
					this.nested.push(now);
					return now;
				}

				if(!this.prev)
					rulesOrder.push(this);
				if(selector)
					rules[selector] = this;
			}

			level = new part(null);

			for(;i<data.length;i++){
				if(state && /\s/.test(data[i]))
					continue;
				else
					state = false;

				switch(data[i]){
					case '"':
					case "'":
						index = data.indexOf(data[i],i+1);
						if(index==-1){
							throw new Error('error: no "*/"');
						}

						common = data.substring(i,index+1);
						buffer += common
						pureBuffer += common;
						i = index;
						break;
					case ';':
						level.extend(buffer+data[i]);
						buffer = '';
						pureBuffer = '';

						if(!level.prev)
							level = new part(null);
						break;
					case '/':
						if(data[i+1]=='*'){
							index = data.indexOf('*/',i+2);
							if(index==-1){
								throw new Error('error: no "*/"');
							}else{
								index+=1;
							}
						}else if(data[i+1]=='/'){
							index = data.indexOf('\n',i+2)-1;
							if(index<0){
								index = data.length;
							}
						}else{
							pureBuffer += data[i];
							buffer += data[i];
							break;
						}

						buffer += data.substring(i,index+1);
						i = index;

						break;
					case '{':
						level = level.nest(buffer, pureBuffer);
						buffer = '';
						pureBuffer = '';

						break;
					case '}':
						level.extend(buffer);
						buffer = '';
						pureBuffer = '';

						state = true;
						level = level.prev;
						break;
					default:
						buffer += data[i];
						pureBuffer += data[i];
				}
			}
			return {rulesOrder: rulesOrder, rules: rules};
		},
		loadStyle: function(path, callback){
			fs.readFile(path, 'utf-8', function(err, file){
				if(!err)
					data.sheets[path] = css.mapStyle(file);

				callback(err, data.sheets[path]);
			});
		},
		decodeMap: function(path){
			function loop(tree){
				var file = '',
					i = 0,
					j = tree.length,
					empty;

				for(;i<j;i++){
					empty = (tree[i].name!='');

					file +=empty? tree[i].name+'{' : '';
					file += tree[i].rule;
					if(tree[i].nested){
						file += loop(tree[i].nested);
					}
					file +=empty? '}\n' : '';
				}
				return file;
			}

			return loop(data.sheets[path].rulesOrder);
		},
		save: function(path){
			 fs.writeFile(path, css.decodeMap(path), function (err) {
			 if (err) throw err;
			 console.log('It\'s saved!');
			 });
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

	}
}

/*
css.loadStyle('c://test/style.less', function(err){
	if(err)	throw err;
	//css.save('c://test/style.less');
});*/

var parser = new(less.Parser);

parser.parse('@color: red;\n\ndiv//ooot\n{div{color: blue;//mem\n}\nwidth: @color;\n}', function (err, tree) {
	if (err) { return console.error(err) }
	var util = require('util');

	console.log(util.inspect(tree.rules, false, null));
	/*
	tree.rules.forEach(function(ele){
		console.log(ele);
	});*/
	//console.log(tree);
});


/*
fs.open('c://test/testowy.txt','r+', 666, function(err, id){
	if(err) throw err;
	fs.write (id, ' \b\r***', 3, 'utf8',  function(err){
		if(err) throw err;
		fs.close(id);
	});
})*/
 //Writes: a (0x61)
// sys.loadLoc('c://test');

//console.log(__path.resolve('c://test'));

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

/*
//addon handler
http.createServer(function(req, res){
	var uri = url.parse(req.url, true),
		path = uri.pathname.substring(1),
		i;

	for(i in uri.query){
		uri.query[i] = decodeURIComponent(uri.query[i]);
	}

	if(path in command)
		command[path](res, uri.query);
	else{
		res.writeHead(200);
		res.end();
	}
}).listen(6776);

//file handler
http.createServer(function(req, res){
	var uri = url.parse(req.url),
		path = uri.pathname.substring(1),
		ext = __path.extname(path);

	css.loadStyle(path, function(err){
		if(err)	throw err;

		res.writeHead(200, {
			'Content-Length': file.length,
			'Content-Type': 'text/plain'
		});
		res.setHeader('Cache-Control', 'no-cache, no-store');

		var file = css.decodeMap(path);
		if(ext=='.less'){
			less.render(file, function (e, file){
				res.end(file,'utf-8')
			});
		}else{
			res.end(file,'utf-8')
		}
	});
}).listen(6777);*/