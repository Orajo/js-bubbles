"use strict";

var storage = {
	// przechowuje dane do zapisania
	db: new Object(),

	saveType: "ajax",

	/**
	 * Identyfikator rekordu bufora danych.
	 * W prkatyce reprezentuje ID głownego klucza danych na serwerze
	 * - pozwala powiązać go z id danych na serwerze
	 */
	storeId: 0,

	/**
	 * Adres części serwerowej
	 */
	serverUrl: '',

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

	/**
	 * Zapisuje zawartość bufora danych.
	 * Po stronie serwerowej aplikacja powinna zwrócić ID zapisanych danych.
	 * To ID zostanie zapisane lokalnie (w ciasteczku) jako identyfikator sesji całego storage.
	 *
	 * @param clearAfterSave bool w trybie ajax czyści bufor po zapisaniu danych.
	 * @return bool Status powodzenia zapisania danych.
	 */
	Save: function (clearAfterSave) {
		var successStatus = false;
		if (this.saveType == "ajax") {
			var retVal = new Object();
			for(var key in this.db) {
				retVal[key] = serialize(this.db[key]);
			}
			try {
				var storageObj = this;
				// test zapisywania wyników na serwerze
				$.ajax({
					type: "POST",
					url: this.serverUrl + "?action=save&sid=" + this.storeId,
					data: retVal,
					async: false,
					success: function (msg) {
						var sid = parseInt(msg);
						if (!isNaN(sid)) {
							successStatus = true;
							storageObj.storeId = sid;
							if (clearAfterSave) {
								storageObj.db = new Object();
							}
							$.setCookie("jsb_store_id", sid);
							console.info("Save satus: " + successStatus.toString());
						}
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
		else if (this.saveType == "local") {
			if(window.localStorage){
				localStorage.setItem("storage", this.db);
			}
			else {
				$.setCookie("storage", this.db);
			}
			successStatus = true;
		}
		return successStatus;
	},

	/**
	 * Inicjalizuje bufor storage odczytując niezbędne dane z serwera
	 * Jeśli w lokalnym ciasteczku nie ma zapipsanego sklucza storage storeId to uznaje, że jest to pierwsze uruchomienie i zwraca false;
	 *
	 * @param serverUrl string adres do części serwerowej odbierającej dane
	 * @return bool true jeśli inicjalizacja odczytała poprawnie dane z serwera; false jeśli nie (np. pierwsze uruchomienie)
	 */
	Init: function (serverUrl) {
		this.serverUrl = serverUrl;

		// sprawdzenie czy jest to pierwsze uruchomienie
		if (this.storeId <=0) {
			var sid = $.cookie('jsb_store_id');
			sid = parseInt(sid);
			if (!isNaN(sid)) {
				this.storeId = sid;
			}
			else {
				return false;
			}
		}

		if (this.saveType == "ajax") {
			var storageObj = this;
			$.ajax({
				type: "GET",
				url: this.serverUrl,
				data: "action=getData&sid=" + this.storeId,
				dataType: "json",
				async: false,
				success: function (msg) {
					if (msg != undefined && msg != null && typeof msg === "object") {
						for (var item in msg) {
							storageObj.Set(item, msg[item]);
						}
						return true;
					}
					return false;
				},
				error: function (xhr, msg, errorThrown) {
					if (console && console.error) {
						console.error('Error:' + msg + " exception: " + errorThrown.toString());
					}
					throw Exception ("Storage initialization error");
				}
			});
		}
		else if (this.saveType == "local") {
			var msg;
			if(window.localStorage){
				msg = localStorage.getItem("storage", this.db);
			}
			else {
				msg = $.getCookie("storage");
			}
			if (msg != undefined && msg != null && typeof msg === "object") {
				for (var item in msg) {
					this.Set(item, msg[item]);
				}
				return true;
			}
		}
		// ze względu na funkcje wewnętrzne Ajax trzeba ponownie sparwdzić warunek - jest to najpewniejsza metoda.
		return this.storeId > 0;
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
				for (i = 0; i < len - 1; i++) {
					str += serialize(_obj[i]) + ',';
				}
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