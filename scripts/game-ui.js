/**
 * Nazwa panelu z planszą gry.
 * Nazwa jest wykorzystywana do przełączania paneli.
 */
var boardPanelName = "boardPanel";

/**
 * tymczasowe pole do przechowywania zaznaczonego typy gry.
 * Dzięki niemu można ten wybór anulować.
 */
var selectedGameType = gameOptions.currentGameType;

var selectedBoardSize = gameOptions.boardSize.y;

/**
 * Pokazuje lub ukrywane dodatkowe panele na planszy.
 * Obecnie jest to panel opcji i panel wyników gry.
 */
function TogglePanel(panelName) {
	var toggled = 0;
	try {
		toggled = $('#' + panelName).data("visible");
	}
	catch (err) {
		toggled = 0;
	}
	if (toggled === 1) {
		$('#' + panelName).animate({left: '100%'}, 1000);
/*		$('#' + boardPanelName).animate({
			left: '0',
			}, 1000
		); */
		$('#' + panelName).data("visible", 0);
	}
	else {
		$('#' + panelName).animate({left: '0'}, 1000);
/*		$('#' + boardPanelName).animate({
			left: '-308',
			}, 1000
		); */
		$('#' + panelName).data("visible", 1);
	}
}

function InitEvents() {

	// Panel opcji
	$("#optionsSwitchBtn").click(function () {
		TogglePanel('controlPanel');
		return false;
	});

	$("#settingOkBtn").click(function () {
		TogglePanel('controlPanel');

		gameOptions.oneClickMode = $("#oneClickMode").attr("checked") ? false : true;

		gameOptions.ChangeBoardBackground($("#boardBkgUrl").get(0).value);

		gameOptions.EnableAudio = $("#canPlaySounds").attr("checked") ? true : false;

		selectedBoardSize = parseInt($("#boardDimensionId").get(0).value);

		if (gameOptions.currentGameType !== selectedGameType || selectedBoardSize != gameOptions.boardSize.y) {
			if (gameStats.gameScore === 0 || confirm("Czy chcesz przerwać grę?")) {
				gameOptions.ChangeBoardSize(selectedBoardSize);
				gameOptions.ChangeGameType(selectedGameType);
				InitBoard();
			}
			else {
				// odtwarzanie w tym wypadku nie odtwarza poprzedniego stanu opcji oneClickMode, 
				// ale tak ma być
				SetSettingsPanel();
			}
		}
	});

	$("#settingsCancelBtn").click(function () {
		SetSettingsPanel();
		TogglePanel('controlPanel');
	});

	// wybranie trybu gry
	$("#options input:image").click(function () {
		if (selectedGameType !== this.value) {
			selectedGameType = this.value;
			// gameOptions.ChangeGameType(this.value);
			// wyłaczenie poprzedniego wskaźnika (właściwie wszystkich)
			$("#options input").removeClass("selected");
			// i zaznaczenie tylko wybranego
			$(this).addClass("selected");
		}
		return true;
	});
	
	// Panel statystyk gier
	$("#resultsSwitchBtn").click(function () {
		TogglePanel('scorePanel');
		return false;
	});

	$("#scoreCloseBtn").click(function () {
		TogglePanel('scorePanel');
	});

	$("#scoreClearBtn").click(function () {
		ResetResults();
		TogglePanel('scorePanel');
	});
	
	// Panel pomocy
	$("#helpSwitchBtn").click(function () {
		TogglePanel('helpPanel');
		return false;
	});
	
	$("#helpCloseBtn").click(function () {
		TogglePanel('helpPanel');
	});
	
	// Koniec gry
	$("#newGameBtn").click(function () {
		EndGame();
		return false;
	});

	// Cofanie ruchu
	$("#undoBtn").click(function () {
		UndoMove();
		return false;
	});
}

/**
 * Przywraca w GUI ustawień aktualne wartości opcji gry.
 * Jest wywoływane przy okazji anulowania zmian oraz inicjalizacji gry.
 */
function SetSettingsPanel() {

	// ustawienie wskaźnika typu gry
	$("#options input").removeClass("selected");
	if (gameOptions.currentGameType === gameTypes.type1) {
		$("#gmt1").addClass("selected");
	}
	else {
		$("#gmt2").addClass("selected");
	}

	// inicjalizacja listy rozmiarów planszy
	$("#boardDimensionId").empty();
	
	// odczytanie wielkości planszy i ustawienie w opcjach
	for (var sizeElement in boardSizeList) {
		$("<option />", {
			value: boardSizeList[sizeElement].y,
			selected: gameOptions.boardSize.y === boardSizeList[sizeElement].y ? true : false,
			text: boardSizeList[sizeElement].text
		}).appendTo("#boardDimensionId");
	}
	
	// inicjalizacja trybu zaznaczania
	$("#oneClickMode").attr("checked", !gameOptions.oneClickMode);

	// inicjalizacja tła gry
	$("#boardBkgUrl").attr("value", gameOptions.boardBackground);

	// inicjalizacja odtwarzania dźwięków.
	$("#canPlaySounds").attr("checked", gameOptions.EnableAudio);
}

/**
 * Aktualizuje tabelę wyników statystycznych gry
 */
function UpdateResultsTable() {
	$("tr#resultsStatsHeader ~ tr").remove();
	var resultData = new Array();
	for(tmp in gameStats.statsArray) {
		resultData.push(gameStats.statsArray[tmp]);	
	}
	$("#resultsTable").tmpl(resultData).appendTo("#resultsStats");
}
