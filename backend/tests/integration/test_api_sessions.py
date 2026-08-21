import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_session_lifecycle(client: AsyncClient):
    # 1. Create anonymous session
    res = await client.post("/sessions", json={"title": "Lease Review", "privacy_mode": "standard"})
    assert res.status_code == 201
    session_data = res.json()
    session_id = session_data["id"]
    assert session_data["status"] == "active"

    # 2. Get session
    get_res = await client.get(f"/sessions/{session_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == session_id

    # 3. Create authenticated user
    reg = await client.post(
        "/auth/register",
        json={"email": "tenant@example.com", "password": "StrongPassword123!", "display_name": "Tenant Bob"},
    )
    auth_header = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    # 4. Save session as authenticated user
    save_res = await client.post(f"/sessions/{session_id}/save", headers=auth_header)
    assert save_res.status_code == 200
    assert save_res.json()["save_state"] == "saved"

    # 5. List user sessions
    list_res = await client.get("/sessions", headers=auth_header)
    assert list_res.status_code == 200
    assert len(list_res.json()["sessions"]) >= 1
