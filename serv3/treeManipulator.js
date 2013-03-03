var less = new (require('less').Parser),
	fs = require('fs'),
	reverse = require('./reverseParser.js'),
	tree;

module.exports = tree = {
		editProp: function(tree, selector, now, old){
			if(selector in tree.selectors){
				var base = tree.selectors[selector];
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
						return ele.combinator.value+ele.value;
					}).join('').trim();
				}).join(', ');
			}

			function loop(rules, lastS){
				//selectors
				rules.forEach(function(ele){
					if('selectors' in ele){
						var sele = (lastS+getSelector(ele)).replace(' &',''),
							now = selectors[sele] = ele.rules;
						loop(ele.rules, sele+' ');
					}
				});
			}

			loop(tree.rules, '');
			return selectors;
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
				}else
					cb(err);
			});
		},
		saveStyle: function(obj, cb){
			fs.writeFile(obj.path, reverse.toLess(obj.tree), cb);
		}
	};
