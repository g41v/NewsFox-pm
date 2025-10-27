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

const VERSION = "1.0.9.4.1";
const NEWSFOX = "NewsFox";
const NEWSFOX_RSS = "http://newsfox.mozdev.org/rss/rss.xml?startup";
const NEWSFOX_DATE = "April 15, 2003 8:01 PM";
const NF_URI = "chrome://newsfox/content/newsfox.xul?bkmk";
const NFINFO = "http://newsfox.mozdev.org/";
const NFSOUND = "NFsound.wav";
const LONG_DATE_STYLE = 2;
const ERROR_OK = "0";
const ERROR_INVALID_FEED_URL = "1";
const ERROR_UNKNOWN_FEED_FORMAT = "2";
const ERROR_SERVER_ERROR = "3";
const ERROR_NOT_FOUND = "4";
const ERROR_REFRESH = "5";
const FEED_VALIDATOR = "http://validator.w3.org/feed/check.cgi?url=";
const NO_LINK = "";
const ICON_OK = getPng("feed.png");
const ICON_STORAGE = getPng("storage.png");
const MASTER = "master";
const MASTER_GROUP = "master_group";
const MASTER_INDEX = "master_index";
const MASTER_FILTER = "master_filter";
const AUTO_MIMETYPE = "+";
const TEST_MIMETYPE = ">";

const HRS12 = 1000*60*60*12;
const DATEBASE = -HRS12;
const TOP_NO_DATE = new Date(DATEBASE + HRS12);
const NO_DATE = new Date(DATEBASE);
const TOP_INVALID_DATE = new Date(DATEBASE - HRS12);
const INVALID_DATE = new Date(DATEBASE - 2*HRS12);
const TOP_FUTURE_DATE = new Date(DATEBASE - 3*HRS12);

const MINAUTOTIME = 5;
const MINFEEDTIME = 10;

const COL_NAME = { n: "none", f: "flag", t: "title", r: "read", d: "date", a: "author", s: "source", b: "blog", p: "prob", o: "orderThread" };
const COL_LETTER = [ "n", "f", "t", "r", "d", "a", "s", "b", "p", "o" ];
const DIR_LETTER = [ "+", "-" ];

var gUserAgent;
var gKMeleon = false;
var gEMusic = false;
var gSeaMonkey = false;
var gFlock = false;
var gFF = -1;
var gNewsfoxDirURL = null;
var gMsgDone = false;
var gSdr;
var gTag = "";
var gAllFeedsLoaded = false;
var gLoadFlags = 0;
var gNewItemsCount = 0;

// spam filter
var gGoodArray = new Array();
var gTotalArray = new Array();
var gWordArray = new Array();
const S_TOTAL_START = 1000;
const S_GOOD_START = 500;
const S_MULT = 0.99;
const S_MINCOUNT = 2500;
const S_MINWORDLENGTH = 3;
const S_MAXCOMPARE = 30;
const S_UNREADPCT = 0.75;
const S_MAXWORDS = 2500;
const S_MINWORDTOTAL = 1000;
const S_MINWORDS = 1000;
var gArtsToUpdateSpam = new Array();
var gArtsToAddSpam = new Array();
var gArtsToScoreSpam = new Array();
var gFeedsToSaveSpam = new Array();
const S_BIGNUM = 1000111000111;
const S_BIGNUMDIV = 1000000;
const S_MAX_ARTS = 200;
const S_NEW_DAYS = 1;

const DEFAULTREGEXPTEXT = "<p.*?<\/p>";
const DEFAULTREGEXPTEXT_INSERT = "<p.*?<\\\/p>";
const DEFAULTREGEXP = new RegExp(DEFAULTREGEXPTEXT, "g");

var stringTrim = function(v)
{
	return v.replace(/^\s+|\s+$/g, '');
}

// Add a URL resolution cache
const resolvedUrlCache = new Map();
const MAX_URL_CACHE_SIZE = 1000;

/**
 * Resolves a URL relative to a base URI, handling various URL scenarios.
 *
 * @param {string} url - The URL to be resolved
 * @param {string} [baseUri=''] - The base URI to resolve against (optional)
 * @returns {string|null} The fully resolved URL, or null if resolution fails
 * @throws {Error} Logs detailed error information if URL resolution encounters issues
 *
 * @description
 * This function handles multiple URL resolution scenarios:
 * - Handles null/undefined inputs
 * - Skips processing for special URL schemes
 * - Supports protocol-relative URLs
 * - Supports root-relative URLs
 * - Implements a caching mechanism
 * - Provides context-aware error handling
 */
function resolveUrl(url, baseUri = '')
{
	try
	{
		// Early validation for invalid inputs
		if (!url)
		{
			// console.debug("Invalid URL provided to resolveUrl:", url, baseUri);
			return '';
		}

		// Predefined list of special URL schemes to bypass processing
		const specialSchemes = [
			"#",
			"data:",
			"mailto:",
			"ftp://",
			"sftp://",
			"http://",
			"https://",
			"viber://",
			"javascript:"
		];

		// Quick early return for special URL schemes
		if (specialSchemes.some(scheme => url.startsWith(scheme)))
		{
			return url;
		}

		// Optimize cache key generation
		const cacheKey = `${url}|${baseUri}`;

		// Check cache before processing
		if (resolvedUrlCache.has(cacheKey))
		{
			return resolvedUrlCache.get(cacheKey);
		}

		let resolvedUrl = null;

		// Handle protocol-relative URLs
		if (url.startsWith('//'))
		{
			if (!baseUri) return null;

			const ioService = Components.classes["@mozilla.org/network/io-service;1"]
				.getService(Components.interfaces.nsIIOService);
			const uri = ioService.newURI(baseUri, null, null);

			resolvedUrl = `${uri.scheme}:${url}`;
		}
		// Handle root-relative URLs
		else if (url.startsWith('/'))
		{
			if (!baseUri) return null;

			const ioService = Components.classes["@mozilla.org/network/io-service;1"]
				.getService(Components.interfaces.nsIIOService);
			const uri = ioService.newURI(baseUri, null, null);

			resolvedUrl = `${uri.scheme}://${uri.host}${url}`;
		}
		// Handle regular URLs, including those with './'
		else
		{
			resolvedUrl = new URL(url, baseUri).href; // This should handle './' correctly
		}

		// Implement cache management
		if (resolvedUrlCache.size >= MAX_URL_CACHE_SIZE)
		{
			// Clean up oldest 20% of entries
			const keysToRemove = Array.from(resolvedUrlCache.keys())
				.slice(0, Math.floor(MAX_URL_CACHE_SIZE * 0.2));

			keysToRemove.forEach(key => resolvedUrlCache.delete(key));
		}

		// Cache the resolved URL
		resolvedUrlCache.set(cacheKey, resolvedUrl);

		return resolvedUrl;
	}
	catch (e)
	{
		console.error("URL resolution failed:", {
			url,
			baseUri,
			errorMessage: e.message,
			stack: e.stack
		});

		return null;
	}
}

