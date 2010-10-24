/**
 * Kolorowe Kulki
 * @author Jarosław Wasilewski
 *
 * TODO: przejście na technikę obiektową
 * TODO: obsługa plansz prostokątnych
 * TODO: zapisywanie wyników gier do ciasteczka
 */

/**
 * Tablica na zaznaczone elementy
 */
var selectedFields = [];

/**
 * Tablica ID elementów już sprawdzonych pod kątem posiadania opcji ruchu
 *
 */
var checkedFields = [];

/**
 * Kopia stanu planszy sprzed ruchu; pozwala na wykonanie cofnięcia (Undo)
 */
var lastBoardState = null;

/**
 * Poprzednia punktacja w grze - konieczna do wykonania Undo
 */
var lastGameScore = null;

/**
 * Ilość punktów za zaznaczone pola
 */
var selectedScore = 0;

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
	},
};

/**
 * Typy gier
 */
var gameTypes =  {
	type1: "Standard",
	type2: "Dosuwanka"
};

var gameOptions = {
	// nazwa ciasteczka, przechowującego opcje
	_cookieName: "jsb_opt",

	// aktualny tryb gry
	currentGameType: gameTypes.type1,

	ChangeGameType: function (newGameType) {
		if (this.currentGameType != newGameType) {
			this.currentGameType = newGameType
			gameStats.currentType = this.currentGameType;
			gameStats.Read();
			refreashBoard();
		}
	},

	/**
	 * Aktualna wielkość planszy
	 */
	boardSize: {
		x: boardSizeList.size15.x, // szerokość planszy
		y: boardSizeList.size15.y  // wysokość planszy
	},
	
	Save: function (){
		$.setSubCookie(this._cookieName, "options", this);
	},
	
	Read: function() {
		mo = $.subCookie(this._cookieName, "options");
		try {
			if (mo !== undefined) {
				this.boardSize.x = mo.boardSize.x; // szerokość planszy
				this.boardSize.y = mo.boardSize.y; // wysokość planszy
				this.ChangeGameType(mo.currentGameType);
			}
		}
		catch (exp) {
			this.boardSize.x = boardSizeList.size15.x; // szerokość planszy
			this.boardSize.y = boardSizeList.size15.y; // wysokość planszy
			this.ChangeGameType(gameTypes.type1);
		}
	}
};

var gameStats = {

	// łączna punktacja bieżącej gry
	gameScore: 0,

	// nazwa ciasteczka, przechowującego wyniki
	_cookieName: "jsb_stats",

	// aktualny tryb gry
	currentType: gameOptions.currentGameType,

	// statystyki gry
	// kontener obiektu ułatwia zapisanie w ciasteczku
	stats: {
		max: 0,
		games: 0,
		avgRes: 0
	},

	Update: function() {
		if (this.stats.max <= this.gameScore) {
			this.stats.max = this.gameScore;
		}
		this.stats.games++;
		if (this.stats.games == 1) 
			divider = 1;
		else 
			divider = 2;
		this.stats.avgRes = parseInt(((this.stats.avgRes+this.gameScore)/divider).toFixed(0));
	},
	
	EndGame: function() {
		this.gameScore = 0;
	},
	
	Clear: function() {
		$.removeSubCookie(this._cookieName, this.currentType);
		this.gameScore = 0;
		this.stats.max = 0;
		this.stats.games = 0;
		this.stats.avgRes = 0;
	},
		
	/**
	 * Zapisuje statyski gier
	 * Zapisuje: 
	 * 	- najlepszy wynik, z podziałem na typy
	 *  - ilość gier, z podziałem na typy
	 *  - średni wynik, z podziałem na typy
	 */
	Save: function (){
		$.setSubCookie(this._cookieName, this.currentType, this.stats);
	},
	
	Read: function() {
		mr = $.subCookie(this._cookieName, this.currentType);
		try {
			if (mr !== undefined) {
				this.stats.max = mr.max > 0 ? mr.max : 0;
				this.stats.games = mr.games ? mr.games : 0;
				this.stats.avgRes = mr.avgRes ? mr.avgRes : 0;
			}
		}
		catch (exp) {
			//console.log("błąd odczytu statystyk");
		}
	}
}

