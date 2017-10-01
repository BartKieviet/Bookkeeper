var Overview;

document.addEventListener( 'DOMContentLoaded', onDOM, false );

// end of script execution

function onDOM() {
	chrome.runtime.sendMessage( { op: 'queryPopUpData' }, onHaveOptions );
}

function onHaveOptions( opts ) {
	Overview.makeForNav( opts.ukey, document, onReady );

	function onReady( table ) {
		document.body.appendChild( table.elements.container );
	}
}
