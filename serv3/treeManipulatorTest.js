var tm = require('./treeManipulator.js'),
	list = [],
	listOut = [];

tm.loadStyle(__dirname+'/test.less', function(err, sheet){
	//console.log(sheet);
	//tm.editRule(sheet, 'al, a div[hover]{color: red}', true);
	tm.editRule(sheet, 1, true);
	console.log(sheet.tree.toCSS());
	//console.log(sheet);
	//console.log(sheet.tree.rules[1].selectors[0])
	//console.log(sheet.selectors['a div'].rule[0].selectors[0].elements);
	//var map = tm.mapLess(sheet.tree, list)
	//console.log(map);

})