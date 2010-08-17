/**
 * Kolorowe Kulki
 * @author Jarosław Wasilewski
 *
 * TODO: sprawdzanie, czy gracz ma jeszcze jakiś ruch i jeśli nie to kończenie gry
 * TODO: przejście na technikę obiektową
 */

/**
 * Tablica na zaznaczone elementy
 */
var selectedFields = new Array();

/**
 * Tablica ID elementów już sprawdzonych pod kątem posiadania opcju ruchu
 *
 */
var checkedFields = new Array();

/**
 * Kopia stanu planszy sprzed ruchu;; pozwala na wykonanie cofnięcia (Undo)
 */
var lastBoardState = null;

/**
 * Poprzednia punktacja w grze - konieczna do wykonania Undo
 */
var lastGameScore = null;

/**
 * Wielkość planszy
 */
var boardSize = 16;

/**
 * Łaczna ilość punktów w grze
 */
var totalScoreValue = 0;

/**
 * Ilość punktów za zaznaczone pola
 */
var selectedScore = 0;

/**
 * Maksymalna ilość punktów uzyskanych we wszystich grach w danej sesji gry
 */
var maxScore = 0;

/**
 * Zapewnienie zgodności IE z innymi przeglądarkami
 */
if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function(elt /*, from*/) {
    var len = this.length >>> 0;

    var from = Number(arguments[1]) || 0;
    from = (from < 0)
         ? Math.ceil(from)
         : Math.floor(from);
    if (from < 0)
      from += len;

    for (; from < len; from++) {
      if (from in this &&
          this[from] === elt)
        return from;
    }
    return -1;
  };
}

/**
 * Funkcja generuje planszę gry
 */
