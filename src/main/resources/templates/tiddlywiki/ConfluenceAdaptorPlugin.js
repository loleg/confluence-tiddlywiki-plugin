/***
|''Name:''|ConfluenceAdaptorPlugin|
|''Description:''|Adaptor for moving and converting data to and from Confluence Wikis|
|''Author:''|Martin Budden (mjbudden (at) gmail (dot) com)|
|''Source:''|http://www.martinswiki.com/#ConfluenceAdaptorPlugin|
|''CodeRepository:''|http://svn.tiddlywiki.org/Trunk/contributors/MartinBudden/adaptors/ConfluenceAdaptorPlugin.js |
|''Version:''|0.6.4|
|''Date:''|Feb 25, 2007|
|''Comments:''|Please make comments at http://groups.google.co.uk/group/TiddlyWikiDev |
|''License:''|[[Creative Commons Attribution-ShareAlike 3.0 License|http://creativecommons.org/licenses/by-sa/3.0/ ]]|
|''~CoreVersion:''|2.4.1|

Confluence Wiki RPC documentation is at:
http://confluence.atlassian.com/display/DOC/Remote+API+Specification
http://confluence.atlassian.com/display/DOC/Remote+API+Specification#RemoteAPISpecification-Page
//#
//#The URL for XML-RPC requests is http://confluence-install/rpc/xmlrpc
//#https://confluence.atlassian.com/confluence/rpc/xmlrpc
//#http://confluence.atlassian.com/display/TEST/Home

''For debug:''
|''Default Confluence username''|&lt;&lt;option txtConfluenceUsername&gt;&gt;|
|''Default Confluence password''|&lt;&lt;option txtConfluencePassword&gt;&gt;|

***/

//{{{
// For debug:
if(!config.options.txtConfluenceUsername)
	{config.options.txtConfluenceUsername = '';}
if(!config.options.txtConfluencePassword)
	{config.options.txtConfluencePassword = '';}
//}}}

