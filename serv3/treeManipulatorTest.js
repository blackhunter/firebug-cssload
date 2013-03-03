var tm = require('./treeManipulator.js');

tm.loadStyle(__dirname+'/test.css', function(err, sheet){
	console.log(sheet.tree.rules[0].rules[0].selectors[0]);
	console.log(tm.mapLess(sheet.tree));
})