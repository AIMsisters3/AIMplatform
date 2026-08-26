<?php

require_once __DIR__ . '/../models/Language.php';
require_once __DIR__ . '/../helpers/response.php';

class LanguageController
{
    private Language $model;

    public function __construct()
    {
        $this->model = new Language();
    }

    /** GET /api/languages - powers the Language dropdown in the admin form. */
    public function index(): void
    {
        json_ok(['items' => $this->model->allActive()]);
    }
}
