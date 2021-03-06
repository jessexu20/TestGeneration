var esprima = require("esprima");
var options = {tokens:true, tolerant: true, loc: true, range: true };
var faker = require("faker");
var fs = require("fs");
faker.locale = "en";
var mock = require('mock-fs');
var _ = require('underscore');

function main()
{
	var args = process.argv.slice(2);

	if( args.length == 0 )
	{
		args = ["subject.js"];
	}
	var filePath = args[0];

	constraints(filePath);

	generateTestCases()

}


function fakeDemo()
{
	console.log( faker.phone.phoneNumber() );
	console.log( faker.phone.phoneNumberFormat() );
	console.log( faker.phone.phoneFormats() );
}

var functionConstraints =
{
	
}

var mockFileLibrary = 
{
	pathExists:
	{
		'path/fileExists': {}
	},
	fileWithContent:
	{
		pathContent: 
		{	
  			file1: 'text content',
		}
	}
};

function generateTestCases()
{

	var content = "var subject = require('./subject.js')\nvar mock = require('mock-fs');\n";
	for ( var funcName in functionConstraints )
	{
		var params = {};

		// initialize params
		for (var i =0; i < functionConstraints[funcName].params.length; i++ )
		{
			var paramName = functionConstraints[funcName].params[i];
			//params[paramName] = '\'' + faker.phone.phoneNumber()+'\'';
			params[paramName] = '\'\'';
		}

		//console.log( params );

		// update parameter values based on known constraints.
		var constraints = functionConstraints[funcName].constraints;
		// Handle global constraints..
		// console.log(constraints);
		
		
		//Test1
		var pT = _.some(constraints,{ident:'p'});
		var qT= _.some(constraints,{ident:'q'});
		
		//Test2
		var fileWithContent = _.some(constraints, {mocking: 'fileWithContent' });
		var pathExists      = _.some(constraints, {mocking: 'fileExists' });
		var buf= _.some(constraints,{ident:'buf'});
		//Test 3,4,5
		var options = _.some(constraints,{ident:'options'});
		var region= _.some(constraints,{ident:'phoneNumber'});
		var formatString=_.some(constraints,{ident:'formatString'});
		// console.log(formatString);
		
		
		
		for( var c = 0; c < constraints.length; c++ )
		{
			var constraint = constraints[c];
			if( params.hasOwnProperty( constraint.ident ) )
			{
				params[constraint.ident] = constraint.value;
			}
		}
		
		
		// Prepare function arguments.

		var args = Object.keys(params).map( function(k) {return params[k]; }).join(",");
		if(qT||pT){
			content+=generateTestOne(pT,qT,funcName,args);
			content+=generateTestOne(pT,!qT,funcName,args);
			content+=generateTestOne(!pT,qT,funcName,args);
			content+=generateTestOne(!pT,!qT,funcName,args);
		}
		if( pathExists || fileWithContent )
		{
			content += generateMockFsTestCases(pathExists,fileWithContent,buf,funcName, args);
			// Bonus...generate constraint variations test cases....
			content += generateMockFsTestCases(!pathExists,!fileWithContent,buf,funcName, args);
			content += generateMockFsTestCases(pathExists,!fileWithContent,buf,funcName, args);
			content += generateMockFsTestCases(pathExists,!fileWithContent,!buf,funcName, args);
			content += generateMockFsTestCases(!pathExists,fileWithContent,buf,funcName, args);
		}
		if(options){
			content+=generateTestFour(options,funcName,args);
			content+=generateTestFour(!options,funcName,args);
		}
		if(region){
			content+=generateTestFive(region,funcName,args);
			content+=generateTestFive(!region,funcName,args);
		}
		else{
			content += "subject.{0}({1});\n".format(funcName, args );
		}

	}


	fs.writeFileSync('test.js', content, "utf8");

}
function generateTestOne(pT,qT,funcName,args){
	var testCase="";
	var newArgs=args.split(',');
	if(pT){
		var number=parseInt(newArgs[0])-Math.random()*10;
		newArgs[0]=number.toString();
	}
	if(qT){
		if(newArgs[1]=="undefined"){
			newArgs[1]=Math.random()*10;
		}
	}
	testCase+="subject.{0}({1});\n".format(funcName, newArgs);
	return testCase;
};
function generateTestFour(options,funcName,args){
	var testCase="";
	var newArgs=args.split(',');
	
	var number="'"+faker.phone.phoneNumberFormat().toString()+"'";
	var numberFormat="'"+faker.phone.phoneFormats().toString()+"'";
	newArgs[0]=number;
	newArgs[1]=numberFormat;
	if(!options){
		newArgs[2]="false";
	}
	testCase+="subject.{0}({1});\n".format(funcName, newArgs);
	return testCase;
};
function generateTestFive(region,funcName,args){
	var testCase="";
	var newArgs=args.split(',');
	newArgs[0]=newArgs[0].substring(1,4);
	var number=faker.phone.phoneNumberFormat().toString();
	if(region){
		number=newArgs[0]+number.substring(3,12);
	}
	number="'"+number+"'";
	newArgs[0]=number;
	testCase+="subject.{0}({1});\n".format(funcName, newArgs);
	return testCase;
};
function generateMockFsTestCases (pathExists,fileWithContent,buf,funcName,args) 
{
	var testCase = "";
	// Insert mock data based on constraints.
	var mergedFS = {};
	if( pathExists )
	{
		for (var attrname in mockFileLibrary.pathExists) { mergedFS[attrname] = mockFileLibrary.pathExists[attrname]; }
	}
	if( fileWithContent )
	{
		for (var attrname in mockFileLibrary.fileWithContent) { mergedFS[attrname] = mockFileLibrary.fileWithContent[attrname]; }
	}
	// #####to generate this!!
	// mock({"path/fileExists":{},"pathContent":{"file1":""}});
	// 	subject.fileTest('path/fileExists','pathContent/file1');
	// mock.restore();
	
	if( pathExists && !buf){
		for (var attrname in mockFileLibrary.fileWithContent) { mergedFS[attrname] = mockFileLibrary.fileWithContent[attrname]; }
		mergedFS['pathContent']['file1']="";
	}
		
	testCase += 
	"mock(" +
		JSON.stringify(mergedFS)
		+
	");\n";

	testCase += "\tsubject.{0}({1});\n".format(funcName, args );
	testCase+="mock.restore();\n";
	return testCase;
}