/**
 * Get the newsfox directory
 */

function getProfURL(profURL)
{
	var nsIPH = Components.classes["@mozilla.org/network/protocol;1?name=file"].createInstance(Components.interfaces.nsIFileProtocolHandler);
	var ioSvc = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService);
	var dFile = Components.classes["@mozilla.org/file/directory_service;1"].
		getService(Components.interfaces.nsIProperties).
		get("ProfD", Components.interfaces.nsIFile);
	dFile.append("newsfox");
	if (!dFile.exists()) dFile.create(dFile.DIRECTORY_TYPE, 0o750);
// doesn't work in FF2
//	if (!dFile.exists()) dFile.create(dFile.DIRECTORY_TYPE, 0o0750);
	var dURI = ioSvc.newURI(nsIPH.getURLSpecFromFile(dFile),null,null);
	return dURI.resolve(profURL);
}

function NFgetProfileDir(force)
{
	var nsIPH = Components.classes["@mozilla.org/network/protocol;1?name=file"].createInstance(Components.interfaces.nsIFileProtocolHandler);
	const NF_SB = document.getElementById("newsfox-string-bundle");
	var profURL = getProfURL(NFgetPref("global.directory", "str", ""));

	if (gNewsfoxDirURL != null)  // use it, but warn if preference changed
	{
		if (gNewsfoxDirURL != profURL && !gMsgDone)
		{
			window.alert(NF_SB.getString('inuse'));
			gMsgDone = true;
		}
		return nsIPH.getFileFromURLSpec(gNewsfoxDirURL);
	}
	if (profURL != "")  // use it if exists, otherwise choose new
	{
		var file = nsIPH.getFileFromURLSpec(profURL);
		if (file.exists())
		{
			gNewsfoxDirURL = profURL;
			return nsIPH.getFileFromURLSpec(gNewsfoxDirURL);
		}

		if (force == false) return null;
		var msg = NF_SB.getString('confirm.newNewsfoxDir');
		if (yesNoConfirm(msg))  // pick new directory, else use default
		{
			var picker = NFdirPicked(file);
			if (picker)
			{
				gNewsfoxDirURL = nsIPH.getURLSpecFromFile(picker.file);
				NFsetPref("global.directory", "str", gNewsfoxDirURL);
				return picker.file;
			}
		}
	}

	// default to standard location
	var file = Components.classes["@mozilla.org/file/directory_service;1"].
		getService(Components.interfaces.nsIProperties).
		get("ProfD", Components.interfaces.nsIFile);
	file.append("newsfox");
	if (!file.exists()) file.create(file.DIRECTORY_TYPE, 0o750);
	// doesn't work in FF2
	//	if (!file.exists()) file.create(file.DIRECTORY_TYPE, 0o0750);
	gNewsfoxDirURL = nsIPH.getURLSpecFromFile(file);
	NFsetPref("global.directory", "str", ".");
	return file;
}

function NFdirPicked(startFile)
{
	var picker = Components.classes["@mozilla.org/filepicker;1"].
		createInstance(Components.interfaces.nsIFilePicker);
	var file = startFile;
	try
	{
		while (!file.exists() || file.isFile()) file = file.parent;
		picker.displayDirectory = file;
	}
	catch(e){}
	const NF_SB = document.getElementById("newsfox-string-bundle");
	var wintitle = NF_SB.getString('chooseNewsfoxFolder');
	picker.init(window, wintitle, picker.modeGetFolder);
	if(picker.show() == picker.returnOK) return picker;
	else return null;
}

function NFgetPref(name, type, dfault, notNewsfox)
{
	var base = "newsfox.";
	if (notNewsfox) base = "";
	var prefs = Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefService)
		.getBranch(base);

	if (prefs.getPrefType(name) == prefs.PREF_INVALID) return dfault;
	try
	{
		switch (type)
		{
			case "str":
				return prefs.getCharPref(name);
			case "int":
				return prefs.getIntPref(name);
			case "bool":
				return prefs.getBoolPref(name);
		}
		return null;
	}
	catch(e) { return dfault; }
}

function NFsetPref(name, type, value, notNewsfox)
{
	var base = "newsfox.";
	if (notNewsfox) base = "";
	var prefs = Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefService)
		.getBranch(base);

	switch (type)
	{
		case "str":
			prefs.setCharPref(name,value);
			break;
		case "int":
			prefs.setIntPref(name,value);
			break;
		case "bool":
			prefs.setBoolPref(name,value);
			break;
	}
}

function setTitle(doNew)
{
	var updateText = null;
	var unread = gFdGroup[0].getUnread();
	newTitle(unread);
	switch (gOptions.statusBarText)
	{
		case 0:
			if (doNew) updateText = gNewItemsCount;
			break;
		case 1:
			updateText = unread;
			if (updateText == 0) updateText = "";
	}
	if (updateText != null && !gKMeleon) updateStatusText(updateText);
}

