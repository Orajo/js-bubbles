/**
 * Kolorowe Kulki
 * @author Jarosław Wasilewski
 * @version 2.1 beta 2
 */

"use strict";

var gameTitle = "JS Bubbles";

var gameVersion = "3.0 alpha 1";

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
 * Wskazuje czy jest to pierwsze uruchomienie gry.
 * jest ti wykrywane na podstawie obecności ciacha z nazwą gracza
 */
var firstStart = false;

/**
 * Nazwa garacza
 */
var playerName = "";

/**
 * Magazyn na dodatkowe kolumny kul w grach: type3
 */
var newColumnStore = [];

var emptyBoardBonus = 500;

/**
 * Obiekt pomocniczy do obsługi timera czasu na wykonanie ruchu
 */
var moveTimer = {
	// domyślny czas do wykonania ruchu
	_startValue: 10,
	_paused: false,
	// uchwyt do timera (zwracany przez setTimeout; służy do wyłączenia timera przez clearTimeout
	_timer: null,
	// aktualny czas, pozostały do wykonania ruchu
	_t: null,
	// uchwyt do metody wywoływanej po każdej sekundzie
	_refColl: null,

	Start: function(refreashCallback) {
		if (this._timer != null) {
			this.Stop();
		}
		this._paused = false;
		this._refColl = refreashCallback;
		this._t = this._startValue;
		if (this._refColl != null && this._refColl != undefined) {
			this._refColl();
		}
		this._timer = setTimeout("moveTimer._count()", 1000);
	},

	_count: function() {
		if (this._paused != true) {
			// liczymy tylko do zera. Potem tojuż byoby karanie ujemnymi punktami
			if (this._t > 0) {
				this._t--;
				this._timer = setTimeout("moveTimer._count()", 1000);
			}
			if (this._refColl != null && this._refColl != undefined) {
				this._refColl();
			}
		}
	},

	Get: function() {
		return this._t;
	},

	Stop: function () {
		this._paused = true;
		this._t = this._startValue;
		clearTimeout(this._timer);
	},

	Pause: function() {
		this._paused = true;
	},

	Resume: function() {
		this._paused = false;
	}
}

function GetGameTitle() {
    return gameTitle + " (" + gameVersion + ") - current mode: " + gameOptions.currentGameType;
}

/**
 * Funkcja generuje planszę gry
 * TODO: sprawdzić wiązanie zdarzenia onclick popprzez jquery.delegate()
 */
