var http = require('http'),
	fs = require('fs'),
	__path = require('path'),
	less = new (require('less').Parser),
	url = require('url'),
	util = require('util');


var lessParse =  require('less');

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
			if(path in data.sheets && selector in data.sheets[path])
			var base = data.sheets[path].selectors[selector].rules;

			//delete
			if(old){
				base.some(function(ele, index){
					if('name' in ele && ele.name==old.name){
						base.splice(index,1);
						return true;
					}
					return false;
				});
			}
			//add
			if(now){
				less.parse(now.name + ': '+ now.value, function(err, tree){
					base.push(tree.rules[0]);
				});
			}
		},
		editRule: function(){

		},
		mapLess: function(sheet){
			function loop(context, selector){
				selector.rules.forEach(function(ele){
					if('selectors' in ele){
						var paths = [];
						ele.selectors.forEach(function(sele){
							selector.joinSelector.apply(selector, [paths, context, sele]);
						});
						loop(paths, ele);
						console.log(paths.map(function (p) {
							return p.map(function (s) {
								return s.toCSS(true);
							}).join('').trim();
						}).join(','));
					}
				});
			}

			loop([], sheet);
		},
		loadStyle: function(path, callback){
			fs.readFile(path, 'utf-8', function(err, file){
				if(!err){
					less.parse(file, function(err, tree){
						if(!err){
							var sheet = {
								vari: {},
								selectors: {},
								tree: tree
							};
							data.sheets[path] = sheet;
							//console.log(util.inspect(tree, false, null));
							//css.mapLess(sheet);
						}

						callback(err);
					});
				}else
					callback(err);
			});
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
	path = uri.pathname.substring(1);

	function serve(file){
		res.writeHead(200, {
			'Content-Length': file.length,
			'Content-Type': 'text/css'
		});
		res.setHeader('Cache-Control', 'no-cache, no-store');
		res.end(file,'utf-8')
	}

	if(!(path in data.sheets))
		css.loadStyle(path, function(err){
			if(err)	throw err;
			serve(data.sheets[path].root.toCSS());
		});
	else
		serve(data.sheets[path].root.toCSS());
}).listen(6777);*/

