var reverse = require('../serv2/reverseParser.js'),
	less = new (require('less').Parser),
	fs = require('fs'),
	assert = require('assert'),
	end = false,
	lastTest = 0,
	passed = true;

function next(nr){
	var exist = (function(exist){
		if(!exist){
			if(!end){
				if(passed)
					console.log('\033[32mAll tests passed!\u001b[0m');
				else
					console.log('\n\033[31mTests failed, report bug!\u001b[0m');

				end = true;
			}
		}else if(++this.loaded==2){
			var obj = {
					nr: this.nr,
					loaded: []
				},
				load = function(err, data){
					if(err){
						passed = false;
						assert.ifError(err);
					}else{
						if(this.toDecode){
							less.parse(data, (function(err, tree){
								this.bind.loaded.push(reverse(tree).split('\n'));
							}).bind(this));
						}else
							this.bind.loaded.push(data.split('\n'));

						if(this.bind.loaded.length==2){
							for(var i=0; i<this.bind.loaded[0].length; i++){
								if(this.bind.loaded[0][i]!=this.bind.loaded[1][i]){
									passed = false;
									if(this.bind.nr!=lastTest){
										lastTest = this.bind.nr;
										console.log('\033[31mTest nr: '+lastTest+'\u001b[0m');
									}
									console.log('\t\033[31mdiff at line: '+i+'\u001b[0m')
								}
							}
							next(this.bind.nr+1);
						}
					}
				}

			fs.readFile('./cases/case'+this.nr+'.less','utf-8', load.bind({
				bind: obj,
				toDecode: true
			}));
			fs.readFile('./results/result'+this.nr+'.less','utf-8',load.bind({
				bind: obj,
				toDecode: false
			}));
		}
	}).bind({
		nr: nr,
		loaded: 0
	});

	fs.exists('./cases/case'+nr+'.less', exist);
	fs.exists('./results/result'+nr+'.less', exist);
}

next(1);

/*
fs.readFile('./cases/case7.less','utf-8', function(err, data){
	if(err)
		console.log(err);
	else{
		less.parse(data, function(err, tree){
			if(err)
				console.log(err);
			else{
				fs.writeFile('./results/result7.less', reverse(tree), function(){

				});
			}
		});
	}
});*/