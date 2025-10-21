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
 * The Original Code is Newsfox.
 *
 * The Initial Developer of the Original Code is
 * Ron Pruitt <wa84it@gmail.com>.
 * Portions created by the Initial Developer are Copyright (C) 2007-2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Andy Frank <andy@andyfrank.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

const YRS10 = 1000*60*60*24*365.25*10;  // close enough

const FEED_NAME = [ null, "rss", "feed", "feed" ];
var NS = [ "http://purl.org/rss/1.0/", null, "http://purl.org/atom/ns#", "http://www.w3.org/2005/Atom" ];
const XHTML = "http://www.w3.org/1999/xhtml";
const XHTML_TRANS_DOCTYPE = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';
const XHTML_STRICT_DOCTYPE = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">';
const DC = "http://purl.org/dc/elements/1.1/";
const CONTENT = "http://purl.org/rss/1.0/modules/content/";
const MEDIA = "http://search.yahoo.com/mrss/";
const RDF_NS = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const CHANNEL_NAME = [ "channel", "channel", "feed", "feed" ];
const ENTRY_NAME = [ "item", "item", "entry", "entry" ];
const ID_NAME = [ "guid", "guid", "id", "id" ];
const CONTENT_NAME = [ "description", "description", "content", "content" ];
const DATE_NAME = [ "date", "pubDate", "issued", "updated" ];
const DATE_NAME2 = [ "", "", "modified", "published" ];
const CATEGORY_NAME = [ "subject", "category", "category", "category" ];
const FEED_AUTHOR = [ "", "managingEditor", "author", "author" ];
const ITEM_AUTHOR = [ "", "author", "author", "author" ];
const HREF_NAME = [ "url", "url", "href", "href" ];

// Updated to include all tags that need link resolution
const TAG_NAME = [ "a", "area", "link", "img", "source", "video", "audio", "object", "embed", "script", "iframe", "picture", "svg", "canvas" ];
const ATTR_NAME = [ "href", "src", "srcset", "data-src", "data-srcset" ];

/**
 * Parser for RSS and Atom feeds
 * @param {Object} xml - The XML document to parse
 * @param {string} baseUrl - Base URL for resolving relative URLs
 */
