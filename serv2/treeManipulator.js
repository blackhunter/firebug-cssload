var less = new (require('less').Parser),
	fs = require('fs'),
	reverse = require('./reverseParser.js'),
	tree;

module.exports = tree = {
		editProp: function(tree, selector, now, old){
			if(selector in tree){
				var base = tree[selector];
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
			}
		},
		editRule: function(){

		},
		mapLess: function(tree){
			var selectors = {};

			function getSelector(ele){
				return ele.selectors.map(function(selector){
					return selector.elements.map(function(ele){
						if(ele.value.name)
							return vars(ele.value.name, path);
						else
							return ele.value;
					}).join('').trim();
				}).join(', ');
			}


			function ruleset(self){
				this.self = self;
				this.child = function(self){
					return new ruleset(self);
				}
			}

			function loop(rules, path){
				//selectors
				rules.forEach(function(ele){
					if('selectors' in ele){
						var sele = getSelector(ele),
							now = selectors[sele] = path.child(ele.rules);
						loop(ele.rules, now);
					}
				});
			}

			loop(tree.rules, new ruleset(tree));
			//return selectors;
		},
		loadStyle: function(path, cb){
			fs.readFile(path, 'utf-8', function(err, file){
				if(!err){
					less.parse(file, function(err, less){
						if(!err){
							var sheet = {
								selectors: tree.mapLess(less),
								path: path,
								tree: less
							};

							cb(null, sheet);
							return;
						}

						cb(err);
					});
				}else if(cb)
					cb(err);
			});
		},
		saveStyle: function(obj, cb){
			fs.writeFile(obj.path, reverse.toLess(obj.tree), cb);
		}
	};
