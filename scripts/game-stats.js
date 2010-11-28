/**
 * Statystyki pojedynczej gry.
 * Kontener obiektu ułatwia zapisanie wyników w ciasteczku
 */
function GameStatistics(name) {
	this.gameType = name;
	this.max = 0;
	this.games = 0;
	this.avg = 0;
	this.Update = function (score) {
		if (this.max <= score) {
			this.max = score;
		}
		this.games++;
		if (this.games == 1) 
			divider = 1;
		else 
			divider = 2;
		this.avg = parseInt(((this.avg + score) / divider).toFixed(0));
	};
	this.ToString = function() {
		return this.gameType + ":" + this.max + ":" + this.games + ":"+ this.avg;
	}
}

/**
 * Generuje szkielet obiektu statystyk na podstawie danych odczytanych z ciasteczka 
 */
GameStatistics.FromString = function (value) {
	try {
		var parts = value.split(":");
		if (parts.length == 4 && parts[0].length > 0) {
			_tmpIbj = new GameStatistics(parts[0])
			_tmpIbj.max = parseInt(parts[1]);
			_tmpIbj.games = parseInt(parts[2]);
			_tmpIbj.avg = parseInt(parts[3]);
			return _tmpIbj;
		}
	}
	catch(e) {}
	return false;
}


/**
 * Obiekt zapisuje statystyki wszystkich gier
 */
var gameStats = {

	// łączna punktacja bieżącej gry
	gameScore: 0,

	// nazwa ciasteczka, przechowującego wyniki
	_cookieName: "jsb_stats",

	// aktualny tryb gry
	currentType: gameOptions.currentGameType,
	
	// wskazuje czy dane statystyczne gier zmianiły się i czy wymagają zapisania
	wasChanged: false,
	
	// zmienna pomocnicza przechowuje statystyki bieżącej gry
	stats: null,
	
	// Lista danych statystycznych różnych gier
	statsArray: new Array(),
	
	EndGame: function() {
		this.gameScore = 0;
	},
	
	Clear: function() {
		storage.Delete(this._cookieName);
		this.gameScore = 0;
		this.stats = new GameStatistics("");
		this.wasChanged = true;
		this.statsArray[this.currentType] = this.stats;
	},
	
	Update: function() {
		this.stats.Update(this.gameScore);
		this.wasChanged = true;
	},
	
	/**
	 * Zapisuje statyski gier
	 * Zapisuje: 
	 * 	- najlepszy wynik, z podziałem na typy
	 *  - ilość gier, z podziałem na typy
	 *  - średni wynik, z podziałem na typy
	 */
	Save: function (){
		if (this.stats.gameType !== "" && this.wasChanged) { // przy starcie gry pole puste
			var a1 = [];
			for(var tmpVar in this.statsArray) {
				if (typeof this.statsArray[tmpVar] === "object") {
					a1.push(this.statsArray[tmpVar].ToString());
				}
			}
			var savedStats = a1.join(";");
			storage.Set(this._cookieName, savedStats);
			this.wasChanged = false;
		}
	},
	
	Read: function() {
		if (this.statsArray.length == 0) {
			var tmpArray = [];
			var savedStats = storage.Get(this._cookieName);
			if (typeof savedStats === "string") {
				var statsList = savedStats.split(";");
				// tymczasowa lista zapisanych statystyk 
				for(var i=0; i < statsList.length; i++) {
					var tmpObj = GameStatistics.FromString(statsList[i]);
					if (tmpObj !== false && typeof tmpObj === "object") {
						tmpArray.push(tmpObj);
					}
				}
			}

			// zestawienie z listą aktualnie dostępnych gier
			for(var gtype in gameTypes) {	
 				if (tmpArray.some(function(element, index, array) {
								   if (element.gameType == gameTypes[gtype]) {
											gameStats.statsArray[gameTypes[gtype]] = element;
											if (gameTypes[gtype] === gameStats.currentType) {
												gameStats.stats = gameStats.statsArray[gameTypes[gtype]];
											}
											return true;
									   }
									   return false;
								   }))
				{
					continue; // następny krok pętli
				}
				// alternatywa - nie znalazł jakiegoś aktualnie istniejącego typu gry w zapisanych statystykach
 				this.statsArray[gameTypes[gtype]] = new GameStatistics(gameTypes[gtype]);
				if (gameTypes[gtype] === this.currentType) {
					this.stats = this.statsArray[gameTypes[gtype]];
				}
			}			
		}
	}
}

