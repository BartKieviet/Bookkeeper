// This is a content script, it runs on main.php but it is NOT injected by the
// manifest, it's only loaded when the user clicks on the OPEN button.  It
// requires overview.js, filter.js, table.js, building.js... the whole thing.

// From other files:
var Building, Overview;

// Globals
var ukey, openButton, overlay;

ukey = document.location.hostname[0].toUpperCase();

// The first time this runs, it is assumed that a click on OPEN just happened,
// and nav.js already removed its event handler.  So we react to the click, and
// also install our own handler, to catch all further clicks on that button.

openButton = document.getElementById( 'bookkeeper-overview-toggle' );
openButton.addEventListener( 'click', onClick, false );
onClick();

function onClick( event ) {
	var overview;

	if ( event )
		event.preventDefault();

	if ( overlay ) {
		// Hide the overview and restore the button.
		overlay.remove();
		overlay = undefined;
		openButton.classList.remove( 'on' );
	}
	else {
		openButton.disabled = true;
		openButton.classList.add( 'on' );
		overlay = document.createElement( 'div' );
		overlay.id = 'bookkeeper-overlay';

		overview = new Overview(
			ukey, document,
			{ storageKey: 'Nav', mode: 'compact' } );
		overview.configure( undefined, onReady );
	}

	function onReady( table ) {
		overlay.appendChild( overview.container );
		document.body.appendChild( overlay );
		openButton.disabled = false;
	}
}
