// This is a content script, it runs on starbase_trade.php and planet_trade.php.

// From other files:
var Building, Overview;

// Globals
var ukey, openButton, overlay;

ukey = document.location.hostname[0].toUpperCase();

setup();

// End of script execution.

function setup() {
	var form, container, img;

	// Insert a BK button.  That's all our UI.

	form = document.forms.planet_trade || document.forms.starbase_trade;

	container = document.createElement( 'div' );
	container.id = 'bookkeeper-ui';
	container.className = 'bookkeeper-starbasetrade';

	img = document.createElement( 'img' );
	img.title = 'Pardus Bookkeeper';
	img.src = chrome.extension.getURL( 'icons/16.png' );
	container.appendChild( img );

	openButton = document.createElement( 'button' );
	openButton.id = 'bookkeeper-overview-toggle';
	openButton.textContent = 'OPEN';
	openButton.addEventListener( 'click', onClick, false );
	container.appendChild( openButton );

	// Button injection take 3.  There's just no good spot to paste in, but
	// I really don't want it near the centre of the page where it can be
	// covered.  Add as previous sibling of the form.
	form.parentElement.style.position = 'relative';
	form.parentElement.insertBefore( container, form );
}

// Lifted from navov.js

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
		overlay.className = 'bookkeeper-starbasetrade';

		overview = new Overview( ukey, document, 'Nav' );
		overview.configure( undefined, onReady );
	}

	function onReady( table ) {
		overlay.appendChild( overview.container );
		document.body.appendChild( overlay );
		openButton.disabled = false;
	}
}
