def test_scraper_tasks_module_imports():
    from app.workers.scraper_tasks import scrape_ato_task, scrape_lote_task
    assert callable(scrape_ato_task)
    assert callable(scrape_lote_task)
