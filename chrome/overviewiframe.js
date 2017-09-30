var Overview;

document.addEventListener( 'DOMContentLoaded', onDOM, false );

// end of script execution

function onDOM() {
	chrome.runtime.sendMessage( { op: 'queryPopUpData' }, onHaveOptions );
}

function onHaveOptions( opts ) {
	var overview = new Overview( opts.ukey, document, 'Nav' );
	overview.configure( undefined, onReady );

	function onReady( table ) {
		overview.table.elements.container.className = 'nav';

		document.body.appendChild( overview.containerElement );
	}
}
