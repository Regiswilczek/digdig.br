def test_orquestrador_imports():
    from app.workers.orquestrador import iniciar_rodada_task
    assert callable(iniciar_rodada_task)
