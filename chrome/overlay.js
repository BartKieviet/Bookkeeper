// From other files:
var Overview;

var Overlay = (function() {

function Overlay( ukey, document, button, options ) {
	this.ukey = ukey;
	this.doc = document;
	this.button = button;
	this.options = options;
	this.anywhereHandler = onClickAnywhere.bind( this );
	reset.call( this );
	button.addEventListener( 'click', this.toggle.bind(this), false );
}

Overlay.prototype.toggle = function() {
	if ( this.element )
		this.close();
	else
		this.open();
}

Overlay.prototype.open = function() {
	if ( !this.ready )
		return;

	this.ready = false;
	this.button.disabled = true;
	this.button.classList.add( 'on' );
	this.element = this.doc.createElement( 'div' );
	this.element.id = 'bookkeeper-overlay';
	if ( this.options.overlayClassName )
		this.element.className = this.options.overlayClassName;
	this.overview = new Overview(
		this.ukey, this.doc, this.options );
	this.overview.configure( undefined, onReady.bind(this) );

	function onReady() {
		this.element.appendChild( this.overview.container );
		this.doc.body.appendChild( this.element );
		this.button.disabled = false;
		window.addEventListener( 'click', this.anywhereHandler, false );
		this.ready = true;
	}
}

// Hide the overview and restore the button.

Overlay.prototype.close = function() {
	if ( !this.ready )
		return;

	if ( this.element )
		this.element.remove();
	this.button.classList.remove( 'on' );
	window.removeEventListener( 'click', this.anywhereHandler, false );
	reset.call( this );
}

function reset() {
	this.ready = true;
	this.element = undefined;
	this.overview = undefined;
}

function onClickAnywhere( event ) {
	var element;

	if ( !(this.ready && this.element) )
		return;

	// See if we find the overlay up the hierarchy.
	element = event.target;
	while ( element ) {
		if ( element === this.element )
			// No prob just checkin
			return;
		element = element.parentElement;
	}

	this.close();
}

return Overlay;

})();
