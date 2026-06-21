import os
import unittest

from api.auth import db
from tests.test_support import isolated_auth_db, register_and_login, request


class AuthContractTests(unittest.TestCase):
    def test_public_registration_never_creates_admin(self):
        with isolated_auth_db():
            code, data, _ = request("POST", "/api/auth/register", {
                "email": "first@example.com",
                "password": "SecurePass123!",
                "name": "First User",
            })
            self.assertEqual(code, 201)
            self.assertEqual(data["user"]["role"], "user")

    def test_weak_default_admin_is_not_seeded(self):
        old_email = os.environ.get("ADMIN_EMAIL")
        old_password = os.environ.get("ADMIN_PASSWORD")
        os.environ["ADMIN_EMAIL"] = "admin@go2china.space"
        os.environ["ADMIN_PASSWORD"] = "admin123"
        try:
            with isolated_auth_db():
                with db() as conn:
                    row = conn.execute("SELECT * FROM users WHERE role = 'admin'").fetchone()
                self.assertIsNone(row)
        finally:
            if old_email is None:
                os.environ.pop("ADMIN_EMAIL", None)
            else:
                os.environ["ADMIN_EMAIL"] = old_email
            if old_password is None:
                os.environ.pop("ADMIN_PASSWORD", None)
            else:
                os.environ["ADMIN_PASSWORD"] = old_password

    def test_strong_explicit_admin_can_be_seeded(self):
        old_email = os.environ.get("ADMIN_EMAIL")
        old_password = os.environ.get("ADMIN_PASSWORD")
        os.environ["ADMIN_EMAIL"] = "owner@go2china.space"
        os.environ["ADMIN_PASSWORD"] = "VeryStrongAdminPassword123!"
        try:
            with isolated_auth_db():
                with db() as conn:
                    row = conn.execute("SELECT * FROM users WHERE email = ?", ("owner@go2china.space",)).fetchone()
                self.assertIsNotNone(row)
                self.assertEqual(row["role"], "admin")
        finally:
            if old_email is None:
                os.environ.pop("ADMIN_EMAIL", None)
            else:
                os.environ["ADMIN_EMAIL"] = old_email
            if old_password is None:
                os.environ.pop("ADMIN_PASSWORD", None)
            else:
                os.environ["ADMIN_PASSWORD"] = old_password

    def test_forgot_password_does_not_leak_token_by_default(self):
        old = os.environ.pop("AUTH_EXPOSE_RESET_TOKEN", None)
        try:
            with isolated_auth_db():
                request("POST", "/api/auth/register", {"email": "reset@example.com", "password": "SecurePass123!"})
                code, data, _ = request("POST", "/api/auth/forgot-password", {"email": "reset@example.com"})
                self.assertEqual(code, 200)
                self.assertNotIn("resetToken", data)
        finally:
            if old is not None:
                os.environ["AUTH_EXPOSE_RESET_TOKEN"] = old

    def test_password_change_requires_current_password(self):
        with isolated_auth_db():
            token, _ = register_and_login()
            code, data, _ = request("POST", "/api/auth/update-profile", {"newPassword": "AnotherPass123!"}, token=token)
            self.assertEqual(code, 400)
            self.assertEqual(data["error"]["code"], "current_password_required")


if __name__ == "__main__":
    unittest.main()
