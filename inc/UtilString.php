<?php
function generateSalt(int $size = 16, bool $hasDigits = true, bool $hasSymbols = true)
{
    $alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    $digits = "0123456789";
    $symbols = "~`! @#$%^&*()_-+={[}]|\\:;\"'<,>.?/";
    $allDicts = [
        true => [
            false => [$alpha, $alpha, $digits],
            true => [$alpha, $digits, $symbols]
        ],
        false => [
            false => [$alpha, $alpha, $alpha],
            true => [$alpha, $alpha, $symbols]
        ]
    ];
    $dict = $allDicts[$hasDigits][$hasSymbols];
    $salt = '';
    for ($i = 0; $i < $size; $i++) {
        $type = rand() % 100;
        if ($type < 70) {
            $car = $dict[0][rand() % strlen($dict[0])];
        } else if ($type < 85) {
            $car = $dict[1][rand() % strlen($dict[1])];
        } else {
            $car = $dict[2][rand() % strlen($dict[2])];
        }
        $salt .= $car;
    }
    return $salt;
}
