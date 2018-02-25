// Common stuff used in multiple files.

var Universe = (function() {

var UNIVERSE_KEYS = {
	artemis: 'A',
	orion: 'O',
	pegasus: 'P'
};

function Universe( universe_name ) {
	var key = UNIVERSE_KEYS[ universe_name ];
	if( !key )
		throw( 'Unsupported universe ' + universe_name );
	this.name = universe_name;
	this.key = key;
}

Universe.fromDocument = function( doc ) {
	var m = /^([^.]+)\.pardus\.at$/.exec( document.location.hostname );
	if ( m )
		return new Universe( m[1] );
	return null;
}

return Universe;

})();

var CalendarNames = {
	WEEKDAYS: [
		'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'
	],
	MONTHS: [
		'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
		'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
	]
};

var ToggleMaker = (function() {

function makeToggleSwitch( switchClass, sliderClass, square ) {
	var container, input, slider;

	container = document.createElement( 'label' );
	input = document.createElement( 'input' );
	slider = document.createElement( 'span' );

	container.className = switchClass;
	input.type = 'checkbox';
	slider.className = sliderClass;
	if ( !square )
		slider.classList.add( 'bookkeeper-round' );

	container.appendChild( input );
	container.appendChild( slider );

	return container;
}

return {
	make: function() {
		return makeToggleSwitch(
			'bookkeeper-switch', 'bookkeeper-slider' );
	},
	makeSmall: function() {
		return makeToggleSwitch(
			'bookkeeper-switch-small', 'bookkeeper-slider-small' );
	}
};
})();

