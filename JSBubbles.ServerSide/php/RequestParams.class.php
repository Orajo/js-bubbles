<?php

/**
 * Obsługa komunikacji z użytkownikiem/przeglądarką poprzez protokół HTTP.
 *
 * Umożliwia:
 * - pobieranie i wstępne walidowanie danych od użytkownika (z formularzy, linków itp.)
 * - pobieranie i wstępne walidowanie danych z dowolnego, tablicowego żródła danych
 * - ustalanie nazwy sesji
 * - pobieranie listy języków i stron kodowych akceptowanych przez użytkownika
 *
 * @author Jarosław Wasilewski <orajo@windowslive.com>
 */
class RequestParams {

	/**
	 * Constructor
	 * @access protected
	 */
	public function RequestParams(){
		$this->__constructor();
	}

	/**
	 * Constructor used for compatibility with PHP5
	 */
	public function __constructor(){
	}

	/**
	 * Usuwa ukośniki z ciągiu jeśli automatycznie są one dodawane przez magic_quotes_gpc w php.ini
	 *
	 * @param string $value
	 * @return string
	 */
	public function Strip($value) {
		return get_magic_quotes_gpc() == 1 && is_string($value) ? stripslashes($value) : $value;
	} # end function Strip

	/**
	 * Przetwarza parametry przekazane przez klienta na zmienne PHP.
	 *
	 * Przetwarza informacje pochodzące z przegl�darki i zawarte w tablicach
	 * $_POST, $_GET itp. <i>(właściwie to z dowolnej tablicy asocjacyjnej)</i> na zmienne
	 * globalne o nazwach takich jak nazwy tych pól i wartościach takich jak ich
	 * warto�ci. Je�li trzeci argument wynosi TRUE to zwracana jest tablica warto�ci
	 * otrzymanych ze �r�d�a danych. Je�li odwo�ujemy si� tylko do jednej warto�ci
	 * zwracana jest tylko ta warto�� a nie tablica. Je�li warto�� o jak� si� pytamy
	 * nie istnieje w �r�dle - ustawiana jest na NULL.
	 *
	 * $_expected_data mo�e by� tablic� postaci 'nazwa' => 'typ', gdzie 'typ' okre�la
	 * jeden z typ�w zmiennych PHP (lub string "mixed", dla dowolnego typu), z kt�rym ta zmienna musi zgodna.
	 * W innym wypadku b�dzie mia�a warto�� NULL.
	 *
	 * @param array $_source �r�d�o, sk�d maj� by� pobierane dane wej�ciowe
	 * @param array $_expect_data lista nazw zmiennych (z ew. typami), kt�re maj� by� przetworzone
	 * @param boolean $_local czy globalizowa� zmienne wyj�ciowe (false) czy te� zwraca� je tylko w zasi�gu lokalnym (true)
	 * @param boolean $_assoc okre�la czy wynikiem ma by� tablica asocjacyjna
	 * @return true wywo�ywana z $_localy = false, array wywo�ywana z $_localy = true
	 */
	public function Params (&$_source, $_expect_data = array (), $_local = true, $_assoc = false) {

		$_ret_val = array();

		if (is_array($_expect_data) && count ($_expect_data) > 0) {

			foreach ($_expect_data as $_name => $_type) {

				if (is_int($_name)) { // tablica nie jest asocjacyjna, czyli nie ma podanych typ�w
					$_name = $_type;
					$_type = null;
				}
				$_variable_value = isset($_source[$_name]) ? self::Strip($_source[$_name]) : null;

				if (!is_null($_variable_value) && $_type) {
					if (!self::_testDataType($_variable_value, $_type)) {
						$_variable_value = null;
					}
				}
				if ($_local) {
					if ($_assoc) {
						$_ret_val[$_name] = $_variable_value;
					}
					else {
						$_ret_val[] = $_variable_value;
					}
				}
				else {
					extract(array($_name => $_variable_value));
				}
			}
		}
		else {	# zmienne w zasi�gu globalnym
			foreach ($_source as $_name => $_value) {
				$_ret_val[$_name] = self::Strip($_value);
			}
		}
		return $_ret_val;
	} # end function Params