function newTitle(undone)
{
	var nF = NEWSFOX;
	if (undone > 0) nF += " (" + undone + ")";
	// prevent flicker, only redo if needed
	if (document.title != nF) document.title = nF;
}

function updateStatusText(text)
{
	var mainWindow =
			window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
			.getInterface(Components.interfaces.nsIWebNavigation)
			.QueryInterface(Components.interfaces.nsIDocShellTreeItem)
			.rootTreeItem
			.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
			.getInterface(Components.interfaces.nsIDOMWindow);
	var doc = mainWindow.document;
	if (null != doc.getElementById("newsfox-status-label"))
	{
		doc.getElementById("newsfox-status-label").removeAttribute("hidden");
		doc.getElementById("newsfox-status-label").setAttribute("value", text);
	}
}

function getPng(Pngfile)
{
	var nsIPH = Components.classes["@mozilla.org/network/protocol;1?name=file"].createInstance(Components.interfaces.nsIFileProtocolHandler);
	var profURL = getProfURL(NFgetPref("global.directory", "str", ""));
	if (profURL != "")
	{
		var file = nsIPH.getFileFromURLSpec(profURL);
		if (file.exists())
		{
			file.append("images");
			file.append(Pngfile);
			if (file.exists()) return getFileSpec(file);
		}
	}
	return "chrome://newsfox/skin/images/"+Pngfile;
}

function checkLocalPng(id,png,prop)
{
	if (!prop) prop = "image";
	var localPng = getPng(png);
	if (localPng.charAt(0) == "f" || localPng.charAt(0) == "F")  // local "f"ile
		document.getElementById(id).setAttribute(prop, localPng);
}

function displayDate(date, style)
{
	const NF_SB = document.getElementById("newsfox-string-bundle");
	if (date > TOP_NO_DATE)
	{
		if (style == 2)
			return date.toLocaleString();
		else if (style == 0)
		{
			var hour = date.getHours();
			if (hour < 10) hour = "0" + hour;
			var min = date.getMinutes();
			if (min < 10) min = "0" + min;
			var time = hour + ":" + min;
			var dateM = date.getMonth()+1;
			if (dateM < 10) dateM = "0" + dateM;
			var dateD = date.getDate();
			if (dateD < 10) dateD = "0" + dateD;
			var dat = date.getFullYear() + "-" + dateM + "-" + dateD + " ";
			var now = new Date();
			var nowM = now.getMonth()+1;
			if (nowM < 10) nowM = "0" + nowM;
			var nowD = now.getDate();
			if (nowD < 10) nowD = "0" + nowD;
			var nowdat = now.getFullYear() + "-" + nowM + "-" + nowD + " ";
			if (dat == nowdat) dat = "";
			return (dat + time);
		}
		else  // style == 1
		{
			var sdf = Components.classes["@mozilla.org/intl/scriptabledateformat;1"]
				.createInstance(Components.interfaces.nsIScriptableDateFormat);
			return sdf.FormatDateTime("", sdf.dateFormatShort,
				sdf.timeFormatNoSeconds, date.getFullYear(), date.getMonth()+1,
				date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds());
		}
	}
	else if (date <= TOP_FUTURE_DATE) return NF_SB.getString('FUTURE_DATE');
	else if (date <= TOP_INVALID_DATE) return NF_SB.getString('INVALID_DATE');
	else return NF_SB.getString('NO_DATE');
}

function NFsetUserAgent()
{
	gUserAgent = NFgetPref("general.useragent.extra.firefox", "str", null, true);
	if (gUserAgent)  // Flock too  'Firefox/x.x.x Flock/y.y.y'
	{
		gFF = 3;
		if (gUserAgent.indexOf("fox/2") > -1) gFF = 2;
		else if (gUserAgent.indexOf("fox/1") > -1) gFF = 1;
		gFlock = (NFgetPref("general.useragent.extra.flock", "str", false, true) || gUserAgent.indexOf("Flock") > -1);
		return gUserAgent;
	}
	gUserAgent = NFgetPref("general.useragent.extra.seamonkey", "str", null, true);
	if (gUserAgent)
		{ gSeaMonkey = true; return gUserAgent; }
	gUserAgent = window.navigator.vendor + "/" + window.navigator.vendorSub;
	if (gUserAgent.indexOf("K-Meleon") > -1)
		{ gKMeleon = true; return gUserAgent; }
	if (gUserAgent.indexOf("eMusic") > -1)
		{ gEMusic = true; return gUserAgent; }
	gUserAgent = window.navigator.userAgent;
	if (gUserAgent.indexOf('Firefox') > -1) gFF = 4;
	if (gUserAgent.indexOf('GranParadiso') > -1 || gUserAgent.indexOf('Minefield') > -1) gFF = 4;
	return gUserAgent;
}

function getFileSpec(file)
{
	var nsIPH = Components.classes["@mozilla.org/network/protocol;1?name=file"].createInstance(Components.interfaces.nsIFileProtocolHandler);
	return nsIPH.getURLSpecFromFile(file);
}

function yesNoConfirm(message)
{
	var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
	var flags = prompts.STD_YES_NO_BUTTONS + prompts.BUTTON_POS_0_DEFAULT;
	return pConfirm(message, flags);
}

function noYesConfirm(message)
{
	var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
	var flags = prompts.STD_YES_NO_BUTTONS + prompts.BUTTON_POS_1_DEFAULT;
	return pConfirm(message, flags);
}

function noOKConfirm(message)
{
	var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
	var flags = prompts.STD_OK_CANCEL_BUTTONS + prompts.BUTTON_POS_1_DEFAULT;
	return pConfirm(message, flags);
}