/**
 * Zapewnienie zgodności IE z innymi przeglądarkami
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
  };
}

/**
 * Inicjalizuje planszę gry
 * @return void
 */
function InitGame() {
	// odczyt rozmiaru planszy
	boardDim = parseInt($("#boardDimensionId").get(0).value);
	switch (boardDim) {
		case boardSizeList.size12.y:
			CreateBoard(boardSizeList.size12.x, boardSizeList.size12.y);
			break;
		case boardSizeList.size20:
			CreateBoard(boardSizeList.size20.x, boardSizeList.size20.y);
			break;
		case boardSizeList.size15:
		default:
			CreateBoard(boardSizeList.size15.x, boardSizeList.size15.y);
			break;
	}
}

/**
 * Funkcja generuje planszę gry
 * TODO: sprawdzić wiązanie zdarzenia onclick popprzez jquery.delegate()
 */
function CreateBoard (sizeX, sizeY) {
	gameOptions.boardSize.x = sizeX;
	gameOptions.boardSize.y = sizeY;
	// czyszczenie planszy
	$("#boardArea").empty();

	boardTable = document.createElement("table");
	boardTable.setAttribute("id", "boardTable");
	for(i = 0; i < gameOptions.boardSize.y; i++) {
		row = document.createElement("tr");
		row.setAttribute("id", "row" + i);
		for(j = 0; j < gameOptions.boardSize.x; j ++) {
			field = document.createElement("td");
			field.setAttribute("id", "field-" + i + "-" + j);
			// losowanie koloru tla
			field.setAttribute("class", "color" + Math.floor(Math.random() * 4+1));
			field.onclick = selectSimilarFields;
			row.appendChild(field);
		}
		boardTable.appendChild(row);
	}
	try {
		document.getElementById("boardArea").appendChild(boardTable);
	}
	catch (e) {
		alert(e.message);
	}
}

/**
 * Kończy grę.
 * @param bool ended Wskazuje czy gra się skończyła (true) czy została przerwana (false)
 */
function EndGame(ended) {
	
    if (ended || confirm("Czy chcesz zakończyć aktualną grę?")) {
    	if (ended) {	
    		alert("No more moves.\nGame over!\nYour score is " + gameStats.gameScore);
    	}
		gameStats.Update();

		// Kasuje punktację aktualnie zaznaczonych elementów
		gameStats.EndGame();
		$("#totalScoreValue").text(gameStats.gameScore);
		refreashBoard();

		// blokada cofania ruchu
		DisableUndo();
		InitGame();
	}
}

/**
 * Zaznacza klikniety element i elementy sasiednie o identycznym kolorze
 * @param Event evn
 */
function selectSimilarFields(evn) {

	// obejście braku Event.target w IE
	var evt=window.event || evn;
	if (!evt.target) { //if event obj doesn't support e.target, presume it does e.srcElement
		evt.target=evt.srcElement; //extend obj with custom e.target prop
	}

	// krok 1: sprawdzenie czy nie klikamy na zaznaczony obszar - jeśli tak to usuwamy go
	selectedClassName = jQuery.trim(evt.target.getAttribute("class"));

	if (selectedClassName.indexOf("emptyField") !== -1) {
		deselectFields();
		return false;
	}
	else if (selectedClassName.indexOf("selected") !== -1 || selectedClassName.indexOf("emptyField") !== -1) {
		removeSelected(evt.target, selectedClassName.slice(0,selectedClassName.indexOf(" ")));
 		if (hasAnyMove()) {
			EndGame(true);
		}
	}
	// krok 2: jeśli nie, to kasowanie poprzedniego zaznaczenia
	else {
		deselectFields();
		// krok 3: zaznaczanie nowego miejsca
		findSimilar(evt.target, selectedClassName, 0);
		CountSelectedScore(false);
	}
	return true;
}

