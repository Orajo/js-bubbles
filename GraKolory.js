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
 * Funkcja generuje planszę gry
 */
function CreateBoard (size) {
	boardSize = size;
	if (oldBoardTable = document.getElementById("boardTable")) {
		document.getElementById("boardArea").removeChild(oldBoardTable);
	}
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
	boardArea = document.getElementById("boardArea");
	boardArea.appendChild(boardTable);
}

/**
 * Zaznacza klikniety element i elementy sasiednie o identycznym kolorze
 * @param Event evn
 */
function selectSimilarFields(evn) {
	// krok 1: sprawdzenie czy nie klikamy na zaznaczony obszar - jesli tak to usuwamy go
	selectedClassName = evn.target.getAttribute("class");

	if (selectedClassName.indexOf("emptyField") !== -1) {
		deselectFields();
		return false;
	}
	else if (selectedClassName.indexOf("selected") !== -1 || selectedClassName.indexOf("emptyField") !== -1) {
		removeSelected(evn.target, selectedClassName.slice(0,selectedClassName.indexOf(" ")));
 		if (isFinish()) {
			alert("Koniec gry");
			EndGame();
		}
	}
	// krok 2: jeśli nie, to kasowanie poprzedniego zaznaczenia
	else {
		deselectFields();
		// krok 3: zaznaczanie nowego miejsca
		findSimilar(evn.target, selectedClassName, 0);
		CountSelectedScore(evn.target);
	}
	return true;
}

/**
 * Ustawia bieżące zaznaczenie oraz oblicza ilość punktów tego zaznaczenia
 * Punkty są naliczane jako SUMA(i*2), gdzie i to numer zaznaczonego elemetu zaczynając od 0
 *
 * @param Element fld
 * @return void
 */
function CountSelectedScore(fld) {
	if (fld !== null && selectedFields.length > 1){ // pojedyncze elementy nie sa zaznaczane
		selectedScore = 0;
		for(i = 0; i < selectedFields.length; i++) {
			selectedFields[i].setAttribute("class", fld.getAttribute("class") + " selected");
			selectedScore += i * 2;
		}
	}
	else {
		selectedScore = 0;
	}
	document.getElementById("scoreValue").innerHTML = selectedScore;
}

/**
 * Oblicza łączną punktację
 * @return void
 */
function CountTotalScore() {
	totalScoreValue += selectedScore;
	document.getElementById("totalScoreValue").innerHTML = totalScoreValue;
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
			if (nextSibling != undefined && nextSibling.getAttribute("class") == selClassName) {
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
	selectedFields.sort(compare);
	var i = 0;
	var couldBeEmptyRow = false;
	do {
		var idElements = selectedFields[0].getAttribute("id").split("-");
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
				//document.getElementById(selectedFields[i].getAttribute("id")).setAttribute("class", upperField.getAttribute("class"));
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
	CountSelectedScore(null);
}

function RemoveEmptyColumns() {
	for (var k = boardSize-1; k > 0; k--) {
		var lastField = document.getElementById("field-" + (boardSize-1) + "-" + k);
		if (lastField.getAttribute("class") == "emptyField") { // ostatni element w kolumnie jest pusty
			// przesuniecie kolejnych kolumn
			var moveDim = 1; // wymiar presunięcia (reguleuje ile kolumn jest pustych)
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
 * Funkcja pomocnicza do sortowania elementów w tablicy selectedElements
 * @param Element a
 * @param Element b
 * @return -1, 0, 1 zależnie od wyniku sortowania
 */
function compare(a, b)
{
	aId = a.getAttribute("id");
	bId = b.getAttribute("id");
	if (aId < bId)
		return 1;
	if (aId > bId)
		return -1;
	return 0;
}

/**
 * Usuwa z tablicy zaznaczonych elementów wskazany element
 * @param Array fldsList
 * @param TD Element fieldToRemove
 * @return Array tablica z usuniętym elementem fieldToRemove
 */
function cleanSelectedFields(fldsList, fieldToRemove) {
	retVal = new Array();
	for (var itemName in fldsList) {
		if (fldsList[itemName] !== fieldToRemove) {
			retVal.unshift(fldsList[itemName]);
		}
	}
	return retVal;
}

function deselectFields () {
	if (selectedFields.length > 0) {
		for (i = 0; i< selectedFields.length; i ++) {
			selectedFields[i] = DeselectField(selectedFields[i]);
		}
	}
	selectedFields = new Array();
}

/**
 * Inicjalizuje plansze gry
 * @return void
 */
function InitGame() {
	// odczyt rozmiaru planszy
	control_boardDimension = document.getElementById("boardDimensionId");
	totalScoreValue = 0;
	CountSelectedScore(null);
	document.getElementById("totalScoreValue").innerHTML = 0;
	CreateBoard(parseInt(control_boardDimension.options[control_boardDimension.selectedIndex].value));
}

function EndGame() {
	CountSelectedScore(null);
	if (maxScore < totalScoreValue)
		maxScore = totalScoreValue;
	document.getElementById("maxScoreValue").innerHTML = maxScore;
	document.getElementById("totalScoreValue").innerHTML = 0;
	InitGame();
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
		// trzeba ponownie podpiąć zdarzenie onclick - nie wiem dlaczego nie jest kopiowane wraz z całą zawartością tablicy planszy!
		var cells = document.getElementById("boardTable").getElementsByTagName("TD");
		for (var i = 0; i < cells.length; i++) {
			var selPos;
			// trzeba też usunąć zaznaczenie poprednio wybranych kulek
			if (selPos = cells[i].getAttribute("class").indexOf("selected") != -1) {
				cells[i] = DeselectField(cells[i]);
			}
			cells[i].onclick = selectSimilarFields;
		}
		document.getElementById("btnUndo").disabled = true;
		// odtworzenie poprzedniego wyniku gry
		selectedScore = -lastGameScore;
		CountTotalScore(); // mała sztuczka, żeby nie zmieniać API
		return true;
	}
	return false;
}

/**
 * Zaznacza pojedyczne pole gry
 * @param Element obiekt pola gry (TD)
 * @return Element obiekt pola gry (TD) z dodaną klasą "selected"
 */
function SelectField(fldObj) {
	if (fldObj.getAttribute("class").indexOf("selected") === -1) {
		return fldObj.setAttribute("class", fld.getAttribute("class") + " selected");
	}
	return fldObj;
}

/**
 * Usuwa zaznaczenie pola
 * @param Element obiekt pola gry (TD)
 * @return Element obiekt pola gry (TD) z usuniętą klasą "selected"
 */
function DeselectField(fldObj) {
	if (fldObj.getAttribute("class").indexOf("selected") !== -1) {
		return fldObj.setAttribute("class", fldObj.getAttribute("class").replace(/selected/gi, ""));
	}
	return fldObj;
}