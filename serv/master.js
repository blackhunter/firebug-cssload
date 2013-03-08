var fork = require('child_process').fork,
	currWoreker = null;

function start(){
	var worker = currWoreker = fork(__dirname + '/main.js');

	/*
	 worker.stderr.on('data', function(err){
	 console.log('err: '+err);
	 })
	 */

	worker.on('message', function(msg){
		console.log(msg);
	});

	worker.on('exit', function(){
		console.log('Aplication stoped! Type "restart" ');
		currWoreker = null;
	});
}

module.exports = function(){
	process.stdin.resume();
	process.stdin.setEncoding('utf8');
	process.stdin.on('data', function(msg){
		switch(msg){
			case 'restart\n':
				start();
				break;
		}
	})

	start();
	setInterval(function(){
		//live promis
		if(currWoreker)
			currWoreker.send('live');
	},1000);
}