module.exports = {
	'@import': [
		['@var: 0;\n.class1{\n@var: 1;\n.class {\n@var: 2;\nthree: @var;\n@var: 3;\n}\none: @var;\n}',true]
	],
	'variable': [
		['@nice-blue: #5B83AD;\n@light-blue: (@nice-blue + #111);',true]
	],
	'rules': [
		['div{color: red;}','div {\ncolor: red;\n}'],
		['div{color: red;}']
	]

}