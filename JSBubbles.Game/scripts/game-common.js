/*
 * Pakiet funkcji bibliotecznych ogólnego przeznaczeia
 * oraz zapewniających wsteczną kompatybilność ze starszymi wersjami JavaScript
 */

/**
 * Zapewnienie zgodności IE z innymi przeglądarkami
 */
/**
 * https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/some
 */
if (!Array.prototype.some) {
	Array.prototype.some = function(fnc) {
		for (var i = 0; i < this.length; i++) {
			if (fnc(this[i], i, this)) {
				return true;
			}
		}
		return false;
	}
}

/**
 * https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/indexOf
 */
if (!Array.prototype.indexOf) {
	Array.prototype.indexOf = function(elt /*, from*/) {
		var len = this.length >>> 0;

		var from = Number(arguments[1]) || 0;
		from = (from < 0) ? Math.ceil(from) : Math.floor(from);
		if (from < 0) {
			from += len;
		}

		for (; from < len; from++) {
			if (from in this && this[from] === elt) {
				return from;
			}
		}
		return -1;
	}
}

/**
 * Sprawdza czy dany ciąg jest pusty
 * @param value string
 */
function IsNullOrEmpty (value) {
	if (value !== undefined && value !== null) {
		var s_value = new String(value);
		if (s_value.length > 0) {
			return false;
		}
	}
	return true;
}
