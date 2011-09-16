/**
 * Kolorowe Kulki
 * @author Jarosław Wasilewski
 * @version 2.1 beta 2
 */

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

function GetGameTitle() {
    return gameTitle + " (" + gameVersion + ") - current mode: " + gameOptions.currentGameType;
}

/**
 * Funkcja generuje planszę gry
 * TODO: sprawdzić wiązanie zdarzenia onclick popprzez jquery.delegate()
 */
function InitBoard () {
	// czyszczenie planszy
	$("#boardArea").empty();

	var boardTable = document.createElement("table");
	boardTable.setAttribute("id", "boardTable");
	for(i = 0; i < gameOptions.boardSize.y; i++) {
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
}

/**
 * Kończy grę.
 * @param ended bool Wskazuje czy gra się skończyła (true) czy została przerwana (false)
 */
function EndGame(ended) {
    if (ended || confirm("Do you want to finish the game?")) {
    	if (ended) {
    		$.jnotify("<strong>Game over!</strong><br/><span style=\"font-size: smaller\">No more moves.</span><br/>Your score is " + gameStats.gameScore, {parentElement: "#boardPanel", delay: 4000, slideSpeed: 2000,
    				  remove: function () {
    				  	refreashMessages();
    				  	InitBoard();
    				  }
    		});
    	}
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
		if (storage.Save(true)) {
			$.jnotify("Data saved!", {parentElement: "#boardPanel", delay: 4000, slideSpeed: 2000});
		}
		else {
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

	// obejście braku Event.target w IE
	var evt=window.event || evn;
	if (!evt.target) { //if event obj doesn't support e.target, presume it does e.srcElement
		evt.target=evt.srcElement; //extend obj with custom e.target prop
	}

	// krok 1: sprawdzenie czy nie klikamy na zaznaczony obszar - jeśli tak to usuwamy go
	var selectedClassName = jQuery.trim(evt.target.getAttribute("class"));

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
		if (gameOptions.oneClickMode) { // in oneClickMode remove selected bools now
			selectSimilarFields(evn);
		}
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
			var nextSiblingClassName = jQuery.trim(nextSibling.getAttribute("class"));
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
			&& (gameTypes.type3 === this.gameOptions.currentGameType || gameTypes.type4 === this.gameOptions.currentGameType)) { // i pasuje typ gry
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
	CountSelectedScore(true);
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
 * @return bool
 */
function hasAnyMove() {
	var initField;

	checkedFields = new Array();

	for (var x = gameOptions.boardSize.x-1; x >= 0; x++) {
		for(var y = gameOptions.boardSize.y-1; y >=0; y++) {
			initField = document.getElementById("field-"+y+"-"+x);
			if (initField === null) return false;
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
 * Generuje dodatkową kolumnę (tzw. magazyn) z kulami, które zostaną dodane do planszy.
 * Dotyczy gry w trybie 3 i 4.
 */
function RenderStore() {
	newColumnStore = generateNewBools(); // zmienna globalna! nie dodawać var!!! bo wpada w nieskończoną pętlę

	if ($("#storeArea").css('display') === 'none') {
		$("#storeArea").css('display', 'block');
	}
	// czyszczenie planszy
	$("#storeArea").empty();

	$("#storeArea").append("<table id=\"storeTable\"></table>");
    //storeTable = document.createElement("table");
	//storeTable.setAttribute("id", "storeTable");
    for(var i = 0; i < gameOptions.boardSize.y; i++) {
		$("#storeTable").append("<tr><td></td></tr>");
 		//row = document.createElement("tr");
		//field = document.createElement("td");
		if (newColumnStore.length + 1 >= (gameOptions.boardSize.y - i)) {
			$("#storeTable td:last").addClass("color" + newColumnStore[gameOptions.boardSize.y - i - 1]);
            //field.setAttribute("class", "color" + newColumnStore[gameOptions.boardSize.y - i]);
		}
        //row.appendChild(field);
		//storeTable.appendChild(row);
		//document.getElementById("storeArea").appendChild(storeTable);
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
    for (i = 0; i < newBoolsNumber; i++) {
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

function refreashMessages() {
	$("#gameTypeName").text(gameStats.currentType);
	if (gameStats.stats != undefined) {
		$("#maxScoreValue").text(gameStats.stats.max);
		$("#avgScoreValue").text(gameStats.stats.avg);
		$("#playedGamesValue").text(gameStats.stats.games);
	}
	$("#gameTypeValue").text(gameStats.currentType);
	$("#gameTypeValue").attr("title", gameStats.currentType);
	$("#playerNameValue").text(gameStats.playerName);
	document.title = GetGameTitle();
}

var audioBang = null;
function BangSoundPlay() {
	if (gameOptions.EnableAudio && audioBang != null) {
		audioBang.pause();
		audioBang.play();
	}
}

function testAudio() {
	var audio = document.createElement('audio');
	if (audio.play) {
		gameOptions.EnableAudio = true;
		audioBang = document.getElementById("audio_bang");
	}
}

// inicjalizacja aplikacji
$(window).load(function () {

	var currentTheme = $.cookie('theme');
	if (currentTheme != undefined) {
		loadCss(currentTheme, false);
	}
	// sparwdzenie czy jest to pierwsze uruchomienie
	playerName = $.cookie('jsb-player');
	if (IsNullOrEmpty(playerName)) {
		firstStart = true;
	}

//	testAudio(); // zmienie gameOptions.playAudio, więc musi być przed gameOptions.Read()!
	storage.Init(playerName);
	// odczytanie statystyk gry
	gameStats.Read();
	gameStats.playerName = playerName;
	gameOptions.Read();
	// musi być po gameOptions.Read(), ponieważ odwołuje się do ustwień gry
	InitEvents();

	UpdateResultsTable();

	SetSettingsPanel();

	// inicjalizacja gry
	InitBoard();
	refreashMessages();

	// inicjowanie personalizacji
	if (firstStart) {
		GetUserName();
		TogglePanel(0, function() {
			$.jnotify("It seems that this is your first time with JS Bubbles.<br /> Maybe you should start from learning the game options?<p class=\"add-info\">Click anywhere to close.</p>", {parentElement: "#controlPanel", delay: 5000, slideSpeed: 2000});
		});
	}
});

// sprzątenie
$(window).unload(function() {
//	gameStats.Save(); // zapisanie stanu gry
//	gameOptions.Save(); // zapisanie opcji
//	storage.Save(); // zapisanie zawartości magaznu danych
});