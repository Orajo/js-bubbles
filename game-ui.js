/**
 * Nazwa panelu z plansz¹ gry.
 * Nazwa jest wykorzystywana do prze³¹czania paneli.
 */
var boardPanelName = "boardPanel";

/**
 * Pokazuje lub ukrywane dodatkowe panele na planszy
 */
function togglePanel(panelName) {
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

function GoToSettings () {
	togglePanel('controlPanel');
}

function ShowResults () {
	togglePanel('scorePanel');
}
