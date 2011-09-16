<?php

$debug = false;

if (!$debug) {
	xdebug_disable();
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
}
catch (PDOException $e) {
	save2log('DB connection error: ' . $e->getMessage());
	header('HTTP/1.1 500 Internal Server Error');
	echo 'server error';
	exit;
}

// pobranie i sprawdzenie parametrów wywołania
$getMode = RequestParams::Param($_GET, 'player');
if ($getMode) {
	$retData = array();
	// pobrać i odesłać dane o wynikach na podstawie nazwy usera
	$sql = 'select g.name gameType, s.max, s.games_no games, s.avg from game as g, stats as s, gamer as gr
where g.id = s.fk_game and s.fk_gamer = gr.id and gr.name = ' . $dbh->quote($getMode);
	$sth = $dbh->query($sql);
	$result = array();
	while($statsObj = $sth->fetchObject()) {
		$result[$statsObj->gameType] = $statsObj;
	}
	$retData['jsb_stats'] = $result;
	// opcje użytkownika
	$sql = 'select options from gamer where name = ' . $dbh->quote($getMode);
	$sth = $dbh->query($sql);
	$result = $sth->fetchColumn(0);
	if ($result) {
		$retData['jsb_opt'] = json_decode($result);
	}
	//var_dump(json_encode($retData));
	echo json_encode($retData);
//	var_dump($retData);
//	print_r($retData);

/*	foreach ($retData as $key => $value) {
		echo "\{$key:$value\n\r";
	} */
//	echo "[jsb_stats] => {Standard:{gameType:'Standard',max:1000,games:1,avg:246},Compressive:{gameType:'Compressive',max:1000,games:0,avg:0},Add balls:{gameType:'Add balls',max:1000,games:0,avg:0},Add balls and compress:{gameType:'Add balls and compress',max:1000,games:0,avg:0}}
//		[options] => {currentGameType:'Standard',boardSize:{x:10,y:15},oneClickMode:false,enableAudio:false,boardBackground:'',theme:'metro'}";
    exit;
}
else {
	// odebranie i zapisanie wyników i ustawień gry
	list($options, $stats, $playerName) = RequestParams::Params($_POST, array('jsb_opt', 'jsb_stats', 'player'));
	if (is_null($playerName)) {
		// odsyłam status braku nazwy usera
		echo "No user";
		exit;
	}
	try {
		$playerName = json_decode($playerName);
		$gamerId = -1;
		// sprawdzenie czy istnieje w bazie danych
		$sql = 'select * from gamer where name = :name';
		$sth = $dbh->prepare($sql);
		if ($sth->execute(array(':name' => $playerName))) {
			// pobierz id
			$result = $sth->fetch(PDO::FETCH_ASSOC);
			if ($result) {
				$gamerId = (int)$result['id'];
				// zapisz ustawienia - jeśli są wysłane
				if ($options) {
					$sth = $dbh->prepare('update gamer set options = :options where name = :name');
					$sth->execute(array(':name' => $playerName, ':options' => $options));
				}
			}
		}

		// jeśli nie udało się odczytać
		if ($gamerId == -1) {
			// nowy gracz - dodaj rekord
			$sql = 'insert into gamer (name, options) values (:name, :options)';
			$sth = $dbh->prepare($sql);
			$sth->bindParam(':name', $playerName, PDO::PARAM_STR);
			$sth->bindParam(':options', $options, PDO::PARAM_STR);
			$isSaved = $sth->execute();
			if ($isSaved) {
				// jeśli udało się dodać to zapisz wyniki
				$gamerId = $dbh->lastInsertId();
			}
			else {
				// najpewniej nieunikalna nazwa usera
				echo "Nazwa gracza powtarza się";
				exit;
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
				for ($i=0; $i < $gamesDictNo; $i++) {
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
			echo "Data saved";
		}
	}
	catch (Exception $exp) {
		save2log('Bład dekodowania JSON: ' . $json_errors[json_last_error()] . "\n\rOpis wyjątku: " . $exp->getMessage());

	}
}

function __autoload($class_name) {
    include_once 'php/'.$class_name . '.class.php';
}

function save2log ($message) {
	global $debug;

	error_log($message . "\r\n", 3, "data.log");
	if ($debug) echo $message;
}