/**
 * Ustawia bieżące zaznaczenie oraz oblicza ilość punktów tego zaznaczenia
 * Punkty są naliczane jako SUMA(i*2), gdzie i to numer zaznaczonego elemetu zaczynając od 0
 *
 * @param bool reset Wskazuje czy wyczyścić punktację ruchu
 * @return void
 */
function CountSelectedScore(reset) {
	selectedScore = 0;
	if (reset === false && selectedFields.length > 1){ // pojedyncze elementy nie sa zaznaczane
		for(i = 0; i < selectedFields.length; i++) {
			//zaznacza element -> dodanie klasy "selected"
			$(selectedFields[i]).addClass("selected");
			selectedScore += i * 2;
		}
	}
	if (selectedScore > 0) {
		$("#scoreValue").text(selectedScore);
		ShowScoreValue();
	}
	else {
		ResetSelectedScores();
	}
}

/**
 * Kasuje punktację aktualnie zaznacoznych elementów
 */
function ResetSelectedScores() {
	selectedScore = 0;
	$("#scoreValue").text(selectedScore);
	$("#scoreValue").css("top", 0);
	$("#scoreValue").css("left", 0);
//	$("#scoreValue").hide();
}

function ShowScoreValue() {
	var top = 0;
	var left = 0;

	if (selectedFields.length > 1){ // pojedyncze elementy nie sa zaznaczane
		for(i = 0; i < selectedFields.length; i++) {
			//zaznacza element -> dodanie klasy "selected"
			var position = $(selectedFields[i]).offset();
			if (left === 0 || position.left < left) {
				left = position.left;
				top = position.top;
			}
			if (top === 0 || position.top < top && position.left >= left) {
				top = position.top;
			}
		}
		$("#scoreValue").css("top", top - 20);
		$("#scoreValue").css("left", left - 10);
	}

	$("#scoreValue").show();
}

/**
 * Oblicza łączną punktację
 * @return void
 */
function CountTotalScore() {
//	totalScoreValue += selectedScore;
	gameStats.gameScore += selectedScore;
	$("#totalScoreValue").text(gameStats.gameScore);
}

/**
 * Wyszukuje elementy sąsiednie do wskazanego elementu planszy
 * @param TD Element selElement
 * @param String selClassName nazwa klasy CSS, która posiada wskazany element
 * @param int licznik licznik pomocniczy do obsługi rekurencji
 * @return void
 */
function findSimilar(selElement, selClassName, licznik) {

	if (selectedFields.indexOf(selElement, 0) == -1) {
		selectedFields.push(selElement);
	}

	var idElements = selElement.getAttribute("id").split("-");
	var posY = idElements[1];
	var posX = idElements[2];
	var newPosX = posX;
	var newPosY = posY;

	do {
		switch (licznik) {
			case 0:
				newPosX = parseInt(posX) - 1;
				licznik++;
				if (newPosX < 0) continue;
				break;
			case 1:
				newPosX = parseInt(posX) + 1;
				licznik++;
				if (newPosX >= gameOptions.boardSize.x) continue;
				break;
			case 2:
				newPosX = posX;
				newPosY = parseInt(posY) - 1;
				licznik++;
				if (newPosY < 0) continue;
				break;
			case 3:
				newPosX = posX;
				newPosY = parseInt(posY) + 1;
				licznik++;
				if (newPosX >= gameOptions.boardSize.x) continue;
				break;
		}
		var nextSibling = document.getElementById("field-" + newPosY + "-" + newPosX);
		if (nextSibling !== null && selectedFields.indexOf(nextSibling) == -1) {
			nextSiblingClassName = jQuery.trim(nextSibling.getAttribute("class"));
			if (nextSibling !== undefined && (nextSiblingClassName == selClassName)) {
				findSimilar(nextSibling, selClassName, 0);
			}
		}
	}
	while (licznik < 4);
}

