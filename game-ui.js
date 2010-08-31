/**
 * Nazwa panelu z planszą gry.
 * Nazwa jest wykorzystywana do przełączania paneli.
 */
var boardPanelName = "boardPanel";

/**
 * Pokazuje lub ukrywane dodatkowe panele na planszy
 */
function TogglePanel(panelName) {
	toggled = 0;
	try {
		toggled = $('#' + panelName).data("visible");
	}
	catch (err) {
		toggled = 0;
	}
	if(toggled === 1) {
		$('#' + panelName).animate({
			left: '100%',
			}, 1000
		);
/*		$('#' + boardPanelName).animate({
			left: '0',
			}, 1000
		); */
		$('#' + panelName).data("visible", 0);
	}
	else {
		$('#' + panelName).animate({
			left: '0',
			}, 1000
		);
/*		$('#' + boardPanelName).animate({
			left: '-308',
			}, 1000
		); */
		$('#' + panelName).data("visible", 1);
	}
}

function InitEvents() {

	// Panel opcji
	$("#optionsSwitchBtn").click(function() {
		TogglePanel('controlPanel');
		return false;
	});

	$("#settingOkBtn").click(function() {
		TogglePanel('controlPanel');

		if (gameStats.gameScore == 0 || confirm("Czy chcesz przerwać grę?")) {
			InitGame();
		}
		else {
			RestoreSettings();
		}
	});

	$("#settingsCancelBtn").click(function() {
		RestoreSettings();
		TogglePanel('controlPanel');
	});

	// Panel statystyk gier
	$("#resultsSwitchBtn").click(function() {
		TogglePanel('scorePanel');
		return false;
	});

	$("#scoreCloseBtn").click(function() {
		TogglePanel('scorePanel');
	});

	$("#scoreClearBtn").click(function() {
		ResetResults();
		TogglePanel('scorePanel');
	});

	// Koniec gry
	$("#newGameBtn").click(function() {
		EndGame();
		return false;
	});

	// Cofanie ruchu
	$("#undoBtn").click(function() {
		UndoMove();
		return false;
	});
}

/**
 * Przywraca w GUI ustawień aktualne wartości opcji gry.
 * Jest wywoływane przy okazji anulowania zmian oraz inicjalizacji gry.
 */
function RestoreSettings() {

	$("#gameTypeId").empty();
	// odczytanie typów gry i ustawienie listy w opcjach
	for (var typeElement in gameTypes) {
		$("<option />", {
			value: typeElement,
			selected: gameStats.currentType === gameTypes[typeElement] ? true : false,
			text: gameTypes[typeElement],
		}).appendTo("#gameTypeId");
	}

	$("#boardDimensionId").empty();
	// odczytanie wielkości planszy i ustawienie w opcjach
	for (var sizeElement in boardSizeList) {
		$("<option />", {
			value: boardSizeList[sizeElement].y,
			selected: boardSize.y === boardSizeList[sizeElement].y ? true : false,
			text: boardSizeList[sizeElement].text,
		}).appendTo("#boardDimensionId");
	}
}