function pConfirm(message, flags)
{
	var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
	var check = {value: false};
	var button = prompts.confirmEx(null, "", message, flags, "", "", "", null, check);
	if (button == 0) return true;
	else return false;
}

function sortChgG()
{
	doSortChg("sortG", "dirG");
}

function sortChg()
{
	var ckbox = document.getElementById("cbGlobalSort");
	if (ckbox && ckbox.checked == true)
	{
		for (var i=1; i<=4; i++)
		{
			document.getElementById("sort"+i).disabled = true;
			document.getElementById("dir"+i).disabled = true;
		}
	}
	else
		doSortChg("sort", "dir");
}

function doSortChg(sortname, dirname)
{
	for (var i=1; i<=4; i++)
	{
		document.getElementById(sortname+""+i).removeAttribute("disabled");
		if (document.getElementById(sortname+""+i).selectedIndex == 0)
		{
			document.getElementById(dirname+""+i).disabled = true;
			for (var j=i+1; j<=4; j++)
				document.getElementById(sortname+""+j).selectedIndex = 0;
		}
		else
			document.getElementById(dirname+""+i).removeAttribute("disabled");
	}
}

function setSorts(sortStr, sortname, dirname)
{
	for (var i=1; i<=sortStr.length/2; i++)
	{
		document.getElementById(sortname+""+i).selectedIndex = COL_LETTER.indexOf(sortStr[2*(i-1)]);
		document.getElementById(dirname+""+i).selectedIndex = (sortStr[2*i-1] == "+") ? 0 : 1;
	}
	for (var i=sortStr.length/2+1; i<=4; i++)
	{
		document.getElementById(sortname+""+i).selectedIndex=0;
		document.getElementById(dirname+""+i).disabled = true;
	}
}

function getSortStr(sortname, dirname)
{
	var sortStr = "";
	for (var i=1; i<=4; i++)
	{
		var colIdIndex = document.getElementById(sortname+""+i).selectedIndex;
		if (colIdIndex == 0) break;
		var dirIndex = document.getElementById(dirname+""+i).selectedIndex;
		sortStr += COL_LETTER[colIdIndex] + DIR_LETTER[dirIndex];
	}
	if (i == 1) sortStr = "n+";
	return sortStr;
}

function openNewTab(url)
{
	if (url == NO_LINK) return;
	if(gKMeleon || gEMusic)
	{
		window.open(url);
		window.focus();
	}
	else
	{
		const kWindowMediatorContractID = "@mozilla.org/appshell/window-mediator;1";
		const kWindowMediatorIID = Components.interfaces.nsIWindowMediator;
		const kWindowMediator = Components.classes[kWindowMediatorContractID].getService(kWindowMediatorIID);
		var browserWindow = kWindowMediator.getMostRecentWindow("navigator:browser");
		var browser = browserWindow.getBrowser();
		var tab = browser.addTab(url);
	}
}

function guessFilterType(xfilter)
{
	if (xfilter.indexOf("linkDOM") > -1 || xfilter.indexOf("linkHTML") > -1)
		return 1;   // JavaScript
	if (xfilter.indexOf("[@") > -1 || xfilter.indexOf("//") > -1)
		return 2;   // XPath
	return 0;   // RegExp
}

function doDeleteOld()
{
	var dOsI = document.getElementById("deleteOld").value;
	var dFsI = document.getElementById("daysFeed").value;
	var disable = false;
	if (dOsI == 0 || dOsI == 3) disable = true;
	document.getElementById("daysFeed").disabled = disable;
	document.getElementById("daysToKeep").disabled = disable;
	if (dFsI == 0)
	{
		document.getElementById("daysToKeep").hidden = true;
		document.getElementById("daysToKeep").value = "2";
		document.getElementById("daysToKeepLabel").hidden = true;
	}
	else
	{
		document.getElementById("daysToKeep").removeAttribute("hidden");
		document.getElementById("daysToKeepLabel").removeAttribute("hidden");
	}
}

function doAutoRefresh(fromFeed)
{
	var aRI = document.getElementById("autoRefreshInterval");
	var needNum;
	if (fromFeed)
		needNum = (document.getElementById("mLtime").selectedIndex == 1);
	else
		needNum = document.getElementById("cbAutoRefresh").checked;
	if (needNum)
		aRI.disabled = false;
	else
	{
		aRI.value = "";
		aRI.disabled = true;
	}
}

function autoInterval()
{
	var aRI = document.getElementById("autoRefreshInterval");
	if (isNaN(aRI.value) || aRI.value < MINFEEDTIME)
	{
		aRI.value = MINFEEDTIME;
		const NF_SB = document.getElementById("newsfox-string-bundle");
		window.alert(NF_SB.getString('autoCheckIntervalWarning'));
	}
}

function propsAdd(value, props, returnProps)
{
	var aserv = Components.classes["@mozilla.org/atom-service;1"].
			getService(Components.interfaces.nsIAtomService);
	if (props)
		props.AppendElement(aserv.getAtom(value));
	return (returnProps + " " + value);
}

function NFloadCss(gOp, prevUri)
{
	var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
				.getService(Components.interfaces.nsIStyleSheetService);
	var ios = Components.classes["@mozilla.org/network/io-service;1"]
				.getService(Components.interfaces.nsIIOService);

// unregistering doesn't seem to work
	if (prevUri) sss.unregisterSheet(prevUri, sss.USER_SHEET);
	var fileCssString = getCss("newsfox.css");
	if (fileCssString != "" || gOp.keywordColor.length > 0)
	{
		var dataURL = "data:text/css;base64,";
		var keywordColorString = "@-moz-document url('chrome://newsfox/content/newsfox.xul')\n{\n";
		for (var i=gOp.keywordColor.length-1; i>=0; i--)
			keywordColorString += "treechildren::-moz-tree-cell-text(keyword" + i + "){color:" + gOp.keywordColor[i] + "!important;}\n";
		keywordColorString += "}\n\n";
		var binText = toBinStr(keywordColorString+fileCssString);
		dataURL += btoa(binText);
		var uri = ios.newURI(dataURL, null, null);
		if(!sss.sheetRegistered(uri, sss.USER_SHEET))
			sss.loadAndRegisterSheet(uri, sss.USER_SHEET);
		return uri;
	}
}

