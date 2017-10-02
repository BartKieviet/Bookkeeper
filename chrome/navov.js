// This is a content script, it runs on main.php but it is NOT injected by the
// manifest, it's only loaded when the user clicks on the OPEN button.  It
// requires overview.js, filter.js, table.js, building.js... the whole thing.

// From other files:
var Building, Overview;

// Globals
var openButton, overviewElement;

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

	if ( overviewElement ) {
		// Hide the overview and restore the button.
		overviewElement.remove();
		overviewElement = undefined;
		openButton.classList.remove( 'on' );
	}
	else {
		openButton.disabled = true;
		openButton.classList.add( 'on' );
		overview = new Overview( 'P', document, 'Nav' );
		// XXX this is ugly
		//overview.table.elements.container.classList.add( 'nav' );
		overviewElement = overview.container;
		overview.configure( undefined, onReady );
	}

	function onReady( table ) {
		document.body.appendChild( overviewElement );
		openButton.disabled = false;
	}
}
