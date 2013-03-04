var tm = require('./treeManipulator.js'),
	list = [],
	listOut = [];

tm.loadStyle(__dirname+'/test.less', function(err, sheet){
	//console.log(sheet);
	tm.editRule(sheet, 'a div kot pies{color: red}', true);
	console.log(sheet.tree.toCSS());
	console.log(sheet.tree.rules[0].rules[2].selectors[0]);
	//console.log(sheet.tree.rules[1].selectors[0])
	//console.log(sheet.selectors['a div'].rule[0].selectors[0].elements);
	//var map = tm.mapLess(sheet.tree, list)
	//console.log(map);

})