function getCss(filename)
{
	var file = NFgetProfileDir();
	file.append(filename);
	return (file.exists()) ? fileRead(file) : "";
}

function toBinStr(text)
{
	var retval = "";
	for(var i=0; i<text.length; i++)
		retval += String.fromCharCode(text.charCodeAt(i) & 0xff);
	return retval;
}

// Example use: let baseUri = getBaseDomain(art.link);
function getBaseDomain(link)
{
	// Check if link is undefined or null
	if (!link)
	{
		console.debug("getBaseDomain: link is empty: ", link);
		return null;
	}

	// Trim whitespace
	link = link.trim();

	// Check if link starts with http:// or https://
	if (!(link.startsWith("http://") || link.startsWith("https://")))
	{
		link = "https://" + link;
	}

	// Remove any path after domain
	let parsedURL = link.match(/^(https?:\/\/[^\/]+)/);
	if (parsedURL)
	{
		link = parsedURL[1];
	}

	// Ensure trailing slash
	if (!link.endsWith("/"))
	{
		link += "/";
	}

	return link;
}

function filterArticle(body)
{
	// Filter elements from body using regex
	try {
		// Remove <link> elements for stylesheets and fonts
		body = body.replace(/<link[^>]*rel\s*=\s*["']stylesheet["'][^>]*>/gi, "");
		body = body.replace(/<link[^>]*rel\s*=\s*["']preload["'][^>]*>/gi, "");
		body = body.replace(/<link[^>]*href\s*=\s*["'][^"']*\.css["'][^>]*>/gi, "");
		body = body.replace(/<link[^>]*href\s*=\s*["'][^"']*\.(woff|woff2|ttf|eot|otf)["'][^>]*>/gi, "");

		// Remove <style> elements
		body = body.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

		// Remove <form> elements
		body = body.replace(/<\/?form[^>]*?>/gi, "");

		// Remove <input> elements
		body = body.replace(/<input[^>]*?\/?>/gi, "");

		// Remove "<audio src='https://samples.audible.com/*></audio>" elements
		body = body.replace(/<audio src='https:\/\/samples\.audible\.com\/[^>]*?\/?><\/audio>/gi, "");
	} catch (e) {
		console.error("filterArticle: Error filtering elements from body:", e.message);
	}
	return body; // Return the filtered body
}

/**
 * Transforms image URLs based on specific patterns, handling all relevant image attributes
 * @param {Node} node - DOM node containing content
 * @param {String} baseuri - Base URI for resolving relative links
 * @param {Number} type - Content type indicator
 */
function transformImageURLs(node, baseuri, type)
{
	// Get node type attribute
	var nType = node.getAttribute("type");

	// Define URL patterns and their replacements to use across all content types
	var urlPatterns = [
		{
			pattern: "/i0.wp.com/",
			replacement: "/"
		},
		{
			pattern: "/i1.wp.com/",
			replacement: "/"
		},
		{
			pattern: "/i2.wp.com/",
			replacement: "/"
		},
		{
			pattern: "/i3.wp.com/",
			replacement: "/"
		},
		{
			pattern: "/m.media-amazon.com/",
			replacement: "/wsrv.nl/?url=https://m.media-amazon.com/"
		},
		{
			pattern: "/images-na.ssl-images-amazon.com/",
			replacement: "/wsrv.nl/?url=https://images-na.ssl-images-amazon.com/"
		},
		{
			pattern: "/items.gog.com/",
			replacement: "/wsrv.nl/?url=https://items.gog.com/"
		},
		{
			pattern: "/images.gog-statics.com/",
			replacement: "/wsrv.nl/?url=https://images.gog-statics.com/"
		},
		{
			pattern: "/cdn.cloudflare.steamstatic.com/",
			replacement: "/wsrv.nl/?url=https://cdn.cloudflare.steamstatic.com/"
		},
		{
			pattern: "/i.redd.it/",
			replacement: "/wsrv.nl/?url=https://i.redd.it/"
		},
		{
			pattern: "/cdn.kobo.com/",
			replacement: "/wsrv.nl/?url=https://cdn.kobo.com/"
		},
		{
			pattern: "/blogger.googleusercontent.com/img/",
			replacement: "/wsrv.nl/?url=https://blogger.googleusercontent.com/img/"
		},
		{
			pattern: "/www.gravatar.com/",
			replacement: "/wsrv.nl/?url=https://www.gravatar.com/"
		},
		{
			pattern: "/secure.gravatar.com/",
			replacement: "/wsrv.nl/?url=https://secure.gravatar.com/"
		}
	];

	// Define all image attributes that should be processed
	const imageAttributes = [
		"src",
		"srcset",
		"data-src",
		"data-srcset",
		"data-original",
		"data-lazy",
		"data-lazy-src",
		"data-lazy-srcset",
		"loading-src"
	];

	// Process xhtml content
	if (nType == "xhtml")
	{
		// Get all image elements in the xhtml content
		var imgElements = node.getElementsByTagNameNS(XHTML, "img");
		// console.debug("Found image elements:", imgElements.length);

		// Process each image element
		for (var i = 0; i < imgElements.length; i++)
		{
			try
			{
				// Log the current image element
				// console.debug("Processing image element:", imgElements[i]);

				// Process each relevant attribute
				for (var k = 0; k < imageAttributes.length; k++)
				{
					var attrName = imageAttributes[k];

					if (imgElements[i].hasAttribute(attrName))
					{
						var attrValue = imgElements[i].getAttribute(attrName);
						var modified = false;

						// Check for each URL pattern
						for (var j = 0; j < urlPatterns.length; j++)
						{
							if (attrValue.includes(urlPatterns[j].pattern))
							{
								// Replace only the matching part of the URL
								attrValue = attrValue.replace(urlPatterns[j].pattern, urlPatterns[j].replacement);
								modified = true;
							}
						}

						// Update the attribute if modified
						if (modified)
						{
							imgElements[i].setAttribute(attrName, attrValue);
						}
					}
				}
			}
			catch (e)
			{
				console.error("Error processing xhtml image URL: " + e.name + "," + e.message, { e });
			}
		}
	}
	else if (type <= 1 || nType == "html" || nType == "text/html")
	{
		// Get the HTML text content
		var hText = node.textContent;

		// Create regex patterns for all image attributes we want to transform
		var imgAttributeRegexes = [];
		for (var k = 0; k < imageAttributes.length; k++)
		{
			var attrName = imageAttributes[k];
			// Create case-insensitive regex for attribute
			imgAttributeRegexes.push(new RegExp(attrName + '\\s*=\\s*(["\'])(.*?)\\1', 'gi'));
		}

		// Process all image tags
		var imgTagRegex = /<img\s+[^>]*>/gi;
		var imgTags = hText.match(imgTagRegex);

		if (imgTags)
		{
			for (var i = 0; i < imgTags.length; i++)
			{
				var imgTag = imgTags[i];
				var modifiedImgTag = imgTag;
				var wasModified = false;

				// Process each attribute type
				for (var k = 0; k < imgAttributeRegexes.length; k++)
				{
					var attrRegex = imgAttributeRegexes[k];
					var attrMatches;

					// Reset regex state
					attrRegex.lastIndex = 0;

					while ((attrMatches = attrRegex.exec(imgTag)) !== null)
					{
						var fullMatch = attrMatches[0];
						var quote = attrMatches[1];
						var attrValue = attrMatches[2];
						var attrModified = false;

						// Check if this is a srcset attribute that needs special handling
						if (fullMatch.toLowerCase().includes('srcset'))
						{
							// Split the srcset into individual sources
							var sources = attrValue.split(',');
							for (var s = 0; s < sources.length; s++)
							{
								var parts = sources[s].trim().split(' ');
								var url = parts[0];
								var descriptor = parts.length > 1 ? parts.slice(1).join(' ') : ''; // Preserve descriptors

								// Apply transformations to URL
								for (var j = 0; j < urlPatterns.length; j++)
								{
									if (url.includes(urlPatterns[j].pattern))
									{
										url = url.replace(urlPatterns[j].pattern, urlPatterns[j].replacement);
										attrModified = true;
									}
								}

								if (attrModified)
								{
									parts[0] = url;
									sources[s] = parts.join(' ');
								}
							}

							if (attrModified)
							{
								var newAttrValue = sources.join(', ');
								modifiedImgTag = modifiedImgTag.replace(
									fullMatch,
									fullMatch.replace(attrValue, newAttrValue)
								);
								wasModified = true;
							}
						}
						else
						{
							// Regular attribute handling
							var newAttrValue = attrValue;

							// Apply transformations
							for (var j = 0; j < urlPatterns.length; j++)
							{
								if (newAttrValue.includes(urlPatterns[j].pattern))
								{
									newAttrValue = newAttrValue.replace(
										urlPatterns[j].pattern,
										urlPatterns[j].replacement
									);
									attrModified = true;
								}
							}

							if (attrModified)
							{
								modifiedImgTag = modifiedImgTag.replace(
									fullMatch,
									fullMatch.replace(attrValue, newAttrValue)
								);
								wasModified = true;
							}
						}
					}
				}

				// Replace the image tag if it was modified
				if (wasModified)
				{
					hText = hText.replace(imgTag, modifiedImgTag);
				}
			}

			// Update the node's content if changes were made
			node.textContent = hText;
		}
	}
}

/**
 * Process lazy-loaded images at display time
 * This function applies all the lazy loading transformations but only at display time
 *
 * @param {Node} node - The DOM node containing content to process
 * @param {String} baseuri - Base URI for resolving relative paths
 * @return {Node} - The processed node with lazy loading resolved
 */
function processLazyLoading(node, baseuri)
{
	// Skip processing if feature disabled or missing parameters
	if (!node || !baseuri || !gOptions.processLazyLoading)
	{
		console.warn("Invalid arguments to processLazyLoading:", {node: !!node, baseuri: !!baseuri});
		return node;
	}

	try {
		// console.debug("processLazyLoading: Processing node type:", node.nodeName, "with baseuri:", baseuri);

		// Define common lazy-loading attribute patterns
		const lazyPatterns = [
			{
				attr: "data-src",
				replacement: "src"
			},
			{
				attr: "data-srcset",
				replacement: "srcset"
			},
			{
				attr: "data-lazy",
				replacement: "src"
			},
			{
				attr: "data-lazy-src",
				replacement: "src"
			},
			{
				attr: "data-lazy-srcset",
				replacement: "srcset"
			},
			{
				attr: "lazy-src",
				replacement: "src"
			},
			{
				attr: "data-original",
				replacement: "src"
			},
			{
				attr: "data-sizes",
				replacement: "sizes"
			},
			{
				attr: "data-src-mobile",
				replacement: "src"
			},
			{
				attr: "data-bg",
				replacement: "style",
				transform: value => `background-image: url('${value}')`
			},
			{
				attr: "data-background-image",
				replacement: "style",
				transform: value => `background-image: url('${value}')`
			},
			{
				attr: "loading",
				removal: true  // This attribute will be removed entirely
			},
			{
				attr: "data-lazyloaded",
				removal: true
			},
			{
				attr: "data-placeholder-resp",
				removal: true
			},
			{
				attr: "decoding",
				removal: true
			},
			{
				attr: "fetchpriority",
				removal: true
			}
		];

		// Get node type
		var nType = node.getAttribute("type");

		// Process based on content type
		if (nType == "xhtml" || node.namespaceURI === XHTML)
		{
			// Get all relevant elements that might have lazy loading attributes
			var mediaElements = [];

			try {
				// Find all elements that might have lazy loading attributes
				var imgElements = node.getElementsByTagName("img");
				var pictureElements = node.getElementsByTagName("picture");
				var sourceElements = node.getElementsByTagName("source");
				var iframeElements = node.getElementsByTagName("iframe");
				var divElements = node.getElementsByTagName("div");

				// Add all found elements to our collection
				for (var i = 0; i < imgElements.length; i++) mediaElements.push(imgElements[i]);
				for (var i = 0; i < pictureElements.length; i++) mediaElements.push(pictureElements[i]);
				for (var i = 0; i < sourceElements.length; i++) mediaElements.push(sourceElements[i]);
				for (var i = 0; i < iframeElements.length; i++) mediaElements.push(iframeElements[i]);
				for (var i = 0; i < divElements.length; i++) mediaElements.push(divElements[i]);

				// console.debug("processLazyLoading: Found", mediaElements.length, "potential lazy-loaded elements");
			} catch (e) {
				console.error("Error finding media elements:", e.message);
			}

			// Process each element
			for (var i = 0; i < mediaElements.length; i++)
			{
				var element = mediaElements[i];
				try
				{
					// Check if this is a lazy-loaded image with a placeholder in src
					var hasDataSrc = element.hasAttribute("data-src") ||
									 element.hasAttribute("data-lazy-src") ||
									 element.hasAttribute("lazy-src");
					var srcIsPlaceholder = false;

					if (hasDataSrc && element.hasAttribute("src"))
					{
						var srcValue = element.getAttribute("src");
						// Improved placeholder detection
						if (srcValue.startsWith("data:"))
						{
							// Check if it's a base64 or SVG placeholder
							if (srcValue.includes("base64") || srcValue.includes("svg"))
							{
								// Estimate the decoded size of the base64 content
								var contentStart = srcValue.indexOf(",") + 1;
								var base64Content = srcValue.substring(contentStart);
								// If base64 content is small, it's likely a placeholder
								srcIsPlaceholder = base64Content.length < 1000;
							}
						}
					}

					// Process each lazy loading pattern
					for (var j = 0; j < lazyPatterns.length; j++)
					{
						var pattern = lazyPatterns[j];
						if (element.hasAttribute(pattern.attr))
						{
							if (pattern.removal)
							{
								// Remove attributes like 'loading="lazy"'
								element.removeAttribute(pattern.attr);
							}
							else
							{
								// Move value from lazy attribute to standard attribute
								var value = element.getAttribute(pattern.attr);
								if (value)
								{
									// Only replace src if it's a placeholder or we don't have a src attribute
									if (pattern.replacement === "src" &&
										element.hasAttribute("src") &&
										!srcIsPlaceholder)
									{
										// Keep existing src if it's not a placeholder
									}
									else
									{
										// Apply any transformation function if provided
										if (pattern.transform) {
											value = pattern.transform(value);
										}

										// Resolve URL if needed for src attributes
										if ((pattern.replacement === "src" ||
											 pattern.replacement === "srcset") &&
											!value.startsWith("data:") &&
											!value.match(/^(https?|ftp):/i)) {
											try {
												value = resolveUrl(value, baseuri);
											} catch(e) {
												console.error("Error resolving URL:", e.message);
											}
										}

										element.setAttribute(pattern.replacement, value);
									}
									element.removeAttribute(pattern.attr);
								}
							}
						}
					}

					// If src is a placeholder and we have a data-src, replace src with data-src value
					if (srcIsPlaceholder)
					{
						var newSrc = null;
						// Check multiple data-src attributes in order of preference
						if (element.hasAttribute("data-src"))
							newSrc = element.getAttribute("data-src");
						else if (element.hasAttribute("data-lazy-src"))
							newSrc = element.getAttribute("data-lazy-src");
						else if (element.hasAttribute("lazy-src"))
							newSrc = element.getAttribute("lazy-src");

						if (newSrc) {
							// Resolve URL if it's relative
							if (!newSrc.startsWith("data:") && !newSrc.match(/^(https?|ftp):/i)) {
								try {
									var resolved = resolveUrl(newSrc, baseuri);
									if (resolved) {
										newSrc = resolved;
									}
								} catch(e) {
									console.error("Error resolving lazy-loaded URL:", e.message);
								}
							}
							element.setAttribute("src", newSrc);

							// Remove all data-src variants to avoid confusion
							element.removeAttribute("data-src");
							element.removeAttribute("data-lazy-src");
							element.removeAttribute("lazy-src");
						}
					}

					// Remove common lazy-loading classes
					if (element.hasAttribute("class"))
					{
						var classes = element.getAttribute("class").split(" ");
						var newClasses = [];

						for (var k = 0; k < classes.length; k++) {
							var cls = classes[k];
							if (!/lazy|lazyload|lazy-load|lazyloaded/.test(cls)) {
								newClasses.push(cls);
							}
						}

						if (newClasses.length > 0) {
							element.setAttribute("class", newClasses.join(" "));
						} else {
							element.removeAttribute("class");
						}
					}
				}
				catch (e)
				{
					console.error("Error processing element:", e.message, "Element:", element.tagName);
					// Continue with next element
				}
			}
		}
		// For HTML string content
		else if (node.textContent)
		{
			try {
				var hText = node.textContent;

				// Enhanced regex for matching lazy-loaded elements
				var lazyAttributePattern = 'data-src|data-srcset|data-lazy|data-lazy-src|data-original|data-sizes|data-lazyloaded|data-placeholder-resp|loading=["\'](lazy|auto)["\']|fetchpriority|lazy-src|data-bg|data-background-image';
				var lazyElementRegex = new RegExp(`<(img|picture|source|iframe|div)[^>]+(${lazyAttributePattern})[^>]*>`, 'gi');

				// Process each matched element
				hText = hText.replace(lazyElementRegex, function(match) {
					var modifiedTag = match;
					// console.debug("processLazyLoading: Processing HTML tag:", match.substring(0, 50) + (match.length > 50 ? "..." : ""));

					// Check if this is a lazy-loaded image with a placeholder in src
					var dataSrcMatch = modifiedTag.match(/data-src\s*=\s*["']([^"']+)["']/i) ||
										modifiedTag.match(/data-lazy-src\s*=\s*["']([^"']+)["']/i) ||
										modifiedTag.match(/lazy-src\s*=\s*["']([^"']+)["']/i);
					var srcMatch = modifiedTag.match(/src\s*=\s*["']([^"']+)["']/i);

					var srcIsPlaceholder = false;
					if (dataSrcMatch && srcMatch) {
						var srcValue = srcMatch[1];
						// Improved placeholder detection
						if (srcValue.startsWith("data:"))
						{
							// Check if it's a base64 or SVG placeholder
							if (srcValue.includes("base64") || srcValue.includes("svg"))
							{
								// Estimate the decoded size of the base64 content
								var contentStart = srcValue.indexOf(",") + 1;
								var base64Content = srcValue.substring(contentStart);
								// If base64 content is small, it's likely a placeholder
								srcIsPlaceholder = base64Content.length < 1000;
							}
						}
					}

					// Process each lazy loading pattern
					for (var i = 0; i < lazyPatterns.length; i++) {
						var pattern = lazyPatterns[i];
						var attrRegex = new RegExp(`${pattern.attr}\\s*=\\s*["']([^"']+)["']`, 'i');
						var attrMatch = modifiedTag.match(attrRegex);

						if (attrMatch) {
							if (pattern.removal) {
								// Remove the attribute entirely
								modifiedTag = modifiedTag.replace(attrRegex, '');
							} else {
								// Replace lazy attribute with standard one
								var value = attrMatch[1];

								// Special handling for src attribute
								if (pattern.replacement === "src" && srcMatch && !srcIsPlaceholder) {
									// Keep existing src if it's not a placeholder
									modifiedTag = modifiedTag.replace(attrRegex, '');
								} else {
									// Apply any transformation if provided
									var newValue = value;
									if (pattern.transform) {
										newValue = pattern.transform(value);
									}

									// Resolve URLs for image sources if needed
									if ((pattern.replacement === "src" || pattern.replacement === "srcset") &&
										!newValue.startsWith("data:") &&
										!newValue.match(/^(https?|ftp):/i)) {
										try {
											newValue = resolveUrl(newValue, baseuri);
										} catch(e) {
											console.error("Error resolving URL in HTML:", e.message);
										}
									}

									if (pattern.replacement === "style" && modifiedTag.includes("style=")) {
										// Append to existing style attribute
										modifiedTag = modifiedTag.replace(/style\s*=\s*["']([^"']*)["']/i,
																		`style="$1; ${newValue}"`);
									} else {
										// Set as new attribute
										modifiedTag = modifiedTag
											.replace(attrRegex, `${pattern.replacement}="${newValue}"`)
											.replace(/\s+/g, ' ');
									}
								}
							}
						}
					}

					// If src is a placeholder and we have a data-src, replace src with data-src value
					if (srcIsPlaceholder && dataSrcMatch)
					{
						var newSrc = dataSrcMatch[1];
						// Resolve URL if baseuri is provided and URL is relative
						if (!newSrc.startsWith("data:") && !newSrc.match(/^(https?|ftp):/i))
						{
							try
							{
								newSrc = resolveUrl(newSrc, baseuri);
							}
							catch(e)
							{
								console.error("Error resolving lazy-loaded URL in HTML:", e.message);
							}
						}
						modifiedTag = modifiedTag.replace(/src\s*=\s*["'][^"']+["']/i, `src="${newSrc}"`);
					}

					// Remove lazy loading related classes
					modifiedTag = modifiedTag.replace(/class\s*=\s*["']([^"']+)["']/i, function(classMatch, classes)
					{
						var classParts = classes.split(/\s+/);
						var filteredClasses = [];

						for (var i = 0; i < classParts.length; i++)
						{
							if (!/lazy|lazyload|lazy-load|lazyloaded/.test(classParts[i]))
							{
								filteredClasses.push(classParts[i]);
							}
						}

						return filteredClasses.length > 0 ? `class="${filteredClasses.join(' ')}"` : '';
					});

					return modifiedTag;
				});

				node.textContent = hText;
			} catch (e) {
				console.error("Error processing HTML lazy loading:", e.message);
			}
		}
 /*
		// Call transformImageURLs after processing lazy loading
		if (gOptions.transformImageURLs)
		{
		transformImageURLs(node, baseuri, nType);
		}
*/
		// console.debug("processLazyLoading: Completed processing");
		return node;
	} catch (e) {
		console.error("Error in processLazyLoading:", e.message, e.stack);
		return node; // Return original node if processing fails
	}
}

/**
 * Temporary debugging function to trace empty URL sources
 * Remove after debugging is complete
 */
function traceEmptyUrlCalls()
{
	// Store original function
	const originalResolveUrl = resolveUrl;

	// Replace with instrumented version
	window.resolveUrl = function(url, baseUri)
	{
		if (!url)
		{
			console.error("EMPTY URL TRACE - Called from:", new Error().stack);
		}
		if (url == '/')
		{
			console.error("'/' URL TRACE - Called from:", new Error().stack);
		}
		return originalResolveUrl(url, baseUri);
	};

	console.log("URL tracing enabled");
// Call this function early in the application startup
// traceEmptyUrlCalls();
}