function InitBoard() {
	// czyszczenie planszy
	$("#boardArea").empty();

	var boardTable = document.createElement("table");
	boardTable.setAttribute("id", "boardTable");
	for(var i = 0; i < gameOptions.boardSize.y; i++) {
		var row = document.createElement("tr");
		row.setAttribute("id", "row" + i);
		for(var j = 0; j < gameOptions.boardSize.x; j ++) {
			var field = document.createElement("td");
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

	// inicjalizacja zegara ruchu
	moveTimer.Start(function() {$("#timeToMoveValue").text(moveTimer.Get());});
}

/**
 * Kończy grę.
 *
 * @param ended bool Wskazuje czy gra się skończyła (true) czy została przerwana (false)
 */
function EndGame(ended) {
    if (ended || confirm("Do you want to finish the game?")) {
    	if (ended) {
    		$.jnotify("<strong>Game over!</strong><br/>Your score is " + gameStats.gameScore, {parentElement: "#boardPanel", delay: 4000, slideSpeed: 2000,
			  remove: function () {
				refreashMessages();
				InitBoard();
				LoadTopTen();
			  }
    		});
    	}
		moveTimer.Stop();

		gameStats.Update();

		UpdateResultsTable();
		// Kasuje punktację aktualnie zaznaczonych elementów
		gameStats.EndGame();
		$("#totalScoreValue").text(gameStats.gameScore);
		// blokada cofania ruchu
		DisableUndo();

		gameStats.Save(); // zapisanie stanu gry
		if (IsNullOrEmpty(gameStats.playerName)) {
			GetUserName();
		}
		if (!storage.Save(true)) {
			$.jnotify("<strong>Data not saved!</strong>", {parentElement: "#boardPanel", delay: 4000, slideSpeed: 2000});
		}

	}
}

/**
 * Zaznacza klikniety element i elementy sasiednie o identycznym kolorze
 * @param evn Event
 * @return bool
 */
function selectSimilarFields(evn) {

	moveTimer.Pause();
	// obejście braku Event.target w IE
	var evt=window.event || evn;
	if (!evt.target) { //if event obj doesn't support e.target, presume it does e.srcElement
		evt.target=evt.srcElement; //extend obj with custom e.target prop
	}

	// krok 1: sprawdzenie czy nie klikamy na zaznaczony obszar - jeśli tak to usuwamy go
	var selectedClassName = jQuery.trim(evt.target.getAttribute("class"));

	if (selectedClassName.indexOf("emptyField") !== -1) {
		deselectFields();
		moveTimer.Resume();
		return false;
	}
	else if (selectedClassName.indexOf("selected") !== -1 || selectedClassName.indexOf("emptyField") !== -1) {
		removeSelected(evt.target, selectedClassName.slice(0,selectedClassName.indexOf(" ")));
		var continueGame = hasAnyMove();
 		if (continueGame != true) {
			// naliczenie bonusu za pusta planszę
			if (continueGame === null) {
				gameStats.gameScore += emptyBoardBonus;
				$.jnotify("Bonus 500!", {parentElement: "#controlPanel", delay: 3000, slideSpeed: 2000});
			}
			EndGame(true);
		}
		else {
			moveTimer.Start(function() {$("#timeToMoveValue").text(moveTimer.Get());});
		}
	}
	// krok 2: jeśli nie, to kasowanie poprzedniego zaznaczenia
	else {
		deselectFields();
		// krok 3: zaznaczanie nowego miejsca
		findSimilar(evt.target, selectedClassName, 0, true);
		HighlightSelectedAndCountScore(false);
		if (gameOptions.oneClickMode) { // in oneClickMode remove selected bools now
			selectSimilarFields(evn);
		}
		moveTimer.Resume();
	}
	return true;
}

/**
 * Ustawia bieżące zaznaczenie oraz oblicza ilość punktów tego zaznaczenia
 * Punkty są naliczane jako SUMA(i*2), gdzie i to numer zaznaczonego elemetu zaczynając od 0
 *
 * @param reset bool Wskazuje czy wyczyścić punktację ruchu
 * @return void
 */
function HighlightSelectedAndCountScore(reset) {
	selectedScore = 0;
	if (reset === false && selectedFields.length > 1){ // pojedyncze elementy nie sa zaznaczane
		for(var i = 0; i < selectedFields.length; i++) {
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
 * Kasuje punktację aktualnie zaznaczonych elementów
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
		for(var i = 0; i < selectedFields.length; i++) {
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
	gameStats.gameScore += moveTimer.Get();
	$("#totalScoreValue").text(gameStats.gameScore);
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
		var aId = a.getAttribute("id");
		var bId = b.getAttribute("id");
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

//	BangSoundPlay();

	// usuwanie pustych kolumn i przesuwanie pozostałych po lewej stronie
	if (couldBeEmptyRow) {
		if (RemoveEmptyColumns() // jeśli przesunął jakies kolumny i w związku z tym zostały puste kolumny
			&& (gameTypes.type3 === gameOptions.currentGameType || gameTypes.type4 === gameOptions.currentGameType)) { // i pasuje typ gry
			do {
				// przepisanie tej kolumny do pierwszej zwolnionej
				for(var i = gameOptions.boardSize.y; i > 0; i--) {
					if (newColumnStore[gameOptions.boardSize.y - i] === undefined) {
						break;
					}
					else {
						var el = document.getElementById("field-" + (i-1) + "-0");
						el.setAttribute("class", "color" + newColumnStore[gameOptions.boardSize.y - i]);
					}
				}
				// regeneracja tablicy magazynu
				RenderStore();
			}
			while(RemoveEmptyColumns())
		}
	}

    if (gameOptions.currentGameType == gameTypes.type2 || gameOptions.currentGameType == gameTypes.type4) {
		// przesunięcie wierszy
		RemoveEmptyFields();
	}
	CountTotalScore();
	HighlightSelectedAndCountScore(true);
}

function RemoveEmptyColumns() {
	var moved = false;
	var retVal = false;
	for (var k = gameOptions.boardSize.x-1; k >= 0; k--) {
		var lastField = document.getElementById("field-" + (gameOptions.boardSize.y-1) + "-" + k);
		if (lastField.getAttribute("class") == "emptyField") { // ostatni element w kolumnie jest pusty
			retVal = true;
			// przesuniecie kolejnych kolumn
			var moveDim = 1; // wymiar przesunięcia (reguluje ile kolumn jest pustych)
			for (var j = k; j >= 1; j--) {
				for(var c = 0; c < gameOptions.boardSize.y; c++) {
					if (j-moveDim < 0) moveDim = j;
					var fieldToMoveFrom = document.getElementById("field-" + c + "-" + (j-moveDim));
					var fieldToMoveTo = document.getElementById("field-" + c + "-" + (j));
					moved = false;
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
	return retVal;
}

function RemoveEmptyFields() {
	var tmpX = null;
	// zaczynamy od prawego górnego rogu
	for (var y = 0; y < gameOptions.boardSize.y; y++) {
		var emptyField = null;
		for (var x = gameOptions.boardSize.x-1; x >= 0; x--) {
			var field = $("#field-" + y + "-" + x).get(0);
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
 *
 * @param fldsList Array
 * @param fieldToRemove TD Element
 * @return Array tablica z usuniętym elementem fieldToRemove
 */
function cleanSelectedFields(fldsList, fieldToRemove) {
	var retVal = new Array();
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
 * @return mixed true jeśli jest ruch; false jeśli nie ma ruchu i null, jeśli nie ma ruchu a plansza jest pusta
 */
function hasAnyMove() {
	var initField;

	checkedFields = new Array();

	for (var x = gameOptions.boardSize.x-1; x >= 0; x--) {
		for(var y = gameOptions.boardSize.y-1; y >=0; y--) {
			initField = document.getElementById("field-"+y+"-"+x);
			if (initField === null) return false;
			if (initField.getAttribute("class") != 'emptyField') {
				if (findSimilar(initField, initField.getAttribute("class"), 0, false)) {
					return true;
				}
			}
			// sprawdzenie pustej planszy
			else if (x == gameOptions.boardSize.x-1 && y == gameOptions.boardSize.y-1) {
				return null;
			}
		}
	}
	return false;
}

/**
 * Wyszukuje elementy sąsiednie do wskazanego elementu planszy
 * @param selElement TD Element selElement
 * @param selClassName String nazwa klasy CSS, która posiada wskazany element
 * @param licznik int licznik pomocniczy do obsługi rekurencji
 * @param selectMode bool wskazuje czy funkcja jest wywoływana w kontekście zaznaczania elementó czy sprawdzania dostępności ruchów.
 * @return bool true jeśli znajdzie takie same sąsiednie pola; false jeśli nie znajdzie
 */
function findSimilar(selElement, selClassName, licznik, selectMode) {

	if (selectMode == true && selectedFields.indexOf(selElement, 0) == -1) {
		selectedFields.push(selElement);
	}

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
			if (selectMode) { // wyszukiwanie do zaznaczenia
				if (selectedFields.indexOf(nextSibling) == -1) {
					var nextSiblingClassName = jQuery.trim(nextSibling.getAttribute("class"));
					if (nextSiblingClassName == selClassName) {
						findSimilar(nextSibling, selClassName, 0, selectMode);
					}
				}
			}
			else { // wyszukiwanie czy jest jeszcze jakiś ruch
				if (nextSibling.getAttribute("class") == 'emptyField' || checkedFields.indexOf(nextSibling.getAttribute("id")) !== -1) continue;
				if (nextSibling.getAttribute("class") == selClassName) {
					return true;
				}
				else {
					if (licznik < 4) { continue; }
					else {
						checkedFields.push(nextSibling.getAttribute("id"));
						if (findSimilar(nextSibling, nextSibling.getAttribute("class"), 0, selectMode)) {
							return true;
						}
					}
				}
			}
		}
	}
	while (licznik < 4);
	return false;
}

/**
 * Generuje dodatkową kolumnę (tzw. magazyn) z kulami, które zostaną dodane do planszy.
 * Dotyczy gry w trybie 3 i 4.
 */
function RenderStore() {
	newColumnStore = generateNewBools(); // zmienna globalna! nie dodawać var!!! bo wpada w nieskończoną pętlę

	// czyszczenie planszy
	$("#storeArea").empty();

	$("#storeArea").append("<table id=\"storeTable\"></table>");
    for(var i = 0; i < gameOptions.boardSize.y; i++) {
		$("#storeTable").append("<tr><td></td></tr>");
		if (newColumnStore.length >= (gameOptions.boardSize.y - i)) {
			$("#storeTable td:last").addClass("color" + newColumnStore[gameOptions.boardSize.y - i - 1]);
		}
	}
	$("#storeArea").show();
}

/**
* Generuje nowe kule dla gry w trybie 3 i 4.
*/
function generateNewBools() {
    // losowanie ilości kól (<= wysokość planszy)
    var newBoolsNumber = Math.floor(Math.random() * gameOptions.boardSize.y + 1);
    // losowanie kolorów
    var newBools = [];
    for (var i = 0; i < newBoolsNumber; i++) {
        newBools.push(Math.floor(Math.random() * 4 + 1));
    }
    return newBools;
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
    $('#undoBtn').attr('src', "images/themes/" + gameOptions.theme + "/Undo.png");
}

/**
* Wyłącza funkcję undo
*/
function DisableUndo() {
    lastBoardState = null;
    $("#undoBtn").disabled = true;
    $('#undoBtn').attr('src', "images/themes/" + gameOptions.theme + "/UndoDisabled.png");
}

function ResetResults() {
	if (confirm("Are you sure you want to clear results?")) {
		gameStats.Clear();
		refreashMessages();
		return true;
	}
	return false;
}

//var audioBang = null;
//function BangSoundPlay() {
//	if (gameOptions.EnableAudio && audioBang != null) {
//		audioBang.pause();
//		audioBang.play();
//	}
//}
//
//function testAudio() {
//	var audio = document.createElement('audio');
//	if (audio.play) {
//		gameOptions.EnableAudio = true;
//		audioBang = document.getElementById("audio_bang");
//	}
//}

// inicjalizacja aplikacji
$(window).load(function () {

//	var currentTheme = $.cookie('theme');
//	if (currentTheme != undefined) {
//		loadCss(currentTheme, false);
//	}

//	testAudio(); // zmienie gameOptions.playAudio, więc musi być przed gameOptions.Read()!

	$("#gameVersion").append(gameVersion);
	storage.saveType = 'ajax';
	var firstStart = !(storage.Init("../JSBubbles.ServerSide/index.php"));
	// odczytanie statystyk gry
	gameStats.Read();
	gameStats.playerName = playerName;
	gameOptions.Read();
	// musi być po gameOptions.Read(), ponieważ odwołuje się do ustwień gry
	InitEvents();

	// inicjalizacja gry
	InitBoard();

	LoadTopTen();
	// odświeża statystyki ogólne co 10 min.
	setInterval("LoadTopTen()", 60000);

	// inicjowanie personalizacji
	if (firstStart) {
		// pobranie nazwy gracza
		GetUserName();

		// sprawdzenie czy jest konfiguracja i stan ze starej wersji gry
		ReadUncientStorage();

//		gameOptions.Save();
		TogglePanel(pannels.settings, function() {
			$.jnotify("It seems that this is your first time with JS Bubbles.<br /> Maybe you should start from learning the game options?<p class=\"add-info\">Click anywhere to close.</p>", {parentElement: "#controlPanel", delay: 5000, slideSpeed: 2000});
		});
	}
	else {
		// else ponieważ ReadUncientStorage też to wykonuje
		SetSettingsPanel();
	}

	refreashMessages();
	UpdateResultsTable();
	// podświetlenie pierwszej opcji menu (tytuł gry)
	toggleHighlight($("#boardPanelSwitchBtn").get(0));
});

/**
 * Ładuje stara wersję (2.x) konfiguracji i wyników z ciasteczka i zapisuje
 * do aktualnego storage.
 *
 * return void;
 */
function ReadUncientStorage() {
	var settings = new Array();
	// odczt danych z ciach
	var elements = $.getCookie("storage");
	var pair;
	if (elements !== null && elements.length > 0) {
		pair = elements.split("/#/");
		if (pair.length > 0) {// rozparsowaniu zapisu zserializowanego do obiektów GameStatistics
			var statsList = pair[1].split(";");
			var tmpArray = new Array();

		// tymczasowa lista zapisanych statystyk
			for(var i=0; i < statsList.length; i++) {
				var tmpObj;
				try {
					var parts = statsList[i].split(":");
					if (parts.length == 4 && parts[0].length > 0) {
						var _tmpIbj = new GameStatistics(parts[0])
						_tmpIbj.max = parseInt(parts[1]);
						_tmpIbj.games = parseInt(parts[2]);
						_tmpIbj.avg = parseInt(parts[3]);
						tmpObj = _tmpIbj;
					}
				}
				catch(e) {}
				if (tmpObj !== false && typeof tmpObj === "object") {
					tmpArray.push(tmpObj);
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
				gameStats.statsArray[gameTypes[gtype]] = new GameStatistics(gameTypes[gtype]);
				if (gameTypes[gtype] === gameStats.currentType) {
					gameStats.stats = gameStats.statsArray[gameTypes[gtype]];
				}
			}
		}
	}

	// odczyt opcji gry
	var mo = $.subCookie(gameOptions._cookieName, "options");
	try {
		if (mo !== undefined) {
			gameOptions.ChangeBoardSize(mo.boardSize.y);
			gameOptions.ChangeGameType(mo.currentGameType);
			gameOptions.oneClickMode = mo.oneClickMode;
			gameOptions.ChangeBoardBackground(mo.boardBackground);
			gameOptions.enableAudio = mo.enableAudio;
		}
	}
	catch (exp) {
	}

	// zapisanie w nowej technologii
	SetSettingsPanel();
	gameOptions.Save();
	gameStats.Save();
	storage.Save(false);
}