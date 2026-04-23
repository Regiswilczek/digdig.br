def test_analise_tasks_module_imports():
    from app.workers.analise_tasks import analisar_lote_haiku_task, analisar_criticos_sonnet_task
    assert callable(analisar_lote_haiku_task)
    assert callable(analisar_criticos_sonnet_task)