	/**
	 * Przetwarza parametr przekazany przez klienta na zmienn� PHP.
	 *
	 * Przetwarza informacje pochodz�ce z przegl�darki i zawarte w tablicach
	 * $_POST, $_GET itp. <i>(w sumie to z dowolnej tablicy asocjacyjnej)</i> na zmienn�
	 * lokaln� lub globaln� o nazwie takiej jak nazwa tego pola i warto�ci takiej jak jego
	 * warto��. Je�li trzeci argument wynosi FALSE to warto�� otrzymana ze �r�d�a
	 * danych jest ustawiana te� jako zmienna globalna. Je�li warto�� o jak� si� pytamy
	 * nie istnieje w �r�dle - ustawiana jest na NULL.
	 *
	 * $_variable_name mo�e by� tablic� postaci 'nazwa' => 'typ', gdzie 'typ' okre�la
	 * jeden z typ�w zmiennych PHP (lub string "mixed", dla dowolnego typu), z kt�rym ta zmienna musi zgodna.
	 * W innym wypadku b�dzie mia�a warto�� null.
	 *
	 * @param array $_source �r�d�o, sk�d maj� by� pobierane dane wej�ciowe
	 * @param mixed $_variable_name string - nazwa zmiennej, kt�ra ma by� pobrana
	 *                            array (nazwa => typ) - nazwa zmiennej i jej po��dany typ
	 * @param boolean $_local czy globalizowa� zmienne wyj�ciowe (false) czy te� zwraca� je tylko w zasi�gu lokalnym (true)
	 * @return mixed
	 */
	public function Param (&$_source, $_variable_name, $_local = true) {

		$_variable_value = null;
		$_type = null; // typ zmiennej
		$_name = null; // nazwa zmiennej

		if (is_array($_variable_name)) {
			if (count($_variable_name)) {
				reset($_variable_name);
				list($_name, $_type) = each($_variable_name);
			}
		}
		else $_name = $_variable_name;

		if (!empty ($_name) && isset($_source[$_name])) {
			$_variable_value = self::Strip($_source[$_name]);

			if (!is_null($_variable_value) && $_type) {
				if (!self::_testDataType($_variable_value, $_type)) {
					$_variable_value = null;
				}
			}

			if (!$_local) {
				extract(array($_variable_name => $_variable_value));
			}
		}
		return $_variable_value;
	} # end function Param

	/**
	 * Okre�la czy parametr $name istnieje w $source.
	 * Dodatkowo mo�na wskaza�, �e jego warto�� powinna by� zgodna z $value.
	 * Zgodno�� jest okre�lana co do typu, tak wi�c dla warto�ci z POST czy GET nale�y stosowa� stringi.
	 *
	 * @param array $_source �r�d�o, sk�d maj� by� pobierane dane wej�ciowe
	 * @param string $name nazwa zmiennej, kt�ra ma by� sprawdzona
	 * @param boolean $value r�na od null testuje te�, czy warto�� zmiennej jest zgodna z $value
	 * @return bool
	 */
	public function HasParam(&$_source, $_name, $_value=null){
		if (is_string($_name) && !empty($_name)) {
			if (is_null($_value)) {
				return isset($_source[$_name]);
			}
			else {
				return isset($_source[$_name]) && $_source[$_name] === $_value;
			}
		}
	}

	/**
	 * Testuje zgodno�� warto�ci zmiennej $value z type $type.
	 * Je�li $type wskazuje na jeden z typ�w PHP, to $value zostanie przekszta�cony do tego typu.
	 * Je�li typem jest obiekt iplmentuj�cy validator to jest on u�yty do sprawdzenia.
	 * Dla typ�w string, mixed dodatkowo jest wykonywane strip_tags().
	 *
	 * @param mixed $value warto�� testowanej zmiennej
	 * @param string $type typ zmiennej, zgodny z jedn� z funkcji PHP serii is_*
	 * @access private
	 * @return bool
	 */
	private function _testDataType(&$value, $type){

		if (is_object($type) && PHP_VERSION > 5.0) {
			if ($type instanceof IMafiValidator) {
				$value = $type->Filter($value);
				if ($type->IsValid($value)) {
					return true;
				}
			}
			return false;
		}
		$_preparsed_value = $value;
		$phpType = '';

		$retVal = false;
		switch($type){
			case 'positiveInteger':
			case 'integer':
			case 'int':
				$phpType = 'integer';
				settype($value, $phpType);
				break;
			case 'double':
			case 'real':
			case 'float':
				$phpType = 'float';
				settype($value, $phpType);
				break;
			case 'bool':
				$phpType = 'bool';
				settype($value, $phpType);
				break;
			case 'token':
			case 'string':
			case 'unsecureString':
				$phpType = 'string';
				settype($value, $phpType);
				break;
			case 'mixed':
			default:
				$phpType = '';
			break;
		} // switchshow_var($value, $type);
		if (!empty($phpType) && $type != 'mixed') {
			$test_funct = 'is_'.$phpType;
			if (($value != $_preparsed_value || !function_exists($test_funct) || !@$test_funct($value))) {
				return false;
			}
		}
		// je�li po rzutowaniu warto�� pola nie uleg�a zmianie to nast�puje dodatkowa walidacja i filtracja
		switch($type){
			case 'positiveInteger':
				if ($value > 0)
					$retVal = true;
				break;
			case 'token':
				if (preg_match('/^\w+$/', $value) !== 1) {
					return false;
				}
				$retVal = true;
				break;
			case 'string':
			case 'mixed':
				if (!is_array($value))
					$value = strip_tags($value);
			default:
				$retVal = true;
		}
		return $retVal;
	}
}