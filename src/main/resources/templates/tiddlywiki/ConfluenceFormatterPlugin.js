/***
|''Name:''|ConfluenceFormatterPlugin|
|''Description:''|Allows Tiddlers to use Confluence text formatting|
|''Author:''|Martin Budden (mjbudden (at) gmail (dot) com)|
|''Source:''|http://www.martinswiki.com/#ConfluenceFormatterPlugin |
|''CodeRepository:''|http://svn.tiddlywiki.org/Trunk/contributors/MartinBudden/formatters/ConfluenceFormatterPlugin.js |
|''Version:''|0.1.6|
|''Date:''|Dec 8, 2006|
|''Comments:''|Please make comments at http://groups.google.co.uk/group/TiddlyWikiDev |
|''License:''|[[Creative Commons Attribution-ShareAlike 3.0 License|http://creativecommons.org/licenses/by-sa/3.0/]] |
|''~CoreVersion:''|2.1.0|

|''Use host images''|&lt;&lt;option chkUseHostImages&gt;&gt;|

This is the ConfluenceFormatterPlugin, which allows you to insert [[Confluence|http://confluence.atlassian.com/renderer/notationhelp.action?section=all]] formated
text into a TiddlyWiki. See also http://confluence.atlassian.com/display/DOC/Confluence+Notation+Guide+Overview

The aim is not to fully emulate Confluence, but to allow you to work with Confluence content off-line
and then paste the content into your Confluence wiki later on, with the expectation that only minor
edits will be required.

To use Confluence format in a Tiddler, tag the Tiddler with ConfluenceFormat.  or set the tiddler's {{{wikiformat}}} extended field to {{{confluence}}}.

Please report any defects you find at http://groups.google.co.uk/group/TiddlyWikiDev

***/

