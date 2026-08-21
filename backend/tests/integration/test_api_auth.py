import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_auth_register_login_refresh_flow(client: AsyncClient):
    # 1. Register
    reg_payload = {
        "email": "attorney@lexiclear.law",
        "password": "StrongPassword1234!",
        "display_name": "Counsel Alice",
    }
    reg_res = await client.post("/auth/register", json=reg_payload)
    assert reg_res.status_code == 201, reg_res.text
    data = reg_res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    refresh_token = data["refresh_token"]

    # 2. Login
    login_payload = {
        "email": "attorney@lexiclear.law",
        "password": "StrongPassword1234!",
    }
    login_res = await client.post("/auth/login", json=login_payload)
    assert login_res.status_code == 200
    login_data = login_res.json()
    access_token = login_data["access_token"]
    assert login_data["user"]["email"] == "attorney@lexiclear.law"

    # 3. Get profile
    me_res = await client.get("/users/me", headers={"Authorization": f"Bearer {access_token}"})
    assert me_res.status_code == 200
    assert me_res.json()["display_name"] == "Counsel Alice"

    # 4. Refresh token
    ref_res = await client.post("/auth/refresh", json={"refresh_token": login_data["refresh_token"]})
    assert ref_res.status_code == 200
    assert "access_token" in ref_res.json()

    # 5. Invalid credentials check
    bad_login = await client.post("/auth/login", json={"email": "attorney@lexiclear.law", "password": "WrongPassword1!"})
    assert bad_login.status_code == 401
    assert bad_login.json()["error"]["code"] == "AUTH_INVALID_CREDENTIALS"