function CreateBoard (size) {
	boardSize = size;
	// czyszczenie planszy
	$("#boardArea").empty();

	boardTable = document.createElement("table");
	boardTable.setAttribute("id", "boardTable");
	for(i = 0; i < size; i++) {
		row = document.createElement("tr");
		row.setAttribute("id", "row" + i);
		for(j = 0; j < size; j ++) {
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
 * Zaznacza klikniety element i elementy sasiednie o identycznym kolorze
 * @param Event evn
 */
function selectSimilarFields(evn) {

	// obejście braku Event.target w IE
	var evt=window.event || evn
	if (!evt.target) { //if event obj doesn't support e.target, presume it does e.srcElement
		evt.target=evt.srcElement; //extend obj with custom e.target prop
	}
	
	// krok 1: sprawdzenie czy nie klikamy na zaznaczony obszar - jesli tak to usuwamy go
	selectedClassName = jQuery.trim(evt.target.getAttribute("class"));

	if (selectedClassName.indexOf("emptyField") !== -1) {
		deselectFields();
		return false;
	}
	else if (selectedClassName.indexOf("selected") !== -1 || selectedClassName.indexOf("emptyField") !== -1) {
		removeSelected(evt.target, selectedClassName.slice(0,selectedClassName.indexOf(" ")));
 		if (isFinish()) {
			alert("Koniec gry");
			EndGame();
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
	if (reset == false && selectedFields.length > 1){ // pojedyncze elementy nie sa zaznaczane
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
	var top = left = 0;

	if (selectedFields.length > 1){ // pojedyncze elementy nie sa zaznaczane
		for(i = 0; i < selectedFields.length; i++) {
			//zaznacza element -> dodanie klasy "selected"
			var position = $(selectedFields[i]).offset();
			if (left == 0 || position.left < left) {
				left = position.left;
				top = position.top;
			}
			if (top == 0 || position.top < top && position.left >= left) {
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
	totalScoreValue += selectedScore;
	$("#totalScoreValue").text(totalScoreValue);
}

/**
 * Kasuje punktację aktualnie zaznacoznych elementów
 */
function ResetTotalScores() {
	totalScoreValue = 0;
	$("#totalScoreValue").text(totalScoreValue);	
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
				if (newPosX >= boardSize) continue;
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
				if (newPosX >= boardSize) continue;
				break;
		}
		var nextSibling = document.getElementById("field-" + newPosY + "-" + newPosX);
		if (nextSibling !== null && selectedFields.indexOf(nextSibling) == -1) {
			nextSiblingClassName = jQuery.trim(nextSibling.getAttribute("class"));
			if (nextSibling != undefined && (nextSiblingClassName == selClassName)) {
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

	// porządkowanie tablicy zaznaczonych elementów - zaczynam od najniżej połóżonych
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
	
	var i = 0;
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

		if (posY == boardSize-1) {
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
	CountTotalScore();
	CountSelectedScore(true);
}

function RemoveEmptyColumns() {
	for (var k = boardSize-1; k > 0; k--) {
		var lastField = document.getElementById("field-" + (boardSize-1) + "-" + k);
		if (lastField.getAttribute("class") == "emptyField") { // ostatni element w kolumnie jest pusty
			// przesuniecie kolejnych kolumn
			var moveDim = 1; // wymiar przesunięcia (reguluje ile kolumn jest pustych)
			for (var j = k; j >= 1; j--) {
				for(var c = 0; c < boardSize; c++) {
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
 * Odświeża planszę o wybranej z listy wielkości
 */
function changeBoardSize() {
	if (totalScoreValue == 0 || confirm("Czy chcesz przerwać grę?")) {
		InitGame();
	}
	else {
		// przywrócenie poprzednio wybranej wielkości planszy
		control_boardDimension = document.getElementById("boardDimensionId");
		control_boardDimension.selectedIndex = boardSize == 12 ? 0 : boardSize == 16 ? 1 : 2;
	}
}

/**
 * Sprawdza czy gracz ma jeszcze jakieś opcje ruchu
 * @return bool
 */
function isFinish() {
	var initField;

	checkedFields = new Array();

	for (var x = boardSize-1; x >= 0; x++) {
		for(var y = boardSize-1; y >=0; y++) {
			initField = document.getElementById("field-"+x+"-"+y);
			if (initField.getAttribute("class") != 'emptyField') {
				return !findMove(initField, initField.getAttribute("class"), 0);
			}
		}
	}
	return true;
}

/**
 * Inicjalizuje plansze gry
 * @return void
 */
function InitGame() {
  // ustalenie rozmiarów okna gadżetu
  // document.body.style.width = "500px";
  // document.body.style.height = "500px";

	// podłączenie zdarzenia do pokazywania/ukrywania panelu opcji
	$('#optionsSwitch ').click(function () {
		if ( $('#optionsSwitch img').attr('src')== "images/1rightarrow.png") {
			$('#optionsSwitch img').attr('src', 'images/1downarrow1.png');
		}
		else {
			$('#optionsSwitch img').attr('src', "images/1rightarrow.png");
		}
		$('#options').slideToggle();
	});


	ResetTotalScores();
	ResetSelectedScores();

	// odczyt rozmiaru planszy
	control_boardDimension = document.getElementById("boardDimensionId");
	CreateBoard(parseInt(control_boardDimension.options[control_boardDimension.selectedIndex].value));
}

/**
 * Kończy grę.
 */
function EndGame() {

	if (maxScore < totalScoreValue)
		maxScore = totalScoreValue;
	document.getElementById("maxScoreValue").innerHTML = maxScore;
	ResetSelectedScores();
	ResetTotalScores();

	// blokada cofania ruchu
	lastBoardState = null;
	document.getElementById("btnUndo").disabled = true;
	$('#btnUndo').attr('src', "images/rewind_gray.png");

	InitGame();
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
				if (newPosX >= boardSize) continue;
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
				if (newPosX >= boardSize) continue;
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
 * Wykonanie kopi planszy w celu umożliwienia cofnięcia ruchu
 */
function SaveGameState() {
	lastBoardState = document.getElementById("boardTable").cloneNode(true);
	document.getElementById("btnUndo").disabled = false;
	lastGameScore = selectedScore;
	$('#btnUndo').attr('src', "images/rewind.png");
}

/**
 * Wykonuje cofnięcie poprzedniego ruchu
 *
 * @return bool
 */
function UndoMove() {
	if (lastBoardState != null) {
		document.getElementById("boardArea").replaceChild(lastBoardState, document.getElementById("boardTable"));
		lastBoardState = null;
		$('#btnUndo').attr('src', "images/rewind_gray.png");
		
		// trzeba ponownie podpiąć zdarzenie onclick - nie wiem dlaczego nie jest kopiowane wraz z całą zawartością tablicy planszy!		
		$("#boardTable td").click(selectSimilarFields);
		deselectFields();
		document.getElementById("btnUndo").disabled = true;
		// odtworzenie poprzedniego wyniku gry
		selectedScore = -lastGameScore;
		CountTotalScore(); // mała sztuczka, żeby nie zmieniać API
		return true;
	}
	return false;
}