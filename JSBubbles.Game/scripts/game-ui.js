"use strict";

/**
 * Tymczasowe pole do przechowywania zaznaczonego typy gry.
 * Dzięki niemu można ten wybór anulować.
 */
var selectedGameType = gameOptions.currentGameType;

var selectedBoardSize = gameOptions.boardSize.y;

/**
 * Numer panelu, który jest aktualnie wydoczny.
 * -1 - oznacza wszystkie panele schowane; widoczny panel gry.
 */
var toggled = -1;

/**
 * Lista paneli
 */
var pannels = {
	game: -1,
	comments: 0,
	settings: 1,
	scores: 2,
	about: 3,
	next: 100,
	prev: -100
}

/**
 * Pokazuje lub ukrywane dodatkowe panele na planszy.
 * Obecnie jest to panel opcji i panel wyników gry.
 * @param panelNo integer NUmer panelu. Zaleca się korzystanie z listy pannels
 * @param onPanelChange function Funkcja wywoływana po zmianie aktywnego panela
 */
function TogglePanel(panelNo, onPanelChange) {

	if (panelNo == pannels.next) {
		panelNo = toggled + 1;
	}
	else if (panelNo == pannels.prev) {
		panelNo = toggled - 1;
	}

	var panelWidth = $(".panelsArea:first-child").outerWidth(true);
//	$('#appContainer').width(panelWidth * 4);

	if (!onPanelChange) onPanelChange = null;

	// otwarcie wybranego panelu
	$('#appContainer').animate({left: (panelNo + 1) * -panelWidth}, 1500, function() {
		toggleHighlight($("ul#gameTopMenu li").get(panelNo + 1));
		if( $.isFunction(onPanelChange) ) onPanelChange.apply(toggled);
	});
	toggled = panelNo;
	$("body").addClass("gameBody" + panelNo);
}

