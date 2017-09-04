// Contains functions used in both files.
(function () {

function getUniverse() {
	var match;

	match = /^([^.]+)\.pardus\.at$/.exec( document.location.hostname );
	if ( match ) {
		return match[ 1 ];
	}

	return null;
}
})();