/**
 * Usuwa zaznaczone elementy.
 *
 * 1. pobierz z tablicy zaznaczonych elementów pierwszy element
 * 2. Pobierz element położony wyzej.
 * 3. Jesli element powyżej jest również zaznaczony to pkt. 2;
 * 4. nałoż (klasę CSS) elementu powyzej na element zastępowany
 * 5. Element zastapiony usuń w tablicy zastępowanych
 * 5. Przedź do elementu wyżej.
 */
function removeSelected(elObj, classNameToRemove) {
	SaveGameState();

	// porządkowanie tablicy zaznaczonych elementów - zaczynam od najniżej położonych
	selectedFields.sort(function(a, b) {
		// Funkcja pomocnicza do sortowania elementów w tablicy selectedElements
		aId = a.getAttribute("id");
		bId = b.getAttribute("id");
		if (aId < bId)
			return 1;
		if (aId > bId)
			return -1;
		return 0;
	});

	var couldBeEmptyRow = false;
	do {
		//alert($(selectedFields[0]).attr("id"));
		var idElements = $(selectedFields[0]).attr("id").split("-");
		var posX = parseInt(idElements[2]);
		var posY = parseInt(idElements[1]);
		var parsedField = document.getElementById("field-" + (posY) + "-" + posX);
		var upperPosY = posY-1;
		var parsedPosY = posY;
		var upperField = null;
		var removedField = null;

		if (posY == gameOptions.boardSize.y-1) {
			// jeśli usuwa kulkę z dolnego wiersza ekranu do zakładam,
			// że pojawi się pusta kolumna i trzeba będzie przesunąć kolumny
			couldBeEmptyRow = true;
		}

		if (posY > 0){
			do {
				removedField = document.getElementById("field-" + parsedPosY + "-" + posX);
				upperField = document.getElementById("field-" + upperPosY + "-" + posX);
				if (upperField === null) {
					removedField.setAttribute("class", "emptyField");
				}
				else {
					while (selectedFields.indexOf(upperField) !== -1) {
						upperPosY--;
						upperField = document.getElementById("field-" + upperPosY + "-" + posX);
					}
					if (upperField === null) {
						removedField.setAttribute("class", "emptyField");
					}
					else {
						removedField.setAttribute("class", upperField.getAttribute("class"));
					}
				}
				if (selectedFields.indexOf(removedField) !== -1) {
					selectedFields = cleanSelectedFields(selectedFields, removedField);
				}
				upperPosY--;
				parsedPosY--;
			}
			while(parsedPosY >= 0);

			if (upperField !== null)
				upperField.setAttribute("class", "emptyField");
		}
		if (posY <= 0){
			parsedField.setAttribute("class", "emptyField");
			if (selectedFields.indexOf(parsedField) !== -1) {
				selectedFields = cleanSelectedFields(selectedFields, parsedField);
			}
		}
	}
	while(selectedFields.length > 0);

	// usuwanie pustych kolumn i przesuwanie pozostałych po lewej stronie
	if (couldBeEmptyRow) {
		RemoveEmptyColumns();
	}
	
	if (gameOptions.currentGameType == gameTypes.type2) {
		// przesunięcie wierszy
		RemoveEmptyFields();
	}
	CountTotalScore();
	CountSelectedScore(true);
}

