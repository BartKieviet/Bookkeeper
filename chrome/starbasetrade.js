// This is a content script, it runs on starbase_trade.php and planet_trade.php.

// From other files:
var Overlay;

setup();

// End of script execution.

function setup() {
	var ukey, form, container, img, button;

	// Insert a BK button.  That's all our UI.

	form = document.forms.planet_trade || document.forms.starbase_trade;

	container = document.createElement( 'div' );
	container.id = 'bookkeeper-ui';
	container.className = 'bookkeeper-starbasetrade';

	img = document.createElement( 'img' );
	img.title = 'Pardus Bookkeeper';
	img.src = chrome.extension.getURL( 'icons/16.png' );
	container.appendChild( img );

	button = document.createElement( 'button' );
	button.id = 'bookkeeper-overview-toggle';
	button.textContent = 'OPEN';
	container.appendChild( button );

	// Button injection take 3.  There's just no good spot to paste in, but
	// I really don't want it near the centre of the page where it can be
	// covered.  Add as previous sibling of the form.
	form.parentElement.style.position = 'relative';
	form.parentElement.insertBefore( container, form );

	ukey = document.location.hostname[0].toUpperCase();
	new Overlay(
		ukey, document, button,
		{ overlayClassName: 'bookkeeper-starbasetrade',
		  mode: 'compact',
		  storageKey: 'SB' } );
}