function InitEvents() {

	// wskaźnik czy któraś z ikon przesuwania na boki jest aktywna
	var showNextPrev = false;

	// obsługa obszaru (ikony) przesywania do poprzedniego panelu
	$("#prevIcon").click(function (){
		if (toggled > pannels.game) {
			$("#prevIcon div").fadeOut();
			TogglePanel(pannels.prev);
			showNextPrev = false;
		}
	}).hover(function(event) {
		if (toggled > pannels.game) {
			// przesuń do pozycji kursora
			$("#prevIcon div").offset({left: 0, top: event.pageY - 21}); // 21 to 1/2 wysokości ikony.
			$("#prevIcon div").fadeIn("fast");
			showNextPrev = true;
		}
	}, function() {
		$("#prevIcon div").fadeOut();
		showNextPrev = false;
	});

	// obsługa obszaru (ikony) przesywania do następnego panelu
	$("#nextIcon").click(function (){
		if (toggled < pannels.about) {
			$("#nextIcon div").fadeOut();
			TogglePanel(pannels.next);
			showNextPrev = false;
		}
	}).hover(function(event) {
		if (toggled < pannels.about) {
			$("#nextIcon div").offset({left: $("#nextIcon").offset.left, top: event.pageY - 21});
			$("#nextIcon div").fadeIn("fast");
			showNextPrev = true;
		}
	}, function() {
		$("#nextIcon div").fadeOut();
		showNextPrev = false;
	});

	// Panel opcji
	$("#optionsSwitchBtn").click(function () {
		TogglePanel(pannels.settings);
		return false;
	});

	$("#settingsOkBtn").click(function () {
		TogglePanel(pannels.game);

		gameOptions.oneClickMode = $('#oneClickMode').is(':checked') ? false : true;

		gameOptions.ChangeBoardViewType($("#controlPanel input[type=radio]:checked").val());

		selectedBoardSize = parseInt($("#boardDimensionId").get(0).value);

		if (gameOptions.currentGameType !== selectedGameType || selectedBoardSize != gameOptions.boardSize.y) {
			if (gameStats.gameScore === 0 || confirm(strings.newGame)) {
				var sizeChanged = gameOptions.ChangeBoardSize(selectedBoardSize);
				gameOptions.ChangeGameType(selectedGameType, sizeChanged);
				InitBoard();
			}
			else {
				// odtwarzanie w tym wypadku nie odtwarza poprzedniego stanu opcji oneClickMode,
				// ale tak ma być
				SetSettingsPanel();
			}
		}
		gameOptions.Save(); // zapisanie opcji
	});

	$("#settingsCancelBtn").click(function () {
		SetSettingsPanel();
		TogglePanel(pannels.game);
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
		TogglePanel(pannels.scores);
		return false;
	});

	// Panel komentarzy
	$("#commentsSwitchBtn").click(function () {
		//TogglePanel('scorePanel');
		TogglePanel(pannels.comments);
		return false;
	});

	// Panel gry
	$("#boardPanelSwitchBtn").click(function () {
		//TogglePanel('scorePanel');
		TogglePanel(pannels.game);
		return false;
	});

	$("#scoreClearBtn").click(function () {
		if (confirm(strings.clearResults)) {
			gameStats.Clear();
			refreashMessages();
			UpdateResultsTable();
			return true;
		}
		return false;
	});

	// Panel pomocy
	$("#helpSwitchBtn").click(function () {
		TogglePanel(pannels.about);
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
	$(".returnBtn").click(function() {
		TogglePanel(pannels.game);
	});

	$("#registerForm input[type=text]").keydown(function() {
		if (IsNullOrEmpty(this.value)) {
			$("#registerForm input#saveBtn").attr("disabled", true);
		}
		else {
			$("#registerForm input#saveBtn").removeAttr("disabled");
		}
	});
}

/**
 * Przywraca w GUI ustawień aktualne wartości opcji gry.
 * Jest wywoływane przy okazji anulowania zmian oraz inicjalizacji gry.
 */
function SetSettingsPanel() {

	// ustawienie wskaźnika typu gry
	$("#options input").removeClass("selected");
	for (var type in gameTypes) {
		if (gameOptions.currentGameType === gameTypes[type]) {
			$("#gm_" + type).addClass("selected");
		}
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
	// włączenie "modal mode" :)
	$("body").append("<div id='modalBackground'></div>");

	// sprawdzenie czy użytkownik podał swoją nazwę. Jeśli nie to pytamu
	$("#registerForm").fadeIn();
	$("playerNameInput").focus();
	if (!IsNullOrEmpty($("#playerNameInput").val())) {
		$("#registerForm input#saveBtn").removeAttr("disabled");
	}
	$("#registerForm input#saveBtn").click(function(){
		gameOptions.playerName = $("#playerNameInput").val();
		$("#modalBackground").remove();
		storage.Set("player", gameOptions.playerName);
		storage.saveType = 'ajax';
		$("#registerForm").fadeOut();
		if (!storage.Save(true)) {
			$.jnotify(strings.dataNotSaved, {parentElement: "#boardPanel", delay: 4000, slideSpeed: 2000});
		}
	});
	// anulowanie rejestracji
	$("#registerForm input[type=reset]").click(function(){
		$("#registerForm").fadeOut();
		gameOptions.playerName = null;
		$("#modalBackground").remove();
		storage.saveType = 'cookie';
		storage.Save(true);
	});
}

function LoadTopTen() {
	$.get('../JSBubbles.ServerSide/index.php', {action: 'stats'}, function(data){
		var resultData = new Array();
		for(var tmp in data) {
			resultData.push(data[tmp]);
		}
		$("tr#topTenStatsHader ~ tr").remove();
		$("#topTenStatsScript").tmpl(resultData).appendTo("#topTenStats");
	}, 'json');
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
	$("#playerNameValue").text(gameOptions.playerName);
	$("#timeToMoveValue").text(moveTimer.Get());
	$("#totalScoreValue").text(gameStats.gameScore);
	document.title = GetGameTitle();
}

function toggleHighlight(selectedBtn){
	$("#gameTopMenu li").removeClass("selected");
	$(selectedBtn).addClass("selected");
}

function loadResources(defLang, lang) {
	var ga = document.createElement('script');
        ga.type = 'text/javascript';

	if (!IsNullOrEmpty(lang)) {
		ga.src = 'scripts/resources/game-resources-' + lang + '.js';
	}
	else {
		var language = navigator.appName == 'Netscape' ? navigator.language : navigator.browserLanguage;

		if (language.indexOf('pl') > -1) {
		// ładuj polskie zasoby
        ga.src = 'scripts/resources/game-resources-pl.js';
		}
		else {
			// ładuj zaosby angielski
			ga.src = 'scripts/resources/game-resources-en.js';
		}
	}

	if (defLang != language) {
		ga.onload = function(){
			$('*[class*="strings."]').each(function () {
				var classNames = this.getAttribute("class");
				var respos = classNames.indexOf("strings.") + 8; // 8 to długość 'strings.'
				var count = classNames.indexOf(" ", respos);
				if (count <= 0) count = classNames.length;
				var resName = classNames.substring(respos, count);
				var inputType = this.getAttribute("type");
				if (inputType == "button" || inputType == "input" || inputType == "clear") {
					this.setAttribute("value", strings[resName]);
				}
				else {
					this.innerHTML = strings[resName];
				}
			});
		}
	}

    var s = document.getElementsByTagName('head')[0];
	s.insertBefore(ga, s.firstChild);
}