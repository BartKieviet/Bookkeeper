// -*- js3-indent-level: 8; js3-indent-tabs-mode: t -*-

document.addEventListener( 'DOMContentLoaded', onDOMContentLoaded, false );

function onDOMContentLoaded() {
	var version_span = document.getElementById( 'bookkeeper-version' ),
	    clear_button = document.getElementById( 'bookkeeper-clear-button' );
	version_span.textContent = chrome.runtime.getManifest().version;

	clear_button.addEventListener( 'click', onClearClick, false );

	if ( typeof chrome.storage.sync.getBytesInUse === 'function' ||
	     typeof chrome.storage.sync.MAX_ITEMS === 'number' ||
	     typeof chrome.storage.sync.QUOTA_BYTES === 'number' ) {
		beginUsageDisplayChore();
	}
	else {
		// Else we're on Firefox or something else that doesn't support
		// Chrome's full storage API.  We won't even try, let's just
		// hide the whole thing.
		document.getElementById( 'bookkeeper-storage-gauge' ).
			parentElement.remove();
	}

	var IDLIST = ['bookkeeper-enableAutoKey', 'bookkeeper-autoKey', 'bookkeeper-enablePSB', 'bookkeeper-enableCustom', 'bookkeeper-enableOwnBuildings'];
	//wiring
	wire( 'bookkeeper-enableAutoKey', 'bookkeeper-autoKey' );

	chrome.storage.sync.get( 'BookkeeperOptions', setupOptions );
	
	IDLIST.forEach( changeSave );
}

function beginUsageDisplayChore() {
	// This is ugly, we don't need to fetch everything, just count it.
	// There should be a chrome.storage.sync.getItemCount() or something.
	chrome.storage.sync.get( null, onItems );
}

function onItems( items ) {
	var count = {};
	count[ 'item_count' ] = Object.keys( items ).length;
	count[ 'O' ] = 0;
	count[ 'A' ] = 0;
	count[ 'P' ] = 0;
	count[ 'B' ] = 0;
	
	for ( var key in items ) {
		switch( key[0] ) {
			case 'O': count[ key[0] ] += 1; break;
			case 'A': count[ key[0] ] += 1; break;
			case 'P': count[ key[0] ] += 1; break;
			default: count[ 'B' ] += 1;
		}
	}
	
	['O','A','P'].forEach( updateClearButtons.bind( null, items ) ); 
	function updateClearButtons( items, key ) {
		if ( count[ key ] > 0 ) {
			document.getElementById( 'bookkeeper-clear-button-' + key ).addEventListener( 'click', clearUni.bind( document.getElementById( 'bookkeeper-clear-button-' + key ), items) );
		} else {
			document.getElementById( 'bookkeeper-clear-button-' + key ).remove();
		}
	}
	
	chrome.storage.sync.getBytesInUse(null,
					  onKnownBytesInUse.bind(null, count));
}

function clearUni( items ) {
	for ( var key in items ) {
		if( key[0] === this.id.split(/-/)[3] ) {
			chrome.storage.sync.remove( key ); //No confirm because of all the faff below
		}
	}
	this.remove();
}

function onKnownBytesInUse( item_count, bytes ) {
	var usage_span = document.getElementById( 'bookkeeper-item-usage' ),
	    quota_span = document.getElementById( 'bookkeeper-item-quota' ),
	    byte_usage_span = document.getElementById( 'bookkeeper-byte-usage' ),
	    byte_quota_span = document.getElementById( 'bookkeeper-byte-quota' ),
	    gauge = document.getElementById( 'bookkeeper-storage-gauge' ),
	    item_quota = chrome.storage.sync.MAX_ITEMS,
	    byte_quota = chrome.storage.sync.QUOTA_BYTES;

	usage_span.textContent = item_count[ 'item_count' ];;
	quota_span.textContent = item_quota;
	byte_usage_span.textContent = bytes;
	byte_quota_span.textContent = byte_quota;

	// Let the gauge show the direst of these two
	gauge.value = Math.max( item_count[ 'item_count' ] / item_quota, bytes / byte_quota );
	document.getElementById('bookkeeper-storage-orion').style.width = ( 100 * item_count[ 'O' ] / item_count[ 'item_count' ] ) + '%';
	document.getElementById('bookkeeper-storage-artemis').style.width = ( 100 * item_count[ 'A' ] / item_count[ 'item_count' ] ) + '%';
	document.getElementById('bookkeeper-storage-pegasus').style.width = ( 100 * item_count[ 'P' ] / item_count[ 'item_count' ] ) + '%';
	document.getElementById('bookkeeper-storage-total').style.width = ( 100 * item_count[ 'B' ] / item_count[ 'item_count' ] ) + '%';
}

