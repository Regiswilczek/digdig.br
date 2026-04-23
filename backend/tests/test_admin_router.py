def test_admin_router_imports():
    from app.routers.admin import router
    assert router is not None
