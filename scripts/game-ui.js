/**
 * Nazwa panelu z planszą gry.
 * Nazwa jest wykorzystywana do przełączania paneli.
 */
var boardPanelName = "boardPanel";

/**
 * Tymczasowe pole do przechowywania zaznaczonego typy gry.
 * Dzięki niemu można ten wybór anulować.
 */
var selectedGameType = gameOptions.currentGameType;

var selectedBoardSize = gameOptions.boardSize.y;

/**
 * Numer panelu, który jest aktualnie wydoczny.
 * -1 - oznacza wszystkie panele schowane.
 */
var toggled = -1;

/**
 * Pokazuje lub ukrywane dodatkowe panele na planszy.
 * Obecnie jest to panel opcji i panel wyników gry.
 */
function TogglePanel(panelName, onPanelChange, onPanelClose) {
	if (!onPanelChange) onPanelChange = null;
	if (!onPanelClose) onPanelClose = null;

	// otwarcie wybranego panelu
	if (panelName > -1) {
		$('#appContainer').animate({ left: (panelName + 1) * -280 }, 1000, function() {
			if( $.isFunction(onPanelChange) ) onPanelChange.apply(toggled);
		});
		toggled = panelName;
		$("#panelTitle h1").animate({ right: (panelName + 1) * 300 }, 1000);
	}
	// zamknięcie otwartych paneli
	else {
		$('#appContainer').animate({ left: 0 }, 1000, function() {
			toggled = -1;
			if( $.isFunction(onPanelClose) ) onPanelClose.apply(toggled);
		});
	}
}

function InitEvents() {

	// Panel opcji
	$("#optionsSwitchBtn").click(function () {
		//TogglePanel('controlPanel');
		TogglePanel(0);
		return false;
	});

	$("#settingsOkBtn").click(function () {
		TogglePanel('controlPanel');

		gameOptions.oneClickMode = $("#oneClickMode").attr("checked") ? false : true;

		gameOptions.ChangeBoardBackground($("#boardBkgUrl").get(0).value);

		gameOptions.EnableAudio = $("#canPlaySounds").attr("checked") ? true : false;

		selectedBoardSize = parseInt($("#boardDimensionId").get(0).value);

		if (gameOptions.currentGameType !== selectedGameType || selectedBoardSize != gameOptions.boardSize.y) {
			if (gameStats.gameScore === 0 || confirm("Are you sure you want to start new game?")) {
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
		GetUserName();
		gameOptions.Save(); // zapisanie opcji
		storage.Save(true);
	});

	$("#settingsCancelBtn").click(function () {
		SetSettingsPanel();
		//TogglePanel('controlPanel');
		TogglePanel(-1);
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
		//TogglePanel('scorePanel');
		TogglePanel(1);
		return false;
	});

	$("#scoreClearBtn").click(function () {
		ResetResults();
		UpdateResultsTable();
		//TogglePanel('scorePanel');
		//TogglePanel(1);
	});

	// Panel pomocy
	$("#helpSwitchBtn").click(function () {
		//TogglePanel('helpPanel');
		TogglePanel(2);
		return false;
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

	// zamknięcie dowolnego panela
	$(".returnBtn").click(function () {
		TogglePanel(-1);
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
	for(var tmp in gameStats.statsArray) {
		resultData.push(gameStats.statsArray[tmp]);
	}
	$("#resultsTable").tmpl(resultData).appendTo("#resultsStats");
}

function GetUserName() {
	// sprawdzenie czy użytkownik podał swoją nazwę. Jeśli nie to pytamu
	while (IsNullOrEmpty(gameOptions.playerName)) {
		gameOptions.playerName = prompt("Podaj swój nick:");
		// TODO obsługa anulowania (zwraca null)
		if (gameOptions.playerName === null) {
			//storage.saveType == 'cookie';
			// break;
		}
	}
	storage.Set("player", gameOptions.playerName);
	// zapisanie w ciachu strony - w celu późniejszego inicjowania magazynu
	$.setCookie('jsb-player', gameOptions.playerName);
}

function loadCss(fileName, save) {
	if (fileName !== "") {
		htmldef = '<link rel="stylesheet" type="text/css" id="themeCss" href="css/themes/' + fileName + '" />';
		$("head").append(htmldef);
	}
	else {
		$("head link#themeCss").remove();
	}
	if (save) {
		$.setCookie('theme', fileName);
	}
}