// What a faff. All I wanted was window.confirm(), but can't use that in the
// options page <_<
var clearButtonRestoreTimeout;
function onClearClick() {
	this.disabled = true;

	if( clearButtonRestoreTimeout ) {
		window.clearTimeout( clearButtonRestoreTimeout );
		clearButtonRestoreTimeout = undefined;
	}

	if( this.dataset.state != 'confirming' ) {
		this.textContent = "Clear storage and untrack all buildings. Are you sure?";
		window.setTimeout( reenable.bind(this), 2000 );
	}
	else {
		chrome.storage.sync.clear( onStorageNuked.bind(this) );
		this.textContent = 'Clearing...';
	}

	function reenable() {
		this.dataset.state = 'confirming';
		this.disabled = false;
		clearButtonRestoreTimeout = window.setTimeout( restore.bind(this), 3000 );
	}

	function restore() {
		this.dataset.state = null;
		this.disabled = false;
		this.textContent = 'Clear storage';
		clearButtonRestoreTimeout = undefined;
	}

	function onStorageNuked() {
		restore.call( this );
		beginUsageDisplayChore();
	}
}

function wire( idCheck, idText ) {
	document.getElementById( idCheck ).addEventListener( 'change', function() {
		document.getElementById( idText ).disabled = !document.getElementById( idCheck ).checked
	} );
}

function changeSave( id ) {
	document.getElementById( id ).addEventListener( 'change', saveOptions );
}

//XXX TODO make life easier by introducing for loops.
function saveOptions() {
	let Options = {};
	Options[ 'enablePSB' ] = document.getElementById( 'bookkeeper-enablePSB' ).checked;
	Options[ 'enableCustom' ] = document.getElementById( 'bookkeeper-enableCustom' ).checked;
	Options[ 'enableAutoKey' ] = document.getElementById( 'bookkeeper-enableAutoKey' ).checked;
	Options[ 'enableOwnBuildings' ] = document.getElementById( 'bookkeeper-enableOwnBuildings' ).checked;
	Options[ 'autoKey' ] = document.getElementById( 'bookkeeper-autoKey' ).value.charCodeAt(0);
	let toSave = {};
	toSave[ 'BookkeeperOptions' ] = Options;
	chrome.storage.sync.set( toSave );
}

function setupOptions( Options ) {
	Options = Options[ 'BookkeeperOptions' ];
	if (Object.keys(Options).length === 0) {
		saveOptions();
	} else {
		for (var key in Options) {
			if ( typeof Options[ key ] === "boolean" ) {
				document.getElementById( 'bookkeeper-' + key ).checked = Options[ key ];
			}
		}
		// document.getElementById( 'bookkeeper-enableCustom' ).checked = Options[ 'enableCustom' ];
		// document.getElementById( 'bookkeeper-enableAutoKey' ).checked = 	Options[ 'enableAutoKey' ];
		// document.getElementById( 'bookkeeper-autoKey' ).value = String.fromCharCode( Options[ 'autoKey' ] );
		document.getElementById( 'bookkeeper-autoKey' ).disabled = !document.getElementById( 'bookkeeper-enableAutoKey' ).checked;
	}
}