function Parser2(xml, baseUrl)
{
	this.title = null;
	this.link = null;
	this.items = new Array();

	// type: 0=RSS1.0, 1=RSS2.0, 2=atom0.3, 3=atom1.0
	this.parse = function(xml, type, baseUrl)
	{
		var channel = xml.getElementsByTagNameNS(NS[type], CHANNEL_NAME[type]);

		// Check if channel is empty
		if (!channel || channel.length === 0)
		{
			console.error("Parser2: No channel found in the provided XML.");
			return; // Gracefully return
		}

		// BASE
		var baseuri =
		{
			spec: baseUrl || '',
			resolve: function(relativeUrl)
			{
				return resolveUrl(relativeUrl, this.spec);
			}
		};

		if (baseuri && baseuri.spec)
		{
			baseuri = adjustBase(baseuri, "/");
		}
		baseuri = getBaseURI(channel[0], baseuri, type);

		// TITLE
		var title = channel[0].getElementsByTagNameNS(NS[type], "title");
		if (title.length > 0) this.title = getText(title[0]);

		// HOMEPAGE
		var uri = getLink(channel[0], baseuri, type);
		if (uri) this.link = uri.spec;

		// FEED AUTHOR
		var feedAuthor = getAuthor(channel[0], type, true);

		// ITEMS:
		var now = new Date();
		var itemContainer = (type == 0) ? xml : channel[0];
		var items = itemContainer.getElementsByTagNameNS(NS[type], ENTRY_NAME[type]);
		for (var i = 0; i < items.length; i++)
		{
			var item = new Article();
			// ITEM:BASE
			var itembase = getBaseURI(items[i], baseuri, type);
			// ITEM:TITLE
			title = items[i].getElementsByTagNameNS(NS[type], "title");
			for (var j = 0; j < title.length; j++)
				if (title[j].parentNode == items[i]) item.title = getXhtml(fixLinks(title[j], itembase, type), type);
			// ITEM:LINK
			var uri = getLink(items[i], itembase, type);
			// need spec instead of resolve to pick up # anchors in link
			if (uri) item.link = uri.spec;
			if (!item.link) item.link = NO_LINK;
			// ITEM:ID
			var id = items[i].getElementsByTagNameNS(NS[type], ID_NAME[type]);
			for (var j = 0; j < id.length; j++)
				if (id[j].parentNode == items[i]) item.id = getText(id[j]);
			if (!item.id && item.link != NO_LINK) item.id = item.link;
			if (item.id && item.id.substring(0, 5) == "http:" && item.link == NO_LINK)
				item.link = (uri) ? uri.resolve(item.id) : item.id;
			// ITEM:BODY
			var body = items[i].getElementsByTagNameNS(NS[type], CONTENT_NAME[type]);
			if (body.length > 0)
				item.body = getXhtml(fixLinks(body[0], itembase, type), type);
			if (!item.body && type >= 2)  // atom
			{
				var body = items[i].getElementsByTagNameNS(NS[type], "summary");
				if (body.length > 0)
				{
					item.body = getXhtml(fixLinks(body[0], itembase, type), type);
					if (!item.body)
						item.body = getText(fixLinks(body[0], itembase, type));
				}
			}
			if (type < 2)  // rss
			{
				var body = items[i].getElementsByTagNameNS(CONTENT, "encoded");
				if (body.length > 0) item.body = getText(fixLinks(body[0], itembase, type));
			}
			// ITEM:DATE
			item.date = NO_DATE;
			var index = 0;
			var idate = items[i].getElementsByTagNameNS(NS[type], DATE_NAME[type]);
			if (idate.length == 0 && type >= 2)
			{
				idate = items[i].getElementsByTagNameNS(NS[type], DATE_NAME2[type]);
				index = 1;
			}
			if (idate.length == 0)
			{
				idate = items[i].getElementsByTagNameNS(DC, "date");
				index = 2;
			}
			var dateIndex = -1;
			for (var j = 0; j < idate.length; j++)
				if (idate[j].parentNode == items[i]) dateIndex = j;
			if (dateIndex != -1)
				if (index == 0 && type == 1)
					item.date = setRFCDate(getText(idate[dateIndex]));
				else
					item.date = setTZDate(getText(idate[dateIndex]));
			// date adjustment
			if (!gOptions.dateNoneStrict && item.date < TOP_NO_DATE
				&& item.date > TOP_INVALID_DATE) item.date = now;
			if (!gOptions.dateInvalidStrict && item.date < TOP_INVALID_DATE
				&& item.date > TOP_FUTURE_DATE) item.date = now;
			if (item.date - now > 10 * 60 * 1000)   // 10 minutes
			{
				if (gOptions.dateFutureStrict)
					while (item.date >= TOP_FUTURE_DATE)
						item.date = new Date(item.date - YRS10);
				else
					item.date = now;
			}
			// ITEM:CATEGORIES
			var cats = items[i].getElementsByTagNameNS(NS[type], CATEGORY_NAME[type]);
			if (cats.length == 0 && type <= 1)
				cats = items[i].getElementsByTagNameNS(DC, "subject");
			var cat = "";
			var newcat;
			for (var j = 0; j < cats.length; j++)
			{
				if (type < 2)
					newcat = getText(cats[j]);
				else
					newcat = cats[j].getAttribute("term");
				newcat = newcat.replace(/\//g, "&#047;");
				cat = mergeCats(cat, newcat, null);
			}
			item.category = cat;
			// ITEM:ENCLOSURES
			if (type < 2)
			{
				var enc = items[i].getElementsByTagNameNS(NS[type], "enclosure");
				for (var j = 0; j < enc.length; j++)
					item.enclosures.push(newEncl(enc[j], HREF_NAME[type]));
			}
			else
			{
				var enc = items[i].getElementsByTagNameNS(NS[type], "link");
				for (var j = 0; j < enc.length; j++)
					if (enc[j].hasAttribute("rel") && enc[j].getAttribute("rel") == "enclosure")
						item.enclosures.push(newEncl(enc[j], HREF_NAME[type]));
			}
			var mediaContent = items[i].getElementsByTagNameNS(MEDIA, "content");
			for (var j = 0; j < mediaContent.length; j++)
				if (mediaContent[j].hasAttribute("url") && mediaContent[j].getAttribute("url") != "")
					item.enclosures.push(newEncl(mediaContent[j], "url"));
			// ITEM:SOURCE
			var source = items[i].getElementsByTagNameNS(NS[type], "source");
			if (source.length > 0)
				if (type < 2)  // RSS
				{
					item.source.name = getText(source[0]);
					if (source[0].hasAttribute("url"))
						item.source.url = source[0].getAttribute("url");
				}
				else
				{
					var titleArray = source[0].getElementsByTagNameNS(NS[type], "title");
					if (titleArray.length > 0)
						item.source.name = getXhtml(titleArray[0], type);
					else
						item.source.name = "...";
					var uri = getLink(source[0], itembase, type);
					if (uri) item.source.url = uri.spec;
				}

			// ITEM:AUTHOR
			item.author = getAuthor(items[i], type, false);
			if (!item.author) item.author = feedAuthor;
			if (!item.author) item.author = "";

/*            // Call transformImageURLs on the item body after parsing
			if (item.body)
			{
				var tempNode = document.createElement('div');
				tempNode.innerHTML = item.body; // Convert body to a DOM node
				if (gOptions.transformImageURLs)
				{
					transformImageURLs(tempNode, baseuri.spec, type); // Transform image URLs
				}
				item.body = tempNode.innerHTML; // Update the body with transformed content
			}
*/
			this.items.push(item);
		}
	}

	// MAIN
	var root = xml.documentElement.localName.toLowerCase();
	var type = -1;
	var errortype = ERROR_OK;
	for (var i = 1; i < 4; i++)
		if (xml.getElementsByTagNameNS(NS[i], FEED_NAME[i]).length) type = i;
	if (xml.getElementsByTagNameNS(RDF_NS, "RDF").length)
	{
		type = 0;
		var ns = xml.getElementsByTagNameNS(RDF_NS, "RDF")[0].getAttribute("xmlns");
		if (ns && ns != "null" && ns.length) NS[0] = ns;
	}
	if (type == -1)
		if (root == "parsererror") errortype = ERROR_INVALID_FEED_URL;
		else errortype = ERROR_UNKNOWN_FEED_FORMAT + root;
	if (errortype != ERROR_OK) throw errortype;
	this.parse(xml, type, baseUrl);
}

function getBaseURI(xml, base, type, feed)
{
	if (!xml || typeof base === 'undefined')
	{
		console.warn("Invalid inputs to getBaseURI:", { xml, base });
		return null;
	}

	// Convert base to URI-like object if it's a string
	let baseuri = base;
	if (typeof base === 'string' && base)
	{
		baseuri =
		{
			spec: base,
			resolve: function(relativeUrl)
			{
				return resolveUrl(relativeUrl, this.spec);
			}
		};
	}

	// Handle xml:base attribute
	if (xml.hasAttribute("xml:base"))
	{
		const xmlBase = xml.getAttribute("xml:base");
		baseuri = adjustBase(baseuri, xmlBase);
	}

	baseuri = getAtomSelfLink(xml, baseuri);
	return baseuri;
}

function adjustBase(baseuri, url)
{
	if (!url) return baseuri;

	try
	{
		// Get the spec from baseuri if it's an object
		const baseUriSpec = baseuri ? (typeof baseuri === 'object' ? baseuri.spec : baseuri) : null;

		// Resolve the URL
		var spec = resolveUrl(url, baseUriSpec);

		// Return a simple object with spec and resolve methods
		return {
			spec: spec,
			resolve: function(relativeUrl)
			{
				return resolveUrl(relativeUrl, this.spec);
			}
		};
	}
	catch(e)
	{
		console.error("Error in adjustBase:", e.message);
		return baseuri;
	}
}

function getAtomSelfLink(xml, baseuri)
{
	// Validate inputs
	if (!xml || !baseuri)
	{
		console.error("Invalid getAtomSelfLink input: xml (" + xml + ") and baseuri (" + baseuri + ") must be provided.", { xml, baseuri });
		// return baseuri;
	}

	var url = null;
	var links = xml.getElementsByTagNameNS(NS[3], "link");
	if (links.length == 0) return baseuri;

	for (var i = 0; i < links.length; i++)
	{
		if (links[i].parentNode == xml && links[i].hasAttribute("rel") && links[i].getAttribute("rel") == "self")
		{
			url = links[i].getAttribute("href");
			break;
		}
	}

	if (!url || url.includes("feeds.feedburner.com")) return baseuri;

	try
	{
		// Ensure baseuri.spec exists before using it
		const baseUriSpec = (baseuri && typeof baseuri.spec === 'string')
			? baseuri.spec
			: (typeof baseuri === 'string' ? baseuri : '');

		// Return a simple object with spec and resolve methods
		const resolvedUrl = resolveUrl(url, baseUriSpec);
		return {
			spec: resolvedUrl,
			resolve: function(relativeUrl)
			{
				return resolveUrl(relativeUrl, this.spec);
			}
		};
	}
	catch (e)
	{
		console.error("Error in getAtomSelfLink:", e.message);
	}

	return baseuri;
}

function getLink(xml, baseuri, type)
{
	// Validate inputs
	if (!xml || !baseuri)
	{
		console.error("Invalid getLink input: xml (" + xml + "), baseuri (" + baseuri + "), and type (" + type + ") must be provided.", { xml, baseuri, type });
		return null; // Return null if inputs are invalid
	}

	var url = null;
	var links = xml.getElementsByTagNameNS(NS[type], "link");

	if (links.length == 0) return url;

	if (type < 2) // RSS
	{
		for (var i = 0; i < links.length; i++)
		{
			if (links[i].parentNode == xml)
			{
				// First check for href attribute
				if (links[i].hasAttribute("href"))
				{
					url = links[i].getAttribute("href");
				}
				// Fallback to text content if no href
				else
				{
					url = getText(links[i]);
				}
				break;
			}
		}
	}
	else // Atom
	{
		for (var i = 0; i < links.length; i++)
		{
			if (links[i].parentNode == xml &&
				(!links[i].hasAttribute("rel") ||
				 links[i].getAttribute("rel") == "alternate" ||
				 links[i].getAttribute("rel") == "http://www.iana.org/assignments/relation/alternate"))
			{
				url = links[i].getAttribute("href");
				break;
			}
		}
	}

	// If a URL was found, resolve it
	if (url)
	{
		try
		{
			// Basic URL validation
			if (url.startsWith('javascript:') || url.startsWith('data:'))
			{
				console.warn("Potentially unsafe URL scheme detected:", url);
				return null;
			}

			// Ensure baseuri.spec exists before using it
			const baseUriSpec = (baseuri && typeof baseuri.spec === 'string')
				? baseuri.spec
				: (typeof baseuri === 'string' ? baseuri : '');

			// Return a simple object with spec and resolve methods
			const resolvedUrl = resolveUrl(url, baseUriSpec);
			return {
				spec: resolvedUrl,
				resolve: function(relativeUrl)
				{
					return resolveUrl(relativeUrl, this.spec);
				}
			};
		}
		catch (e)
		{
			console.error("Error resolving URL in getLink:", e);
			return null;
		}
	}

	return null;
}

function setRFCDate(rfcDate)
{
	var ndate = new Date(Date.parse(rfcDate));
	if (ndate == "Invalid Date") ndate = rescueRFCDate(rfcDate);
	return ndate;
}

function setTZDate(isoDate)
{
	try
	{
		// Check for "YYYY-MM-DD HH:MM:SS ±HHMM" format
		const traditionalFormat = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\s*([-+]\d{4})?$/;
		const match = isoDate.match(traditionalFormat);

		if (match)
	{
			// Convert to ISO 8601 format
			const [_, year, month, day, hour, minute, second, offset] = match;
			isoDate = `${year}-${month}-${day}T${hour}:${minute}:${second}${offset ? offset.slice(0,3) + ':' + offset.slice(3) : ''}`;
		}

		var dateTime = isoDate.split("T");
		var ymd = dateTime[0].split("-");
		for (var i=ymd.length; i<3; i++) ymd[i] = 1;
		var utc;
		if (dateTime.length > 1)
		{
			var timeSplitter = dateTime[1].match("[Z+-]");
			var timeOffset = dateTime[1].split(timeSplitter);
			var hms = timeOffset[0].split(":");
			for (var i=hms.length; i<3; i++) hms[i] = 0;  // hms.length<3 illegal
			utc = Date.UTC(ymd[0],ymd[1]-1,ymd[2],hms[0],hms[1],hms[2]);
			var mult = 0;
			if (timeSplitter == "+") mult = -1;
			else if (timeSplitter == "-") mult = 1;
			if (mult != 0)
			{
				var hm = timeOffset[1].split(":");
				// multiply since hm not integers
				utc = utc + mult*1000*(hm[0]*3600+hm[1]*60);
			}
		}
		else
			utc = Date.UTC(ymd[0],ymd[1]-1,ymd[2],0,0,0);
		var ndate = new Date(utc);
		if (ndate == "Invalid Date" || ymd[0] < 1970 || ymd[1] > 12 || ymd[2] > 31)
			ndate = INVALID_DATE;
		return ndate;
	}
	catch(e)
	{
		return INVALID_DATE;
	}
}

function fixLinks(node, baseuri, type)
{
	if (!node || !baseuri) return node;

	// Ensure we have a consistent baseuri object while preserving existing functionality
	const base = typeof baseuri === 'string' ?
		{
			spec: baseuri,
			resolve: function(relativeUrl)
			{
				return resolveUrl(relativeUrl, this.spec);
			}
		} : baseuri;

	// Validate base URI format - use spec if available
	const baseUriStr = base.spec || base;
	if (!baseUriStr || (typeof baseUriStr === 'string' && !baseUriStr.match(/^[a-z]+:/i)))
	{
		console.warn("fixLinks: Invalid base URI format:", baseUriStr);
		return node;
	}

	if (gOptions.fixyoutube1)
	{
		fixYoutube1(node, base, type);
	}

	if (gOptions.wmode)
	{
		adjustWmode(node, base, type);
	}

	if (gOptions.transformImageURLs)
	{
		transformImageURLs(node, base, type);
	}

	var nType = node.getAttribute("type");
	if (!gOptions.openInViewPane)
	{
		if (nType == "xhtml")
		{
			var kids = node.getElementsByTagNameNS(XHTML,"a");
			for (var j=0; j<kids.length; j++)
			{
				if (kids[j].hasAttribute("href"))
				{
					kids[j].setAttribute("target", "_blank");
				}
			}
		}
		else if (type <= 1 || nType == "html" || nType == "text/html")
		{
			var hText = node.textContent;
			if (hText == "") return node;
			hText = encodeNewlineInPreTag(hText);
			// needed to avoid <a\nhref=...
			hText = hText.replace(/\n/g," ");
			// hack, seem to need / in fixRelativeLinks, from bug#25459
			hText = hText.replace(/&#x2F;/g,"/");
			node.textContent = makeTarget_Blank(hText);
		}
	}

	// Get updated baseuri while maintaining URI object structure
	var updatedBase = getBaseURI(node, base, type);
	if (!updatedBase || NFgetPref("z.dontFixRelativeLinks", "bool", false))
	{
		console.error("fixLinks: Failed to get a valid base URI.",
		{
			node: node.nodeName,
			baseuri: updatedBase ? updatedBase.spec : updatedBase,
			type: type
		});
		return node;
	}

	if (nType == "xhtml")
	{
		for (var i=0; i<TAG_NAME.length; i++)
		{
			var kids = node.getElementsByTagNameNS(XHTML,TAG_NAME[i]);
			for (var j=0; j<kids.length; j++)
			{
				if (kids[j].hasAttribute(ATTR_NAME[i]))
				{
					try
					{
						var attrValue = kids[j].getAttribute(ATTR_NAME[i]);
						// Use the resolve method if available, otherwise fall back to resolveUrl
						var resolvedValue = updatedBase.resolve ?
							updatedBase.resolve(attrValue) :
							resolveUrl(attrValue, updatedBase.spec || updatedBase);
						kids[j].setAttribute(ATTR_NAME[i], resolvedValue);
					}
					catch (e)
					{
						console.error("Error resolving attribute value:", e.message,
						{
							attr: ATTR_NAME[i],
							value: attrValue
						});
					}
				}
			}
		}
	}
	else if (type <= 1 || nType == "html" || nType == "text/html")
	{
		try
		{
			var hText = node.textContent;
			if (!hText) return node;  // if node is empty and openInViewPane=true

			// Pass the proper base URI format to fixRelativeLinks
			node.textContent = fixRelativeLinks(
				hText,
				updatedBase.spec || updatedBase
			);
		}
		catch(e)
		{
			console.error("Error in fixLinks text processing:", e.message);
			return node;
		}
	}

	return node;
}

function encodeNewlineInPreTag(hText)
{
	var index = hText.length;
	var preStart, preEnd, begin, middle, end;
	while (index > -1)
	{
		preStart = hText.toLowerCase().lastIndexOf("<pre>", index);
		preEnd = hText.toLowerCase().indexOf("</pre>", preStart);
		if (preStart != -1 && preEnd != -1)
		{
			begin = hText.substring(0,preStart);
			end = hText.substring(preEnd);
			middle = hText.substring(preStart, preEnd).replace(/\n/g,"&#010;");
			hText = begin + middle + end;
		}
		index = preStart - 1;
	}
	return hText;
}

function makeTarget_Blank(hText)
{
	var index = hText.length;
	var indTarget, indGt, indHref;
	while (index > -1)
	{
		index = hText.toLowerCase().lastIndexOf("<a ",index);
		indTarget = hText.toLowerCase().indexOf("target=",index);
		indGt = hText.indexOf(">",index);
		indHref = hText.toLowerCase().indexOf("href=",index);
		if (indHref != -1 && indHref < indGt && index > -1)
		{
			if (indTarget != -1 && indTarget < indGt)
			{
				var indTargetEnd = hText.substring(indTarget).search(/\s|>/);
				hText = hText.substring(0,indTarget) + " target=\"_blank\" " + hText.substring(indTarget+indTargetEnd);
			}
			else
				hText = hText.substring(0,index+3) + " target=\"_blank\" " + hText.substring(index+3);
		}
		index--;
	}
	return hText;
}

/**
 * Resolves relative URLs in HTML content to absolute URLs using a base URI.
 *
 * @param {string} hText - The HTML text content to process
 * @param {string|object} baseuri - The base URI to resolve against, either as a string or an object with a 'spec' property
 * @returns {string} The HTML content with resolved URLs
 *
 * @throws {Error} Logs error if baseuri is invalid or missing
 *
 * @description
 * Processes HTML content and resolves relative URLs in various attributes:
 * - Standard link attributes (href, src)
 * - Responsive image attributes (srcset)
 * - Lazy-loading attributes (data-src, data-srcset)
 *
 * Handles multiple URL formats:
 * - Absolute URLs (left unchanged)
 * - Protocol-relative URLs (//example.com)
 * - Root-relative URLs (/path)
 * - Relative URLs (path/to/resource)
 *
 * Preserves:
 * - URL descriptors in srcset attributes
 * - Data URLs
 * - Original URLs if resolution fails
 */
function fixRelativeLinks(hText, baseuri)
{
	// Cache commonly used values
	const baseuriSpec = typeof baseuri === 'string' ? baseuri : (baseuri?.spec || null);

	if (!baseuriSpec)
	{
		console.error("fixRelativeLinks: Invalid or missing baseuri");
		return hText;
	}

	// Pre-compile regular expressions
	const tagRegexes = new Map();
	const srcsetRegex = /<img\s+[^>]*?srcset\s*=\s*(['"])([^'"]*)\1/gi;
	const dataSrcsetRegex = /<img\s+[^>]*?data-srcset\s*=\s*(['"])([^'"]*)\1/gi;

	// Process standard attributes more efficiently
	for (let i = 0; i < TAG_NAME.length; i++)
	{
		const tag = TAG_NAME[i];
		let attr;

		// Map tags to their primary attributes
		if (tag === "a" || tag === "area" || tag === "link")
		{
			attr = "href";
		}
		else if (tag === "img" || tag === "source")
		{
			attr = "src";
		}
		else
		{
			continue;
		}

		// Create and cache regex for this tag/attribute combination
		const regex = new RegExp(`<${tag}\\s+[^>]*?${attr}\\s*=\\s*(['"])([^'"]*?)\\1`, 'gi');
		tagRegexes.set(`${tag}-${attr}`, regex);

		// Single-pass replacement
		hText = hText.replace(regex, (match, quote, url) => {
			if (url.startsWith("#")) return match;
			if (url.startsWith("data:")) return match;
			if (url.startsWith("mailto:")) return match;
			if (url.startsWith("http://")) return match;
			if (url.startsWith("https://")) return match;
			if (url.startsWith("viber://")) return match;
			if (url.startsWith("javascript:")) return match;
			// if (url.indexOf('://') < url.indexOf('.')) return match;
			// console.debug("fixRelativeLinks Single-pass replacement: ", regex, (match, quote, url));

			try
			{
				const resolvedUrl = resolveUrl(url, baseuriSpec);
				return match.replace(quote + url + quote, quote + resolvedUrl + quote);
			}
			catch (e)
			{
				console.error(`Error resolving ${attr} URL:`, e.message,
							{ tag, attr, url, baseUri: baseuriSpec });
				return match;
			}
		});
	}

	// Helper function for processing srcset-style attributes
	const processSrcsetAttribute = (match, quote, srcsetValue) => {
		if (!srcsetValue) return match;

		try
		{
			const newSrcset = srcsetValue
				.split(',')
				.map(part => {
					const [url, ...descriptors] = part.trim().split(/\s+/);
					if (url.startsWith("data:")) return part.trim();
					return resolveUrl(url, baseuriSpec) + (descriptors.length ? ' ' + descriptors.join(' ') : '');
				})
				.join(', ');

			return match.replace(quote + srcsetValue + quote, quote + newSrcset + quote);
		}
		catch (e)
		{
			console.error("Error resolving srcset URLs:", e.message,
						 { srcsetValue, baseUri: baseuriSpec });
			return match;
		}
	};

	// Process srcset and data-srcset attributes
	hText = hText.replace(srcsetRegex, processSrcsetAttribute);
	hText = hText.replace(dataSrcsetRegex, processSrcsetAttribute);

	return hText; // Return the modified HTML text with resolved links
}

function getXhtml(node,type)
{
	var nType = node.getAttribute("type");
	if (nType == "xhtml")
	{
		var serializer = new XMLSerializer();
		var xml = "";
	// have to watch out for space before the atom <div>, can only be one <div>
		for (var i=0; i<node.childNodes.length; i++)
			if (node.childNodes[i].localName == "div")
				xml = serializer.serializeToString(node.childNodes[i]);
	// div can't be part of content, need to retain namespaces
		xml = changeDivToSpan(xml);
		return "<xhtml>" + stringTrim(xml) + "</xhtml>";
	}
	else if (type >=2 && (!nType || nType == "text"))
		return encodeHTML(getText(node));
	else
		return getText(node);
}

function changeDivToSpan(xml)
{
	var ind1 = xml.indexOf("<div");
	var ind2 = xml.indexOf(":div");
	var ind3 = xml.lastIndexOf("div>");
	var goodStart = false;
	var goodEnd = false;
	if (xml.length-ind3 == 4) goodEnd = true;
	if (ind1 == 0 || (ind1 == -1 || ind2 < ind1)) goodStart = true;
	if (goodStart && goodEnd)
	{
		if (ind1 == 0) xml = xml.replace("<div","<span");
		else xml = xml.replace(":div",":span");
		xml = xml.replace(/div>$/,"span>");
	}
	return xml;
}

function getText(node)
{
	var result = "";
	var walker = node.ownerDocument.createTreeWalker(node, NodeFilter.SHOW_CDATA_SECTION | NodeFilter.SHOW_TEXT, null, false);
	while(walker.nextNode()) result += walker.currentNode.nodeValue;
	return stringTrim(result);
}

function mergeCats(cat,newcat,rmcat)
{
	var ScatS = "\/";
	if (cat) ScatS += cat + "\/";
	if (newcat)
	{
		var newcatArray = newcat.split("\/");
		for (var i=0; i<newcatArray.length; i++)
		{
			var SnewcatS = "\/" + newcatArray[i] + "\/";
			if (ScatS.indexOf(SnewcatS) == -1) ScatS += SnewcatS;
		}
	}
	if (rmcat)
	{
		var rmcatArray = rmcat.split("\/");
		for (i=0; i<rmcatArray.length; i++)
		{
			var SrmcatS = "\/" + rmcatArray[i] + "\/";
			ScatS = ScatS.replace(SrmcatS,"\/");
		}
	}
	var Back = ScatS;
	while (Back.indexOf("\/\/") > -1) Back = Back.replace(/\/\//g, "\/");
	Back = Back.replace(/^\//, "");
	Back = Back.replace(/\/$/, "");
	var backArray = Back.split("\/");
	backArray.sort();
	Back = backArray.join("\/");
	return Back;
}

function newEncl(enc,hrefname)
{
	var encl = new Enclosure();
	encl.url = enc.getAttribute(hrefname);
	if (enc.hasAttribute("type")) encl.type = enc.getAttribute("type");
	if (enc.hasAttribute("length")) encl.length = enc.getAttribute("length");
	return encl;
}

/**
 * Get a human readable summary of error. (from Andy Frank)
 */
function getErrorSummary(code)
{
	const NF_SB = document.getElementById("newsfox-string-bundle");
	var strOK = NF_SB.getString('feed_ok');
	var strINVALID = NF_SB.getString('feed_invalid');
	var strUNKNOWN = NF_SB.getString('feed_format_unknown');
	var strSERVER = NF_SB.getString('feed_server_error');
	var strNOTFOUND = NF_SB.getString('feed_not_found');
	var strOTHER = NF_SB.getString('feed_other_error');
	switch (code.substring(0,1))
	{
		case ERROR_OK:
			return strOK;
		case ERROR_INVALID_FEED_URL:
			return strINVALID;
		case ERROR_UNKNOWN_FEED_FORMAT:
			return strUNKNOWN + ": " + code.substring(1);
		case ERROR_SERVER_ERROR:
			return strSERVER;
		case ERROR_NOT_FOUND:
			return strNOTFOUND;
		default: return strOTHER;
	}
}

/**
 * Get possible remedies for this error. (from Andy Frank)
 */
function getErrorRemedies(code)
{
	// TODO - break out into HTML referenced by ID
	const NF_SB = document.getElementById("newsfox-string-bundle");
	var remedyINVALID = NF_SB.getString('remedy_invalid');
	var remedyUNKNOWN = NF_SB.getString('remedy_format_unknown');
	var remedySERVER = NF_SB.getString('remedy_server_error');
	switch (code.substring(0,1))
	{
		case ERROR_OK:
		case ERROR_NOT_FOUND:
			return "";
		case ERROR_INVALID_FEED_URL:
			return remedyINVALID;
		case ERROR_UNKNOWN_FEED_FORMAT:
			return remedyUNKNOWN;
		case ERROR_SERVER_ERROR:
			return remedySERVER + ":\n\n" + code.substring(1);
		default: return code;
	}
}

function rescueRFCDate(rfcDate)
{
	try
	{
		var dateArray = rfcDate.split(" ");
		var yr = dateArray[3];
		if (yr.length == 2) yr = yr < 70 ? "20" + yr: "19" + yr;
		dateArray[3] = yr;
	// From Bernhard Schelling bug#17681
		if (dateArray.length == 6 && isNaN(dateArray[5]))
		{
			var timeZone = String(dateArray[5]).toUpperCase();
			if      (timeZone == 'ACDT') { dateArray[5] = '+1030'; }
			else if (timeZone == 'ACST') { dateArray[5] = '+0930'; }
			else if (timeZone == 'ADT')  { dateArray[5] = '-0300'; }
			else if (timeZone == 'AEDT') { dateArray[5] = '+1100'; }
			else if (timeZone == 'AEST') { dateArray[5] = '+1000'; }
			else if (timeZone == 'AHST') { dateArray[5] = '-1000'; }
			else if (timeZone == 'AKDT') { dateArray[5] = '-0800'; }
			else if (timeZone == 'AKST') { dateArray[5] = '-0900'; }
			else if (timeZone == 'AST')  { dateArray[5] = '-0400'; }
			else if (timeZone == 'AT')   { dateArray[5] = '-0200'; }
			else if (timeZone == 'AWDT') { dateArray[5] = '+0900'; }
			else if (timeZone == 'AWST') { dateArray[5] = '+0800'; }
			else if (timeZone == 'BST')  { dateArray[5] = '+0100'; }
			else if (timeZone == 'BT')   { dateArray[5] = '+0300'; }
			else if (timeZone == 'CAT')  { dateArray[5] = '-1000'; }
			else if (timeZone == 'CCT')  { dateArray[5] = '+0800'; }
			else if (timeZone == 'CEDT') { dateArray[5] = '+0200'; }
			else if (timeZone == 'CEST') { dateArray[5] = '+0200'; }
			else if (timeZone == 'CET')  { dateArray[5] = '+0100'; }
			else if (timeZone == 'CXT')  { dateArray[5] = '+0700'; }
			else if (timeZone == 'EADT') { dateArray[5] = '+1100'; }
			else if (timeZone == 'EAST') { dateArray[5] = '+1000'; }
			else if (timeZone == 'EEDT') { dateArray[5] = '+0300'; }
			else if (timeZone == 'EEST') { dateArray[5] = '+0300'; }
			else if (timeZone == 'EET')  { dateArray[5] = '+0200'; }
			else if (timeZone == 'FST')  { dateArray[5] = '+0200'; }
			else if (timeZone == 'FWT')  { dateArray[5] = '+0100'; }
			else if (timeZone == 'GST')  { dateArray[5] = '+1000'; }
			else if (timeZone == 'HAA')  { dateArray[5] = '-0300'; }
			else if (timeZone == 'HAC')  { dateArray[5] = '-0500'; }
			else if (timeZone == 'HADT') { dateArray[5] = '-0900'; }
			else if (timeZone == 'HAE')  { dateArray[5] = '-0400'; }
			else if (timeZone == 'HAP')  { dateArray[5] = '-0700'; }
			else if (timeZone == 'HAR')  { dateArray[5] = '-0600'; }
			else if (timeZone == 'HAST') { dateArray[5] = '-1000'; }
			else if (timeZone == 'HAT')  { dateArray[5] = '-0230'; }
			else if (timeZone == 'HAY')  { dateArray[5] = '-0800'; }
			else if (timeZone == 'HDT')  { dateArray[5] = '-0900'; }
			else if (timeZone == 'HNA')  { dateArray[5] = '-0400'; }
			else if (timeZone == 'HNC')  { dateArray[5] = '-0600'; }
			else if (timeZone == 'HNE')  { dateArray[5] = '-0500'; }
			else if (timeZone == 'HNP')  { dateArray[5] = '-0800'; }
			else if (timeZone == 'HNR')  { dateArray[5] = '-0700'; }
			else if (timeZone == 'HNT')  { dateArray[5] = '-0330'; }
			else if (timeZone == 'HNY')  { dateArray[5] = '-0900'; }
			else if (timeZone == 'HST')  { dateArray[5] = '-1000'; }
			else if (timeZone == 'IDLE') { dateArray[5] = '+1200'; }
			else if (timeZone == 'IDLW') { dateArray[5] = '-1200'; }
			else if (timeZone == 'IST')  { dateArray[5] = '+0100'; }
			else if (timeZone == 'JST')  { dateArray[5] = '+0900'; }
			else if (timeZone == 'MEST') { dateArray[5] = '+0200'; }
			else if (timeZone == 'MESZ') { dateArray[5] = '+0200'; }
			else if (timeZone == 'MET')  { dateArray[5] = '+0100'; }
			else if (timeZone == 'MEWT') { dateArray[5] = '+0100'; }
			else if (timeZone == 'MEZ')  { dateArray[5] = '+0100'; }
			else if (timeZone == 'NDT')  { dateArray[5] = '-0230'; }
			else if (timeZone == 'NFT')  { dateArray[5] = '+1130'; }
			else if (timeZone == 'NST')  { dateArray[5] = '-0330'; }
			else if (timeZone == 'NT')   { dateArray[5] = '-1100'; }
			else if (timeZone == 'NZDT') { dateArray[5] = '+1300'; }
			else if (timeZone == 'NZST') { dateArray[5] = '+1200'; }
			else if (timeZone == 'NZT')  { dateArray[5] = '+1200'; }
			else if (timeZone == 'SST')  { dateArray[5] = '+0200'; }
			else if (timeZone == 'SWT')  { dateArray[5] = '+0100'; }
			else if (timeZone == 'UTC')  { dateArray[5] = '-0000'; }
			else if (timeZone == 'WADT') { dateArray[5] = '+0800'; }
			else if (timeZone == 'WAT')  { dateArray[5] = '-0100'; }
			else if (timeZone == 'WEDT') { dateArray[5] = '+0100'; }
			else if (timeZone == 'WEST') { dateArray[5] = '+0100'; }
			else if (timeZone == 'WET')  { dateArray[5] = '-0000'; }
			else if (timeZone == 'WST')  { dateArray[5] = '+0800'; }
			else if (timeZone == 'YDT')  { dateArray[5] = '-0800'; }
			else if (timeZone == 'YST')  { dateArray[5] = '-0900'; }
			else if (timeZone == 'ZP4')  { dateArray[5] = '+0400'; }
			else if (timeZone == 'ZP5')  { dateArray[5] = '+0500'; }
			else if (timeZone == 'ZP6')  { dateArray[5] = '+0600'; }
			//Support for single letter military time zones
			else if (dateArray[5].length==1 && dateArray[5].match(/[A-I,K-Z]/))
			{
				var i = dateArray[5].charCodeAt(0);
				i = (i==90?0:i<74?i-64:i<78?i-65:77-i);
				dateArray[5] = (i<-9?'-':i<0?'-0':i<10?'+0':'+')+String(i<0?0-i:i)+'00';
			}
	 	}
		var newString = dateArray.join(" ");
		var ndate = new Date(Date.parse(newString));
		if (ndate == "Invalid Date") return INVALID_DATE;
		else return ndate;
	}
	catch(e) { return setTZDate(rfcDate); }
}

function getAuthor(node,type,isFeed)
{
	var authorDisplay = null;
	var author;
	if (isFeed)
		author = node.getElementsByTagNameNS(NS[type],FEED_AUTHOR[type]);
	else
		author = node.getElementsByTagNameNS(NS[type],ITEM_AUTHOR[type]);
	if (author.length > 0)
	{
		if (type > 1) // atom
		{
			var name = author[0].getElementsByTagNameNS(NS[type],"name");
			try { name = name[0].textContent; }
			catch(e) { name = ""; }
			var email = author[0].getElementsByTagNameNS(NS[type],"email");
			try { email = email[0].textContent; }
			catch(e) { email = null; }
			authorDisplay = name;
			if (email) authorDisplay += " (" + email + ")";
		}
	}
	else author = node.getElementsByTagNameNS(DC,"creator");
	if (!authorDisplay && author.length > 0) authorDisplay = getText(author[0]);
	if (authorDisplay == "")
		return null;
	else
		return authorDisplay;
}

function adjustWmode(node, baseuri,type)
{
	var nType = node.getAttribute("type");

	if (nType == "xhtml")
	{
		var kids = node.getElementsByTagNameNS(XHTML,"embed");
		for (var j=0; j<kids.length; j++)
				kids[j].setAttribute("wmode", "opaque");
	}
	else if (type <= 1 || nType == "html" || nType == "text/html")
	{
		var hText = node.textContent;
		if (hText == "") return node;
		node.textContent = makeWmode_Opaque(hText);
	}

	return node;
}

function makeWmode_Opaque(hText)
{
	var index = hText.length;
	var indTarget, indGt, indHref;
	while (index > -1)
	{
		index = hText.toLowerCase().lastIndexOf("<embed",index);
		if (hText.substring(index).search(/\s/) == 6)
		{
			indTarget = hText.toLowerCase().indexOf("wmode=",index);
			indGt = hText.indexOf(">",index);
			indHref = hText.toLowerCase().indexOf("href=",index);
			if (indTarget != -1 && indTarget < indGt)
			{
					var indTargetEnd = hText.substring(indTarget).search(/\s|>/);
					hText = hText.substring(0,indTarget) + " wmode=\"opaque\" " + hText.substring(indTarget+indTargetEnd);
			}
			else if (index != -1)
				hText = hText.substring(0,index+7) + " wmode=\"opaque\" " + hText.substring(index+7);
		}
		index--;
	}
	return hText;
}

function fixYoutube1(node, baseuri, type)
{
	var nType = node.getAttribute("type");

	if (nType == "xhtml")
	{
	}
	else if (type <= 1 || nType == "html" || nType == "text/html")
	{
		var hText = node.textContent;
		var index = hText.length;
		while (index > -1)
		{
			index = hText.lastIndexOf("www.youtube.com\/embed", index);
			if (index > -1)
			{
			try
			{
				var index1 = hText.lastIndexOf("iframe",index);
				var index2 = hText.indexOf("iframe",index+21);
				hText = hText.substring(0, index1) + "embed" + hText.substring(index1 + 6, index) + "www.youtube.com\/v" + hText.substring(index + 21, index2) + "embed" + hText.substring(index2 + 6);
//				hText = hText.substring(0,index) + "www.youtube.com\/v" + hText.substring(index+21);
				node.textContent = hText;
			}
			catch (e)
			{
			console.error("Error processing YouTube embed: " + e.name + "," + e.message, { e });
			}
			}
			index--;
		}
	}
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
			pattern: "/shared.cloudflare.steamstatic.com/",
			replacement: "/wsrv.nl/?url=https://shared.cloudflare.steamstatic.com/"
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
			pattern: "/secure.gravatar.com/avatar/",
			replacement: "/wsrv.nl/?url=https://secure.gravatar.com/avatar/"
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
					if (srcIsPlaceholder && dataSrcMatch) {
						var newSrc = dataSrcMatch[1];
						// Resolve URL if baseuri is provided and URL is relative
						if (!newSrc.startsWith("data:") && !newSrc.match(/^(https?|ftp):/i)) {
							try {
								newSrc = resolveUrl(newSrc, baseuri);
							} catch(e) {
								console.error("Error resolving lazy-loaded URL in HTML:", e.message);
							}
						}
						modifiedTag = modifiedTag.replace(/src\s*=\s*["'][^"']+["']/i, `src="${newSrc}"`);
					}

					// Remove lazy loading related classes
					modifiedTag = modifiedTag.replace(/class\s*=\s*["']([^"']+)["']/i, function(classMatch, classes) {
						var classParts = classes.split(/\s+/);
						var filteredClasses = [];

						for (var i = 0; i < classParts.length; i++) {
							if (!/lazy|lazyload|lazy-load|lazyloaded/.test(classParts[i])) {
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