function constraints(filePath)
{
   var buf = fs.readFileSync(filePath, "utf8");
	var result = esprima.parse(buf, options);

	traverse(result, function (node) 
	{
		if (node.type === 'FunctionDeclaration') 
		{
			var funcName = functionName(node);
			console.log();
			console.log("Line : {0} Function: {1}".format(node.loc.start.line, funcName ));

			var params = node.params.map(function(p) {return p.name});

			functionConstraints[funcName] = {constraints:[], params: params};

			// Check for expressions using argument.
			traverse(node, function(child)
			{

				
				if( child.type === 'BinaryExpression' && child.operator == "==")
				{
					if( child.left.type == 'Identifier' && params.indexOf( child.left.name ) > -1)
					{
						// get expression from original source code:
						//var expression = buf.substring(child.range[0], child.range[1]);
						var rightHand = buf.substring(child.right.range[0], child.right.range[1])
						functionConstraints[funcName].constraints.push( 
							{
								ident: child.left.name,
								value: rightHand
							}
						);
						// console.log(functionConstraints[funcName].constraints);
					}
				}
				if( child.type === 'BinaryExpression' && child.operator == "==")
				{
					if( child.left.type == 'Identifier' && child.left.name=="area")
					{
						// get expression from original source code:
						//var expression = buf.substring(child.range[0], child.range[1]);
						var rightHand = buf.substring(child.right.range[0], child.right.range[1])
						functionConstraints[funcName].constraints.push(
							{
								ident: 'phoneNumber',
								value: rightHand,
							}
						);
					}
				}
				if( child.type === 'BinaryExpression' && child.operator == "<")
				{
					if( child.left.type == 'Identifier' && params.indexOf( child.left.name ) > -1)
					{
						// get expression from original source code:
						//var expression = buf.substring(child.range[0], child.range[1]);
						var rightHand = buf.substring(child.right.range[0], child.right.range[1])
						functionConstraints[funcName].constraints.push(
							{
								ident: child.left.name,
								value: rightHand
							});
					}
				}
				if( child.type === 'BinaryExpression' && child.operator == ">")
				{
					if( child.left.type == 'MemberExpression'  &&  child.left.property.name=='length')
					{
						// get expression from original source code:
						//var expression = buf.substring(child.range[0], child.range[1]);
						var rightHand = buf.substring(child.right.range[0], child.right.range[1])
						functionConstraints[funcName].constraints.push(
							{
								ident: child.left.object.name,
								value: rightHand
							});
					}
				}
				if( child.type == "CallExpression" && 
					 child.callee.property &&
					 child.callee.property.name =="readFileSync" )
				{
					for( var p =0; p < params.length; p++ )
					{
						if( child.arguments[0].name == params[p] )
						{
							functionConstraints[funcName].constraints.push( 
							{
								// A fake path to a file
								ident: params[p],
								value: "'pathContent/file1'",
								mocking: 'fileWithContent'
							});
						}
					}
				}

				if( child.type == "CallExpression" &&
					 child.callee.property &&
					 child.callee.property.name =="existsSync")
				{
					for( var p =0; p < params.length; p++ )
					{
						if( child.arguments[0].name == params[p] )
						{
							functionConstraints[funcName].constraints.push( 
							{
								// A fake path to a file
								ident: params[p],
								value: "'path/fileExists'",
								mocking: 'fileExists'
							});
						}
					}
				}
				if( child.type == "LogicalExpression" && child.operator=='||')
				{
					if(child.right.type=='UnaryExpression'){
						if(child.right.argument.type=='MemberExpression'){
							functionConstraints[funcName].constraints.push(
								{
									ident: child.right.argument.object.name,
									value: '{normalize: true}'
								}
							)
						}
					}
				}
			});

			console.log( functionConstraints[funcName]);

		}
	});
}

function traverse(object, visitor) 
{
    var key, child;

    visitor.call(null, object);
    for (key in object) {
        if (object.hasOwnProperty(key)) {
            child = object[key];
            if (typeof child === 'object' && child !== null) {
                traverse(child, visitor);
            }
        }
    }
}

function traverseWithCancel(object, visitor)
{
    var key, child;

    if( visitor.call(null, object) )
    {
	    for (key in object) {
	        if (object.hasOwnProperty(key)) {
	            child = object[key];
	            if (typeof child === 'object' && child !== null) {
	                traverseWithCancel(child, visitor);
	            }
	        }
	    }
 	 }
}

function functionName( node )
{
	if( node.id )
	{
		return node.id.name;
	}
	return "";
}


if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

main();