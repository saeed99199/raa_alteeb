<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect('http://127.0.0.1:3002/login');
});
