// So this runs on the bbox page.  This is not a content script, it's a regular
// script, much like options.js, it's loaded into an HTML page via the script
// tag etc.  And it runs in the extension's context, so it has access to all
// chrome.* APIs.

// We have access to Building because bbox.html loads it before us.
var Building;

document.addEventListener( 'DOMContentLoaded', onDOM, false );

// End of script execution.

function onDOM() {
	chrome.runtime.sendMessage( { op: 'queryPopUpData' }, onHaveData );
}

function onHaveData( data ) {
	var e = document.createElement( 'h1' );
	e.textContent = 'Hello!';
	document.body.appendChild( e );

	e = document.createElement( 'p' );
	e.textContent = 'It is now ' + Building.now() + ' seconds past Jan 1 1970 00:00';
	document.body.appendChild( e );

	e = document.createElement( 'p' );
	e.textContent = "We're supposed to show building " + data;
	document.body.appendChild( e );

	chrome.storage.sync.getBytesInUse(null, onKnownBytesInUse );

	function onKnownBytesInUse( bytes ) {
		var p = document.createElement( 'p' );
		p.textContent = 'Bytes in use: ' + bytes;
		document.body.appendChild( p );
	}
}