function RemoveEmptyColumns() {
	for (var k = gameOptions.boardSize.x-1; k > 0; k--) {
		var lastField = document.getElementById("field-" + (gameOptions.boardSize.y-1) + "-" + k);
		if (lastField.getAttribute("class") == "emptyField") { // ostatni element w kolumnie jest pusty
			// przesuniecie kolejnych kolumn
			var moveDim = 1; // wymiar przesunięcia (reguluje ile kolumn jest pustych)
			for (var j = k; j >= 1; j--) {
				for(var c = 0; c < gameOptions.boardSize.y; c++) {
					if (j-moveDim < 0) moveDim = j;
					var fieldToMoveFrom = document.getElementById("field-" + c + "-" + (j-moveDim));
					var fieldToMoveTo = document.getElementById("field-" + c + "-" + (j));
					var moved = false;
					if (fieldToMoveTo.getAttribute("class") != fieldToMoveFrom.getAttribute("class")) {
						fieldToMoveTo.setAttribute("class", fieldToMoveFrom.getAttribute("class"));
						moved = true;
					}
					if (fieldToMoveFrom.getAttribute("class") !== "emptyField") {
						fieldToMoveFrom.setAttribute("class", "emptyField");
					}
				}
				if (!moved && j > 1 && (j-moveDim > 0)) {
					j++;
					moveDim++;
				}
			}
		}
	}
}

function RemoveEmptyFields() {
	tmpX = null;
	// zaczynamy od prawego górnego rogu
	for (var y = 0; y < gameOptions.boardSize.y; y++) {
		emptyField = null;
		for (var x = gameOptions.boardSize.x-1; x >= 0; x--) {
			field = $("#field-" + y + "-" + x).get(0);
			// sprawdzenie czy pole jest puste
			if (field!= undefined && field.getAttribute("class") == "emptyField" && emptyField == null) {
				// jeśli tak, to zapamiętaj pierwszą znalezioną pustą pozycję
				// potem w to miejsce wstawimy znalezioną kulę
				emptyField = field;
				tmpX = x;
				continue;
			}
			// znalezione nie puste pole poprzedzone przez jakieś puste
			else if(field.getAttribute("class") !== "emptyField" && emptyField != null) { 
				// wstaw w to miejsce pole z kulą
				emptyField.setAttribute("class", field.getAttribute("class"));
				// skasuj info o purym polu (teraz jest pełne)
				emptyField = null;
				// wyczyś pole, z którego zabrałeś kulę
				field.setAttribute("class", "emptyField");
				// ustaw kursor iteracji na polu, w którym wstawiono kulę
				if (x > 0) x = tmpX;
			}
		}
	}
}

/**
 * Usuwa z tablicy zaznaczonych elementów wskazany element
 * @param Array fldsList
 * @param TD Element fieldToRemove
 * @return Array tablica z usuniętym elementem fieldToRemove
 */
function cleanSelectedFields(fldsList, fieldToRemove) {
	retVal = new Array();
	for(var i = 0; i < fldsList.length; i++) {
		if (fldsList[i] !== fieldToRemove) {
			retVal.unshift(fldsList[i]);
		}
	}
	return retVal;
}

function deselectFields () {
	$("#boardArea td.selected").removeClass("selected");
	selectedFields = new Array();
}

/**
 * Sprawdza czy gracz ma jeszcze jakieś opcje ruchu
 * @return bool
 */
function hasAnyMove() {
	var initField;

	checkedFields = new Array();

	for (var x = gameOptions.boardSize.x-1; x >= 0; x++) {
		for(var y = gameOptions.boardSize.y-1; y >=0; y++) {
			initField = document.getElementById("field-"+y+"-"+x);
			if (initField.getAttribute("class") != 'emptyField') {
				return !findMove(initField, initField.getAttribute("class"), 0);
			}
		}
	}
	return true;
}

/**
 * Wyszukuje elementy sąsiednie do wskazanego elementu planszy
 * @param TD Element selElement
 * @param String selClassName nazwa klasy CSS, która posiada wskazany element
 * @param int licznik licznik pomocniczy do obsługi rekurencji
 * @return void
 */
