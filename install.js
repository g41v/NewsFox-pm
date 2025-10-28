var _____WB$wombat$assign$function_____ = function(name) {return (self._wb_wombat && self._wb_wombat.local_init && self._wb_wombat.local_init(name)) || self[name]; };
if (!self.__WB_pmw) { self.__WB_pmw = function(obj) { this.__WB_source = obj; return this; } }
{
  let window = _____WB$wombat$assign$function_____("window");
  let self = _____WB$wombat$assign$function_____("self");
  let document = _____WB$wombat$assign$function_____("document");
  let location = _____WB$wombat$assign$function_____("location");
  let top = _____WB$wombat$assign$function_____("top");
  let parent = _____WB$wombat$assign$function_____("parent");
  let frames = _____WB$wombat$assign$function_____("frames");
  let opener = _____WB$wombat$assign$function_____("opener");

// This code is heavily inspired by Chris Pederick (useragentswitcher) install.js
var contentFlag         = CONTENT | PROFILE_CHROME;
var localeFlag          = LOCALE | PROFILE_CHROME;
var skinFlag            = SKIN | PROFILE_CHROME;

var displayName         = "NewsFox"; // The name displayed to the user (don't include the version)
var version             = "1.1.0.0.0";

var name                = "newsfox"; // The leafname of the JAR file (without the .jar part)
var jarName             = name + ".jar";

var jarFolder           = "content/" + name + "/"

var error               = null;

var folder              = getFolder("Profile", "chrome");
var prefFolder          = getFolder(getFolder("Program", "defaults"), "pref");
var compFolder          = getFolder("Components");
var searchFolder        = getFolder("Plugins");

var locales             = new Array( "en-US", "ja-JP", "de-DE", "fr-FR", "ru-RU", "it-IT", "es-ES", "nl-NL", "zh-TW", "zh-CN", "tr-TR", "sk-SK", "pt-BR", "pl-PL", "hu-HU", "fi-FI", "et-EE", "cs-CZ", "bg-BG", "da-DK", "hy-AM", "sv-SE" );
//for (var i=0; i<locales.length; i++)
//	if (confirm(locales[i] + "?\n\nCancel moves to next")) break;
//var tmp = locales[0];
//locales[0] = locales[i];
//locales[i] = tmp;

var skins               = new Array( "classic" );
var prefs               = new Array(  );
var components          = new Array(  );
var searchPlugins       = new Array(  );

var existsInApplication = File.exists(getFolder(getFolder("chrome"), jarName));
var existsInProfile     = File.exists(getFolder(folder, jarName));

// Mozilla Suite/Seamonkey stores all pref files in a single directory
// under the application directory.  If the name of the preference file(s)
// is/are not unique enough, you may override other extension preferences.
// set this to true if you need to prevent this.
var disambiguatePrefs   = true;

// If the extension exists in the application folder or it doesn't exist
// in the profile folder and the user doesn't want it installed to the
// profile folder
if(existsInApplication ||
    (!existsInProfile &&
      !confirm( "Do you want to install the " + displayName +
                " extension into your profile folder?\n" +
                "(Cancel will install into the application folder)")))
{
    contentFlag = CONTENT | DELAYED_CHROME;
    folder      = getFolder("chrome");
    localeFlag  = LOCALE | DELAYED_CHROME;
    skinFlag    = SKIN | DELAYED_CHROME;
}

initInstall(displayName, name, version);
setPackageFolder(folder);
error = addFile(name, version, "chrome/" + jarName, folder, null);

// If adding the JAR file succeeded
if(error == SUCCESS)
{
	folder = getFolder(folder, jarName);
	registerChrome(contentFlag, folder, jarFolder);

	for (var i = 0; i < locales.length; i++)
		registerChrome(localeFlag, folder, "locale/" + locales[i] + "/");

	for (var i = 0; i < skins.length; i++)
		registerChrome(skinFlag, folder, "skin/" + skins[i] + "/" + name + "/");

	for (var i = 0; i < prefs.length; i++)
	{
		if (!disambiguatePrefs)
			addFile(name + " Defaults", version, "defaults/preferences/" + prefs[i], prefFolder, prefs[i], true);
		else
			addFile(name + " Defaults", version, "defaults/preferences/" + prefs[i], prefFolder, name + "-" + prefs[i], true);
	}

	for (var i = 0; i < components.length; i++)
		addFile(name + " Components", version, "components/" + components[i], compFolder, components[i], true);

	for (var i = 0; i < searchPlugins.length; i++)
		addFile(name + " searchPlugins", version, "searchplugins/" + searchPlugins[i], searchFolder, searchPlugins[i], true);

	error = performInstall();

	if(error != SUCCESS && error != REBOOT_NEEDED)
	{
		displayError(error);
		cancelInstall(error);
	}
	else
		alert("The installation of the " + displayName + " extension succeeded.");
}
else  // failed
{
	displayError(error);
	cancelInstall(error);
}

// Displays the error message to the user
function displayError(error)
{
    // If the error code was -215
    if(error == READ_ONLY)
    {
        alert("The installation of " + displayName +
            " failed.\nOne of the files being overwritten is read-only.");
    }
    // If the error code was -235
    else if(error == INSUFFICIENT_DISK_SPACE)
    {
        alert("The installation of " + displayName +
            " failed.\nThere is insufficient disk space.");
    }
    // If the error code was -239
    else if(error == CHROME_REGISTRY_ERROR)
    {
        alert("The installation of " + displayName +
            " failed.\nChrome registration failed.");
    }
    else
    {
        alert("The installation of " + displayName +
            " failed.\nThe error code is: " + error);
    }
}


}
