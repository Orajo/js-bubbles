var storage = {
	db: [],
	
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
	
	Save: function () {
		serializable = [];
		for(element in this.db) {
			if (typeof this.db[element] === "string") { // for IE, becouse iterates also through added functions 
				serializable.push(element + "/#/" + this.db[element]);
			}
		}
		retVal = serializable.join("/##/");
		$.setCookie("storage", retVal);
		delete serializable;
	},

	Init: function() {
	  	serializable = $.cookie("storage");
	  	if (serializable !== null && serializable.length > 0) {
			elements = serializable.split("/##/");
			if (elements !== null && elements.length > 0) {
				for(i = 0; i < elements.length; i++) {
					pair = elements[i].split("/#/");
					this.Set(pair[0], pair[1]);
				}
			}
	  	}
	  	delete serializable;
	}
}