function findMove(selElement, selClassName, licznik) {

	var idElements = selElement.getAttribute("id").split("-");
	var posY = idElements[1];
	var posX = idElements[2];
	var newPosX = posX;
	var newPosY = posY;
	var nextSibling;

	do {
		switch (licznik) {
			case 0:
				newPosX = parseInt(posX) - 1;
				licznik++;
				if (newPosX < 0) continue;
				break;
			case 1:
				newPosX = parseInt(posX) + 1;
				licznik++;
				if (newPosX >= gameOptions.boardSize.x) continue;
				break;
			case 2:
				newPosX = posX;
				newPosY = parseInt(posY) - 1;
				licznik++;
				if (newPosY < 0) continue;
				break;
			case 3:
				newPosX = posX;
				newPosY = parseInt(posY) + 1;
				licznik++;
				if (newPosX >= gameOptions.boardSize.x) continue;
				break;
		}
		nextSibling = document.getElementById("field-" + newPosY + "-" + newPosX);
		if (nextSibling !== null && nextSibling !== undefined) {
			if (nextSibling.getAttribute("class") == 'emptyField' || checkedFields.indexOf(nextSibling.getAttribute("id")) !== -1) continue;
			if (nextSibling.getAttribute("class") == selClassName) {
				return true;
			}
			else {
				checkedFields.push(nextSibling.getAttribute("id"));
				if (findMove(nextSibling, nextSibling.getAttribute("class"), 0)) {
					return true;
				}
			}
		}
	}
	while (licznik < 4);
	return false;
}

/**
 * Wykonanie kopii planszy w celu umożliwienia cofnięcia ruchu
 */
function SaveGameState() {
	lastBoardState = document.getElementById("boardTable").cloneNode(true);
	lastGameScore = selectedScore;
	EnableUndo();
}

/**
 * Wykonuje cofnięcie poprzedniego ruchu
 *
 * @return bool
 */
function UndoMove() {
	if (lastBoardState != null) {
		document.getElementById("boardArea").replaceChild(lastBoardState, document.getElementById("boardTable"));

		DisableUndo();

		// trzeba ponownie podpiąć zdarzenie onclick - nie wiem dlaczego nie jest kopiowane wraz z całą zawartością tablicy planszy!
		$("#boardTable td").click(selectSimilarFields);
		deselectFields();

		// odtworzenie poprzedniego wyniku gry
		selectedScore = -lastGameScore;
		CountTotalScore(); // mała sztuczka, żeby nie zmieniać API
		return true;
	}
	return false;
}

/**
 * Włącza funkcję undo
 */
function EnableUndo() {
    $("#undoBtn").disabled = false;
    $('#undoBtn').attr('src', "images/rewind.png");
}

/**
* Wyłącza funkcję undo
*/
function DisableUndo() {
    lastBoardState = null;
    $("#undoBtn").disabled = true;
    $('#undoBtn').attr('src', "images/rewind_gray.png");
}

function ResetResults() {
	if (confirm("Are you sure you want to clear results?")) {
		gameStats.Clear();
		refreashBoard();
		return true;
	}
	return false;
}

function refreashBoard() {
	$("#gameTypeName").text(gameStats.currentType);
	$("#maxScoreValue").text(gameStats.stats.max);
	$("#avgScoreValue").text(gameStats.stats.avgRes);
	$("#playedGamesValue").text(gameStats.stats.games);
	$("#gameTypeValue").text(gameStats.currentType);
}

function saveOptions() {
    
}

// inicjalizacja aplikacji
$(window).load(function () {
	
	InitEvents();
	// odczytanie statystyk gry
	gameStats.Read();
	gameOptions.Read();

    RestoreSettings();

	// inicjalizacja gry
	InitGame();
	refreashBoard();
});

// sprzątenie
$(window).unload(function() {
	gameStats.Save(); // zapisanie stanu gry
	gameOptions.Save(); // zapisanie opcji 
	saveOptions();
});