// -*- js3-indent-level: 8; js3-indent-tabs-mode: t -*-

document.addEventListener( 'DOMContentLoaded', onDOMContentLoaded, false );

function onDOMContentLoaded() {
	var open_options = document.getElementById( 'bookkeeper-open-options' );

	// For some reason Chrome focuses the link. It looks weird.
	open_options.blur();
	open_options.addEventListener( 'click', onOpenOptionsClick, false );
}

function onOpenOptionsClick( event ) {
	event.preventDefault();
	chrome.runtime.openOptionsPage();
}
