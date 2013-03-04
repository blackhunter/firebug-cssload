var less = new (require('less').Parser),
	fs = require('fs'),
	reverse = require('./reverseParser.js'),
	tree;

module.exports = tree = {
		editProp: function(tree, selector, now, old){
			if(selector in tree.selectors){
				var base = tree.selectors[selector].rules;
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
		editRule: function(sheet, css, fromFile){
			if(typeof css == 'number'){
				var toDel, i, selector,
					listType = (fromFile? 'list' : 'listOut');

				selector = sheet[listType][css];
				sheet[listType].splice(css,1);
				toDel = sheet.selectors[selector];
				delete sheet.selectors[selector];

				i = toDel.parent.length;
				while(i--){
					if(toDel.parent[i].rules == toDel.rules){
						toDel.parent.splice(i, 1);
						break;
					}
				}
			}else{
				var getSelector = this.selectorParser;

				if(css.substr(0, css.indexOf("{")) in sheet.selectors)
					return;

				less.parse(css, function(err, less){
					less.rules[0].selectors.forEach(function(ele){
						var startSelector = getSelector({selectors: [ele]});
						var now = ele,
							end = [];

						while(true){	//ok
							if(!now.elements.length){
								sheet.selectors[startSelector] = {
									rules: less.rules[0].rules,
									parent: sheet.tree.rules
								}
								sheet.listOut.push(startSelector);
								sheet.tree.rules.push(less.rules[0]);
								break;

							}else if((selector = getSelector({selectors: [now]})) in sheet.selectors){
								ele.elements = end;
								sheet.selectors[selector].rules.push(less.rules[0]);
								sheet.listOut.push(startSelector);
								sheet.selectors[startSelector] = {
									rules: less.rules[0].rules,
									parent: sheet.selectors[selector]
								}
								break;
							}else{
								end.push(now.elements.pop())
							}
						}
					});
				});
			}
		},
		mapLess: function(tree, list){
			var selectors = {},
				getSelector = this.selectorParser;

			function loop(rules, lastS){
				//selectors
				rules.forEach(function(ele){
					if('selectors' in ele){
						var sele = (lastS+getSelector(ele)).replace(' &','');

						if(list)
							list.push(sele);

						selectors[sele] = {
							rules: ele.rules,
							parent: rules
						}
						loop(ele.rules, sele+' ');
					}
				});
			}

			loop(tree.rules, '');
			return selectors;
		},
		selectorParser: function(ele){
			return ele.selectors.map(function(selector){
				return selector.elements.map(function(ele){
					return (ele.combinator.value=='+'? ' + ' : ele.combinator.value)+ele.value;
				}).join('').trim();
			}).join(', ');
		},
		loadStyle: function(path, cb){
			fs.readFile(path, 'utf-8', function(err, file){
				if(!err){
					less.parse(file, function(err, less){
						if(!err){
							var sheet = {
								selectors: null,
								list: [],
								listOut: [],
								path: path,
								tree: less
							};

							sheet.selectors = tree.mapLess(less, sheet.list)

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
