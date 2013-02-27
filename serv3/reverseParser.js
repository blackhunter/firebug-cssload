var colors = {"#f0f8ff":"aliceblue","#faebd7":"antiquewhite","#00ffff":"cyan","#7fffd4":"aquamarine","#f0ffff":"azure","#f5f5dc":"beige","#ffe4c4":"bisque","#000000":"black","#ffebcd":"blanchedalmond","#0000ff":"blue","#8a2be2":"blueviolet","#a52a2a":"brown","#deb887":"burlywood","#5f9ea0":"cadetblue","#7fff00":"chartreuse","#d2691e":"chocolate","#ff7f50":"coral","#6495ed":"cornflowerblue","#fff8dc":"cornsilk","#dc143c":"crimson","#00008b":"darkblue","#008b8b":"darkcyan","#b8860b":"darkgoldenrod","#a9a9a9":"darkgrey","#006400":"darkgreen","#bdb76b":"darkkhaki","#8b008b":"darkmagenta","#556b2f":"darkolivegreen","#ff8c00":"darkorange","#9932cc":"darkorchid","#8b0000":"darkred","#e9967a":"darksalmon","#8fbc8f":"darkseagreen","#483d8b":"darkslateblue","#2f4f4f":"darkslategrey","#00ced1":"darkturquoise","#9400d3":"darkviolet","#ff1493":"deeppink","#00bfff":"deepskyblue","#696969":"dimgrey","#1e90ff":"dodgerblue","#b22222":"firebrick","#fffaf0":"floralwhite","#228b22":"forestgreen","#ff00ff":"magenta","#dcdcdc":"gainsboro","#f8f8ff":"ghostwhite","#ffd700":"gold","#daa520":"goldenrod","#808080":"grey","#008000":"green","#adff2f":"greenyellow","#f0fff0":"honeydew","#ff69b4":"hotpink","#cd5c5c":"indianred","#4b0082":"indigo","#fffff0":"ivory","#f0e68c":"khaki","#e6e6fa":"lavender","#fff0f5":"lavenderblush","#7cfc00":"lawngreen","#fffacd":"lemonchiffon","#add8e6":"lightblue","#f08080":"lightcoral","#e0ffff":"lightcyan","#fafad2":"lightgoldenrodyellow","#d3d3d3":"lightgrey","#90ee90":"lightgreen","#ffb6c1":"lightpink","#ffa07a":"lightsalmon","#20b2aa":"lightseagreen","#87cefa":"lightskyblue","#778899":"lightslategrey","#b0c4de":"lightsteelblue","#ffffe0":"lightyellow","#00ff00":"lime","#32cd32":"limegreen","#faf0e6":"linen","#800000":"maroon","#66cdaa":"mediumaquamarine","#0000cd":"mediumblue","#ba55d3":"mediumorchid","#9370d8":"mediumpurple","#3cb371":"mediumseagreen","#7b68ee":"mediumslateblue","#00fa9a":"mediumspringgreen","#48d1cc":"mediumturquoise","#c71585":"mediumvioletred","#191970":"midnightblue","#f5fffa":"mintcream","#ffe4e1":"mistyrose","#ffe4b5":"moccasin","#ffdead":"navajowhite","#000080":"navy","#fdf5e6":"oldlace","#808000":"olive","#6b8e23":"olivedrab","#ffa500":"orange","#ff4500":"orangered","#da70d6":"orchid","#eee8aa":"palegoldenrod","#98fb98":"palegreen","#afeeee":"paleturquoise","#d87093":"palevioletred","#ffefd5":"papayawhip","#ffdab9":"peachpuff","#cd853f":"peru","#ffc0cb":"pink","#dda0dd":"plum","#b0e0e6":"powderblue","#800080":"purple","#ff0000":"red","#bc8f8f":"rosybrown","#4169e1":"royalblue","#8b4513":"saddlebrown","#fa8072":"salmon","#f4a460":"sandybrown","#2e8b57":"seagreen","#fff5ee":"seashell","#a0522d":"sienna","#c0c0c0":"silver","#87ceeb":"skyblue","#6a5acd":"slateblue","#708090":"slategrey","#fffafa":"snow","#00ff7f":"springgreen","#4682b4":"steelblue","#d2b48c":"tan","#008080":"teal","#d8bfd8":"thistle","#ff6347":"tomato","#40e0d0":"turquoise","#ee82ee":"violet","#f5deb3":"wheat","#ffffff":"white","#f5f5f5":"whitesmoke","#ffff00":"yellow","#9acd32":"yellowgreen"},
	cap = {
		'ruleset': {t: ['features', 'name','silent'], def: 'value'},
		'val_end': {t:['rgb','value','name','operands'], def: 'value'},
		'lvalue': {t: ['name','unit','lvalue','operands'], def: 'value'},
		'operands': {t: ['rgb','name','unit'], def: 'value'},
		'rules': {t: ['path','features','arguments','args','selectors','name','silent'], def: 'value'},
		'value': {t: ['name','unit','value','operands','selector','rgb','variadic'], def:'value'},
		'args': {t: ['name','variadic','value'], def: 'name'},
		'name': {t: ['unit','value'], def:'value'}
	},
	diagnosis = function(obj, oInstance, params){
		var pick = cap[oInstance].def;
		cap[oInstance].t.some(function(ele){
			return (ele in obj)? pick =  ele : false;
		});

		if(pick){
			return trans[pick](obj, params);
		}else{
			console.log('undiagnosis element: ', obj, oInstance);
			return '';
		}
	},
	endIgnore = false,
	currTabs = '',
	trans = {
		level: function(){
			return (currTabs.length? '' : '\n');
		},
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
				else if('name' in ele){
					if(inherent=='media')
						return '('+this.name(ele, inherent)+')';
					else
						return	this.name(ele, inherent);
				}else if('value' in ele || 'expression' in ele){
					return this.specValue(ele, inherent);
				}else{
					return diagnosis(ele, 'val_end', inherent);
				}
			}
		},
		silent: function(ele){
			this.endSep(true);
			return ele.value.substr(0,ele.value.length-!ele.silent*1);
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
				val += ' {\n'+this.rules(ruleset.rules)+'\n'+this.tabs()+'}'+this.level();
				this.endSep(true);
			}

			return val;
		},
		selector: function(tab){
			if(!Array.isArray(tab))	tab = [tab];
			return tab.map(function(selector){
				return selector.elements.map(function(ele){
					return ele.combinator.value+(ele.value.name? '@{'+ele.value.name.substr(1)+'}' : ele.value);
				}).join('').trim();
			}).join(', ');
		},
		args: function(args){
			var __self = this;
			if(args.length)
				return '('+args.map(function(ele){
					return diagnosis(ele, 'args');
				}).join(', ')+')';
			else
				return '()';
		},
		variadic: function(){
			return '...';
		},
		rgb: function(ele){
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
		features: function(parm){
			var val = '@media ';
			val += this.value(parm.features.value, 'media');
			val += ' {\n'+this.ruleset(parm.ruleset)+'\n'+this.tabs()+'}'+this.level();
			this.endSep(true);
			return val;
		},
		ruleset: function(ruleset){
			this.tabs(true);
			var __self = this;
			return ruleset.rules.map(function(rule){
				return currTabs+diagnosis(rule, 'ruleset')+__self.endSep();
			}).join('\n');
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

exports.trans = trans;
exports.rgb = trans.rgb;
exports.toLess = function(tree){
	endIgnore = false;
	currTabs = '';
	return trans.rules(tree.rules);
}
