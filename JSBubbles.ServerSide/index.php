<?php

$debug = false;

if (!$debug) {
//	xdebug_disable();
}

/* Connect to an ODBC database using driver invocation */
$dsn = 'mysql:dbname=jsbubbles;host=127.0.0.1';
$user = 'root';
$password = 'dodekorajo';
$dbh = null;

// Określenie błędów.
$json_errors = array(
	JSON_ERROR_NONE => 'Nie wystąpił żaden błąd',
	JSON_ERROR_DEPTH => 'Przekroczono maksymalny poziom zagłębienia',
	JSON_ERROR_CTRL_CHAR => 'Błąd znaku sterującego, prawdopodobnie nieprawidłowo zakodowany',
	JSON_ERROR_SYNTAX => 'Błąd składni',
	JSON_ERROR_STATE_MISMATCH => 'Niepoprawny składniowo lub zniekształcony JSON',
	JSON_ERROR_SYNTAX => 'Błąd składni',
	JSON_ERROR_UTF8 => 'Nieprawidłowe znaki UTF-8. Możliwe, że nieprawidłowo zakodowane'
);

// połączenie do bazy danych
try {
	$dbh = new PDO($dsn, $user, $password);
} catch (PDOException $e) {
	save2log('DB connection error: ' . $e->getMessage());

	header('HTTP/1.1 500 Internal Server Error');
	returnError('server error');
}

// pobranie i sprawdzenie parametrów wywołania
list($action, $storageId) = RequestParams::Params($_GET, array('action' => 'string', 'sid' => 'int'));

// sprawdzenie poprawności danych sterujących
if ($storageId < 0) {
	$storageId = 0;
}

// router akcji
switch ($action) {
	case 'stats':
		// zwraca dane statystyczne o wszystkich grach - Top10
		$stats = getTopTen($dbh);
		returnJsonData($stats);
		break;
	case 'getData':
		// pobranie danych o wynikach aktualnego gracza
		getGameState($dbh, $storageId);
		break;
	case 'save':
		saveData($dbh, $storageId);
		break;
}

function saveData($dbh, $gamerId) {
// odebranie i zapisanie wyników i ustawień gry
	list($options, $stats, $playerName) = RequestParams::Params($_POST, array('jsb_opt', 'jsb_stats', 'player'));

	try {
		$playerName = json_decode($playerName);
		// sprawdzenie czy istnieje w bazie danych
		$sql = 'select * from gamer where id = :id';
		$sth = $dbh->prepare($sql);
		if ($sth->execute(array(':id' => $gamerId))) {
			$result = $sth->fetch(PDO::FETCH_ASSOC);
			if ($result) {
				// zapisz ustawienia - jeśli są wysłane
				if ($options) {
					$sth = $dbh->prepare('update gamer set options = :options where id = :id');
					$sth->execute(array(':id' => $gamerId, ':options' => $options));
				}
			}
			// jeśli nie udało się odczytać
			else {
				// nowy gracz - dodaj rekord
				if (empty($playerName)) {
					returnError("No user name");
				}

				$sql = 'insert into gamer (name, options) values (:name, :options)';
				$sth = $dbh->prepare($sql);
				$sth->bindParam(':name', $playerName, PDO::PARAM_STR);
				$sth->bindParam(':options', $options, PDO::PARAM_STR);
				$isSaved = $sth->execute();
				if ($isSaved) {
					// jeśli udało się dodać to zapisz wyniki
					$gamerId = $dbh->lastInsertId();
				} else {
					// najpewniej nieunikalna nazwa usera
					returnError("Nazwa gracza powtarza się lub wystąpił inny błąd");
				}
			}
		}

		if ($stats) {
			// pobierz słownik gier
			$sth = $dbh->query('select * from game');
			$gamesDict = $sth->fetchAll(PDO::FETCH_ASSOC);
			$gamesDictNo = count($gamesDict);

			$sql = 'replace into stats (fk_gamer, fk_game, max, avg, games_no) values (:gamer, :game, :max, :avg, :games_no)';
			$sth = $dbh->prepare($sql);
			$statsObj = json_decode($stats);
			foreach ($statsObj as $gameStats) {
				$sth->bindParam(':gamer', $gamerId, PDO::PARAM_INT);
				$sth->bindParam(':max', $gameStats->max, PDO::PARAM_INT);
				$sth->bindParam(':avg', $gameStats->avg, PDO::PARAM_INT);
				$sth->bindParam(':games_no', $gameStats->games, PDO::PARAM_INT);
				for ($i = 0; $i < $gamesDictNo; $i++) {
					if ($gamesDict[$i]['name'] === $gameStats->gameType) {
						$sth->bindParam(':game', $gamesDict[$i]['id'], PDO::PARAM_INT);
						break;
					}
				}
				if (!$sth->execute()) {
					$arr = $sth->errorInfo();
					save2log($arr[2]);
				}
			}
		}
		echo $gamerId;
	} catch (Exception $exp) {
		save2log('Bład dekodowania JSON: ' . $json_errors[json_last_error()] . "\n\rOpis wyjątku: " . $exp->getMessage());
	}
}

function getTopTen($dbh) {
	$result = array();

	$sql = 'select gm.name as player, g.name as game, s.max as max_result
from gamer gm, game g, stats s
where s.fk_gamer = gm.id and s.fk_game = g.id
and s.max = (select max(max) as max_result
	from stats
	where s.id = stats.id and s.max > 0)
group by game
having max(max_result)
order by max_result desc';
	try {
		$sth = $dbh->query($sql);
		$result = $sth->fetchAll(PDO::FETCH_ASSOC);
	} catch (Exception $exp) {
		// ignoruję bo i tak nic nie zrobię
	}
	return $result;
}

function getGameState($dbh, $userId) {
	if ($userId <= 0) {
		returnError("No user ID");
	}

	$retData = array();
	// pobrać i odesłać dane o wynikach na podstawie nazwy usera
	$sql = 'select g.name gameType, s.max, s.games_no games, s.avg from game as g, stats as s, gamer as gr where g.id = s.fk_game and s.fk_gamer = gr.id and gr.id = ' . $dbh->quote($userId);
	$sth = $dbh->query($sql);
	$result = array();
	while ($statsObj = $sth->fetchObject()) {
		$result[$statsObj->gameType] = $statsObj;
	}
	$retData['jsb_stats'] = $result;
	// opcje użytkownika
	$sql = 'select options from gamer where id = ' . $dbh->quote($userId);
	$sth = $dbh->query($sql);
	$result = $sth->fetchColumn(0);
	if ($result) {
		$retData['jsb_opt'] = json_decode($result);
	}
	returnJsonData($retData);
}

function __autoload($class_name) {
	include_once 'php/' . $class_name . '.class.php';
}

function save2log($message) {
	global $debug;

	error_log($message . "\r\n", 3, "data.log");
	if ($debug)
		echo $message;
}

function returnJsonData($data) {
	echo json_encode($data);
	exit;
}

function returnError($msg) {
	header('HTTP/1.1 500 Internal Server Error');
	echo $msg;
	exit;
}