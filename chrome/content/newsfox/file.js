/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is NewsFox.
 *
 * The Initial Developer of the Original Code is
 * Andy Frank <andy@andyfrank.com>.
 * Portions created by the Initial Developer are Copyright (C) 2005-2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Andrey Gromyko <andrey@gromyko.name>
 *   Ron Pruitt <wa84it@gmail.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the LGPL or the GPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

var hasNetUtil = true;
try { Components.utils.import("resource://gre/modules/NetUtil.jsm"); }
catch(e) { hasNetUtil = false; }
var hasOSFile = true;
try { Components.utils.import("resource://gre/modules/osfile.jsm"); }
catch(e) { hasOSFile = false; }

var scKeyList = new Array();
const SRCHCLASS = "srch";
const KEYWORDCLASS = "keyword";
const ONCECLASS = "once";

const gPicName = [ "weblink.png", "mail.png", "encl-video.png", "encl-audio.png", "encl-other.png" ];
var gPicVal = [ null, null, null, null,  null ];
var reqPic = [ null, null, null, null, null ];
var gDone = 0;
//var gDefaultTextview = "body { font:10pt Verdana,sans-serif; background:white; }\n#newsfox-box { background: #e3dfd9; padding:10px; overflow:hidden; }\n.srch { color: red; font-weight: bold; }\n.keyword { color: green; font-weight: bold; }\n.once { color: orange; font-weight: bold; }";
var gDefaultTextview = "";
const async = true;

////////////////////////////////////////////////////////////////
// Text view
////////////////////////////////////////////////////////////////

