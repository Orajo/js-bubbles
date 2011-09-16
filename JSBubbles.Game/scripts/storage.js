var storage = {
	// przechowuje dane do zapisania
	db: new Object(),

	saveType: "ajax",

	Get: function (key) {
		if (this.db[key] !== undefined) {
			return this.db[key];
		}
		return null;
	},

	Set: function (key, value) {
		this.db[key] = value;
	},

	Exists: function (key) {
		return (this.db[key] !== undefined);
	},

	Delete: function (key) {
		delete this.db[key];
	},

	Save: function (clearAfterSave) {
		var successStatus = false;
		if (this.saveType == "ajax") {
			retVal = new Object();
			for(key in this.db) {
				retVal[key] = serialize(this.db[key]);
			}
			try {
				// test zapisywania wynik�w na serwerze
				$.ajax({
					type: "POST",
					url: "JSBubbles.ServerSide/index.php",
					data: retVal,
					async: false,
					success: function (msg) {
						successStatus = (msg == 'Data saved');
					},
					error : function (xhr, msg, errorThrown) {
						if (console && console.error) {
							console.error('Error:' + msg + " exception: " + errorThrown.toString());
						}
						successStatus = false;
					}
				});
			}
			catch (exp) {
				if (console && console.error) {
					console.error('[Exception] ' + exp.toString());
				}
				successStatus = false;
			}
		}
		else if (this.saveType == "cookie") {
			serializable = [];
			for (element in this.db) {
				if (typeof this.db[element] === "string") { // for IE, becouse iterates also through added functions
					serializable.push(element + "=" + this.db[element]);
				}
			}
			retVal = serializable.join("/##/");
			$.setCookie("storage", retVal);
			delete serializable;
			successStatus = true;
		}
		if (clearAfterSave) {
			this.db = new Object();
		}
		return successStatus;
	},

	Init: function (playerName) {

		if (this.saveType == "ajax") {
			storageObj = this;
			$.ajax({
				type: "GET",
				url: "index.php",
				data: "player=" + playerName,
				dataType: "json",
				async: false,
				success: function (msg) {
					if (msg != undefined && msg != null && typeof msg === "object") {
						for (var item in msg) {
							storageObj.Set(item, msg[item]);
						}
					}
				},
				error : function (xhr, msg, errorThrown) {
					if (console && console.error) {
						console.error('Error:' + msg + " exception: " + errorThrown.toString());
					}
				},
			});
		}
		else if (this.saveType == "cookie") {
			serializable = $.cookie("storage");
			if (serializable !== null && serializable.length > 0) {
				elements = serializable.split("/##/");
				if (elements !== null && elements.length > 0) {
					for (i = 0; i < elements.length; i++) {
						pair = elements[i].split("=");
						this.Set(pair[0], pair[1]);
					}
				}
			}
			delete serializable;
		}
	}
}

/**
 * Based on http://blog.stchur.com/2007/04/06/serializing-objects-in-javascript/ serialization script.
 * Modificated to handle only properties. I don't want to serialize methods!
 * Ignores also properties which begin with underscore (assumed that are private).
 */
function serialize(_obj) {

	switch (typeof _obj) {
		// numbers, booleans, and functions are trivial:
		// just return the object itself since its default .toString()
		// gives us exactly what we want
		case 'number':
		case 'boolean':
//		case 'function':
			return _obj;
			break;

		// for JSON format, strings need to be wrapped in quotes
		case 'string':
			return '"' + _obj + '"';
			break;

		case 'object':
			var str;
			if (_obj.constructor === Array || typeof _obj.callee !== 'undefined') {
				str = '[';
				var i, len = _obj.length;
				for (i = 0; i < len - 1; i++) { str += serialize(_obj[i]) + ','; }
				str += serialize(_obj[i]) + ']';
			}
			else {
				str = '{';
				var key;
				for (key in _obj) {
					if (typeof _obj[key] === 'function' || key.charAt(0) == "_") continue;
					str += '"' + key + '":' + serialize(_obj[key]) + ',';
				}
				str = str.replace(/\,$/, '') + '}';
			}
			return str;
			break;
	}
}