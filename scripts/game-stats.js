/// <reference path="jquery-1.6.2-vsdoc.js" />

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
		var divider = this.games == 1 ? 1 : 2;
		this.avg = parseInt(((this.avg + score) / divider).toFixed(0));
	};
}

/**
 * Obiekt zapisuje statystyki wszystkich gier
 */
function GameStats() {

	// nazwa gracza
	this.playerName = "";

	// łączna punktacja bieżącej gry
	this.gameScore = 0;

	// nazwa ciasteczka, przechowującego wyniki
	this._cookieName = "jsb_stats";

	// aktualny tryb gry
	this.currentType = gameOptions.currentGameType;

	// wskazuje czy dane statystyczne gier zmianiły się i czy wymagają zapisania
	this._wasChanged = false;

	// zmienna pomocnicza przechowuje statystyki bieżącej gry
	this.stats = new GameStatistics("");

	// Lista danych statystycznych różnych gier
	this.statsArray = new Object();

	// określenie listy typów gry i aktualnego typu
	if (this.statsArray === null || this.statsArray === undefined) {
		this.statsArray = new Object();
	}
	for (var gtype in gameTypes) {
		this.statsArray[gameTypes[gtype]] = new GameStatistics(gameTypes[gtype]);
		if (gameTypes[gtype] === this.currentType) {
			this.stats = this.statsArray[gameTypes[gtype]];
		}
	}

	this.EndGame = function () {
		this.gameScore = 0;
	};

	this.Clear = function () {
		storage.Delete(this._cookieName);
		this.gameScore = 0;
		this.stats = new GameStatistics("");
		this._wasChanged = true;
		// na wypadek gdyby statystyki gier nie zostały wcześniej zainicjowane
		if (this.statsArray == null || this.statsArray === undefined) {
			this.statsArray = new Object();
		}
		this.statsArray[this.currentType] = this.stats;
	},

	this.Update = function () {
		this.stats.Update(this.gameScore);
		this._wasChanged = true;
	},

	/**
	* Zapisuje statyski gier
	* Zapisuje:
	* 	- najlepszy wynik, z podziałem na typy
	*  - ilość gier, z podziałem na typy
	*  - średni wynik, z podziałem na typy
	*/
	this.Save = function () {
		if (this.stats != undefined && this.stats.gameType !== "" && this._wasChanged) { // przy starcie gry pole puste
			storage.Set(this._cookieName, this.statsArray);
			this._wasChanged = false;
		}
	},

	/**
         * Odczytuje z magazynu i ustawia informacje o statusykach gry
	 */
	this.Read = function () {
		if (this.statsArray === null || this.statsArray === undefined) {
			this.statsArray = new Object();
		}

		var savedStats = storage.Get(this._cookieName);
		if (savedStats != null) {
			// zestawienie z listą aktualnie dostępnych gier
			for (var gtype in gameTypes) {
				if (savedStats[gameTypes[gtype]] != undefined) {
					var gameDesc = gameTypes[gtype];
					this.statsArray[gameDesc] = new GameStatistics(gameDesc);
					this.statsArray[gameDesc].games = parseInt(savedStats[gameDesc].games);
					this.statsArray[gameDesc].max = parseInt(savedStats[gameDesc].max);
					this.statsArray[gameDesc].avg = parseInt(savedStats[gameDesc].avg);
					if (gameTypes[gtype] === gameStats.currentType) {
						gameStats.stats = gameStats.statsArray[gameTypes[gtype]];
					}
					continue;
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

var gameStats = new GameStats();