function getTextView(art, feed)
{
	var iframe = document.getElementById("buildContent");
	iframe.contentWindow.addEventListener('keypress', handleEvent, true);
	var doc = iframe.contentDocument;
	iframe.docShell.allowJavascript = false;
	var iosvc = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
	var artURI;
	try { artURI = iosvc.newURI(art.link, null, null); }
	catch(e) { artURI = iosvc.newURI("about:blank", null, null); }

	while (doc.body.childNodes.length > 0) doc.body.removeChild(doc.body.childNodes[0]);
	doc.title = art.title;

	var tagsToRemove;
	if (gOptions.globalStyle == 5 && feed.style != 5)
		tagsToRemove = gOptions.htmlRemove;
	else
		tagsToRemove = feed.htmlRemove;
	if (tagsToRemove == "") tagsToRemove = gOptions.htmlRemove;
	var div = doc.createElement("div");
	div.setAttribute("id","newsfox-box");
		var a = doc.createElement("a");
		a.setAttribute("class","newsfox-title");
		a.setAttribute("href",art.link);
		if (!gOptions.openInViewPane) a.setAttribute("target", "_blank");
		var b = getXhtmlBody(art.title,"b",doc,artURI,feed.getStyle(),tagsToRemove);
		a.appendChild(b);
	div.appendChild(a);
	if (art.author != "")
	{
		var p = doc.createElement("span");
		p.setAttribute("class","newsfox-author");
		p.setAttribute("style","font-size: smaller; display:none; padding-left: 7px; font-style: italic;");
		var txt = art.author;
		if (txt.indexOf('(') > -1) txt = txt.substring(0,txt.indexOf('('));
		p.innerHTML = txt;
	div.appendChild(p);
	}
	div.appendChild(doc.createElement("br"));

	var s = doc.createElement("span");
	s.setAttribute("class","newsfox-feed");
	s.setAttribute("style","font-size:smaller; display:none;");
	var a = doc.createElement("span");
	a.innerHTML = feed.getDisplayName();
	s.appendChild(a);
	s.appendChild(doc.createElement("br"));
	div.appendChild(s);

	if (art.link)
	{
		var s = doc.createElement("span");
		s.setAttribute("class","newsfox-link");
		var a = doc.createElement("a");
		a.setAttribute("href",art.link);
		if (!gOptions.openInViewPane) a.setAttribute("target", "_blank");
			var img = doc.createElement("img");
			img.setAttribute("src",gPicVal[0]);
			img.setAttribute("style","border: 0px; padding-right: 7px;");
		a.appendChild(img);
		s.appendChild(a);
		div.appendChild(s);
		if (NFgetPref("debug.showStatusText", "bool", false))
			window.status = art.link;
	}
		var s = doc.createElement("span");
		s.setAttribute("class","newsfox-mail");
		var a = doc.createElement("a");
		a.setAttribute("href",makeMailto(art.title,art.link));
		a.setAttribute("target", "_blank");
			var img = doc.createElement("img");
			img.setAttribute("src",gPicVal[1]);
			img.setAttribute("style","border: 0px; padding-right: 7px;");
		a.appendChild(img);
		s.appendChild(a);
	div.appendChild(s);
		var p1 = doc.createElement("span");
		p1.setAttribute("class","newsfox-source");
		p1.setAttribute("style","font-size: smaller");
		var a = doc.createElement("a");
		if (!gOptions.openInViewPane) a.setAttribute("target", "_blank");
		if (art.source.url) a.setAttribute("href", art.source.url);
		a.setAttribute("style","text-decoration: none");
		a.innerHTML = "";
		if (art.source.name != "") a.innerHTML += "(" + emphsrch(art.source.name) + ") ";
		p1.appendChild(a);
	div.appendChild(p1);
		var s = doc.createElement("span");
		s.setAttribute("class","newsfox-tag");
		s.setAttribute("style","font-size: smaller");
		s.innerHTML = "";
		if (art.tag != "") s.innerHTML += "&lt;" + emphsrch(art.tag) + "&gt; ";
	div.appendChild(s);
		var p = doc.createElement("span");
		p.setAttribute("class","newsfox-category");
		p.setAttribute("style","font-size: smaller");
		p.innerHTML = "";
		if (art.category != "") p.innerHTML += "[" + emphsrch(art.category.replace(/\//g,"&bull;")) + "] ";
	div.appendChild(p);
		var p2 = doc.createElement("span");
		p2.setAttribute("class","newsfox-date");
		p2.setAttribute("style","font-size: smaller; white-space: nowrap;");
		p2.innerHTML = displayDate(art.date, LONG_DATE_STYLE);
	div.appendChild(p2);
	div.appendChild(doc.createElement("br"));

	if (art.enclosures.length > 0)
	{
		var s = doc.createElement("span");
		s.setAttribute("class","newsfox-enclosures");
		for (var i=0; i<art.enclosures.length; i++)
		{
			var artenc = art.enclosures[i];
			var nobr = doc.createElement("span");  // xhtml equivalent of <nobr>
			nobr.setAttribute("style","white-space: nowrap;");
			var a = doc.createElement("a");
			a.setAttribute("class","newsfox-encl");
			a.setAttribute("href", artenc.url);
			a.setAttribute("target","_blank");
			var img = doc.createElement("img");
			var imgsrc;
			var encltype = artenc.type.substring(0,5);
			if (encltype == "video")
				imgsrc = gPicVal[2];
			else if (encltype == "audio")
				imgsrc = gPicVal[3];
			else
				imgsrc = gPicVal[4];
			img.setAttribute("src",imgsrc);
			img.setAttribute("style","border: 0px; padding-right: 2px; vertical-align: middle;");
			var p = doc.createElement("span");
			p.innerHTML = artenc.type;
			a.appendChild(img);
			a.appendChild(p);
			nobr.appendChild(a);
			var p = doc.createElement("span");
			var sz = Math.round(artenc.length/1024);
			if (sz == 0 || isNaN(sz)) sz = "----";
			sz += "Kb";
			p.innerHTML = ": " + sz + "&nbsp;&nbsp;&nbsp;&nbsp;";
			nobr.appendChild(p);
			s.appendChild(nobr);
			var s2 = doc.createElement("span");
			s2.innerHTML = " ";  // enclosures won't wrap without wrappable space
			s.appendChild(s2);
		}
		s.appendChild(doc.createElement("br"));
		div.appendChild(s);
	}
	var body = art.body;
	if (art.Xtend && art.Xbody.length > 0) body = art.Xbody;

	// Filter out elements from body using regex
	body = filterArticle(body);

	// Get the content as an XHTML body element
	// console.debug("getTextView: artURI value is: ", artURI);
	var p = getXhtmlBody(body, "p", doc, artURI, feed.getStyle(), tagsToRemove);

	/*
	// Process lazy loading at display time
	if (gOptions.processLazyLoading)
	{
		try
		{
			// Use the most specific baseuri available
			var baseUriToUse = getBaseDomain(art.link);
			// console.debug("Processing lazy loading at display time with baseUriToUse: ", baseUriToUse);

			if (baseUriToUse)
			{
				console.debug("Processing lazy loading in getTextView with baseUri:", baseUriToUse);
				processLazyLoading(p, baseUriToUse);
			}
			else
			{
				console.warn("Skipping lazy loading processing: No valid baseUri available");
			}
		}
		catch (e)
		{
			console.error("Error processing lazy loading in getTextView:", e.message, e.stack);
			// Continue with display even if lazy loading processing fails
		}
	}
	*/

	doc.body.appendChild(div);
	doc.body.appendChild(p);
}

function makeMailto(title,link)
{
	var mFile = Components.classes["@mozilla.org/file/directory_service;1"].
		getService(Components.interfaces.nsIProperties).
		get("ProfD", Components.interfaces.nsIFile);
	mFile.append("mimeTypes.rdf");
	var mimexml = null;
	if (mFile.exists()) mimexml = xmlLoad(mFile);

	var uri = encodeURI("mailto:?subject=" + entityDecode(title) + "&body=" + link);
	uri = uri.replace(/\?/g,"%3F");
	uri = uri.replace(/=/g,"%3D");
	uri = uri.replace(/&/g,"%26");
	var webAddress = getWebAddress(mimexml);
	if (!gOptions.fixMailto || useSystemDefault(mimexml) || webAddress == null)
	{
		uri = uri.replace("%3Fsubject%3D","?subject=");
		uri = uri.replace("%26body%3D","&body=");
	}
	else
	{
		uri = webAddress.replace("%s",uri);
	}
	return(uri);
}

function useSystemDefault(xml)
{
	if (xml == null) return true;
	var val = false;
	var schemes = xml.getElementsByTagName("RDF:Description");
	for (var i=0; i<schemes.length; i++)
	{
		if (schemes[i].getAttribute("RDF:about") == "urn:scheme:handler:mailto")
			if (schemes[i].getAttribute("NC:useSystemDefault")) return true;
	}
	return false;
}

function getWebAddress(xml)
{
	if (xml == null) return null;
	var schemes = xml.getElementsByTagName("RDF:Description");
	for (var i=0; i<schemes.length; i++)
	{
		if (schemes[i].getAttribute("RDF:about") == "urn:scheme:externalApplication:mailto")
// returns either web address if using webmail or null
			return schemes[i].getAttribute("NC:uriTemplate")
	}
	return null;
}

function getImgsForTextview()
{
// Firefox bug#292789 requires us to load chrome: images with data: URI
	var file;
	var fileToGet;
	for (var i=0; i<gPicVal.length; i++)
	{
		file = NFgetProfileDir();
		file.append("images");
		file.append(gPicName[i]);
		if (file.exists())
			fileToGet = getFileSpec(file);
		else
			fileToGet = "chrome://newsfox/skin/images/" + gPicName[i];

		reqPic[i] = new XMLHttpRequest();
		reqPic[i].open('GET', fileToGet, async);
// trick by Marcus Granado, next line and toBinStr()
// http://mgran.blogspot.com/2006/08/downloading-binary-streams-with.html
		reqPic[i].overrideMimeType('text/plain; charset=x-user-defined');
		reqPic[i].onload = function()
		{
			gDone++;
			if (gDone == gPicVal.length) processImgFiles();
		}
		reqPic[i].send(null);
// onload works with sync as well so don't need the following
//    if (!async) makeSrc(i,reqPic[i]);
	}

	var req2 = new XMLHttpRequest();
	req2.open("GET", "chrome://newsfox/skin/textview.css", async);
	req2.overrideMimeType("text/plain");
	req2.onload = function() { gDefaultTextview = req2.responseText; }
	req2.send(null);
// onload works with sync as well so don't need the following
//	if (!async) gDefaultTextview = req2.responseText;
}

function processImgFiles()
{
	for (var i=0; i<gPicVal.length; i++)
		doImgFile(i,reqPic[i]);
}

function doImgFile(i,req)
{
	var retval = "data:" + req.getResponseHeader('content-type') + ";base64,";
	var binText = toBinStr(req.responseText);
	retval += btoa(binText);
	gPicVal[i] = retval;
}

function getXhtmlBody(body, tag, doc, artURI, style, tagsToRemove)
{
	// Add URL resolution before XML parsing
	if (artURI)
	{
		body = fixRelativeLinks(body, artURI.prePath);
	}

	// Filter out elements from body using regex
	body = filterArticle(body)

	// Call transformImageURLs
	try
	{
		if (gOptions.transformImageURLs)
		{
			var tempNode = document.createElement('div');
			tempNode.textContent = body; // Convert body to a DOM node
			transformImageURLs(tempNode, artURI.prePath, 0);
			// console.debug("Processing transformImageURLs in getXhtmlBody with baseUri:", artURI.prePath);
			body = tempNode.textContent; // Update the body after transformed content
		}
	}
	catch (e)
	{
		console.error("Error transforming image URLs:", e.message);
		// Continue processing even if transformation fails
	}

	// Call processLazyLoading
	if (gOptions.processLazyLoading)
	{
		try
		{
			var tempNode = document.createElement('div');
			tempNode.textContent = body; // Convert body to a DOM node
			processLazyLoading(tempNode, artURI.prePath);
			console.debug("Processing lazy loading in getXhtmlBody with baseUri:", artURI.prePath);
			body = tempNode.textContent; // Update the body after processLazyLoading
		}
		catch (e)
		{
			console.error("Error processing lazy loading in getTextView:", e.message, e.stack, e);
			// Continue with display even if lazy loading processing fails
		}
	}

	// DOMParser is broken: Firefox bug#429785, using artURI is a fix
	// added benefit: puts XML parse errors that are not suppressed
	// in try-catch with the proper domain of the originating article
	if (body.substring(0, 7) == "<xhtml>")
	{
		var p = doc.createElementNS(XHTML, tag);
		var body2 = body.replace(/^<xhtml>|<\/xhtml>$/g, "");
		body2 = emphsrch(body2);
		if (tag == "p") body2 = linkify(body2, "x");
		var xmlBody = new DOMParser(null,artURI,null).parseFromString(body2,"text/xml");
		// Atom specification guarantees a single <div> element, now a <span>
		var xBody = doc.importNode(xmlBody.childNodes[0], true);
		p.appendChild(xBody);
		if (style == 5) stripMedia(p, tagsToRemove);
	}
	else if (style == 4) // style == 4 is force XHTML
	{
		var p = doc.createElementNS(XHTML, tag);
		var body2 = emphsrch(body);
		// only linkify body, not title
		if (tag == "p") body2 = linkify(body2, "x");
		try
		{
			var xmlBody = new DOMParser(null,artURI,null).parseFromString(XHTML_TRANS_DOCTYPE + '<span xmlns="' + XHTML + '">' + body2 + "</span>","text/xml");
			var xBody = doc.importNode(xmlBody.childNodes[1], true);
			p.appendChild(xBody);
		}
		catch (e)
		{
			console.error("XML parsing failed in getXhtmlBody:", e);
			var p = doc.createElement(tag);
			p.innerHTML = body2;
		}
	}
	else
	{
		var p = doc.createElement(tag);
		body = emphsrch(body);
		// only linkify body, not title
		if (tag == "p") body = linkify(body, "h");
		p.innerHTML = body;
		if (style == 5) stripMedia(p, tagsToRemove);
	}
	return p;
}

function stripMedia(elem,tagsToRemove)
{
	var mediaTags = tagsToRemove.split(",");
	for (var i=0; i<mediaTags.length; i++)
	{
		var els = elem.getElementsByTagName(mediaTags[i]);
		for (var j=els.length-1; j>=0; j--)
			els[j].parentNode.removeChild(els[j]);
	}
	return elem;
}

function emphsrch(html)
{
	if (gSearchValue != "") html = hilite(gSearchValue,html,ONCECLASS);
	var keyword;
	for (var i=0; i<gOptions.keyword.length; i++)
	{
		keyword = gOptions.keyword[i];
		if (keyword) html = hilite(keyword,html,""+KEYWORDCLASS+i);
	}
	if (gCollect.type == 3)  // search
	{
		var st = gCollect.getSrchText();
		for (var i=0; i<st.length; i++)
			html = hilite(st[i],html,SRCHCLASS);
	}
	return html;
}

function hilite(srchtext, html, htmlClass)
{
	if (srchtext.length == 0) return html;
	var text = html;
	var repltext = srchtext;
	var caseSen = false;
	if (htmlClass == SRCHCLASS)
	{
		var srchdat = gFdGroup[gCollect.grpindex].srchdat;
		var textflags = srchdat.textflags;
		caseSen = ((textflags & 0x04) == 0);
	}
	if (!caseSen)
	{
		text = text.toLowerCase();
		repltext = repltext.toLowerCase();
	}

	var todo = new Array();
	var startpos = 0;
	var newpos = text.indexOf(repltext,startpos);
	while (newpos > -1)
	{
		// check if in <tag> or in html
		if (text.lastIndexOf(">",newpos) >= text.lastIndexOf("<",newpos))
			todo.push(newpos);
		startpos = newpos + 1;
		newpos = text.indexOf(repltext,startpos);
	}
	var pos;
	var len = srchtext.length;
	for (var i=todo.length-1; i>=0; i--)
	{
		pos = todo[i];
		html = html.substring(0,pos)+"<span class='" + htmlClass + "'>"+html.substring(pos,pos+len)+"</span>"+html.substring(pos+len);
	}
	return html;
}

function linkify(html, type)
{
	if (type == "x" && !gOptions.linkifyXHTML) return html;
	if (type != "x" && !gOptions.linkify) return html;
	var loctext = " target='_blank' ";
	if (gOptions.openInViewPane) loctext = "";
	var text = html.toLowerCase();
	var httpRE = /(https*|ftp|nntp|news|mailto|telnet|irc):\S*/;

	var todo = new Array();
	var todolen = new Array();
	var startpos = 0;
	var m1 = text.match(httpRE);
	var newpos;
	var newlen;
	while (m1 != null)
	{
		newpos = m1.index + startpos;
		newlen = m1[0].length;
		// check if in <tag> or in html
		if (text.lastIndexOf(">",newpos) >= text.lastIndexOf("<",newpos)
				&& m1[0].indexOf("<") == -1)
		{
			todo.push(newpos);
			todolen.push(newlen);
		}
		startpos = newpos + 1;
		m1 = text.substr(startpos).match(httpRE);
	}
	var pos;
	var endpos;
	for (var i=todo.length-1; i>=0; i--)
	{
		pos = todo[i];
		endpos = pos + todolen[i];
		if (text[endpos-1] == ".") endpos--;
		html = html.substring(0,pos)+"<a " + loctext + " href='" + html.substring(pos,endpos) + "'>"+html.substring(pos,endpos)+"</a>"+html.substring(endpos);
	}
	return html;
}

function resetIframe(id)
{
	var iframe = document.getElementById(id);
	var doc = iframe.contentDocument;

// doesn't work, need to keep node with name='html' if it exists
//	while (doc.childNodes.length > 0) doc.removeChild(doc.childNodes[0]);

	var docHEAD = null;
	for (var i=0; i<doc.childNodes.length; i++)
		if (doc.childNodes[i].localName && doc.childNodes[i].localName.toLowerCase() == "html")
		{
			var docHTML = doc.childNodes[i];
			for (i=0; i<docHTML.childNodes.length; i++)
				if (docHTML.childNodes[i].localName && docHTML.childNodes[i].localName.toLowerCase() == "head")
				{
					docHEAD = docHTML.childNodes[i];
					while (docHEAD.childNodes.length > 0)
						docHEAD.removeChild(docHEAD.childNodes[0]);
				}
				else if (docHTML.childNodes[i].localName && docHTML.childNodes[i].localName.toLowerCase() == "body")
				{
					var docBODY = docHTML.childNodes[i];
					while (docBODY.childNodes.length > 0)
						docBODY.removeChild(docBODY.childNodes[0]);
				}
				else
					docHTML.removeChild(docHTML.childNodes[i]);
		}

	var meta = doc.createElement("meta");
	meta.setAttribute("http-equiv", "content-type");
	meta.setAttribute("content", "text/html");
	meta.setAttribute("charset", "utf-8");

	var sty = doc.createElement("style");
	sty.setAttribute("type","text/css");
	var keywordColorString = "";
	for (var i=0; i<gOptions.keywordColor.length; i++)
		keywordColorString += "\n.keyword" + i + "{ color: " + gOptions.keywordColor[i] + "; }";
	sty.innerHTML = gDefaultTextview + "\n\n" + keywordColorString + "\n\n" + getCss("textview.css");

	if (docHEAD)
	{
		docHEAD.appendChild(meta);
		docHEAD.appendChild(sty);
	}

}

////////////////////////////////////////////////////////////////
// Keyboard shortcuts
////////////////////////////////////////////////////////////////

function updateShortcuts(index)
{
	var keySet = document.getElementById("shortcut-keys");
	while (keySet.firstChild != null) keySet.removeChild(keySet.firstChild);

	for (var i=0; i<scKeyList.length; i++)
	{
		var idkey = scKeyList[i];
		idkey.setAttribute("modifiers", idkey.getAttribute("mod"+index));
		idkey.setAttribute("key", idkey.getAttribute("key"+index));
		if (index == 1 || index == 2 ||
					(index == 3 && idkey.getAttribute("key") != ""))
			keySet.appendChild(idkey);
	}

	var feedTree = document.getElementById("newsfox.feedTree");
	if (index != 0)
		feedTree.setAttribute("disableKeyNavigation", true);
	else
		feedTree.removeAttribute("disableKeyNavigation");

	makeAccel();
}

function makeAccel()
{
	var file = NFgetProfileDir();
	file.append("accel.xml");
	if (file.exists()) file.remove(false);

	var data = "";
	data += "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<body>\n\n";
	const NF_SB = document.getElementById("newsfox-string-bundle");
	var feedKeyNav = NF_SB.getString('feedKeyNav');
	feedKeyNav = toUTF8(encodeHTML(feedKeyNav));
	feedKeyNav = feedKeyNav.replace(/'/g,'\"');
	feedKeyNav = feedKeyNav.replace(/&quot;/g,'\"');
	data += "\t<info val='" + feedKeyNav + "' />\n";
	var feedTree = document.getElementById("newsfox.feedTree");
	var dKNvalue = "true";
	if (feedTree.getAttribute("disableKeyNavigation") != "true") dKNvalue = "false";
	data += "\t<feedtree disableKeyNavigation=\"" + dKNvalue + "\"/>\n\n";

	var keySet = document.getElementById("shortcut-keys");
	for (var i=keySet.firstChild; i != null; i=i.nextSibling)
	{
		data += "\t<key id=\"" + i.id + "\" modifiers=\"" + i.getAttribute("modifiers") + "\" key=\"" + i.getAttribute("key") + "\"/>\n";
	}
	data += "</body>\n";

	writeDataToFile(data, file, true, "makeAccel(): ")
}

function getAccel()
{
	var file = NFgetProfileDir();
	file.append("accel.xml");

	if (!file.exists())
		makeAccel();
	else
	{
		var xml = xmlLoad(file);

		var keyNav = xml.getElementsByTagName("feedtree");
		if (keyNav.length != 0)
		{
			var feedTree = document.getElementById("newsfox.feedTree");
			if (keyNav[0].getAttribute("disableKeyNavigation") != "false")
				feedTree.setAttribute("disableKeyNavigation", true);
			else
				feedTree.removeAttribute("disableKeyNavigation");
		}

		var kids = xml.getElementsByTagName("key");
		for (var i=0; i<kids.length; i++)
		{
			var idkey = document.getElementById(kids[i].getAttribute("id"));
			idkey.setAttribute("modifiers", kids[i].getAttribute("modifiers"));
			idkey.setAttribute("mod3", kids[i].getAttribute("modifiers"));
			idkey.setAttribute("key", kids[i].getAttribute("key"));
			idkey.setAttribute("key3", kids[i].getAttribute("key"));
		}
	}

	var keySet = document.getElementById("shortcut-keys");
	var idkey = keySet.firstChild;
	while (idkey != null)
	{
		scKeyList.push(idkey);
		var mods = idkey.getAttribute("modifiers");
		var keys = idkey.getAttribute("key");
		var tmp = idkey.nextSibling;
		if (mods=="" && keys=="") keySet.removeChild(idkey);
		idkey = tmp;
	}
}

////////////////////////////////////////////////////////////////
// Create new feed
////////////////////////////////////////////////////////////////

function createNewFeed(model, url, isExcluded, rmArtfile, isOPML)
{
	var feed;
	try
	{
		var uid  = model.makeUniqueUid(url); //makeUid(model, url);
		feed = new Feed();
		feed.uid = uid;
		feed.url = url;
		feed.defaultName = uid;
		feed.exclude = isExcluded;
		model.add(feed, isExcluded);
		if (rmArtfile) deleteFeedFromDisk(feed);
		if (isOPML)
			// feedtree.view is null
			gFdGroup[0].list.push(model.size()-1);
		else if (!isExcluded)
			{
				var feedtree = document.getElementById("newsfox.feedTree");
				if (gFdGroup[0].expanded == true) feedtree.view.toggleOpenState(0);
				var index = model.size();
				gFdGroup[0].list.push(index-1);
				feedtree.view.toggleOpenState(0);
			}
	}
	catch (err)
	{
		var msg = "createNewFeed(): [" + uid + "] " + err
		alert(msg);
	}
	return feed;
}

////////////////////////////////////////////////////////////////
// Load feeds from disk
////////////////////////////////////////////////////////////////

function loadIndices()
{
	try
	{
		var file = NFgetProfileDir();
		file.append(MASTER_INDEX+".xml");
		var xml = xmlLoad(file);

		// Get file version
		var root = xml.getElementsByTagName("newsfox-index")[0];
		var version = root.getAttribute("version");

		var fdgpidxstr = xml.getElementsByTagName("fdgpidx")[0].textContent;
		var tmp = fdgpidxstr.split(",");
		for (var i=0; i < tmp.length; i++)
			tmp[i] = parseInt(tmp[i]);
		gIdx.fdgp = tmp;

		var feedidxstr = xml.getElementsByTagName("feedidx")[0].textContent;
		tmp = feedidxstr.split(",");
		for (i=0; i < tmp.length; i++)
			tmp[i] = parseInt(tmp[i]);
		gIdx.feed = tmp;

		var catgidxstr = xml.getElementsByTagName("catgidx")[0].textContent;
		tmp = catgidxstr.split(",");
		for (i=0; i < tmp.length; i++)
		{
			tmp[i] = parseInt(tmp[i]);
			if (tmp[i] > 0)
			{
				var feed = gFmodel.get(gIdx.feed[i]);
				loadFeed(feed,true,false);
			}
		}
		gIdx.catg = tmp;

		var openidxstr = xml.getElementsByTagName("openidx")[0].textContent;
		tmp = openidxstr.split(",");
		for (i=0; i < tmp.length; i++)
			tmp[i] = (tmp[i] == 1);
		gIdx.open = tmp;


		gLoadFlags &= 0xFE;
	}
	catch (err) { gLoadFlags |= 0x01; }
}

function loadGroupModel()
{
	try
	{
		var file = NFgetProfileDir();
		file.append(MASTER_GROUP+".xml");
		var xml = xmlLoad(file);

		// Get file version
		var root = xml.getElementsByTagName("newsfox-grouplist")[0];
		var version = root.getAttribute("version");

		var tmp = new Array();
		var kids = xml.getElementsByTagName("group");
		for (var i=0; i<kids.length; i++)
		{
			var grp = new FeedGroup();
			gFdGroup[i] = new FeedGroup();
			gFdGroup[i].title = getVal(kids[i], "title", "str", grp.title);
			gFdGroup[i].expanded = getVal(kids[i], "expanded", "bool", grp.expanded);
			var v = child(kids[i], "list");
			if (v != null && v.childNodes.length > 0)
			{
				var tmpstr = v.textContent;
				var tmp = tmpstr.split(",");
				for (var j=0; j < tmp.length; j++)
					gFdGroup[i].list[j] = parseInt(tmp[j]);
			}
			gFdGroup[i].search = getVal(kids[i], "search", "bool", grp.search);
			if (gFdGroup[i].search)
			{
				gFdGroup[i].searchTag = getVal(kids[i], "searchTag", "str", grp.searchTag);
				if (!gFdGroup[i].searchTag)
				{
					gFdGroup[i].showUnread = getVal(kids[i], "showUnread", "bool", grp.showUnread);
					gFdGroup[i].srchdat.flagged = getVal(kids[i], "flagged", "int", grp.srchdat.flagged);
					gFdGroup[i].srchdat.unread = getVal(kids[i], "unread", "int", grp.srchdat.unread);
					gFdGroup[i].srchdat.text = getVal(kids[i], "text", "str", grp.srchdat.text);
					gFdGroup[i].srchdat.textflags = getVal(kids[i], "textflags", "int", grp.srchdat.textflags);
					gFdGroup[i].srchdat.startTime = getVal(kids[i], "startTime", "int", grp.srchdat.startTime);
					gFdGroup[i].srchdat.endTime = getVal(kids[i], "endTime", "int", grp.srchdat.endTime);
				}
			}

			// Version 1.1-2 search used 0-1-2 for body-title-both, 1.3 uses 1-2-3
			if (version == 1.1 || version == 1.2)
				if (gFdGroup[i].search) gFdGroup[i].srchdat.textflags += 1;

			// Version 1.1 encoded strings, version 1.2 uses UTF-8 encoding
			if (version == 1.1)
			{
				gFdGroup[i].title = entityDecode(gFdGroup[i].title);
				if (gFdGroup[i].search)
					gFdGroup[i].srchdat.text = entityDecode(gFdGroup[i].srchdat.text);
			}

		}
		gFdGroup.length = kids.length;

		gLoadFlags &= 0xFD;
	}
	catch (err) { gLoadFlags |= 0x02; }
}

function loadFeedModel()
{
	gFmodel = new FdModel();
	try
	{
		var file = NFgetProfileDir();
		file.append(MASTER+".xml");
		var xml = xmlLoad(file);

		// Get file version
		var root = xml.getElementsByTagName("newsfox-feedlist")[0];
		var version = root.getAttribute("version");

		var tag = xml.getElementsByTagName("tag");
		if (tag.length) gTag = tag[0].textContent;

		var iconfile, leafName;
		var kids = xml.getElementsByTagName("feed");
		for (var i=0; i<kids.length; i++)
		{
			var feed = new Feed();
			feed.exclude = (kids[i].getAttribute("exclude") == "true");
			var hasDeleteOld = false;
			var hasDontDeleteUnread = false;
			var hasDeleteOldStyle = false;
			for (var k=0; k<kids[i].childNodes.length; k++)
			{
				var elem = kids[i].childNodes[k];
				switch (elem.nodeName)
				{
					case "uid":
						feed.uid = getVal2(elem, "str", feed.uid);
						break;
					case "dname":
						feed.defaultName = getVal2(elem, "str", feed.uid);
						break;
					case "style":
						feed.style = getVal2(elem, "int", feed.style);
						break;
					case "artTreeCols":
						feed.artTreeCols = getVal2(elem, "str", feed.artTreeCols);
						break;
					case "private":
						feed.prvate = getVal2(elem, "bool", feed.prvate);
						break;
					case "flags":
						if (elem != null && elem.childNodes.length > 0)
						{
							var flags = elem.textContent;
							for (var j=0; j<flags.length; j++)
					 			feed.flags.push(parseInt(flags.charAt(j)));
						}
						break;
					case "storage":
						feed.storage = getVal2(elem, "bool", feed.storage);
						break;
					case "url":
						feed.url = getVal2(elem, "str", feed.url);
						break;
					case "home":
						feed.homepage = getVal2(elem, "str", feed.homepage);
						break;
					case "htmlRemove":
						feed.htmlRemove = getVal2(elem, "str", feed.htmlRemove);
						break;
					case "deleteOld":
						hasDeleteOld = true;
						feed.deleteOld = getVal2(elem, "bool", null);
						break;
					case "daysToKeep":
						feed.daysToKeep = getVal2(elem, "int", feed.daysToKeep);
						break;
					case "lastUpdate":
						var date = getVal2(elem, "str", null);
						if (date)
						{
							feed.lastUpdate = new Date();
 							feed.lastUpdate.setTime(Date.parse(date));
						}
						break;
					case "autoRefreshInterval":
						feed.autoRefreshInterval = getVal2(elem, "int", feed.autoRefreshInterval);
						if (feed.autoRefreshInterval != 0 &&
										feed.autoRefreshInterval != -1 &&
										feed.autoRefreshInterval < MINFEEDTIME)
							feed.autoRefreshInterval = MINFEEDTIME;
						break;
					case "autoCheck":
						feed.autoCheck = getVal2(elem, "bool", feed.autoCheck);
						break;
					case "customName":
						feed.customName = getVal2(elem, "str", feed.customName);
						break;
					case "dontDeleteUnread":
						hasDontDeleteUnread = true;
						feed.dontDeleteUnread = getVal2(elem, "bool", null);
						break;
					case "Xfilter":
						feed.Xfilter = getVal2(elem, "str", feed.Xfilter);
						break;
					case "XfilterType":
						feed.XfilterType = getVal2(elem, "int", feed.XfilterType);
						break;
					case "XfilterNew":
						feed.XfilterNew = getVal2(elem, "bool", feed.XfilterNew);
						break;
					case "XfilterMimeType":
						feed.XfilterMimeType = getVal2(elem, "str", feed.XfilterMimeType);
						break;
					case "XfilterImages":
						feed.XfilterImages = getVal2(elem, "bool", feed.XfilterImages);
						break;
					case "sortStr":
						feed.sortStr = getVal2(elem, "str", "g+");
						break;
					case "deleteOldStyle":
						hasDeleteOldStyle = true;
						feed.deleteOldStyle = getVal2(elem, "int", feed.deleteOldStyle);
						break;
					case "changedUnread":
						feed.changedUnread = getVal2(elem, "int", feed.changedUnread);
						break;
				}
			}
			if (!hasDeleteOldStyle && (hasDeleteOld || hasDontDeleteUnread))
			{
				feed.deleteOldStyle = 3 - 1*(feed.deleteOld == true) - 1*(feed.dontDeleteUnread == true && feed.deleteOld == true);
				if (feed.deleteOldStyle == gOptions.globalDeleteOldStyle &&
						(feed.daysToKeep == gOptions.daysKeep))
					feed.deleteOldStyle = 0;
			}

			if (!feed.storage)
			{
				iconfile = NFgetProfileDir();
				leafName = feed.uid + ".ico";
				iconfile.append(leafName);
				if (!gOptions.favicons  || !iconfile.exists() || !isImg(iconfile))
					feed.icon.src = ICON_OK;
				else
					feed.icon.src = getFileSpec(iconfile);
			}
			else  // storage
				feed.icon.src = ICON_STORAGE;

			// Version 1.1-4 used 0 as default for daysToKeep, now -1
			if (version <= 1.4)
				if (feed.daysToKeep == 0) feed.daysToKeep = -1;

			// Version 1.1-2 encoded strings, version 1.3 uses UTF-8 encoding
			if (version == 1.1 || version == 1.2)
			{
				feed.defaultName = entityDecode(feed.defaultName);
				feed.customName =	entityDecode(feed.customName);
			}

			// Version 1.0 tried to encode body text. Version 1.1
			// just uses CDATA, so decode not necessary
			if (version == 1.0)
			{
				feed.url = decodeHTML(feed.url);
				feed.defaultName = decodeHTML(feed.defaultName);
				feed.homepage = decodeHTML(feed.homepage);
			}

			gFmodel.add(feed);
		}

		gLoadFlags &= 0xFB;
	}
	catch (err) { gLoadFlags |= 0x04; }
}

function loadFeed(feed, force, fromBackup)
{
	const NF_SB = document.getElementById("newsfox-string-bundle");

		this.doneYet = function()
		{
			if (feed.loaded) return;
			setTimeout(this.doneYet,25);
		}

	if (feed.loaded || (feed.prvate && !force)) return;
	if (feed.loading)
	{
		setTimeout(this.doneYet,25);
		return;
	}
	feed.loading = true;

	try
	{
		var file = NFgetProfileDir();
		file.append(feed.uid + ".xml");
		checkFeedFile(file);

		var xml = "";
		if (feed.prvate)
		{
			var output = fileRead(file);
			var obj = Components.classes["@mozilla.org/io/string-input-stream;1"]
				.createInstance(Components.interfaces.nsIStringInputStream);
			try
				{ var decryptStr = gSdr.decryptString(output); }
			catch(e)
				{ throw(NF_SB.getString('badPassword')); }
			xml = new DOMParser().parseFromString(decryptStr, "text/xml");
		}
		else
			var xml = xmlLoad(file, feed);

		// Get file version
		var root = xml.getElementsByTagName("newsfox-feed")[0];
		var version = root.getAttribute("version");
		feed.removeAll();

		var un = xml.getElementsByTagName("username");
		if (un.length) feed.username = un[0].textContent;
		var pw = xml.getElementsByTagName("password");
		if (pw.length) feed.password = pw[0].textContent;

		var flags = feed.flags;
		feed.flags = new Array();
		var doDeletedSave = false;
		var kids = xml.getElementsByTagName("article");

		for (var i=0; i<kids.length; i++)
		{
			var id = child(kids[i], "id");
			// versions up until 1.2 used link as id
			if (id || version <= 1.2)
			{
				var art = new Article();
				art.link  = getVal(kids[i], "link", "str", art.link);
				art.title  = getVal(kids[i], "title", "str", art.title);
				art.body  = getVal(kids[i], "body", "str", art.body);
				art.category  = getVal(kids[i], "category", "str", art.category);
				art.tag  = getVal(kids[i], "tag", "str", art.tag);
				var date = getVal(kids[i], "date", "str", null);
				art.date  = new Date();
				if (date) art.date.setTime(Date.parse(date));
				art.id = (id) ? id.textContent : art.id;
				var enc = kids[i].getElementsByTagName("enclosure");
				for (var j=0; j<enc.length; j++)
					art.enclosures.push(newEncl(enc[j],"url"));
				art.source.url  = getVal(kids[i], "Surl", "str", art.source.url);
				art.source.name  = getVal(kids[i], "Sname", "str", art.source.name);
				art.author  = getVal(kids[i], "author", "str", art.author);
				art.prob  = parseFloat(getVal(kids[i], "prob", "str", art.prob));
				art.Xtend  = getVal(kids[i], "Xtend", "bool", art.Xtend);
				art.Xbody  = getVal(kids[i], "Xbody", "str", art.Xbody);

				// Version 1.1-2 encoded strings, version 1.3 uses UTF-8 encoding
				if (version == 1.1 || version == 1.2)
				{
					art.category = entityDecode(art.category);
					art.id = (art.id) ? art.id : art.link;
				}

				// Version 1.0 tried to encode body text. Version 1.1
				// just uses CDATA, so decode not necessary
				if (version == 1.0)
				{
					art.link  = decodeHTML(art.link);
					art.title = decodeHTML(art.title);
					art.body  = decodeHTML(art.body);
				}

				// Add feed
				if (fromBackup)
					feed.add(art,0);  // unread, unflagged
				else
					feed.add(art,flags[i]);
			}
		}
		if (kids.length != feed.flags.length) doDeletedSave = true;
		feed.sortCategories();

		// load deleted articles
		if (!feed.storage && !fromBackup)
		{
			var kids = xml.getElementsByTagName("deletedarticle");
			for (var i=0; i<kids.length; i++)
			{
				var art = new Article();
				art.link  = getVal(kids[i], "link", "str", art.link);
				var date = getVal(kids[i], "date", "str", null);
				art.date  = new Date();
				if (date) art.date.setTime(Date.parse(date));
				art.id = getVal(kids[i], "id", "str", art.link);

				feed.deletedAdd(art);
			}
		}

		// some articles deleted
		if (doDeletedSave) saveFeed(feed);
		if (feed.readError)
		{
			saveFeed(feed);
			feed.readError = false;
		}
		feed.loaded = true;
	}
	catch (err)
	{
		feed.loading = false;
		var loadOK = false;
		var bakExists = doReset(feed.uid);
		if (bakExists)
			loadOK = loadFeed(feed,force,true);
		if (!fromBackup)
		{
			var feedString = NF_SB.getString('feedFileCorrupt') + "  ";
			if (loadOK) feedString += NF_SB.getString('feedFileRecovered');
			else feedString += NF_SB.getString('feedFileRecoverFailed');
			alert(feed.uid + ".xml(" + feed.url + ") " + feedString);
		}
		return loadOK;
	}
	feed.loading = false;
	return true;
}

function loadFilterData()
{
	try
	{
		var file = NFgetProfileDir();
		file.append(MASTER_FILTER+".xml");
		if (file.exists())
		{
			var xml = xmlLoad(file);

			// Get file version
			var root = xml.getElementsByTagName("newsfox-filter")[0];
			var version = root.getAttribute("version");

			var sorter = function(a,b)
				{ return ((tmp0s[b] < tmp0s[a]) ? 1 : -1); }
			var tmp0 = getVal(root, "gWordArray", "str", null);
			if (tmp0)
			{
				var tmp0s = tmp0.split(" ");
				var tmp1 = getVal(root, "gGoodArray", "str", null);
				var tmp1s = tmp1.split(" ");
				var tmp2 = getVal(root, "gTotalArray", "str", null);
				var tmp2s = tmp2.split(" ");
				var dummy = new Array();
				for (var i=0; i<tmp0s.length; i++) dummy[i] = i;
				dummy.sort(sorter);
				gWordArray = new Array();
				gGoodArray = new Array();
				gTotalArray = new Array();
				for (i=0; i<tmp0s.length; i++)
				{
					gWordArray[i] = tmp0s[dummy[i]];
					gGoodArray[i] = parseInt(tmp1s[dummy[i]]);
					gTotalArray[i] = parseInt(tmp2s[dummy[i]]);
				}
			}
		}
		gLoadFlags &= 0xF8;
	}
	catch (err) { gLoadFlags |= 0x08; }
}

function getVal(root,name,type,dfault)
{
	var v = root.getElementsByTagName(name);
	if (v) v = v[0];
	return getVal2(v,type,dfault);
}

function getVal2(v,type,dfault)
{
	if (v == null || v.childNodes.length == 0) return dfault;
	switch (type)
	{
		case "str":
			v = v.textContent;
			break;
		case "int":
			v = parseInt(v.textContent);
			break;
		case "bool":
			v = (v.textContent == "true");
	}
	return v;
}

function checkFeedFile(file)
{
	try
	{
		if (!file.exists())
		{
			var ostream = openOutputStream(file);
			var data = "";
			data += "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
			data += "<newsfox-feed version=\"1.7\">\n";
			data += "</newsfox-feed>\n";
			ostream.write(data, data.length);
			ostream.close();
		}
	}
	catch (err) { alert(err); }
}

////////////////////////////////////////////////////////////////
// File Util
////////////////////////////////////////////////////////////////

function openOutputStream(file)
{
	var out = Components.classes["@mozilla.org/network/file-output-stream;1"]
		.createInstance(Components.interfaces.nsIFileOutputStream);
	out.init(file,-1,-1,0);
	return out;
}

function setInputStream(data)
{
	var istream = Components.classes["@mozilla.org/io/string-input-stream;1"]
		.createInstance(Components.interfaces.nsIStringInputStream);
	istream.setData(data, data.length);
	return istream;
}

function writeDataToFile(data, file, synchro, errorMessage)
{
	try
	{
		var ostream = openOutputStream(file);
		if (hasNetUtil && !synchro)
		{
			var istream = setInputStream(data);
			// Pale Moon 33.6 compatible NetUtil usage
			NetUtil.asyncCopy(istream, ostream, function(err)
			{
				if (!Components.isSuccessCode(err))
				{
					console.error(errorMessage + err);
				}
			});
		}
		else
		{
			ostream.write(data, data.length);
			ostream.close();
		}
	}
	catch(err)
	{
		console.error(errorMessage + err);
	}
}

function moveToBackup(leafName)
{
// started getting NS_ERROR_FILE_IS_LOCKED: Component returned failure code: 0x8052000e (NS_ERROR_FILE_IS_LOCKED) [nsIFile.moveTo]
// in FF 32a1 (not in 30b8)
	try
	{
	 var file = NFgetProfileDir();
	 file.append(leafName+".xml");
	 if (file.exists()) file.moveTo(NFgetProfileDir(),leafName+".bak");
	 return(file);
	}
	catch(e)
	{
		var file = NFgetProfileDir();
		file.append(leafName+".bak");
		return(file);
	}
}

function rmBackupFile(backupFile)
{
	var backupFilePath = backupFile.path;
	try
	{
		if (hasOSFile)
			var promise = OS.File.remove(backupFilePath);
		else
			backupFile.remove(false);
	}
	catch(e) { if (backupFile.exists()) backupFile.remove(false); }
}

function fileRead(file)
{
	var inputStream = Components.classes["@mozilla.org/network/file-input-stream;1"]
		.createInstance(Components.interfaces.nsIFileInputStream);
	inputStream.init(file, -1, -1, null);
	var scInputStream = Components.classes["@mozilla.org/scriptableinputstream;1"]
		.createInstance(Components.interfaces.nsIScriptableInputStream);
	scInputStream.init(inputStream);
	var output = scInputStream.read(-1);
	scInputStream.close();
	inputStream.close();

	// Handle UTF-8 conversion
	var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
		.createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
	converter.charset = "UTF-8";
	return converter.ConvertToUnicode(output);
}

function xmlLoad(file, feed)
{
	var inputStream = Components.classes["@mozilla.org/network/file-input-stream;1"]
		.createInstance(Components.interfaces.nsIFileInputStream);
	try
	{
		inputStream.init(file, -1, -1, null);
		var tmp = (new DOMParser()).parseFromStream(inputStream, "utf-8", inputStream.available(), "text/xml");
		inputStream.close();

	// Firefox started sometimes writing garbage at the end of feed files beginning around FF30
		var root = tmp.documentElement.localName.toLowerCase();
		if (root == "parsererror" && feed != null)
		{
			var tmp1 = fileRead(file);
			var tmp2 = tmp1.lastIndexOf("</newsfox-feed>");
			if (tmp2 != -1)
			{
				var tmp3 = tmp1.substr(0,tmp2+15) + "\n";
				tmp = (new DOMParser()).parseFromString(tmp3, "text/xml");
				feed.readError = true;
			}
		}
		return tmp;
	}
	catch(e)
	{
		if(inputStream) inputStream.close();
		throw e;
	}
}

////////////////////////////////////////////////////////////////
// Save feeds to disk
////////////////////////////////////////////////////////////////

function saveIndices()
//  Versions   FirstNF    new_features
//      1.0       0.7      master indexes
//              0.8.1      switched to UTF-8 encoding, no actual change
{
	var leafName = MASTER_INDEX;
	moveToBackup(leafName);
	var file = NFgetProfileDir();
	file.append(leafName+".xml");

	var data = "";
	data += "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
	data += "<newsfox-index version=\"1.0\">\n";
	var fdgpidxstr = gIdx.fdgp.join();
	data += "  <fdgpidx>" + fdgpidxstr + "</fdgpidx>\n";
	var feedidxstr = gIdx.feed.join();
	data += "  <feedidx>" + feedidxstr + "</feedidx>\n";
	var catgidxstr = gIdx.catg.join();
	data += "  <catgidx>" + catgidxstr + "</catgidx>\n";
	var tmp = new Array();
	for (var i=0; i<gIdx.open.length; i++)
		tmp[i] = 1*(gIdx.open[i] == true);
	var openidxstr = tmp.join();
	data += "  <openidx>" + openidxstr + "</openidx>\n";
	data += "</newsfox-index>\n";

	writeDataToFile(data, file, true, "saveIndices(): ")
}

function saveGroupModel()
//  Versions   FirstNF    new_features
//      1.0       0.7      master group file
//      1.1       0.8      search groups
//      1.2     0.8.1      switched to UTF-8 encoding
//      1.3     0.8.3      searchTag, showUnread
{
	var leafName = MASTER_GROUP;
	moveToBackup(leafName);
	var file = NFgetProfileDir();
	file.append(leafName+".xml");

	var data = "";
	data += "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
	data += "<newsfox-grouplist version=\"1.3\">\n";
	for (var i=0; i<gFdGroup.length; i++)
	{
		var grpstr = gFdGroup[i].list.join();
		data += " <group>\n";
		data += "  <title><![CDATA[" + toUTF8(gFdGroup[i].title) + "]]></title>\n";
		data += "  <expanded>" + gFdGroup[i].expanded + "</expanded>\n";
		data += "  <search>" + gFdGroup[i].search + "</search>\n";
		if (gFdGroup[i].search)
		{
			if (gFdGroup[i].searchTag)
			{
				data += "  <searchTag>" + gFdGroup[i].searchTag + "</searchTag>\n";
				data += "  <text><![CDATA[" + toUTF8(gFdGroup[i].srchdat.text) + "]]></text>\n";
			}
			else
			{
				data += "  <showUnread>" + gFdGroup[i].showUnread + "</showUnread>\n";
				data += "  <flagged>" + gFdGroup[i].srchdat.flagged + "</flagged>\n";
				data += "  <unread>" + gFdGroup[i].srchdat.unread + "</unread>\n";
				data += "  <text><![CDATA[" + toUTF8(gFdGroup[i].srchdat.text) + "]]></text>\n";
				data += "  <textflags>" + gFdGroup[i].srchdat.textflags + "</textflags>\n";
				data += "  <startTime>" + gFdGroup[i].srchdat.startTime + "</startTime>\n";
				data += "  <endTime>" + gFdGroup[i].srchdat.endTime + "</endTime>\n";
			}
		}
		data += "  <list>" + grpstr + "</list>\n";
		data += " </group>\n";
	}
	data += "</newsfox-grouplist>\n";

	writeDataToFile(data, file, true, "saveGroupModel(): ")
}

function saveFeedModel()
//  Versions   FirstNF    new_features
//      1.0       0.2      feed_model, xml encoded
//                0.3      added homepage, style
//      1.1     0.3.4      uses CDATA
//                0.4      deleteOld
//                0.5      exclude, autoCheck, expanded
//              0.6.3      icon
//      1.2       0.7      remove expanded
//      1.3     0.8.1      switched to UTF-8 encoding, daysToKeep
//      1.4     0.8.3      tag, storage, prvate, lastUpdate, autoRefreshInterval
//      1.5     0.8.4      daysToKeep default changed to -1
//      1.6     1.0.2      Xfilter, XfilterNew, XfilterImages
//      1.7     1.0.3      XfilterMimeType, XfilterType, sortStr
//      1.8     1.0.4      deleteOldStyle(remove deleteOld, dontDeleteUnread), changedUnread
//      1.9     1.0.9      artTreeCols
//     1.10   1.0.9.2      htmlRemove
{
	var leafName = MASTER;
	moveToBackup(leafName);
	var file = NFgetProfileDir();
	file.append(leafName+".xml");

	var data = "";
	data += "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
	data += "<newsfox-feedlist version=\"1.10\">\n";
	data += " <tag><![CDATA[" + toUTF8(gTag) + "]]></tag>\n";
	for (var i=0; i<gFmodel.sizeTotal(); i++)
	{
		var feed = gFmodel.get(i);
		data += " <feed exclude=\"" + feed.exclude + "\">\n";
		data += "  <uid>" + toUTF8(feed.uid) + "</uid>\n";
		data += "  <url><![CDATA[" + toUTF8(feed.url) + "]]></url>\n";
		data += "  <dname><![CDATA[" + toUTF8(feed.defaultName) + "]]></dname>\n";
// Only save if property overrides global setting
		if (feed.style != 0)
			data += "  <style>" + feed.style + "</style>\n";
		data += "  <artTreeCols><![CDATA[" + toUTF8(feed.artTreeCols) + "]]></artTreeCols>\n";
		data += "  <storage>" + feed.storage + "</storage>\n";
		if (!feed.storage)
		{
			if (feed.homepage != null)
				data += "  <home><![CDATA[" + toUTF8(feed.homepage) + "]]></home>\n";
			data += "  <htmlRemove>" + feed.htmlRemove + "</htmlRemove>\n";
			data += "  <deleteOldStyle>" + feed.deleteOldStyle + "</deleteOldStyle>\n";
			data += "  <daysToKeep>" + feed.daysToKeep + "</daysToKeep>\n";
			data += "  <changedUnread>" + feed.changedUnread + "</changedUnread>\n";
			if (feed.lastUpdate)
				data += "  <lastUpdate>" + feed.lastUpdate.toUTCString() + "</lastUpdate>\n";
			data += "  <autoRefreshInterval>" + feed.autoRefreshInterval + "</autoRefreshInterval>\n";
			data += "  <autoCheck>" + feed.autoCheck + "</autoCheck>\n";
			if( null != feed.customName )
				data += "  <customName><![CDATA[" + toUTF8(feed.customName) + "]]></customName>\n";
			if (feed.Xfilter)
				data += "  <Xfilter><![CDATA[" + toUTF8(feed.Xfilter) + "]]></Xfilter>\n";
			data += "  <XfilterType>" + feed.XfilterType + "</XfilterType>\n";
			data += "  <XfilterNew>" + feed.XfilterNew + "</XfilterNew>\n";
			if (feed.XfilterMimeType)
				data += "  <XfilterMimeType><![CDATA[" + toUTF8(feed.XfilterMimeType) + "]]></XfilterMimeType>\n";
			data += "  <XfilterImages>" + feed.XfilterImages + "</XfilterImages>\n";
		}
		data += "  <private>" + feed.prvate + "</private>\n";
		if (feed.sortStr != "g+")
			data += "  <sortStr>" + feed.sortStr + "</sortStr>\n";
		data += "  <flags>";
		var fdflag;
		for (var j=0; j<feed.flags.length; j++)
		{
			fdflag = 1*((feed.flags[j] & 0x01)!=0) + 4*((feed.flags[j] & 0x04)!=0);
//RPdebug				if (fdflag != feed.flags[j]) alert(feed.getDisplayName() + "  j= " + j + "  feed.flags[j]= " + feed.flags[j]);
			data += "" + fdflag;
		}
		data += "</flags>\n";
		data += " </feed>\n";
	}
	data += "</newsfox-feedlist>\n";

	writeDataToFile(data, file, true, "saveFeedModel(): ")
}

function saveFeed(feed)
//  Versions   FirstNF    new_features
//      1.0       0.1      also included feed_model information
//                0.2      removed feed_model, version # same, xml encoded
//      1.1     0.3.4      uses CDATA
//                0.4      category
//      1.2   0.7.5.1      deleted articles
//      1.3     0.8.1      switched to UTF-8 encoding, id, enclosures
//      1.4     0.8.2      Surl, Sname
//      1.5     0.8.3      username, password, tag
//			1.6     0.8.4      author, prob
//      1.7     1.0.2      Xtend, Xbody
{
	var leafName = feed.uid;
	var backupFile = moveToBackup(leafName);
	var file = NFgetProfileDir();
	file.append(leafName+".xml");

	var data = "";
	data += "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
	data += "<newsfox-feed version=\"1.7\">\n";
	if (feed.username  || feed.password)
	{
		data += " <username>" + encodeHTML(feed.username) + "</username>\n";
		data += " <password>" + encodeHTML(feed.password) + "</password>\n";
	}
	for (var i=0; i<feed.size(); i++)
	{
		var art = feed.get(i);
		data += " <article>\n";
		if (art.link) data += "  <link><![CDATA[" + toUTF8(art.link) + "]]></link>\n";
		data += "  <title><![CDATA[" + toUTF8(art.title) + "]]></title>\n";
		data += "  <date>" + toUTF8(art.date.toUTCString()) + "</date>\n";
		data += "  <body><![CDATA[" + toUTF8(art.body) + "]]></body>\n";
// AG: added category
		data += "  <category><![CDATA[" + toUTF8(art.category) + "]]></category>\n";
		data += "  <tag><![CDATA[" + toUTF8(art.tag) + "]]></tag>\n";
		if (art.id) data += "  <id><![CDATA[" + toUTF8(art.id) + "]]></id>\n";
		for (var j=0; j<art.enclosures.length; j++)
		{
			var enc = art.enclosures[j];
			data += '  <enclosure url="' + toUTF8(encodeHTML(enc.url)) + '" type="' + toUTF8(encodeHTML(enc.type)) + '" length="' + toUTF8(encodeHTML(enc.length)) + '"/>\n';
		}
		if (art.source.url)
		{
			data += "  <Surl><![CDATA[" + toUTF8(art.source.url) + "]]></Surl>\n";
			data += "  <Sname><![CDATA[" + toUTF8(art.source.name) + "]]></Sname>\n";
		}
		if (art.author != "")
			data += "  <author><![CDATA[" + toUTF8(art.author) + "]]></author>\n";
		data += "  <prob><![CDATA[" + art.prob + "]]></prob>\n";
		if (art.Xbody != "")
		{
			if (art.Xtend) data += "  <Xtend>true</Xtend>\n";
			data += "  <Xbody><![CDATA[" + toUTF8(art.Xbody) + "]]></Xbody>\n";
		}
		data += " </article>\n";
	}
	if (!feed.storage)
	{
		for (var i=0; i<feed.deletedsize(); i++)
		{
			var art = feed.deletedget(i);
			data += " <deletedarticle>\n";
			data += "  <link><![CDATA[" + toUTF8(art.link) + "]]></link>\n";
			data += "  <date>" + toUTF8(art.date) + "</date>\n";
			data += "  <id><![CDATA[" + toUTF8(art.id) + "]]></id>\n";
			data += " </deletedarticle>\n";
		}
	}
	data += "</newsfox-feed>\n";

	if (feed.prvate)
		data = gSdr.encryptString(data);

	var errMsg = "saveFeed(): [" + feed.uid + "] ";
	writeDataToFile(data, file, false, errMsg)

//catch(e) { doReset(feed.uid); }

	if (!gOptions.backupFeedFiles) rmBackupFile(backupFile);
}

function saveFilterData()
//  Versions   FirstNF    new_features
//      1.0     0.8.4      spam filter information
{
	if (!gOptions.spam) return;
	var leafName = MASTER_FILTER;
	moveToBackup(leafName);
	var file = NFgetProfileDir();
	file.append(leafName+".xml");

	var data = "";
	data += "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
	data += "<newsfox-filter version=\"1.0\">\n";
	data += "<gWordArray><![CDATA[" + toUTF8(gWordArray.join(" ")) + "]]></gWordArray>\n";
	data += "<gGoodArray><![CDATA[" + toUTF8(gGoodArray.join(" ")) + "]]></gGoodArray>\n";
	data += "<gTotalArray><![CDATA[" + toUTF8(gTotalArray.join(" ")) + "]]></gTotalArray>\n";
	data += "</newsfox-filter>\n";

	writeDataToFile(data, file, false, "saveFilter(): ")
}

////////////////////////////////////////////////////////////////
// Delete feed
////////////////////////////////////////////////////////////////

function deleteFeedFromDisk(feed)
{
	try
	{
		var file = NFgetProfileDir();
		file.append(feed.uid + ".xml");
		if (file.exists()) file.remove(false);
		var file = NFgetProfileDir();
		file.append(feed.uid + ".ico");
		if (file.exists()) file.remove(false);
	}
	catch (err) {} // TODO sometimes icon file locked, file now checked on creation as well - alert("deleteFeedFromDisk(): [" + feed.uid + "] " + err); }
}

////////////////////////////////////////////////////////////////
// Util
////////////////////////////////////////////////////////////////

function child(element, tagName)
{
	var kids = element.childNodes;
	for (var i=0; i<kids.length; i++)
		if (kids[i].nodeName == tagName)
			return kids[i];
	return null;
}

////////////////////////////////////////////////////////////////
// Encode/Decode
////////////////////////////////////////////////////////////////

/**
 * Return XML-friendly HTML encoding.
 */
function encodeHTML(s)
{
	if (!s) return "";
	s = s.replace(new RegExp('&','gi'), '&amp;');
	s = s.replace(new RegExp('<','gi'), '&lt;');
	s = s.replace(new RegExp('>','gi'), '&gt;');
	s = s.replace(new RegExp('"','gi'), '&quot;');
	return s;
}

/**
 * Return original HTML from encoding.
 */
function decodeHTML(s)
{
	s = s.replace(new RegExp('&lt;'   ,'gi'), '<');
	s = s.replace(new RegExp('&gt;'   ,'gi'), '>');
	s = s.replace(new RegExp('&quot;' ,'gi'), '"');
	s = s.replace(new RegExp('&acute;','gi'), '´');
	s = s.replace(new RegExp('&amp;'  ,'gi'), '&'); //always decode the ampersand last
	return s;
}

function toUTF8(inVal)
{
	// CDATA(from html) tag inside CDATA(from NewsFox) tag is a problem
	try
	{
		inVal = inVal.replace(/<!\[CDATA\[((.|\n)*?)]]>/g,"$1");
		inVal = inVal.replace(/]]>/g,"]]&gt;");
	}
	catch(e) {}
	try
	{
		var uC = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
			.createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
		uC.charset = "UTF-8";
		return uC.ConvertFromUnicode(inVal)+ uC.Finish();
	}
	catch(e) { return inVal; }
}

// from Sage project
function entityDecode(aStr)
{
	var formatConverter = Components.classes["@mozilla.org/widget/htmlformatconverter;1"].createInstance(Components.interfaces.nsIFormatConverter);
	var fromStr = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
	fromStr.data = aStr;
	var toStr = {value: null};

	try
	{
		formatConverter.convert("text/html", fromStr, fromStr.toString().length, "text/unicode", toStr, {});
	}
	catch(e)
	{
	return aStr;
	}
	if (toStr.value)
	{
		toStr = toStr.value.QueryInterface(Components.interfaces.nsISupportsString);
		return toStr.toString();
	}
	return aStr;
}

////////////////////////////////////////////////////////////////
// Extended Descriptions (Filtered Web Pages)
////////////////////////////////////////////////////////////////

// Queue to hold xbody requests
let xbodyQueue = [];
let isProcessingQueue = false;
// Map to track hosts being processed
let hostsInProcess = new Map();

// Function to handle the xbody queue and call getXbody
function getXbodyQueue(art, feed)
{
	// Add the request to the queue
	xbodyQueue.push({ art, feed });

	// If not already processing, start processing the queue
	if (!isProcessingQueue)
	{
		isProcessingQueue = true; // Set flag to indicate processing
		getXbody(); // Start processing the queue
	}
}

/**
* Fetches and processes extended content for an article.
* @param {Article} art - The article object to be extended with additional content.
* @param {Feed} feed - The feed object containing filter configuration settings.
* This function handles three main scenarios:
* 1. Web filter case (XfilterType=3): Sets minimal "w" marker for web view rendering
* 2. Image processing only: Processes images in article without fetching new content
Side effects:
- Sets art.Xtend to true
- May set art.Xbody with processed content
- May update UI via artTreeInvalidate()
- May trigger articleSelected() if current article
Error handling is delegated to processError() function for request failures.
*/
function getXbody()
{
	if (xbodyQueue.length === 0)
	{
		isProcessingQueue = false; // No more requests to process
		hostsInProcess.clear(); // Clear the hosts tracking
		return;
	}

	// Find the next request that doesn't have its host already being processed
	let nextItemIndex = -1;
	for (let i = 0; i < xbodyQueue.length; i++)
	{
		const item = xbodyQueue[i];
		const art = item.art;
		let host = "";

		// Try to extract the host from the article link
		try
		{
			// Parse the URL to extract host
			let url = new URL(art.link);
			host = url.hostname;
			// console.debug("getXbody: host is: ", host);
		}
		catch(e)
		{
			console.error("Error extracting host from URL: " + art.link, e.message);
			host = art.link; // Use the full URL as fallback
		}

		// If this host is not currently being processed, select this item
		if (!hostsInProcess.has(host))
		{
			nextItemIndex = i;
			hostsInProcess.set(host, true);
			break;
		}
	}

	// If no suitable item was found, wait for currently processing hosts to complete
	if (nextItemIndex === -1)
	{
		// We'll return and wait for the next call when a host completes
		return;
	}

	// Process the selected item
	const { art, feed } = xbodyQueue.splice(nextItemIndex, 1)[0];
	art.Xtend = true;

	// Store the host for cleanup when processing completes
	let currentHost = "";
	try
	{
		let url = new URL(art.link);
		currentHost = url.hostname;
	}
	catch(e)
	{
		console.error("Error extracting host in processing:", e.message);
		currentHost = art.link;
	}

	// Special case handling without fetching
	if (feed.XfilterType == 3 || (gOptions.defaultXfilterIsWeb && feed.XfilterType == -1))
	{
		art.Xbody = "w";
		var arttree = artTreeInvalidate();
		var index = arttree.currentIndex;
		if (index > -1 && gCollect.get(index).id == art.id)
		{
			articleSelected();
		}

		hostsInProcess.delete(currentHost); // Remove host from tracking and continue with queue
		setTimeout(getXbody, gOptions.getXbodyDelay); // Continue processing queue after configurable delay
		return Promise.resolve(); // Resolve immediately
	}

	// Image processing only case
	if (feed.XfilterImages && !feed.Xfilter)
	{
		postProcessImages(art.body, art, feed);
		artTreeInvalidate(); // Update the UI to reflect that images have been processed

		hostsInProcess.delete(currentHost); // Remove host from tracking and continue with queue
		setTimeout(getXbody, gOptions.getXbodyDelay); // Continue processing queue after configurable delay
		return Promise.resolve(); // Resolve after processing images
	}
	else
	{
		// Full content fetching case
		return new Promise((resolve, reject) =>
		{
			try
			{
				var xmlhttp = new XMLHttpRequest();
				xmlhttp.open("GET", art.link, true);

				// Handle MIME type settings
				if (art.XfilterMimeType)
				{
					xmlhttp.overrideMimeType("text/html; charset=" + art.XfilterMimeType);
				}
				else if (feed.XfilterMimeType &&
						 feed.XfilterMimeType != AUTO_MIMETYPE &&
						 feed.XfilterMimeType != TEST_MIMETYPE)
				{
					xmlhttp.overrideMimeType("text/html; charset=" + feed.XfilterMimeType);
				}
				else
				{
					xmlhttp.overrideMimeType("text/html");
				}

				// Store a reference to the host for cleanup in callbacks
				const hostRef = currentHost;

				// Set a timeout for the request
				const timeoutId = setTimeout(() => {
					xmlhttp.abort(); // Abort the request
					console.error(`Request timed out for host: ${hostRef}`);
					hostsInProcess.delete(hostRef); // Remove host from tracking
					setTimeout(getXbody, gOptions.getXbodyDelay); // Continue processing queue after delay
					reject(new Error("Request timed out for host: " + hostRef)); // Reject the promise
				}, gOptions.renewTimeout); // Use the configured timeout value

				xmlhttp.onload = function()
				{
					clearTimeout(timeoutId); // Clear the timeout on successful load
					checkContentType(art, xmlhttp, feed);
					artTreeInvalidate(); // Update the UI to reflect the successful content fetch
					hostsInProcess.delete(hostRef); // Remove host from tracking and continue with queue
					setTimeout(getXbody, gOptions.getXbodyDelay); // Use the configurable delay
					resolve(); // Resolve the promise
				};

				xmlhttp.onerror = function()
				{
					clearTimeout(timeoutId); // Clear the timeout on error
					processError(art, xmlhttp, feed);
					hostsInProcess.delete(hostRef); // Remove host from tracking and continue with queue
					setTimeout(getXbody, gOptions.getXbodyDelay); // Use the configurable delay
					reject(new Error("Request failed for host: " + hostRef)); // Reject the promise
				};

				xmlhttp.send(null);
			}
			catch(e)
			{
				console.error("Error in getXbody:", e.message);
				processError(art, xmlhttp, feed);
				hostsInProcess.delete(currentHost); // Remove host from tracking and continue with queue
				setTimeout(getXbody, gOptions.getXbodyDelay); // Use the configurable delay
				reject(new Error("Error in getXbody: " + e.message)); // Reject the promise
			}
		});
	}
}

function processError(art, xmlhttp, feed)
{
	xmlhttp.abort();
	const NF_SB = document.getElementById("newsfox-string-bundle");
	var statusError = NF_SB.getString('remedy_server_error');
	// Instead of throwing an error, just log it and mark the article
	console.error(statusError + ": " + xmlhttp.status);
	art.Xtend = false; // Mark as not extended
	art.XtendError = true; // Indicate an error occurred
	artTreeInvalidate(); // Update the UI
	// No need to throw an error, just return
}

function doError(art, msg)
{
	art.Xtend = false;
	art.XtendError = true;
	artTreeInvalidate();
	throw msg;
}

function fixContentType(art,xmlhttp,feed)
{
	try
	{
		var serverCT = xmlhttp.getResponseHeader("Content-Type").toLowerCase();
		serverCT = serverCT.replace(/\s*/g,"");
		var serverCharset = serverCT.replace(/text\/html/,"")
																.replace(/;charset=/,"");
		serverCT = serverCT.replace(/;charset\=iso-8859-1/,"")
											.replace(/;charset\=utf-8/,"");
		var htmlCharset;
		var htmlCT = xmlhttp.responseText.toLowerCase();
		htmlCT = htmlCT.match(/<meta\s*http-equiv=['"]*content-type['"]*.*?>/);
		if (htmlCT)
		{
			htmlCT = htmlCT[0];
			htmlCT = htmlCT.match(/content=(['"])(.*?)\1/)[2];
			htmlCT = htmlCT.replace(/\s*/g,"");
			htmlCharset = htmlCT.replace(/text\/html/,"").replace(/;charset=/,"");
			htmlCT = htmlCT.replace(/;charset\=iso-8859-1/,"")
										.replace(/;charset\=utf-8/,"");
		}
		else
		{
			htmlCT = "";
			htmlCharset = "";
		}
		if ((serverCT != htmlCT  && htmlCharset != "")
						|| feed.XfilterMimeType == TEST_MIMETYPE)
		{
			var type;
			if (feed.XfilterMimeType == AUTO_MIMETYPE)
				type = -1;    // do article
			else
			{
				const NF_SB = document.getElementById("newsfox-string-bundle");
				var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
				var check = {value: false};
				if (htmlCharset != "")
					var flags = prompts.BUTTON_POS_0 * prompts.BUTTON_TITLE_IS_STRING +
							prompts.BUTTON_POS_1 * prompts.BUTTON_TITLE_IS_STRING  +
							prompts.BUTTON_POS_2 * prompts.BUTTON_TITLE_IS_STRING;
				else
					var flags = prompts.BUTTON_POS_0 * 0 +
							prompts.BUTTON_POS_1 * 0  +
							prompts.BUTTON_POS_2 * prompts.BUTTON_TITLE_IS_STRING;
				var apparentCharset = NF_SB.getString('charset.apparent');
				var pageCharset = NF_SB.getString('charset.page');
				var tryToFix = NF_SB.getString('charset.tryToFix');
				var csFeed = NF_SB.getString('charset.feed');
				var csArticle = NF_SB.getString('charset.article');
				var csNothing = NF_SB.getString('charset.nothing');
				type = prompts.confirmEx(null, "", apparentCharset + ": " + htmlCharset + "\n" + pageCharset + ": " + serverCharset + "\n\n" + tryToFix, flags, csFeed, csArticle, csNothing, null, check);
			}
			if (htmlCharset == "") type = 2;
			switch (type)
			{
				case 0:
					feed.XfilterMimeType = htmlCharset;
					return true;
				case 1:
					feed.XfilterMimeType = AUTO_MIMETYPE;
				case -1:
					art.XfilterMimeType = htmlCharset;
					return true;
				case 2:
					return false;
			}
		}
	}
	catch(e){}
	return false;
}

function checkContentType(art, xmlhttp, feed)
{
	if (xmlhttp.status != 200) processError(art, xmlhttp, feed);
	var mimeType = feed.XfilterMimeType;
	var changed = false;
	if (!art.XfilterMimeType && ((mimeType == AUTO_MIMETYPE) || (mimeType == TEST_MIMETYPE)))
		changed = fixContentType(art, xmlhttp, feed);
	if (changed)
	{
		// Extract host for tracking in getXbodyQueue
		let host = "";
		try
		{
			if (typeof Components !== 'undefined' && Components.classes)
			{
				let ios = Components.classes["@mozilla.org/network/io-service;1"]
							.getService(Components.interfaces.nsIIOService);
				let uri = ios.newURI(art.link, null, null);
				host = uri.host;
				// Remove this host from tracking before recalling getXbodyQueue
				if (hostsInProcess && typeof hostsInProcess.delete === 'function')
				{
					hostsInProcess.delete(host);
				}
			}
		}
		catch(e)
		{
			console.error("Error extracting host in checkContentType:", e.message);
		}

		getXbodyQueue(art, feed);
	}
	else
		processXbody(art, xmlhttp, feed);
}

function processXbody(art, xmlhttp, feed)
{
	const NF_SB = document.getElementById("newsfox-string-bundle");
	var linkHTML = xmlhttp.responseText;

	// Clean and normalize HTML content
	linkHTML = linkHTML.replace(/[\n|\r|\t]/g, " ");
	linkHTML = linkHTML.replace(/[\x00-\x1F]/g, "");

	// Resolve baseUri early
	var baseUri = getBaseDomain(art.link);

	// Pre-process relative URLs in HTML before creating DOM
	try
	{
		if (baseUri)
		{
			// console.debug("processXbody before baseUri: ", linkHTML, baseUri);
			linkHTML = fixRelativeLinks(linkHTML, baseUri);
			// console.debug("processXbody after baseUri: ", linkHTML, baseUri);
		}
	}
	catch (e)
	{
		console.error("processXbody: Error in pre-DOM URL resolution:", e.message);
	}

	// Filter out elements from linkHTML using regex
	linkHTML = filterArticle(linkHTML)

	var linkDOM = getDomFromHtml(linkHTML);
	var artText;
	if (!linkDOM)
	{
		console.error("processXbody: Failed to create DOM from linkHTML.");
		return doError(art, new Error("Invalid HTML content"));
	}

	/*
	// Function to verify if the expected elements are removed
	function verifyChanges(linkDOM) {
		var removedStylesheets = [];
		var removedFonts = [];

		// Check for remaining link elements
		var linkElements = linkDOM.getElementsByTagName("link");
		for (var i = 0; i < linkElements.length; i++) {
			var rel = linkElements[i].getAttribute("rel");
			var href = linkElements[i].getAttribute("href");

			if (rel && (rel.toLowerCase() === "stylesheet" || rel.toLowerCase() === "preload")) {
				removedStylesheets.push(href);
			} else if (href) {
				var lowerHref = href.toLowerCase();
				if (lowerHref.includes("fonts.googleapis.com") ||
					lowerHref.endsWith(".css") ||
					lowerHref.endsWith(".woff") ||
					lowerHref.endsWith(".woff2") ||
					lowerHref.endsWith(".ttf") ||
					lowerHref.endsWith(".eot") ||
					lowerHref.endsWith(".otf")) {
					removedFonts.push(href);
				}
			}
		}

		// Log the results
		console.debug("Remaining Stylesheets: ", removedStylesheets);
		console.debug("Remaining Font Resources: ", removedFonts);
	}

	// Call the verification function
	// verifyChanges(linkDOM);
	*/

	/*
	// Filter out CSS and font files - remove them from DOM before processing
	if (linkDOM.getElementsByTagName)
	{
		try
		{
			// Remove CSS link elements
			var linkElements = linkDOM.getElementsByTagName("link");
			for (var i = linkElements.length - 1; i >= 0; i--)
			{
				var linkElement = linkElements[i];
				var rel = linkElement.getAttribute("rel");
				var href = linkElement.getAttribute("href");

				if (rel && (rel.toLowerCase() === "stylesheet" || rel.toLowerCase() === "preload"))
				{
					linkElement.parentNode.removeChild(linkElement);
					console.debug("Removed stylesheet link: " + linkElement.href);
				}
				else if (href)
				{
					var lowerHref = href.toLowerCase();
					if (lowerHref.includes("fonts.googleapis.com") ||
						lowerHref.endsWith(".css") ||
						lowerHref.endsWith(".woff") ||
						lowerHref.endsWith(".woff2") ||
						lowerHref.endsWith(".ttf") ||
						lowerHref.endsWith(".eot") ||
						lowerHref.endsWith(".otf"))
					{
						linkElement.parentNode.removeChild(linkElement);
						console.debug("Removed font/CSS resource: " + linkElement);
					}
				}
			}

			// Remove style elements
			var styleElements = linkDOM.getElementsByTagName("style");

			console.debug("Total style elements found: " + styleElements.length);

			if (styleElements && styleElements.length > 0)
			{
				for (var i = styleElements.length - 1; i >= 0; i--)
				{
					if (styleElements[i] && styleElements[i].parentNode)
					{
						styleElements[i].parentNode.removeChild(styleElements[i]);
						console.debug("Removed style element: " + styleElements[i].outerHTML);
					}
				}
			}
		}
		catch (e)
		{
			console.error("Error removing CSS/font elements: ", e.message);
			// Continue processing even if removal fails
		}
	}
	*/

	// Process base elements and update baseUri
	try
	{
		// Ensure we're working with an actual DOM document
		if (linkDOM.getElementsByTagName)
		{
			var baseElements = linkDOM.getElementsByTagName("base");
			for (var i = 0; i < baseElements.length; i++)
			{
				var baseElement = baseElements[i];
				// Verify we have a valid element before calling getAttribute
				if (baseElement && baseElement.getAttribute)
				{
					var baseHref = baseElement.getAttribute("href");
					if (baseHref && baseUri)
					{
						baseUri = resolveUrl(baseHref, baseUri);
						// Update the base element with resolved URL
						baseElement.setAttribute("href", baseUri);
						break;
					}
				}
			}
		}
	}
	catch (e)
	{
		console.error("processXbody: Error processing base elements:", e.message);
	}

	// Fix all URLs in DOM before filtering
	try
	{
		if (baseUri && linkDOM.querySelectorAll)
		{
			// Process href attributes
			const elementsWithHref = linkDOM.querySelectorAll('[href]');
			Array.prototype.forEach.call(elementsWithHref, function(el)
			{
				if (el && el.getAttribute)
				{
					const href = el.getAttribute('href');
					if (href && !href.match(/^(data:|javascript:|https?:|ftp:|file:)/i))
					{
						el.setAttribute('href', resolveUrl(href, baseUri));
					}
				}
			});

			// Process src attributes
			const elementsWithSrc = linkDOM.querySelectorAll('[src]');
			Array.prototype.forEach.call(elementsWithSrc, function(el)
			{
				if (el && el.getAttribute)
				{
					const src = el.getAttribute('src');
					if (src && !src.match(/^(data:|javascript:|https?:|ftp:|file:)/i))
					{
						el.setAttribute('src', resolveUrl(src, baseUri));
					}
				}
			});

			// Process data-src attributes
			const elementsWithDataSrc = linkDOM.querySelectorAll('[data-src]');
			Array.prototype.forEach.call(elementsWithDataSrc, function(el)
			{
				if (el && el.getAttribute)
				{
					const dataSrc = el.getAttribute('data-src');
					if (dataSrc && !dataSrc.match(/^(data:|javascript:|https?:|ftp:|file:)/i))
					{
						el.setAttribute('data-src', resolveUrl(dataSrc, baseUri));
					}
				}
			});

			// Process srcset attributes
			const elementsWithSrcset = linkDOM.querySelectorAll('[srcset]');
			Array.prototype.forEach.call(elementsWithSrcset, function(el)
			{
				if (el && el.getAttribute)
				{
					const srcset = el.getAttribute('srcset');
					if (srcset && !srcset.match(/^(data:|javascript:|https?:|ftp:|file:)/i))
					{
						el.setAttribute('srcset', resolveUrl(srcset, baseUri));
					}
				}
			});

			// Process data-srcset attributes
			const elementsWithDataSrcset = linkDOM.querySelectorAll('[data-srcset]');
			Array.prototype.forEach.call(elementsWithDataSrcset, function(el)
			{
				if (el && el.getAttribute)
				{
					const dataSrcset = el.getAttribute('data-srcset');
					if (dataSrcset && !dataSrcset.match(/^(data:|javascript:|https?:|ftp:|file:)/i))
					{
						el.setAttribute('data-srcset', resolveUrl(dataSrcset, baseUri));
					}
				}
			});
		}
	}
	catch (e)
	{
		console.error("processXbody: Error fixing links in DOM:", e.message);
	}

	// Extract the updated HTML from linkDOM (Is it Usefull???)
	// console.debug("processXbody: linkHTML before linkDOM is: ", linkHTML);
	linkHTML = new XMLSerializer().serializeToString(linkDOM);
	// console.debug("processXbody: linkHTML after is: ", linkHTML);

	// Process content based on filter type
	var Xfilter = feed.Xfilter;
	var filterType = feed.XfilterType;
	if (Xfilter && filterType == -1) filterType = guessFilterType(Xfilter);

	/**
	 * Helper function to process lazy loading with proper error handling
	 * @param {string} content - The HTML content to process
	 * @param {string} baseUri - The base URI for resolving URLs
	 * @param {string} filterType - The type of filter being processed
	 * @returns {string} - The processed content
	 */
	function processLazyLoadingWithErrorHandling(content, baseUri, filterType)
	{
		if (!gOptions.processLazyLoading || !content || !baseUri) {
			return content;
		}

		try
		{
			var tempNode = document.createElement('div');
			tempNode.textContent = content;
			tempNode = processLazyLoading(tempNode, baseUri);
			return tempNode.textContent;
		}
		catch (lazyErr)
		{
			console.error(`Error processing lazy loading after ${filterType} filter:`, lazyErr.message);
			return content; // Return original content if processing fails
		}
	}

	// Handle different filter types
	if (filterType <= 0)  // none or RegExp
	{
		var re = DEFAULTREGEXP;
		if (feed.Xfilter)
		{
			try
			{
				re = new RegExp(feed.Xfilter, "g");
			}
			catch(e)
			{
				var badRE = NF_SB.getString('filterErrorBadRegExp');
				alert(badRE + ": " + feed.Xfilter);
			}
		}

		var body = linkHTML.match(re);
		if (!body)
		{
			body = linkHTML.match(DEFAULTREGEXP) || [linkHTML];
		}
		artText = body.join("");
	}
	else if (filterType == 1)  // JavaScript
	{
		try
		{
			// Create sandbox and set up environment
			var newsfox_iframe = document.getElementById("buildContent");
			var sandbox = Components.utils.Sandbox(newsfox_iframe.contentWindow);

			// Set up sandbox with the raw HTML
			sandbox.linkHTML = Components.utils.cloneInto(linkHTML, sandbox);
			sandbox.win = Components.utils.cloneInto(newsfox_iframe.contentWindow, sandbox, {cloneFunctions: true, wrapReflectors: true});
			sandbox.doc = Components.utils.cloneInto(newsfox_iframe.contentDocument, sandbox, {cloneFunctions: true, wrapReflectors: true});

			// Basic filter setup without URL processing
			var xfilterGEBC = 'var getElementsByClass = function (searchClass, tag, node) { var classElements = new Array(); var els = node.getElementsByTagName(tag); var pattern = new RegExp("(^|\\\\s)" + searchClass + "(\\\\s|$)"); for (i=0, j=0; i<els.length; i++) if (pattern.test(els[i].className)) classElements[j++] = els[i]; return classElements; }; ';
//		var getElementsByClass =
//				function (searchClass, tag, node)
//				{
//					var classElements = new Array();
//					var els = node.getElementsByTagName(tag);
//
//					var pattern = new RegExp("(^|\\\\s)" + searchClass + "(\\\\s|$)");
//					for (i=0, j=0; i<els.length; i++)
//						if (pattern.test(els[i].className)) classElements[j++] = els[i];
//					return classElements;
//				}

			var xfilterLINKDOM = ' var iframeEls = doc.getElementsByTagName("iframe"); var tmp; for (var i=0; i< iframeEls.length; i++) if (iframeEls[i].id == "hiddenDOMiframe") tmp = i; linkDOM = iframeEls[tmp].contentDocument; ';
//		var iframeEls = doc.getElementsByTagName("iframe");
//		var tmp; for (var i=0; i< iframeEls.length; i++)
//			if (iframeEls[i].id == "hiddenDOMiframe") tmp = i;
//		linkDOM = iframeEls[tmp].contentDocument;

			var xfilterPre = xfilterGEBC + xfilterLINKDOM;

			sandbox.cxf = Components.utils.cloneInto(xfilterPre + feed.Xfilter, sandbox);
			var tmp = Components.utils.evalInSandbox(sandbox.cxf, sandbox);

			if (typeof tmp == "string")
			{
				artText = tmp;
			}
			else
			{
				var badEval = NF_SB.getString('filterErrorBadJavaScript');
				throw new Error(badEval);
			}
		}
		catch(e)
		{
			console.error("processXbody: JavaScript filter error: ", e.message, { feed: feed.getDisplayName() });
			return doError(art, e);
		}
	}
	else  // filterType == 2, XPath
	{
		try
		{
			var xmlSer = new XMLSerializer();
			// xmlSer uses capitals in tags e.g. <DIV>, need to make sure
			// artText is not XHTML or <DIV> tags will be ignored
			artText = "<p>";
			var result = linkDOM.evaluate(Xfilter, linkDOM, null,
											XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

			// Process nodes together
			for (var j = 0; j < result.snapshotLength; j++)
			{
				var node = result.snapshotItem(j);
				artText += xmlSer.serializeToString(node);
			}
		}
		catch(e)
		{
			console.error("processXbody: XPath filter error: ", e.message, { feed: feed.getDisplayName() });
			return doError(art, e);
		}
	}

	// Filter out elements from artText using regex
	artText = filterArticle(artText);

	// Call transformImageURLs
	try
	{
		if (gOptions.transformImageURLs && linkDOM && baseUri)
		{
			var tempNode = document.createElement('div');
			tempNode.textContent = artText; // Convert artText to a DOM node
			// console.debug("Processing transformImageURLs in processXbody function");
			transformImageURLs(tempNode, baseUri, feed.XfilterType);
			artText = tempNode.textContent; // Update the artText with transformed content
		}
	}
	catch (e)
	{
		console.error("Error transforming image URLs:", e.message);
		// Continue processing even if transformation fails
	}

	// Process lazy loading before second pass URL resolution
	// This ensures we handle all lazy-loaded content in one place
	try
	{
		if (gOptions.processLazyLoading && baseUri && artText)
		{
			// Check if content actually needs lazy loading processing
			const needsLazyLoading = /\b(data-src|data-srcset|lazy-src|data-lazy|data-original|loading=["'](lazy|auto)["'])\s*=/i.test(artText);

			if (needsLazyLoading)
			{
				// console.debug("Processing lazy loading for filter type:", filterType);
				artText = processLazyLoadingWithErrorHandling(artText, baseUri, `filter-${filterType}`);
			}
			else
			{
				// console.debug("No lazy loading attributes found, skipping processing");
			}
		}
	}
	catch (e)
	{
		console.error("Error in lazy loading processing:", e.message);
		// Continue processing even if lazy loading failed
	}

	// Post-processing
	if (!gOptions.openInViewPane)
	{
		artText = makeTarget_Blank(artText);
	}

	// Process images in artText
	postProcessImages(artText, art, feed);

	// return artText;
}

function postProcessImages(artText, art, feed)
{
	if (feed.XfilterImages) getImages(artText, art, feed);
	art.Xbody = artText;
	var arttree = artTreeInvalidate();
	var index = arttree.currentIndex;
	if (index > -1 && gCollect.get(index).id == art.id)
		articleSelected();
	saveFeed(feed);
}

function getImages(artText, art, feed)
{
	// Match both absolute and relative image sources
	var imgs = artText.match(/<[Ii][Mm][Gg].*?[Ss][Rr][Cc]\s*=\s*['"]([^'"]+)['"]/g);
	if (imgs)
	{
		art.imagesToGet = imgs.length;
		artTreeInvalidate();
		for (var i = 0; i < imgs.length; i++)
		{
			// Extract the URL from the img tag
			var urlMatch = imgs[i].match(/[Ss][Rr][Cc]\s*=\s*['"]([^'"]+)['"]/);
			if (urlMatch)
			{
				var url = urlMatch[1];

				// Ensure the URL is valid before proceeding
				if (url)
				{
					getDataForImage(url, art, artText, imgs[i], feed);
				}
				else
				{
					console.warn("Invalid URL extracted from img tag:", url);
				}
			}
		}
	}
}

function getDataForImage(url, art, artText, imgText, feed)
{
	try
	{
		if (!url)
		{
			console.warn("getDataForImage Invalid URL: ", url);
			art.imagesToGet--;
			return;
		}

		// Properly resolve the URL
		var baseUri = getBaseDomain(art.link);
		url = resolveUrl(url, baseUri);
		console.debug("getDataForImage: Resolved URL is: ", url);

		var req = new XMLHttpRequest();
		req.open('GET', url, true);
		// trick by Marcus Granado, next line and toBinStr()
		// http://mgran.blogspot.com/2006/08/downloading-binary-streams-with.html
		req.overrideMimeType('text/plain; charset=x-user-defined');
		req.onload = function()
		{
			return processImage(req, url, art, artText, imgText, feed);
		}
		req.onreadystatechange = function()
		{
			if (art.Xtend == false)
			{
				art.imagesToGet--;
				req.abort();
			}
		}
		req.send(null);
	}
	catch(e)
	{
		art.imagesToGet--;
		if (req) req.abort();
	}
}

function processImage(req, url, art, artText, imgText, feed)
{
	// Check if the request was successful
	if (req.status !== 200)
	{
		console.error("Failed to load image:", url, "Status:", req.status);
		art.imagesToGet--;
		return; // Exit if the request was not successful
	}

	var dataType = req.getResponseHeader('content-type');
	if (dataType && dataType.substring(0, 5) == "image")
	{
		var dataURL = "data:" + dataType + ";base64,";
		var binText = toBinStr(req.responseText);
		dataURL += btoa(binText);

		// Extract the original URL pattern from imgText to ensure correct replacement
		var srcPattern = imgText.match(/[Ss][Rr][Cc]\s*=\s*['"]([^'"]+)['"]/)[1];
		var newimgText = imgText.replace(srcPattern, dataURL);
		var newartText = art.Xbody.replace(imgText, newimgText);
		art.Xbody = newartText;
	}
	else
	{
		console.warn("Response is not an image:", url, "Content-Type:", dataType);
	}

	art.imagesToGet--;
	if (art.imagesToGet == 0)
	{
		saveFeed(feed);
		artTreeInvalidate();
	}
}

function getDomFromHtml(siteHTML)
{
	// Parse the string into a doc fragment using the html iframe
	var newsfox_iframe = document.getElementById("buildContent");
	newsfox_iframe.docShell.allowJavascript = false;
	var doc = newsfox_iframe.contentDocument;
	var range = doc.createRange();
	range.selectNode(doc.body);
	var parsedHTML = range.createContextualFragment(siteHTML);

	var iframe = doc.createElement("iframe");
	iframe.setAttribute("style", "visibility: hidden;");
	iframe.id = "hiddenDOMiframe";
	doc.body.appendChild(iframe);

	// Import from doc fragment into the iframe
	var elem = iframe.contentDocument.importNode(parsedHTML, true);
	iframe.contentDocument.body.appendChild(elem);
	var siteDOM = iframe.contentDocument;
	// leave the iframe since FF35 since we need access to the DOM from newsfox_iframe
	// delete the iframe as we don't need it any more
	// doc.body.removeChild(iframe);
	return siteDOM;
}