//{{{
// Ensure that the ConfluenceFormatterPlugin is only installed once.
if(!version.extensions.ConfluenceFormatterPlugin) {
version.extensions.ConfluenceFormatterPlugin = {installed:true};

if(version.major &lt; 2 || (version.major == 2 &amp;&amp; version.minor &lt; 1))
	{alertAndThrow('ConfluenceFormatterPlugin requires TiddlyWiki 2.1 or later.');}

if(config.options.chkUseHostImages === undefined)
	{config.options.chkUseHostImages = true;}

confluenceFormatter = {}; // 'namespace' for local functions

confluenceDebug = function(out,str)
{
	createTiddlyText(out,str.replace(/\n/mg,'\\n').replace(/\r/mg,'RR'));
	createTiddlyElement(out,'br');
};

confluenceFormatter.createSpan = function(w)
{
	createTiddlyElement(w.output,'span').innerHTML = this.text;
};

confluenceFormatter.macros = function(w)
{
	this.lookaheadRegExp.lastIndex = w.matchStart;
	var lookaheadMatch = this.lookaheadRegExp.exec(w.source);
	if(lookaheadMatch &amp;&amp; lookaheadMatch.index == w.matchStart) {
		var lm1 = lookaheadMatch[1];
		var lm2 = lookaheadMatch[2];
		switch(lm1) {
		case 'anchor':
			a = createTiddlyElement(w.output,'a');// drop anchor
			t = w.tiddler ? w.tiddler.title + ':' : '';
			a.setAttribute('name',t + lm2);
			break;
		case 'color':
			var e = createTiddlyElement(w.output,'span');
			e.style.color = lm2;
			w.subWikifyTerm(e,/(\{color\})/mg);
			return;
			break;
		case 'excerpt':
			break;
		case 'noformat':
		case 'code':
			break;
		case 'panel':
		case 'note':
		case 'warning':
		case 'info':
		case 'tip':
//#&lt;div align='center'&gt;&lt;div class='informationMacroPadding'&gt;
//#&lt;table cellpadding='5' width='85%' cellspacing='0' class='warningMacro' border='0'&gt;
//#&lt;tr&gt;&lt;td width='16' valign='top'&gt;
//#&lt;img src=&quot;/confluence/images/icons/emoticons/forbidden.gif&quot; width=&quot;16&quot; height=&quot;16&quot; align=&quot;absmiddle&quot; alt=&quot;&quot; border=&quot;0&quot;&gt;
//#&lt;/td&gt;&lt;td&gt;
//#&lt;b class=&quot;strong&quot;&gt;Warning&lt;/b&gt;&lt;br /&gt;&lt;br/&gt;
//#Insert warning message here!
//#&lt;/td&gt;&lt;/tr&gt;
//#&lt;/table&gt;
//#&lt;/div&gt;&lt;/div&gt;
//#function createTiddlyElement(theParent,theElement,theID,theClass,theText)
			var d = createTiddlyElement(w.output,'div');
			var dp = createTiddlyElement(d,'div',null,'informationMacroPadding');
			var t = createTiddlyElement(dp,'table',null,lm1+'Macro');
			t.cellpadding='5';t.width='85%';t.cellspacing='0';t.border='0';
			var tr = createTiddlyElement(t,'tr');
			var td  = createTiddlyElement(tr,'td');
			td.width='16';td.valign='top';
			var img = createTiddlyElement(td,'img');
			img.src='/confluence/images/icons/emoticons/forbidden.gif';
			img.width='16';img.height='16';img.align='absmiddle';img.alt='';img.border='0';
			td  = createTiddlyElement(tr,'td');
			//# '&lt;b class='strong'&gt;Warning&lt;/b&gt;&lt;br/&gt;&lt;br/&gt;'+lm2;
			confluenceFormatter.subWikify(w,td,lm2);//'*'+lm1+'*&lt;br/&gt;&lt;br/&gt;';
			w.subWikifyTerm(td,new RegExp('(\{'+lm1+'\})','mg'));
			return;
			break;
		case 'section':
			// includes columns
			break;
		default:
			w.outputText(w.output,w.matchStart,w.nextMatch);
			return;
		}
		w.nextMatch = this.lookaheadRegExp.lastIndex;
	} else {
		w.outputText(w.output,w.matchStart,w.nextMatch);
	}
};

confluenceFormatter.subWikify = function(w,out,src)
{
	var oldSource = w.source;
	var nextMatch = w.nextMatch;
	w.source = src;
	w.nextMatch = 0;
	w.subWikifyUnterm(out);
	w.source = oldSource;
	w.nextMatch = nextMatch;
};

confluenceFormatter.singleCharFormat = function(w)
{
	this.lookaheadRegExp.lastIndex = w.matchStart;
	var lookaheadMatch = this.lookaheadRegExp.exec(w.source);
	if(lookaheadMatch &amp;&amp; lookaheadMatch.index == w.matchStart &amp;&amp; lookaheadMatch[0].substr(lookaheadMatch[0].length-2,1) != ' ') {
		w.subWikifyTerm(createTiddlyElement(w.output,this.element),this.termRegExp);
		w.nextMatch = this.lookaheadRegExp.lastIndex;
	} else {
		w.outputText(w.output,w.matchStart,w.nextMatch);
	}
};

confluenceFormatter.setAttributesFromParams = function(e,p)
{
	var re = /\s*(.*?)=(?:(?:&quot;(.*?)&quot;)|(?:'(.*?)')|((?:\w|%|#)*))/mg;
	var match = re.exec(p);
	while(match) {
		var s = match[1].unDash();
		if(s=='bgcolor') {
			s = 'backgroundColor';
		}
		try {
			if(match[2]) {
				e.setAttribute(s,match[2]);
			} else if(match[3]) {
				e.setAttribute(s,match[3]);
			} else {
				e.setAttribute(s,match[4]);
			}
		}
		catch(ex) {}
		match = re.exec(p);
	}
};

config.confluenceFormatters = [
{
	name: 'confluenceHeading',
	match: '^h[1-6](?:(?:\\(.*?\\))|(?:\\{.*?\\})|(?:\\[.*?\\]))?\\. ',
	lookaheadRegExp: /^h([1-6])(?:(?:\((.*?)\))|(?:\{(.*?)\})|(?:\[(.*?)\]))?\. /mg,
	//#match: '^h[1-6]. ',
	//#lookaheadRegExp: /^h([1-6])\. /mg,
	termRegExp: /(\n)/mg,
	handler: function(w)
	{
		this.lookaheadRegExp.lastIndex = w.matchStart;
		var lookaheadMatch = this.lookaheadRegExp.exec(w.source);
		if(lookaheadMatch &amp;&amp; lookaheadMatch.index == w.matchStart) {
			w.subWikifyTerm(createTiddlyElement(w.output,'h'+lookaheadMatch[1]),this.termRegExp);
		}
	}
},
{
	name: 'confluenceTable',
	match: '^\\|(?:(?:.|\n)*)\\|$',
	lookaheadRegExp: /^\|(?:(?:.|\n)*)\|$/mg,
	cellRegExp: /(?:\|(?:[^\|]*)\|)(\n|$)?/mg,
	cellTermRegExp: /((?:\x20*)\|)/mg,
	handler: function(w)
	{
		var table = createTiddlyElement(w.output,'table');
		var rowContainer = createTiddlyElement(table,'tbody');
		var prevColumns = [];
		w.nextMatch = w.matchStart;
		this.lookaheadRegExp.lastIndex = w.nextMatch;
		var lookaheadMatch = this.lookaheadRegExp.exec(w.source);
		while(lookaheadMatch &amp;&amp; lookaheadMatch.index == w.nextMatch) {
			var r = this.rowHandler(w,createTiddlyElement(rowContainer,'tr'),prevColumns);
			if(!r) {
				w.nextMatch++;
				break;
			}
			this.lookaheadRegExp.lastIndex = w.nextMatch;
			lookaheadMatch = this.lookaheadRegExp.exec(w.source);
		}
	},
	rowHandler: function(w,e,prevColumns)
	{
		this.cellRegExp.lastIndex = w.nextMatch;
		var cellMatch = this.cellRegExp.exec(w.source);
		while(cellMatch &amp;&amp; cellMatch.index == w.nextMatch) {
			w.nextMatch++;
			var cell = createTiddlyElement(e,'td');
			w.subWikifyTerm(cell,this.cellTermRegExp);
			if(cellMatch[1]) {
				//# End of row
				w.nextMatch = this.cellRegExp.lastIndex;
				return true;
			} else {
				//# Cell
				w.nextMatch--;
			}
			this.cellRegExp.lastIndex = w.nextMatch;
			cellMatch = this.cellRegExp.exec(w.source);
		}
		return false;
	}
},
{
	name: 'confluenceList',
	match: '^[#\\*\\-]+ ',
	lookaheadRegExp: /^(?:(#)|(\*)|(\-))+ /mg,
	termRegExp: /(\n)/mg,
	handler: function(w)
	{
		var stack = [w.output];
		var currLevel = 0, currType = null;
		var listLevel, listType;
		w.nextMatch = w.matchStart;
		this.lookaheadRegExp.lastIndex = w.nextMatch;
		var lookaheadMatch = this.lookaheadRegExp.exec(w.source);
		while(lookaheadMatch &amp;&amp; lookaheadMatch.index == w.nextMatch) {
			var style = lookaheadMatch[3] ? 'square' : null;
			listType = lookaheadMatch[1] ? 'ol' : 'ul';
			listLevel = lookaheadMatch[0].length - 1;
			w.nextMatch += listLevel;
			if(listLevel &gt; currLevel){
				for(var i=currLevel; i&lt;listLevel; i++) {
					stack.push(createTiddlyElement(stack[stack.length-1],listType));
				}
			} else if(listLevel &lt; currLevel) {
				for(i=currLevel; i&gt;listLevel; i--) {
					stack.pop();
				}
			} else if(listLevel == currLevel &amp;&amp; listType != currType) {
				stack.pop();
				stack.push(createTiddlyElement(stack[stack.length-1],listType));
			}
			currLevel = listLevel;
			currType = listType;
			var e = createTiddlyElement(stack[stack.length-1],'li');
			e.style[config.browser.isIE ? 'list-style-type' : 'listStyleType'] = style;
			w.subWikifyTerm(e,this.termRegExp);
			this.lookaheadRegExp.lastIndex = w.nextMatch;
			lookaheadMatch = this.lookaheadRegExp.exec(w.source);
		}
	}
},
{
//#(class)(#id){style}[language]
	name: 'confluenceBlockQuote',
	match: '^bq(?:(?:\\(.*?\\))|(?:\\{.*?\\})|(?:\\[.*?\\]))?\\. ',
	lookaheadRegExp: /^bq(?:(?:\((#?)(.*?)\))|(?:\{(.*?)\})|(?:\[(.*?)\]))?\. /mg,
	termRegExp: /(\n)/mg,
	element: 'blockquote',
	handler: function(w)
	{
		this.lookaheadRegExp.lastIndex = w.matchStart;
		var lookaheadMatch = this.lookaheadRegExp.exec(w.source);
		if(lookaheadMatch &amp;&amp; lookaheadMatch.index == w.matchStart) {
			var e = createTiddlyElement(w.output,this.element);
			w.subWikifyTerm(e,this.termRegExp);
		}
	}
},
{
	name: 'confluenceQuote',
	match: '^{quote}',
	termRegExp: /(\{quote\})/mg,
	element: 'blockquote',
	handler: config.formatterHelpers.createElementAndWikify
},
{
	name: 'confluenceNoformat',
	match: '^{noformat}\\n',
	lookaheadRegExp: /\{noformat\}((?:.|\n)*?)\{noformat\}/mg,
	element: 'pre',
	handler: config.formatterHelpers.enclosedTextHelper
},
{
	name: 'confluenceRule',
	match: '^---+$\\n?',
	handler: function(w)
	{
		createTiddlyElement(w.output,'hr');
	}
},
{
	name: 'macro',
	match: '&lt;&lt;',
	lookaheadRegExp: /&lt;&lt;([^&gt;\s]+)(?:\s*)((?:[^&gt;]|(?:&gt;(?!&gt;)))*)&gt;&gt;/mg,
	handler: function(w)
	{
		this.lookaheadRegExp.lastIndex = w.matchStart;
		var lookaheadMatch = this.lookaheadRegExp.exec(w.source);
		if(lookaheadMatch &amp;&amp; lookaheadMatch.index == w.matchStart &amp;&amp; lookaheadMatch[1]) {
			w.nextMatch = this.lookaheadRegExp.lastIndex;
			invokeMacro(w.output,lookaheadMatch[1],lookaheadMatch[2],w,w.tiddler);
		}
	}
},
{
//#&quot;This is a link (optional title)&quot;:http://www.textism.com
	name: 'confluenceExternalLink',
	match: '(?:&quot;.*?&quot; ?):?[a-z]{2,8}:',
	lookaheadRegExp: /(?:\&quot;(.*?)(?:\((.*?)\))?\&quot; ?):?(.*?)(?=\s|$)/mg, //&quot;
	handler: function(w)
	{
		this.lookaheadRegExp.lastIndex = w.matchStart;
		var lookaheadMatch = this.lookaheadRegExp.exec(w.source);
		if(lookaheadMatch &amp;&amp; lookaheadMatch.index == w.matchStart) {
			var link = lookaheadMatch[3];
			var text = lookaheadMatch[1] ? lookaheadMatch[1] : link;
			var e = createExternalLink(w.output,link);
			if(lookaheadMatch[2])
				e.title = lookaheadMatch[2];
			createTiddlyText(e,text);
			w.nextMatch = this.lookaheadRegExp.lastIndex;
		}
	}
},
{
	name: 'confluenceUrlLink',
	match: config.textPrimitives.urlPattern,
	handler: function(w)
	{
		w.outputText(createExternalLink(w.output,w.matchText),w.matchStart,w.nextMatch);
	}
},
{
	name: 'confluenceExplicitLink',
	match: '\\[',
	lookaheadRegExp: /\[([^\|\]]*?)(?:(?:\])|(?:\|(.*?))\])/mg,
	handler: function(w)
	{
		this.lookaheadRegExp.lastIndex = w.matchStart;
		var lookaheadMatch = this.lookaheadRegExp.exec(w.source);
		if(lookaheadMatch &amp;&amp; lookaheadMatch.index == w.matchStart)
			{
			var text = lookaheadMatch[1];
			var link = lookaheadMatch[2] ? lookaheadMatch[2] : text;
			var tip = lookaheadMatch[3] ? lookaheadMatch[3] : text;
			var e = config.formatterHelpers.isExternalLink(link) ? createExternalLink(w.output,link) : createTiddlyLink(w.output,link,false,null,w.isStatic);
			confluenceFormatter.subWikify(w,e,text);
			//createTiddlyText(e,text);
			w.nextMatch = this.lookaheadRegExp.lastIndex;
			}
	}
},
{
//# !/common/textist.gif(optional alt text)!
	name: 'confluenceImage',
	match: '!.*?!',
	lookaheadRegExp: /!(.*?)(?:\((.*?)\))?!/mg,
	handler: function(w)
	{
		this.lookaheadRegExp.lastIndex = w.matchStart;
		var lookaheadMatch = this.lookaheadRegExp.exec(w.source);
		if(lookaheadMatch &amp;&amp; lookaheadMatch.index == w.matchStart) {
			var img = createTiddlyElement(w.output,'img');
			img.src = lookaheadMatch[1];
			if(config.options.chkUseHostImages) {
				var s = lookaheadMatch[1];
				var i = s.indexOf('|');
				if(i!=-1)
					s = s.substr(0,i);
				var uriTemplate = '%0/download/attachments/%1/%2';
				var uri = uriTemplate.format([new AdaptorBase().fullHostName(w.tiddler.fields['server.host']),w.tiddler.fields['server.page.id'],s]);
				//#console.log('uri:'+uri);
				img.src = uri;
			}
			if(lookaheadMatch[2]) {
				img.title = lookaheadMatch[2];
			}
			w.nextMatch = this.lookaheadRegExp.lastIndex;
		}
	}
},
{
	name: 'confluenceBold',
	match: '\\*(?![\\s\\*])',
	lookaheadRegExp: /\*(?!\s)(?:.*?)(?!\s)\*(?=[\s\._\-])/mg,
	termRegExp: /((?!\s)\*(?=[\s\.\-_]))/mg,
	element: 'strong',
	handler: confluenceFormatter.singleCharFormat
},
{
	name: 'confluenceItalic',
	match: '_(?![\\s_])',
	lookaheadRegExp: /_(?!\s)(?:.*?)(?!\s)_(?=[\s\.\*\-])/mg,
	termRegExp: /((?!\s)_(?=[\s\.\*\-]))/mg,
	element: 'em',
	handler: confluenceFormatter.singleCharFormat
},
{
	name: 'confluenceUnderline',
	match: '\\+(?![\\s|\\+])',
	lookaheadRegExp: /\+(?!\s)(?:.*?)(?!\s)\+(?=\s)/mg,
	termRegExp: /((?!\s)\+(?=\s))/mg,
	element: 'u',
	handler: confluenceFormatter.singleCharFormat
},
{
	name: 'confluenceStrike',
	match: '-(?![\\s\\-])',
	lookaheadRegExp: /-(?!\s)(?:.*?)(?!\s)-(?=[\s\.\*_])/mg,
	termRegExp: /((?!\s)-(?=[\s\.\*_]))/mg,
	element: 'strike',
	handler: confluenceFormatter.singleCharFormat
},
{
	name: 'confluenceSuperscript',
	match: '\\^(?![\\s|\\^])',
	lookaheadRegExp: /\^(?!\s)(?:.*?)(?!\s)\^(?=\s)/mg,
	termRegExp: /((?!\s)\^(?=\s))/mg,
	element: 'sup',
	handler: confluenceFormatter.singleCharFormat
},
{
	name: 'confluenceSubscript',
	match: '~(?![\\s|~])',
	lookaheadRegExp: /~(?!\s)(?:.*?)(?!\s)~(?=\s)/mg,
	termRegExp: /((?!\s)~(?=\s))/mg,
	element: 'sub',
	handler: confluenceFormatter.singleCharFormat
},
{
	name: 'confluenceCitation',
	match: '\\?\\?',
	termRegExp: /(\?\?)/mg,
	element: 'cite',
	handler: config.formatterHelpers.createElementAndWikify
},
{
	name: 'confluenceMonospacedByChar',
	match: '\\{\\{',
	lookaheadRegExp: /\{\{((?:.|\n)*?)\}\}/mg,
	element: 'code',
	handler: config.formatterHelpers.enclosedTextHelper
},
{
	name: 'confluenceBreak',
	match: '\\n{2,}',
	handler: function(w)
	{
		createTiddlyElement(w.output,'br');
	}
},
{
	name: 'confluenceExplicitLineBreak',
	match: '&lt;br ?/?&gt;|\\\\|\\n',
	handler: function(w)
	{
		createTiddlyElement(w.output,'br');
	}
},
{
	name: 'confluenceComment',
	match: '&lt;!\\-\\-',
	lookaheadRegExp: /&lt;!\-\-((?:.|\n)*?)\-\-!&gt;/mg,
	handler: function(w)
	{
		this.lookaheadRegExp.lastIndex = w.matchStart;
		var lookaheadMatch = this.lookaheadRegExp.exec(w.source);
		if(lookaheadMatch &amp;&amp; lookaheadMatch.index == w.matchStart) {
			w.nextMatch = this.lookaheadRegExp.lastIndex;
		}
	}
},
{
	name: 'confluenceMdash',
	match: '---',
	handler: function(w) {createTiddlyElement(w.output,'span').innerHTML = '&amp;mdash;';}
},
{
	name: 'confluenceNdash',
	match: '--',
	handler: function(w) {createTiddlyElement(w.output,'span').innerHTML = '&amp;ndash;';}
},
{
	name: 'confluenceTrademark',
	match: '\\(TM\\)',
	handler: function(w) {createTiddlyElement(w.output,'span').innerHTML = '&amp;trade;';}
},
{
	name: 'confluenceRegistered',
	match: '\\(R\\)',
	text: '&amp;reg;',
	handler: confluenceFormatter.createSpan
	//handler: function(w) {createTiddlyElement(w.output,'span').innerHTML = '&amp;reg;';}
},
{
	name: 'confluenceCopyright',
	match: '\\(C\\)',
	handler: function(w) {createTiddlyElement(w.output,'span').innerHTML = '&amp;copy;';}
},
{
	name: 'confluenceElipsis',
	match: '\\.\\.\\.',
	handler: function(w) {createTiddlyElement(w.output,'span').innerHTML = '&amp;hellip;';}
},
{
	name: 'confluenceMacros',
	match: '\\{(?:[a-z]{2,16})(?:: ?.*?)?\\}',
	lookaheadRegExp: /\{([a-z]{2,16}): ?(.*?)\}/mg,
	handler: confluenceFormatter.macros
},
{
	name: 'confluenceHtmlEntitiesEncoding',
	match: '&amp;#?[a-zA-Z0-9]{2,8};',
	handler: function(w)
	{
		createTiddlyElement(w.output,'span').innerHTML = w.matchText;
	}
},
{
	name: 'confluenceHtmlTag',
	match: &quot;&lt;(?:[a-zA-Z]{2,}|a)(?:\\s*(?:(?:.*?)=[\&quot;']?(?:.*?)[\&quot;']?))*?&gt;&quot;,
	lookaheadRegExp: /&lt;([a-zA-Z]+)((?:\s+(?:.*?)=[&quot;']?(?:.*?)[&quot;']?)*?)?\s*(\/)?&gt;(?:\n?)/mg, //'
	handler: function(w)
	{
		this.lookaheadRegExp.lastIndex = w.matchStart;
		var lookaheadMatch = this.lookaheadRegExp.exec(w.source);
		if(lookaheadMatch &amp;&amp; lookaheadMatch.index == w.matchStart) {
			var e =createTiddlyElement(w.output,lookaheadMatch[1]);
			if(lookaheadMatch[2]) {
				confluenceFormatter.setAttributesFromParams(e,lookaheadMatch[2]);
			}
			if(lookaheadMatch[3]) {
				w.nextMatch = this.lookaheadRegExp.lastIndex;// empty tag
			} else {
				w.subWikify(e,'&lt;/'+lookaheadMatch[1]+'&gt;');
			}
		}
	}
}/*,
{
	name: 'confluenceMatchedQuotes',
	match: '(?=\s)&quot;',
	lookaheadRegExp: /\&quot;((?:.|\n)*?)\&quot;/mg,
	handler: function(w)
	{
		this.lookaheadRegExp.lastIndex = w.matchStart;
		var lookaheadMatch = this.lookaheadRegExp.exec(w.source);
		if(lookaheadMatch &amp;&amp; lookaheadMatch.index == w.matchStart) {
			createTiddlyElement(w.output,'span').innerHTML = '&amp;ldquo;' + lookaheadMatch[1] + '&amp;rdquo;';
			w.nextMatch = this.lookaheadRegExp.lastIndex;
		}
	}
}*/
];

config.parsers.confluenceFormatter = new Formatter(config.confluenceFormatters);
config.parsers.confluenceFormatter.format = 'confluence';
config.parsers.confluenceFormatter.formatTag = 'ConfluenceFormat';
} // end of 'install only once'
//}}}