//TODO @media, &, #bundle > .button;, comments, round(number, [places: 0]);
//.mixin (@a) when (lightness(@a) >= 50%)
//.one {@media (width: 400px) {
function treeToLess(tree){
	var endIgnore = false,
		currTabs = '',
		colors = {"#f0f8ff":"aliceblue","#faebd7":"antiquewhite","#00ffff":"cyan","#7fffd4":"aquamarine","#f0ffff":"azure","#f5f5dc":"beige","#ffe4c4":"bisque","#000000":"black","#ffebcd":"blanchedalmond","#0000ff":"blue","#8a2be2":"blueviolet","#a52a2a":"brown","#deb887":"burlywood","#5f9ea0":"cadetblue","#7fff00":"chartreuse","#d2691e":"chocolate","#ff7f50":"coral","#6495ed":"cornflowerblue","#fff8dc":"cornsilk","#dc143c":"crimson","#00008b":"darkblue","#008b8b":"darkcyan","#b8860b":"darkgoldenrod","#a9a9a9":"darkgrey","#006400":"darkgreen","#bdb76b":"darkkhaki","#8b008b":"darkmagenta","#556b2f":"darkolivegreen","#ff8c00":"darkorange","#9932cc":"darkorchid","#8b0000":"darkred","#e9967a":"darksalmon","#8fbc8f":"darkseagreen","#483d8b":"darkslateblue","#2f4f4f":"darkslategrey","#00ced1":"darkturquoise","#9400d3":"darkviolet","#ff1493":"deeppink","#00bfff":"deepskyblue","#696969":"dimgrey","#1e90ff":"dodgerblue","#b22222":"firebrick","#fffaf0":"floralwhite","#228b22":"forestgreen","#ff00ff":"magenta","#dcdcdc":"gainsboro","#f8f8ff":"ghostwhite","#ffd700":"gold","#daa520":"goldenrod","#808080":"grey","#008000":"green","#adff2f":"greenyellow","#f0fff0":"honeydew","#ff69b4":"hotpink","#cd5c5c":"indianred","#4b0082":"indigo","#fffff0":"ivory","#f0e68c":"khaki","#e6e6fa":"lavender","#fff0f5":"lavenderblush","#7cfc00":"lawngreen","#fffacd":"lemonchiffon","#add8e6":"lightblue","#f08080":"lightcoral","#e0ffff":"lightcyan","#fafad2":"lightgoldenrodyellow","#d3d3d3":"lightgrey","#90ee90":"lightgreen","#ffb6c1":"lightpink","#ffa07a":"lightsalmon","#20b2aa":"lightseagreen","#87cefa":"lightskyblue","#778899":"lightslategrey","#b0c4de":"lightsteelblue","#ffffe0":"lightyellow","#00ff00":"lime","#32cd32":"limegreen","#faf0e6":"linen","#800000":"maroon","#66cdaa":"mediumaquamarine","#0000cd":"mediumblue","#ba55d3":"mediumorchid","#9370d8":"mediumpurple","#3cb371":"mediumseagreen","#7b68ee":"mediumslateblue","#00fa9a":"mediumspringgreen","#48d1cc":"mediumturquoise","#c71585":"mediumvioletred","#191970":"midnightblue","#f5fffa":"mintcream","#ffe4e1":"mistyrose","#ffe4b5":"moccasin","#ffdead":"navajowhite","#000080":"navy","#fdf5e6":"oldlace","#808000":"olive","#6b8e23":"olivedrab","#ffa500":"orange","#ff4500":"orangered","#da70d6":"orchid","#eee8aa":"palegoldenrod","#98fb98":"palegreen","#afeeee":"paleturquoise","#d87093":"palevioletred","#ffefd5":"papayawhip","#ffdab9":"peachpuff","#cd853f":"peru","#ffc0cb":"pink","#dda0dd":"plum","#b0e0e6":"powderblue","#800080":"purple","#ff0000":"red","#bc8f8f":"rosybrown","#4169e1":"royalblue","#8b4513":"saddlebrown","#fa8072":"salmon","#f4a460":"sandybrown","#2e8b57":"seagreen","#fff5ee":"seashell","#a0522d":"sienna","#c0c0c0":"silver","#87ceeb":"skyblue","#6a5acd":"slateblue","#708090":"slategrey","#fffafa":"snow","#00ff7f":"springgreen","#4682b4":"steelblue","#d2b48c":"tan","#008080":"teal","#d8bfd8":"thistle","#ff6347":"tomato","#40e0d0":"turquoise","#ee82ee":"violet","#f5deb3":"wheat","#ffffff":"white","#f5f5f5":"whitesmoke","#ffff00":"yellow","#9acd32":"yellowgreen"},
		lastOp = null;

	var trans = {
		tabs: function(up){
			if(up)
				currTabs += '\t';
			else
				currTabs = currTabs.substr(1);
			return currTabs;
		},
		endSep: function(one){
			if(one)
				endIgnore = true;
			else{
				var end = (endIgnore? '' : ';');
				if(endIgnore)
					endIgnore = false;
				return end;
			}
		},
		value: function(ele, inherent){
			if(typeof(ele) == 'string'){
				return ele;
			}else if(Array.isArray(ele)){
				return ele.map(function(ele){
					return diagnosis(ele, 'value', inherent);
				}).join(' ');
			}else if(ele && typeof(ele)=='object'){
				if('rootpath' in ele)
					return 'url('+this.specValue(ele, inherent)+')';
				else if('value' in ele || 'expression' in ele){
					//console.log(inherent);
					return this.specValue(ele, inherent);
				}else{
					//console.log('now');
					throw new Error('here you are');
					//return diagnosis(ele,'val_end', inherent);
				}

			}
		},
		specValue: function(ele, inherent){
			if(ele.expression)
				var value = '`'+ele.expression+'`';
			else
				var value = this.value(ele.value, inherent);

			return (ele.escaped? '~' : '') + (ele.quote? ele.quote : '') + value + (ele.quote? ele.quote : '');
		},
		lvalue: function(con){
			var val = '',
				instance = /[><=]/.test(con.op);

			if(con.negate)
				val += 'not ';

			if(instance)
				val += '(';

			val += ['lvalue','rvalue'].map(function(sites){
					return diagnosis(con[sites], 'lvalue');
			}).filter(function(ele){	//remove unnecessary
				return ele!='true';
			}).join(' '+con.op+' ');

			if(instance)
				val += ')';
			return val;
		},
		operands: function(ele, last){
			var bracket = (!last || (!/[\+-]/.test(last) && /[\+-]/.test(ele.op)));
			return (bracket? '(' : '') + ele.operands.map(function(op){
				return diagnosis(op, 'operands', ele.op);
			}).join(' '+ele.op+' ') + (bracket? ')' : '');
		},
		rules: function(tab){
			var __self = this;

			return tab.map(function(rule){
				return currTabs+diagnosis(rule, 'rules')+__self.endSep();
			}).join('\n');

		},
		selectors: function(ruleset){
			var val = this.selector(ruleset.selector || ruleset.selectors);
			if('arguments' in ruleset)
				val += this.args(ruleset.arguments);
			if('params' in ruleset)
				val += this.args(ruleset.params);
			if('condition' in ruleset && ruleset.condition)
				val += ' when ' + trans.lvalue(ruleset['condition']);
			if('rules' in ruleset){
				this.tabs(true);
				val += ' {\n'+this.rules(ruleset.rules)+'\n'+this.tabs()+'}';
				this.endSep(true);
			}

			return val;
		},
		selector: function(tab){
			if(!Array.isArray(tab))	tab = [tab];
			return tab.map(function(selector){
				return selector.elements.map(function(ele){
					return ele.combinator.value+ele.value;
				}).join().trim();
			}).join(', ');
		},
		args: function(args){
			var __self = this;
			if(args.length)
				return '('+args.map(function(ele){
					return diagnosis(ele, 'args');
				}).join(', ')+')';
			else
				return '';
		},
		variadic: function(){
			return '...';
		},
		rgb: function(ele) {
			if(ele.alpha < 1.0){
				return "rgba(" + ele.rgb.map(function(part){
					return Math.round(part);
				}).concat(ele.alpha).join(', ') + ")";
			}else{
				var color = '#' + ele.rgb.map(function(part){
					part = Math.round(part);
					part = (part > 255 ? 255 : (part < 0 ? 0 : part)).toString(16);
					return part.length === 1 ? '0' + part : part;
				}).join('');
				return (color in colors)?colors[color] : color;
			}
		},
		name: function(ele){
			var val = '';

			if(ele.name)
				val += ele.name;

			if('value' in ele){
				if(val!='')
					val += ': ';
				val += diagnosis(ele.value ,'name');
			}else if('args' in ele){
				val += this.args(ele.args);
			}

			return val;
		},
		unit: function(ele){
			return ele.value+ele.unit;
		},
		arguments: function(arg){
			return this.selectors(arg);
		},
		features: function(parm){	//TODO
			return '@media(' +this.value(parm.features) + ')';
		},
		path: function(ele){
			var val = '@import';
			if(ele.once)
				val += '-once';
			val += ' ';
			val += this.specValue(ele._path);
			return val;
		}
	}

	var cap = {
		'val_end': {t:['rgb','value','name','operands'], def: 'value'},
		'lvalue': {t: ['name','unit','lvalue','operands'], def: 'value'},
		'operands': {t: ['rgb','name','unit'], def: 'value'},
		'rules': {t: ['path','features','arguments','args','selectors','name'], def: 'value'},
		'value': {t: ['name','unit','value','operands','selector','rgb','variadic'], def:'value'},
		'args': {t: ['name','variadic','value'], def: 'name'},
		'name': {t: ['unit','value'], def:'value'}
	}

	function diagnosis(obj, oInstance, params){
		var pick = cap[oInstance].def;

		/*
		if(Array.isArray(obj)){
			return obj.map(function(ele){
				console.log('run');
				return diagnosis(ele, oInstance, params);
			}).join();
		}else if(typeof(obj)=='string' || typeof(obj)=='number')
			return obj;*/

		//if(oInstance=='operands')
		//	console.log(obj, params);
		cap[oInstance].t.some(function(ele){
			return (ele in obj)? pick =  ele : false;
		});

		if(pick){
			return trans[pick](obj, params);
		}else{
			console.log('undiagnosis element: ', obj, oInstance);
			return '';
		}
	}

	console.log(util.inspect(tree.rules, false, null));
	return trans.rules(tree.rules);
	/*
	return tree.rules.map(function(rule){
		if('selector' in rule)
			return ruleset(rule, level);
		else
			return value(rule);
	}).join('\n');*/


	/*
	function loop(context, selector){
		selector.rules.forEach(function(ele){
			if('selectors' in ele){
				var paths = [];
				ele.selectors.forEach(function(sele){
					selector.joinSelector.apply(selector, [paths, context, sele]);
				});
				loop(paths, ele);
				console.log(paths.map(function (p) {
					return p.map(function (s) {
						return s.toCSS(true);
					}).join('').trim();
				}).join(','));
			}
		});
	}

	var less = [];
	loop([], sheet);*/

}



//tests

var url = 'c://test/style.less';

	css.loadStyle(url, function(err){
		if(err)	console.log(err);
		else
		console.log(treeToLess(data.sheets[url].tree));
		//console.log(data.sheets[url].tree);
	});

/*
less.parse(/*'div{border: (2+3px) darken(@color, 10%) solid @color red}''div, ul{color: darken(@color, 10%); div{color: blue;}}', function(err, tree){
	//console.log(util.inspect(tree, false, null));
	console.log(treeToLess(tree));*/

