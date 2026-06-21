import os
import tempfile

from tests.test_support import WsgiTestCase


class AuthContractTest(WsgiTestCase):
    def setUp(self):
        self.db_dir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.db_dir.name, "auth.db")
        os.environ["AUTH_DB_PATH"] = self.db_path
        os.environ.pop("ADMIN_EMAIL", None)
        os.environ.pop("ADMIN_PASSWORD", None)
        os.environ.pop("AUTH_EXPOSE_RESET_TOKEN", None)
        from api import auth

        self.auth = auth
        auth._initialized = False
        auth._RATE_LIMITS.clear()
        from api.index import app

        self.app = app

    def tearDown(self):
        self.auth._initialized = False
        os.environ.pop("AUTH_DB_PATH", None)
        os.environ.pop("ADMIN_EMAIL", None)
        os.environ.pop("ADMIN_PASSWORD", None)
        os.environ.pop("AUTH_EXPOSE_RESET_TOKEN", None)
        self.auth._RATE_LIMITS.clear()
        self.db_dir.cleanup()

    def assert_json_error(self, response, expected_status, expected_error):
        self.assertEqual(response["status"], expected_status)
        self.assertTrue(response["body"])
        self.assertEqual(response["json"], {"error": expected_error})
        headers = dict(response["headers"])
        self.assertEqual(headers.get("Content-Type"), "application/json; charset=utf-8")

    def test_unauthenticated_trips_returns_stable_json_error(self):
        response = self.call_app(self.app, self.make_environ("GET", "/api/trips"))

        self.assert_json_error(
            response,
            "401 Unauthorized",
            "Authentication required",
        )

    def test_db_path_tracks_environment_changes_before_reinit(self):
        self.assertFalse(os.path.exists(self.db_path))

        self.auth.ensure_init()
        self.assertTrue(os.path.exists(self.db_path))

        second_dir = tempfile.TemporaryDirectory()
        self.addCleanup(second_dir.cleanup)
        second_db_path = os.path.join(second_dir.name, "auth-second.db")
        os.environ["AUTH_DB_PATH"] = second_db_path

        self.auth._initialized = False
        self.auth.ensure_init()

        self.assertTrue(os.path.exists(second_db_path))

    def test_register_persists_display_name_through_login_and_me(self):
        register_response = self.call_app(
            self.app,
            self.make_environ(
                "POST",
                "/api/auth/register",
                {
                    "email": "user@example.com",
                    "password": "secret123",
                    "display_name": "Atlas User",
                },
            ),
        )
        self.assertEqual(register_response["status"], "201 Created")

        login_response = self.call_app(
            self.app,
            self.make_environ(
                "POST",
                "/api/auth/login",
                {
                    "email": "user@example.com",
                    "password": "secret123",
                },
            ),
        )
        self.assertEqual(login_response["status"], "200 OK")
        self.assertEqual(login_response["json"]["user"]["display_name"], "Atlas User")

        me_response = self.call_app(
            self.app,
            self.make_environ(
                "GET",
                "/api/auth/me",
                token=login_response["json"]["token"],
            ),
        )
        self.assertEqual(me_response["status"], "200 OK")
        self.assertEqual(me_response["json"]["user"]["display_name"], "Atlas User")

    def test_default_admin_credentials_are_not_seeded(self):
        response = self.call_app(
            self.app,
            self.make_environ(
                "POST",
                "/api/auth/login",
                {
                    "email": "admin@go2china.space",
                    "password": "admin123",
                },
            ),
        )

        self.assert_json_error(
            response,
            "401 Unauthorized",
            "Invalid email or password",
        )

    def test_explicit_admin_seed_requires_non_default_password(self):
        os.environ["ADMIN_EMAIL"] = "owner@go2china.space"
        os.environ["ADMIN_PASSWORD"] = "much-safer-admin-password"
        self.auth._initialized = False

        response = self.call_app(
            self.app,
            self.make_environ(
                "POST",
                "/api/auth/login",
                {
                    "email": "owner@go2china.space",
                    "password": "much-safer-admin-password",
                },
            ),
        )

        self.assertEqual(response["status"], "200 OK")
        self.assertEqual(response["json"]["user"]["role"], "admin")

    def test_first_public_registration_stays_regular_user(self):
        response = self.call_app(
            self.app,
            self.make_environ(
                "POST",
                "/api/auth/register",
                {
                    "email": "first@example.com",
                    "password": "secret123",
                },
            ),
        )

        self.assertEqual(response["status"], "201 Created")
        self.assertEqual(response["json"]["user"]["role"], "user")

    def test_forgot_password_does_not_expose_reset_token_by_default(self):
        self.call_app(
            self.app,
            self.make_environ(
                "POST",
                "/api/auth/register",
                {
                    "email": "reset@example.com",
                    "password": "secret123",
                },
            ),
        )

        response = self.call_app(
            self.app,
            self.make_environ(
                "POST",
                "/api/auth/forgot-password",
                {"email": "reset@example.com"},
            ),
        )

        self.assertEqual(response["status"], "200 OK")
        self.assertNotIn("reset_token", response["json"])
        self.assertNotIn("user_id", response["json"])

    def test_change_password_requires_current_password(self):
        register_response = self.call_app(
            self.app,
            self.make_environ(
                "POST",
                "/api/auth/register",
                {
                    "email": "profile@example.com",
                    "password": "secret123",
                },
            ),
        )
        self.assertEqual(register_response["status"], "201 Created")
        login_response = self.call_app(
            self.app,
            self.make_environ(
                "POST",
                "/api/auth/login",
                {
                    "email": "profile@example.com",
                    "password": "secret123",
                },
            ),
        )
        self.assertEqual(login_response["status"], "200 OK")

        response = self.call_app(
            self.app,
            self.make_environ(
                "POST",
                "/api/auth/update-profile",
                {"password": "newsecret123"},
                token=login_response["json"]["token"],
            ),
        )

        self.assert_json_error(
            response,
            "400 Bad Request",
            "Current password is required to change password",
        )