//{{{
// Ensure that the plugin is only installed once.
if(!version.extensions.ConfluenceAdaptorPlugin) {
version.extensions.ConfluenceAdaptorPlugin = {installed:true};

function ConfluenceAdaptor()
{
	this.host = null;
	this.workspace = null;
	this.sessionToken = null; // From 1.3 onwards, supply an empty string as the token to be treated as being the anonymous user.
	return this;
}

ConfluenceAdaptor.prototype = new AdaptorBase();

ConfluenceAdaptor.serverType = 'confluence';
ConfluenceAdaptor.serverParsingErrorMessage = &quot;Error parsing result from server&quot;;
ConfluenceAdaptor.errorInFunctionMessage = &quot;Error in function ConfluenceAdaptor.%0&quot;;
ConfluenceAdaptor.usernamePrompt = &quot;Username&quot;;
ConfluenceAdaptor.passwordPrompt = &quot;Password&quot;;
ConfluenceAdaptor.couldNotLogin = &quot;Could not log in&quot;;
ConfluenceAdaptor.fnTemplate = '&lt;?xml version=&quot;1.0&quot; encoding=&quot;utf-8&quot;?&gt;&lt;methodCall&gt;&lt;methodName&gt;%0&lt;/methodName&gt;&lt;params&gt;%1&lt;/params&gt;&lt;/methodCall&gt;';


ConfluenceAdaptor.doHttpPOST = function(uri,callback,params,headers,data)
{
	return httpReq('POST',uri,callback,params,headers,data,'text/xml; charset=&quot;utf-8&quot;',null,null,true);
};

ConfluenceAdaptor.minHostName = function(host)
{
	return host ? host.replace(/^http:\/\//,'').replace(/\/$/,'') : '';
};

ConfluenceAdaptor.normalizedTitle = function(title)
{
	return title;
};

// Convert a ConfluenceAdaptor iso8601 DateTime in YYYYMMDDThh:mm:ss  format into a JavaScript Date object
ConfluenceAdaptor.dateFromIso8601DateTime = function(timestamp)
{
	var dt = timestamp;
	return new Date(Date.UTC(dt.substr(0,4),dt.substr(4,2)-1,dt.substr(6,2),dt.substr(9,2),dt.substr(12,2)));
};

ConfluenceAdaptor.prototype.complete = function(context,fn)
{
//#console.log(&quot;complete:&quot;+context.sessionToken);
	context.complete = fn;
	if(context.sessionToken!==undefined) {
		var ret = context.complete(context,context.userParams);
	} else {
		ret = this.login(context);
	}
	return ret;
};

ConfluenceAdaptor.prototype.login = function(context)
{
//#console.log('login:'+context.host);
	if(config.options.txtConfluenceUsername &amp;&amp; config.options.txtConfluencePassword) {
		context.username = config.options.txtConfluenceUsername;
		context.password = config.options.txtConfluencePassword;
		ConfluenceAdaptor.loginPromptCallback(context);
	//#} else if(typeof PasswordPrompt != 'undefined') {
	//#	PasswordPrompt.prompt(ConfluenceAdaptor.loginPromptCallback,context);
	} else if(context.loginPromptFn) {
		context.loginPromptCallback = ConfluenceAdaptor.loginPromptCallback;
		context.loginPromptFn(context);
	} else {
		context.username = prompt(ConfluenceAdaptor.usernamePrompt,'');
		context.password = prompt(ConfluenceAdaptor.passwordPrompt,'');
		ConfluenceAdaptor.loginPromptCallback(context);
		//return ConfluenceAdaptor.couldNotLogin;
	}
	return true;
};

ConfluenceAdaptor.loginPromptCallback = function(context)
{
//#console.log('loginPromptCallback');
	var uriTemplate = '%0/rpc/xmlrpc';
	var uri = uriTemplate.format([context.host]);
//#console.log('uri: '+uri);

	var fn = 'confluence1.login';
	var fnParamsTemplate = '&lt;param&gt;&lt;value&gt;&lt;string&gt;%0&lt;/string&gt;&lt;/value&gt;&lt;/param&gt;';
	fnParamsTemplate += '&lt;param&gt;&lt;value&gt;&lt;string&gt;%1&lt;/string&gt;&lt;/value&gt;&lt;/param&gt;';
	var fnParams = fnParamsTemplate.format([context.username,context.password]);
	var payload = ConfluenceAdaptor.fnTemplate.format([fn,fnParams]);
//#console.log('payload:'+payload);
	var req = ConfluenceAdaptor.doHttpPOST(uri,ConfluenceAdaptor.loginCallback,context,null,payload);
	return typeof req == 'string' ? req : true;
};

ConfluenceAdaptor.loginCallback = function(status,context,responseText,url,xhr)
{
//#console.log('loginCallback:'+status);
//#console.log('rt:'+responseText);
	context.status = false;
	context.statusText = ConfluenceAdaptor.errorInFunctionMessage.format(['loginCallback']);
	if(status) {
		try {
			var text = responseText;
			var faultRegExp = /&lt;member&gt;&lt;name&gt;faultString&lt;\/name&gt;&lt;value&gt;([^&lt;]*)&lt;\/value&gt;/mg;
			faultRegExp.lastIndex = 0;
			var match = faultRegExp.exec(text);
			if(match) {
				context.statusText = match[1].replace(/&amp;#32;/mg,' ').replace(/&amp;#13;/mg,'');
				if(context.callback)
					context.callback(context,context.userParams);
				return;
			}
			
			//text = text.replace('&lt;params&gt;&lt;param&gt;&lt;string&gt;','');
			//text = text.replace('&lt;/string&gt;&lt;/param&gt;&lt;/params&gt;','');
			var matchRegExp = /&lt;value&gt;([^&lt;]*)&lt;\/value&gt;/mg;
			matchRegExp.lastIndex = 0;
			match = matchRegExp.exec(text);
			context.sessionToken = match ? match[1] : '';
			config.options.txtConfluenceUsername = context.username;
			config.options.txtConfluencePassword = context.password;
		} catch (ex) {
			context.statusText = exceptionText(ex,config.messages.serverParsingError);
			if(context.callback)
				context.callback(context,context.userParams);
			return;
		}
		context.status = true;
	} else {
		context.statusText = xhr.statusText;
	}
	if(context.complete)
		context.complete(context,context.userParams);
};

ConfluenceAdaptor.prototype.openHost = function(host,context,userParams,callback)
{
//#console.log(&quot;openHost:&quot;+host);
	context = this.setContext(context,userParams,callback);
	context.host = this.fullHostName(host);
	if(context.callback) {
		context.status = true;
		window.setTimeout(function() {callback(context,userParams);},0);
	}
	return true;
};

ConfluenceAdaptor.prototype.openWorkspace = function(workspace,context,userParams,callback)
{
//#console.log(&quot;openWorkspace:&quot;+workspace);
	context = this.setContext(context,userParams,callback);
	context.workspace = workspace;
	if(context.callback) {
		context.status = true;
		window.setTimeout(function() {callback(context,userParams);},0);
	}
	return true;
};

ConfluenceAdaptor.prototype.getWorkspaceList = function(context,userParams,callback)
{
//#console.log('getWorkspaceList');
	context = this.setContext(context,userParams,callback);
	context.workspaces = [];
	var workspace = userParams ? userParams.getValue(&quot;feedWorkspace&quot;) : context.workspace;//!! kludge until core fixed
	if(!workspace)
		return this.complete(context,ConfluenceAdaptor.getWorkspaceListComplete);
	context.workspaces.push({title:workspace,name:workspace});
	context.workspace = workspace;
	if(context.callback)
		context.callback(context,context.userParams);
	return true;
};

ConfluenceAdaptor.getWorkspaceListComplete = function(context)
{
//#console.log('getWorkspaceListComplete');
//# http://confluence.atlassian.com/display/DOC/Remote+API+Specification#RemoteAPISpecification-Spaces

	var uriTemplate = '%0/rpc/xmlrpc';
	var uri = uriTemplate.format([context.host]);
//#console.log('uri: '+uri);

	var fn = 'confluence1.getSpaces';
	var fnParamsTemplate = '&lt;param&gt;&lt;value&gt;&lt;string&gt;%0&lt;/string&gt;&lt;/value&gt;&lt;/param&gt;';
	var fnParams = fnParamsTemplate.format([context.sessionToken]);
	var payload = ConfluenceAdaptor.fnTemplate.format([fn,fnParams]);
//#console.log(&quot;payload:&quot;+payload);
	var req = ConfluenceAdaptor.doHttpPOST(uri,ConfluenceAdaptor.getWorkspaceListCallback,context,null,payload);
//#console.log(&quot;req:&quot;+req);
};

ConfluenceAdaptor.getWorkspaceListCallback = function(status,context,responseText,uri,xhr)
{
//#console.log('getWorkspaceListCallback:'+status);
//#console.log('rt:'+responseText);

//# returns an array of SpaceSummaries, see
//# http://confluence.atlassian.com/display/DOC/Remote+API+Specification#RemoteAPISpecification-SpaceSummary
	context.status = false;
	context.statusText = ConfluenceAdaptor.errorInFunctionMessage.format(['getTiddlerListCallback']);
	context.workspaces = [];
//#&lt;?xml version=&quot;1.0&quot;?&gt;&lt;methodResponse&gt;&lt;params&gt;&lt;param&gt;&lt;value&gt;&lt;array&gt;&lt;data&gt;&lt;value&gt;
//#&lt;struct&gt;
//#&lt;member&gt;&lt;name&gt;name&lt;/name&gt;&lt;value&gt;MartinTest&lt;/value&gt;&lt;/member&gt;
//#&lt;member&gt;&lt;name&gt;url&lt;/name&gt;&lt;value&gt;http://try.atlassian.com/display/MartinTest&lt;/value&gt;&lt;/member&gt;
//#&lt;member&gt;&lt;name&gt;key&lt;/name&gt;&lt;value&gt;MartinTest&lt;/value&gt;&lt;/member&gt;
//#&lt;member&gt;&lt;name&gt;type&lt;/name&gt;&lt;value&gt;global&lt;/value&gt;&lt;/member&gt;
//#&lt;/struct&gt;
//#&lt;/value&gt;&lt;/data&gt;&lt;/array&gt;&lt;/value&gt;&lt;/param&gt;&lt;/params&gt;&lt;/methodResponse&gt;
	if(status) {
		try {
			var text = responseText;
			text = text.replace('&lt;methodResponse&gt;&lt;params&gt;&lt;param&gt;&lt;value&gt;&lt;array&gt;&lt;data&gt;','');
			text = text.replace('&lt;/data&gt;&lt;/array&gt;&lt;/value&gt;&lt;/param&gt;&lt;/params&gt;&lt;/methodResponse&gt;','');
			var matchRegExp = /&lt;name&gt;key&lt;\/name&gt;&lt;value&gt;([^&lt;]*)&lt;\/value&gt;/mg;
			matchRegExp.lastIndex = 0;
			var match = matchRegExp.exec(text);
			while(match) {
				var item = {title:match[1],name:match[1]};
				context.workspaces.push(item);
				match = matchRegExp.exec(text);
			}
			if(context.workspaces.length==1)
				context.workspace = context.workspaces[0].title;
		} catch (ex) {
			context.statusText = exceptionText(ex,config.messages.serverParsingError);
			if(context.callback)
				context.callback(context,context.userParams);
			return;
		}
		context.status = true;
	} else {
		context.statusText = xhr.statusText;
	}
	if(context.callback)
		context.callback(context,context.userParams);
};

ConfluenceAdaptor.prototype.getTiddlerList = function(context,userParams,callback)
{
//#console.log('getTiddlerList');
	context = this.setContext(context,userParams,callback);
	return this.complete(context,ConfluenceAdaptor.getTiddlerListComplete);
};

ConfluenceAdaptor.getTiddlerListComplete = function(context)
{
//#console.log('getTiddlerListComplete');
	var uriTemplate = '%0/rpc/xmlrpc';
	var uri = uriTemplate.format([context.host]);
//#console.log('uri: '+uri);

	var fn = 'confluence1.getPages';
	var fnParamsTemplate = '&lt;param&gt;&lt;value&gt;&lt;string&gt;%0&lt;/string&gt;&lt;/value&gt;&lt;/param&gt;';
	fnParamsTemplate += '&lt;param&gt;&lt;value&gt;&lt;string&gt;%1&lt;/string&gt;&lt;/value&gt;&lt;/param&gt;';
	var fnParams = fnParamsTemplate.format([context.sessionToken,context.workspace]);
	var payload = ConfluenceAdaptor.fnTemplate.format([fn,fnParams]);
//#console.log(&quot;payload:&quot;+payload);
	var req = ConfluenceAdaptor.doHttpPOST(uri,ConfluenceAdaptor.getTiddlerListCallback,context,null,payload);
	return typeof req == 'string' ? req : true;
};

//#&lt;?xml version=&quot;1.0&quot;?&gt;&lt;methodResponse&gt;&lt;params&gt;
//#&lt;param&gt;&lt;value&gt;&lt;array&gt;&lt;data&gt;&lt;value&gt;&lt;struct&gt;
//#&lt;member&gt;&lt;name&gt;id&lt;/name&gt;&lt;value&gt;54694264&lt;/value&gt;&lt;/member&gt;
//#&lt;member&gt;&lt;name&gt;parentId&lt;/name&gt;&lt;value&gt;0&lt;/value&gt;&lt;/member&gt;
//#&lt;member&gt;&lt;name&gt;title&lt;/name&gt;&lt;value&gt;Home&lt;/value&gt;&lt;/member&gt;
//#&lt;member&gt;&lt;name&gt;url&lt;/name&gt;&lt;value&gt;http://try.atlassian.com/display/MartinTest/Home&lt;/value&gt;&lt;/member&gt;
//#&lt;member&gt;&lt;name&gt;permissions&lt;/name&gt;&lt;value&gt;0&lt;/value&gt;&lt;/member&gt;
//#&lt;member&gt;&lt;name&gt;space&lt;/name&gt;&lt;value&gt;MartinTest&lt;/value&gt;&lt;/member&gt;
//#&lt;/struct&gt;&lt;/value&gt;&lt;/data&gt;&lt;/array&gt;&lt;/value&gt;&lt;/param&gt;
//#&lt;/params&gt;&lt;/methodResponse&gt;

ConfluenceAdaptor.getTiddlerListCallback = function(status,context,responseText,uri,xhr)
{
//#console.log('getTiddlerListCallback status:'+status);
//#console.log('rt:'+responseText);

//# returns an array of PageSummaries, see
//# http://confluence.atlassian.com/display/DOC/Remote+API+Specification#RemoteAPISpecification-PageSummary
	context.status = true;
	//context.statusText = ConfluenceAdaptor.errorInFunctionMessage.format(['getTiddlerListCallback']);
	context.statusText = &quot;&quot;;
	context.tiddlers = [];
	if(status) {
		try {
			var text = responseText;
			text = text.replace('&lt;?xml version=&quot;1.0&quot; encoding=&quot;UTF-8&quot;?&gt;&lt;methodResponse&gt;&lt;params&gt;&lt;param&gt;&lt;value&gt;&lt;array&gt;&lt;data&gt;','');
			text = text.replace('&lt;/data&gt;&lt;/array&gt;&lt;/value&gt;&lt;/param&gt;&lt;/params&gt;&lt;/methodResponse&gt;','');
			var matchRegExp = /&lt;name&gt;faultString&lt;\/name&gt;&lt;value&gt;([^&lt;]*)&lt;\/value&gt;/mg;
			matchRegExp.lastIndex = 0;
			match = matchRegExp.exec(text);
			if(match) {
				context.status = false;
				context.statusText = match[1].replace(/&amp;#32;/mg,' ').replace(/&amp;#13;/mg,'');
			}
			matchRegExp = /&lt;name&gt;title&lt;\/name&gt;&lt;value&gt;([^&lt;]*)&lt;\/value&gt;/mg;
			matchRegExp.lastIndex = 0;
			match = matchRegExp.exec(text);
			while(match) {
				if(!store.isShadowTiddler(match[1])) {
					//# avoid overwriting shadow tiddlers
					var tiddler = new Tiddler(match[1]);
					tiddler.fields.wikiformat = 'confluence';
					tiddler.fields['server.host'] = ConfluenceAdaptor.minHostName(context.host);
					tiddler.fields['server.workspace'] = context.workspace;
					context.tiddlers.push(tiddler);
				}
				match = matchRegExp.exec(text);
			}
		} catch (ex) {
			context.status = false;
			context.statusText = exceptionText(ex,config.messages.serverParsingError);
			if(context.callback)
				context.callback(context,context.userParams);
			return;
		}
	} else {
		context.status = false;
		context.statusText = xhr.statusText;
	}
	if(context.callback)
		context.callback(context,context.userParams);
};

ConfluenceAdaptor.prototype.generateTiddlerInfo = function(tiddler)
{
//# http://confluence.atlassian.com/display/TEST/Home
	var info = {};
	var host = this &amp;&amp; this.host ? this.host : this.fullHostName(tiddler.fields['server.host']);
	var workspace = this &amp;&amp; this.workspace ? this.workspace : tiddler.fields['server.workspace'];
	uriTemplate = '%0/display/%1/%2';
	info.uri = uriTemplate.format([host,workspace,tiddler.title]);
	return info;
};

ConfluenceAdaptor.prototype.getTiddler = function(title,context,userParams,callback)
{
//#console.log('getTiddler:'+title);
	if(!context)
		context = {};
	if(!context.sessionToken &amp;&amp; userParams &amp;&amp; userParams.getValue) {
		var cc = userParams.getValue(&quot;context&quot;);
		if(cc) {
			for(var i in cc) {
				context[i] = cc[i];
			}
		}
	}
	context = this.setContext(context,userParams,callback);
	var tiddler = store.getTiddler(title);
	context.host = context.host||this.fullHostName(tiddler.fields['server.host']);
	context.workspace = context.workspace||tiddler.fields['server.workspace'];
	context.title = title;
	this.complete(context,ConfluenceAdaptor.getTiddlerComplete);
};

ConfluenceAdaptor.getTiddlerComplete = function(context)
{
//#console.log('ConfluenceAdaptor.getTiddler:'+context.title);
	var uriTemplate = '%0/rpc/xmlrpc';
	var uri = uriTemplate.format([context.host]);
//#console.log('uri:'+uri);

	var fn = 'confluence1.getPage';
	var fnParamsTemplate = '&lt;param&gt;&lt;value&gt;&lt;string&gt;%0&lt;/string&gt;&lt;/value&gt;&lt;/param&gt;';
	fnParamsTemplate += '&lt;param&gt;&lt;value&gt;&lt;string&gt;%1&lt;/string&gt;&lt;/value&gt;&lt;/param&gt;';
	fnParamsTemplate += '&lt;param&gt;&lt;value&gt;&lt;string&gt;%2&lt;/string&gt;&lt;/value&gt;&lt;/param&gt;';
	var fnParams = fnParamsTemplate.format([context.sessionToken,context.workspace,context.title]);
	var payload = ConfluenceAdaptor.fnTemplate.format([fn,fnParams]);
//#console.log(&quot;payload:&quot;+payload);

	context.tiddler = new Tiddler(context.title);
	context.tiddler.fields.wikiformat = 'confluence';
	context.tiddler.fields['server.host'] = ConfluenceAdaptor.minHostName(context.host);
	context.tiddler.fields['server.workspace'] = context.workspace;
	var req = ConfluenceAdaptor.doHttpPOST(uri,ConfluenceAdaptor.getTiddlerCallback,context,null,payload);
//#console.log(&quot;req:&quot;+req);
	return typeof req == 'string' ? req : true;
};

ConfluenceAdaptor.getTiddlerCallback = function(status,context,responseText,uri,xhr)
{
//#console.log('getTiddlerCallback status:'+status);
//#console.log('rt:'+responseText);

//# returns a page, see
//# http://confluence.atlassian.com/display/DOC/Remote+API+Specification#RemoteAPISpecification-Page
	if(status) {
		var text = responseText;
		text = text.replace(/&amp;#32;/mg,' ').replace(/&amp;#13;/mg,'');
		text = text.replace('&lt;methodResponse&gt;&lt;params&gt;&lt;param&gt;&lt;value&gt;','');
		text = text.replace('&lt;/value&gt;&lt;/param&gt;&lt;/params&gt;&lt;/methodResponse&gt;','');
		var matchRegExp = /&lt;name&gt;content&lt;\/name&gt;&lt;value&gt;([^&lt;]*)&lt;\/value&gt;/mg;
		matchRegExp.lastIndex = 0;
		match = matchRegExp.exec(text);
		if(match) {
			context.tiddler.text = match[1];
		}
		matchRegExp = /&lt;name&gt;modifier&lt;\/name&gt;&lt;value&gt;([^&lt;]*)&lt;\/value&gt;/mg;
		matchRegExp.lastIndex = 0;
		match = matchRegExp.exec(text);
		if(match) {
			context.tiddler.modifier = match[1];
		}
		matchRegExp = /&lt;name&gt;version&lt;\/name&gt;&lt;value&gt;([^&lt;]*)&lt;\/value&gt;/mg;
		matchRegExp.lastIndex = 0;
		match = matchRegExp.exec(text);
		if(match) {
			context.tiddler.fields['server.page.revision'] = match[1];
		}
		matchRegExp = /&lt;name&gt;id&lt;\/name&gt;&lt;value&gt;([^&lt;]*)&lt;\/value&gt;/mg;
		matchRegExp.lastIndex = 0;
		match = matchRegExp.exec(text);
		if(match) {
			context.tiddler.fields['server.page.id'] = match[1];
		}
		matchRegExp = /&lt;name&gt;modified&lt;\/name&gt;&lt;value&gt;&lt;dateTime.iso8601&gt;([^&lt;]*)&lt;\/dateTime.iso8601&gt;&lt;\/value&gt;/mg;
		matchRegExp.lastIndex = 0;
		match = matchRegExp.exec(text);
		if(match) {
			context.tiddler.modified = ConfluenceAdaptor.dateFromIso8601DateTime(match[1]);
		}

		context.status = true;
	} else {
		context.status = false;
		context.statusText = xhr.statusText;
	}
	if(context.callback)
		context.callback(context,context.userParams);
};

ConfluenceAdaptor.prototype.putTiddler = function(tiddler,context,userParams,callback)
{
//#console.log('putTiddler:'+tiddler.title);
	context = this.setContext(context,userParams,callback);
	context.host = context.host||this.fullHostName(tiddler.fields['server.host']);
	context.workspace = context.workspace||tiddler.fields['server.workspace'];
	context.tiddler = tiddler;
	context.title = tiddler.title;
	return this.complete(context,ConfluenceAdaptor.putTiddlerComplete);
};

ConfluenceAdaptor.putTiddlerComplete = function(context)
{
//#console.log('ConfluenceAdaptor.putTiddlerComplete:'+context.tiddler.title);
	var tiddler = context.tiddler;

//#putPage(utf8 page,utf8 content,struct attributes )
	var fn = 'confluence1.storePage';
	var uriTemplate = '%0/rpc/xmlrpc';
	var host = context.host || this.fullHostName(tiddler.fields['server.host']);
	var uri = uriTemplate.format([host]);
//#console.log('uri: '+uri);

	var fnParamsTemplate = '&lt;param&gt;&lt;value&gt;&lt;string&gt;%0&lt;/string&gt;&lt;/value&gt;&lt;/param&gt;';
	fnParamsTemplate += '&lt;param&gt;&lt;value&gt;&lt;struct&gt;%1&lt;/struct&gt;&lt;/value&gt;&lt;/param&gt;';
//For adding, the Page given as an argument should have space, title and content fields at a minimum.
//For updating, the Page given should have id, space, title, content and version fields at a minimum.
//The parentId field is always optional. All other fields will be ignored.
	var pageTemplate = &quot;&lt;member&gt;&lt;name&gt;space&lt;/name&gt;&lt;value&gt;%0&lt;/value&gt;&lt;/member&gt;&quot;+
		&quot;&lt;member&gt;&lt;name&gt;title&lt;/name&gt;&lt;value&gt;%1&lt;/value&gt;&lt;/member&gt;&quot;+
		&quot;&lt;member&gt;&lt;name&gt;content&lt;/name&gt;&lt;value&gt;%2&lt;/value&gt;&lt;/member&gt;&quot;;
	if(tiddler.fields['server.page.id']) {
		pageTemplate += &quot;&lt;member&gt;&lt;name&gt;id&lt;/name&gt;&lt;value&gt;%3&lt;/value&gt;&lt;/member&gt;&quot;;
		pageTemplate += &quot;&lt;member&gt;&lt;name&gt;version&lt;/name&gt;&lt;value&gt;%4&lt;/value&gt;&lt;/member&gt;&quot;;
	}

	var pageStruct = pageTemplate.format([context.workspace,tiddler.title,tiddler.text,tiddler.fields['server.page.id'],tiddler.fields['server.page.revision']]);
	var fnParams = fnParamsTemplate.format([context.sessionToken,pageStruct]);
	var payload = ConfluenceAdaptor.fnTemplate.format([fn,fnParams]);
//#console.log(&quot;payload:&quot;+payload);

	var req = ConfluenceAdaptor.doHttpPOST(uri,ConfluenceAdaptor.putTiddlerCallback,context,null,payload);
	return typeof req == 'string' ? req : true;
};

ConfluenceAdaptor.putTiddlerCallback = function(status,context,responseText,uri,xhr)
{
//#console.log('putTiddlerCallback status:'+status);
//#console.log('rt:'+responseText);
//#&lt;?xml version=&quot;1.0&quot;?&gt;&lt;methodResponse&gt;
//#&lt;fault&gt;&lt;value&gt;&lt;struct&gt;
//#&lt;member&gt;&lt;name&gt;faultString&lt;/name&gt;&lt;value&gt;java.lang.Exception: com.atlassian.confluence.rpc.InvalidSessionException: User not authenticated or session expired. Call login() to open a new session&lt;/value&gt;&lt;/member&gt;&lt;member&gt;
//#&lt;name&gt;faultCode&lt;/name&gt;&lt;value&gt;&lt;int&gt;0&lt;/int&gt;&lt;/value&gt;&lt;/member&gt;
//#&lt;/struct&gt;&lt;/value&gt;&lt;/fault&gt;
//#&lt;/methodResponse&gt;
	if(status) {
		context.status = true;
	} else {
		context.status = false;
		context.statusText = xhr.statusText;
	}
	var faultRegExp = /&lt;member&gt;&lt;name&gt;faultString&lt;\/name&gt;&lt;value&gt;([^&lt;]*)&lt;\/value&gt;/mg;
	faultRegExp.lastIndex = 0;
	var match = faultRegExp.exec(responseText);
	if(match) {
		context.status = false;
		context.statusText = match[1].replace(/&amp;#32;/mg,' ').replace(/&amp;#13;/mg,'');
		//#console.log('err:'+context.statusText);
	}
	if(context.callback)
		context.callback(context,context.userParams);
};

//# placeholder, not complete
/*ConfluenceAdaptor.prototype.deleteTiddler = function(title,context,userParams,callback)
{
console.log('deleteTiddler:'+tiddler.title);
	context = this.setContext(context,userParams,callback);
	context.title = title;
	var tiddler = store.getTiddler(title);
	context.host = context.host||this.fullHostName(tiddler.fields['server.host']);
	context.workspace = context.workspace||tiddler.fields['server.workspace'];
	return this.complete(context,ConfluenceAdaptor.deleteTiddlerComplete);
};*/

ConfluenceAdaptor.deleteTiddlerComplete = function(context)
{
//#console.log('ConfluenceAdaptor.deleteTiddlerComplete:'+context.title);

//#putPage(utf8 page,utf8 content,struct attributes )
	var fn = 'confluence1.removePage';
	var uriTemplate = '%0/rpc/xmlrpc';
	var host = context.host || context.adaptor.fullHostName(context.tiddler.fields['server.host']);
	var uri = uriTemplate.format([host]);
//#console.log('uri: '+uri);

	var fnParamsTemplate = '&lt;param&gt;&lt;value&gt;&lt;string&gt;%0&lt;/string&gt;&lt;/value&gt;&lt;/param&gt;';
	fnParamsTemplate += '&lt;param&gt;&lt;value&gt;&lt;string&gt;%1&lt;/string&gt;&lt;/value&gt;&lt;/param&gt;';
	var fnParams = fnParamsTemplate.format([context.sessionToken,context.tiddler.fields['server.page.id']]);
	var payload = ConfluenceAdaptor.fnTemplate.format([fn,fnParams]);
//#console.log(&quot;payload:&quot;+payload);

	var req = ConfluenceAdaptor.doHttpPOST(uri,ConfluenceAdaptor.deleteTiddlerCallback,context,null,payload);
//#console.log(&quot;req:&quot;+req);
	return typeof req == 'string' ? req : true;
};

ConfluenceAdaptor.deleteTiddlerCallback = function(status,context,responseText,uri,xhr)
{
//#console.log('deleteTiddlerCallback:'+status);
//#console.log('rt:'+responseText);
	if(status) {
		context.status = true;
	} else {
		context.status = false;
		context.statusText = xhr.statusText;
	}
	var faultRegExp = /&lt;member&gt;&lt;name&gt;faultString&lt;\/name&gt;&lt;value&gt;([^&lt;]*)&lt;\/value&gt;/mg;
	faultRegExp.lastIndex = 0;
	var match = faultRegExp.exec(responeseText);
	if(match) {
		context.status = false;
		context.statusText = match[1].replace(/&amp;#32;/mg,' ').replace(/&amp;#13;/mg,'');
	}
	if(context.callback)
		context.callback(context,context.userParams);
};

config.adaptors[ConfluenceAdaptor.serverType] = ConfluenceAdaptor;
} // end of 'install only once'
//}}}