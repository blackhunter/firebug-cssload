
function value(val){
	return Array.isArray(val.value[0].value)? reverse.rgb(val.value[0].value[0]) : val.value[0].value;
};

function vars(name, path){
	if(name[1]=='@'){
		return vars(vars(name.substr(1), path), path);
	}else{
		if(name in path.vars){
			return value(path.vars[name].value);
		}else if(path.lockup!=null)
			return vars(name, path.lockup);
		else
			throw new Error('nie ma zmiennej');
	}
}

function selector(self, parent){
	this.self = self;
	this.vars = {};
	this.mixins = {};
	this.lockup = parent;
	this.child = function(self){
		return new selector(self, this);
	}
}

function selector(ele){
	return ele.selectors.map(function(selector){
		return selector.elements.map(function(ele){
			if(ele.value.name)
				return vars(ele.value.name, path);
			else
				return ele.value;
		}).join('').trim();
	}).join(', ');
}
