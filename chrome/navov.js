// This is a content script, it runs on main.php but it is NOT injected by the
// manifest, it's only loaded when the user clicks on the OPEN button.  It
// requires overview.js, filter.js, table.js, building.js... the whole thing.

// From other files:
var Overlay;

// The first time this runs, it is assumed that a click on OPEN just happened,
// and nav.js already removed its event handler.  Overlay here will install its
// own handler and handle further clicks.

var overlay = new Overlay(
	document.location.hostname[0].toUpperCase(),
	document,
	document.getElementById( 'bookkeeper-overview-toggle' ),
	{ storageKey: 'Nav', mode: 'compact' } );

// Since a click just happened

overlay.open();
