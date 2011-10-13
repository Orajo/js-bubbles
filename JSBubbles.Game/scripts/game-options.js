"use strict";

/**
* Wielkości planszy
*/
var boardSizeList = {
	size12: {
		text: "12 x 12",
		x: 12,
		y: 12
	},
	size15: {
		text: "10 x 15",
		x: 10,
		y: 15
	},
	size20: {
		text: "16 x 20",
		x: 16,
		y: 20
	}
};

/**
* Typy gier
*/
var gameTypes = {
	type1: "Standard",
	type2: "Compressive",
	type3: "Add balls",
	type4: "Add balls and compress"
};

var gameOptions = {
	// nazwa ciasteczka, przechowującego opcje
	_cookieName: "jsb_opt",

	// aktualny tryb gry
	currentGameType: gameTypes.type1,

	/**
	 * Nazwa gracza
	 */
	playerName: "",

	/**
	* Aktualna wielkość planszy
	*/
	boardSize: {
		x: boardSizeList.size15.x, // szerokość planszy
		y: boardSizeList.size15.y  // wysokość planszy
	},

	/**
	* Tryb zaznaczania i kasowania kul tym samym kliknięceim
	*/
	oneClickMode: false,

	/**
	* Play sound when remove balls
	*/
	enableAudio: false,

	/**
	* Adres URL tła strony
	*/
	boardBackground: "",

	/**
	* Temat
	*/
	theme: "metro",

	/**
	* Domyślny temat
	*/
	_defaultTheme: "metro",

	/**
	 * Typ planszy
	 */
	boardType: 'bools',

	ChangeBoardBackground: function (url) {
		gameOptions.boardBackground = url;
		if (gameOptions.boardBackground !== "") {
			$("#appContainer").css("background-image", "url(\"" + gameOptions.boardBackground + "\")");
		}
	},

	ChangeBoardSize: function (sizeId) {
		// odczyt rozmiaru planszy
		switch (sizeId) {
			case boardSizeList.size12.y:
				gameOptions.boardSize.x = boardSizeList.size12.x;
				gameOptions.boardSize.y = boardSizeList.size12.y;
				break;
			case boardSizeList.size20.y:
				gameOptions.boardSize.x = boardSizeList.size20.x;
				gameOptions.boardSize.y = boardSizeList.size20.y;
				break;
			case boardSizeList.size15.y:
			default:
				gameOptions.boardSize.x = boardSizeList.size15.x;
				gameOptions.boardSize.y = boardSizeList.size15.y;
				break;
		}
	},

	/**
	* Metoda zmienia typ aktualnej gry
	* @param newGameType string nazwa opisowa nowego typu gry
	*/
	ChangeGameType: function (newGameType) {
		if (this.currentGameType !== newGameType) {
			this.currentGameType = newGameType;
			// gameStats.Save();
			gameStats.currentType = this.currentGameType;
			gameStats.stats = gameStats.statsArray[this.currentGameType];
			// gameStats.Read();
			refreashMessages();
			if (this.currentGameType === gameTypes.type3 || this.currentGameType === gameTypes.type4) {
				RenderStore();
			}
			else {
				$("#storeArea").hide();
			}
		}
	},

	ChangeBoardViewType: function(newType) {
		if (this.boardType !== newType) {
			// zmiana wizualizacji planszy
			if (newType === 'squares'){
				$('#boardTable td:not(.emptyField)').addClass('square');
			}
			else {
				$('#boardTable td').removeClass('square');
			}
			this.boardType = newType;
		}
	},

	Save: function () {
		storage.Set(this._cookieName, this);
	},

	Read: function () {
		try {
			var mo = storage.Get(this._cookieName);
			if (mo !== undefined) {
				this.ChangeBoardSize(parseInt(mo.boardSize.y));
				this.ChangeGameType(mo.currentGameType);
				this.oneClickMode = mo.oneClickMode;
				this.ChangeBoardBackground(mo.boardBackground);
				this.enableAudio = mo.enableAudio;
				this.playerName = mo.playerName;
				this.ChangeBoardViewType(mo.boardType);
				if (mo.theme == undefined) {
					this.theme = _defaultTheme
				}
				else {
					this.theme = mo.theme;
				}
			}
		}
		catch (exp) {
			this.ChangeBoardSize(boardSizeList.size15.y);
			this.ChangeGameType(gameTypes.type1);
		}
	}
};