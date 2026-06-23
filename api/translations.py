from api.common import json_response, load_json


FILES = {
    "phrases": "translations/phrases.json",
    "dining": "translations/dining.json",
    "attractions": "translations/attractions.json",
    "culture": "translations/culture.json",
}


def api_translation_payload():
    payload = {}
    for key, filename in FILES.items():
        payload[key] = load_json(filename)
    return payload


def dispatch(method, environ, start_response):
    if method != "GET":
        from http import HTTPStatus

        from api.common import error_response

        return error_response(start_response, HTTPStatus.METHOD_NOT_ALLOWED, "method_not_allowed", "Method not allowed.", environ)
    return json_response(start_response, api_translation_payload(), environ=environ)
